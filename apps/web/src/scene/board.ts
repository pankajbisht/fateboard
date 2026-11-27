import * as fabric from 'fabric';
import { applyTone, tonePatterns } from '@/character/board';
import { frameGroup, swapFrameDrawing } from '@/lib/canvas/frameGroup';
import { FRAME_W } from './camera/projection';
import { renderScene } from './render/renderScene';
import { sceneSvg } from './render/toSvg';
import { parseScene } from './schema/parse';
import type { Scene } from './schema/types';
import { buildFightClip, type ClipOptions, type FightClip } from './combat/clip';
import { parseCombo, type FightCombo } from './combat/choreo';
import type { SceneModel } from './render/types';

/**
 * A scene on a page (docs/CHARACTER_STUDIO.md §9.1): one Fabric group built from the rendered SVG, carrying
 * `sceneData` (in CUSTOM_PROPS) so it saves with the page, survives undo and opens in the studio again. The group
 * is exactly the frame (fixed layout + a clip of the frame's size), so an actor stepping out of the frame is cut
 * at its edge and never widens the selection. The only Fabric file of src/scene (no store import).
 */
export interface SceneData {
    scene: Scene;
}

type WithData = fabric.FabricObject & { sceneData?: unknown };

/** px per frame unit before the page / zoom creation scale: the 1000-unit frame is 800 px wide. */
export const SCENE_PX = 0.8;

/** The rendered model as Fabric shapes (screentone applied by index for manga). */
async function loadDrawing(model: SceneModel, w: number): Promise<fabric.FabricObject[]> {
    const loaded = await fabric.loadSVGFromString(sceneSvg(model, w));
    const objects = (loaded?.objects ?? []).filter(Boolean) as fabric.FabricObject[];
    // manga: screentone by index (the SVG has one path per drawable, in order)
    if (objects.length && model.items.some((d) => d.tone)) {
        if (objects.length === model.items.length) {
            const tone = tonePatterns();
            model.items.forEach((d, i) => {
                if (d.tone) applyTone(objects[i], tone(d.tone));
            });
        } else
            console.warn('[scene] screentone left grey: the drawing did not load shape for shape');
    }
    return objects;
}

export async function buildSceneObject(data: SceneData): Promise<fabric.Group | null> {
    const model = renderScene(data.scene);
    const w = FRAME_W * SCENE_PX;
    const h = (w * model.height) / model.width;
    const objects = await loadDrawing(model, w);
    if (!objects.length) return null;
    const group = frameGroup(objects, w, h);
    (group as WithData).sceneData = JSON.parse(JSON.stringify(data));
    group.set({ name: data.scene.name } as Partial<fabric.FabricObject>);
    return group;
}

/** "Update on page": the fresh drawing goes into the SAME group (id, animation, notes, locks stay). */
export function swapSceneDrawing(target: fabric.Group, fresh: fabric.Group, data: SceneData) {
    swapFrameDrawing(target, fresh);
    (target as WithData).sceneData = JSON.parse(JSON.stringify(data));
    target.set({ name: data.scene.name, dirty: true } as Partial<fabric.Group>);
    target.setCoords();
}

export const isSceneGroup = (o: unknown): o is fabric.Group =>
    o instanceof fabric.Group && !!(o as WithData).sceneData;

/** The scene on a page object, validated, or null for any other object. */
export function readSceneData(obj: unknown): SceneData | null {
    const raw = (obj as WithData | null | undefined)?.sceneData as { scene?: unknown } | undefined;
    if (!raw || typeof raw !== 'object') return null;
    const scene = parseScene(raw.scene);
    return scene ? { scene } : null;
}

/**
 * A fight clip on a page (docs/COMBAT_PACK.md, timeline playback): one frame-sized group holding the place drawn
 * once, one drawing of the fighters per clip frame (only the current one visible) and the border on top. The
 * timeline shows the frame for its time (`animation/clips.ts`); nothing is drawn again while it plays.
 * `fightClip` (in CUSTOM_PROPS) carries the timing and the recipe. It is saved as a poster (the place, the first
 * drawing and the over layer, `lib/serialization.ts`): one clip held 12k shapes (16 MB) in every undo step and
 * autosave (2026-11-27). After a load `restoreFightClipFrames` draws the rest from the recipe again.
 */
export interface FightClipData {
    name: string;
    /** timeline time (ms) of the first frame, drawings per second, how many */
    start: number;
    fps: number;
    count: number;
    /** impact frames */
    hits: number[];
    /** index of the first frame among the group's children (after the place, when there is one) */
    first: number;
    /** the child drawn over the fighters (−1: none), hidden from frame `fullFrom` on (whole, zoomed frames) */
    over: number;
    fullFrom: number;
    /** what the drawings are baked from (clips placed before 2026-11-27 have none and save every drawing) */
    recipe?: FightClipRecipe;
}

/** The input of `buildFightClip`: the same recipe always bakes the same drawings. */
export interface FightClipRecipe {
    scene: Scene;
    a: string;
    b: string;
    combo: FightCombo;
    options: ClipOptions;
}

type WithClip = fabric.FabricObject & { fightClip?: unknown };
/** runtime only: every drawing is in the group (placed, or restored) */
type Runtime = fabric.Group & { fightClip?: FightClipData; __clipFull?: boolean };

/** The recipe on a page clip, validated, or null. */
export function readClipRecipe(raw: unknown): FightClipRecipe | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const scene = parseScene(r.scene);
    const combo = parseCombo(r.combo);
    if (!scene || !combo || typeof r.a !== 'string' || typeof r.b !== 'string') return null;
    const options = r.options && typeof r.options === 'object' ? (r.options as ClipOptions) : {};
    return { scene, a: r.a, b: r.b, combo, options };
}

/** The fighters' drawings of a clip, by recipe: an undo or a page switch moves them into the loaded poster. */
const drawn = new Map<string, fabric.FabricObject[]>();
const drawing = new Map<string, Promise<fabric.FabricObject[] | null>>();
const KEEP_DRAWN = 2;
const remember = (key: string, frames: fabric.FabricObject[]) => {
    drawn.delete(key);
    drawn.set(key, frames);
    while (drawn.size > KEEP_DRAWN) drawn.delete(drawn.keys().next().value as string);
};

/** Draws a clip's layers: one frame-sized group each, centred on the frame (so layers nest without moving). */
function clipPainter(clip: FightClip) {
    const w = FRAME_W * SCENE_PX;
    const base = renderScene(clip.base, 'set', clip.near);
    const h = (w * base.height) / base.width;
    const px = w / base.width;
    const layer = async (model: SceneModel, visible = true, shake: [number, number] = [0, 0]) => {
        const objects = await loadDrawing(model, w);
        if (!objects.length) return null;
        const g = frameGroup(objects, w, h);
        g.set({ left: w / 2 + shake[0] * px, top: h / 2 + shake[1] * px, visible });
        g.setCoords();
        return g;
    };
    const frame = async (i: number): Promise<fabric.FabricObject> => {
        const f = clip.frames[i];
        const model = renderScene(f.scene, f.full ? 'all' : 'actors');
        const fx = f.fx.map((s) => ({
            key: s.key,
            d: s.d,
            fill: s.fill,
            stroke: s.stroke,
            strokeWidth: s.strokeWidth,
            ...(s.opacity !== undefined ? { opacity: s.opacity } : {}),
        }));
        const g = await layer({ ...model, items: [...model.items, ...fx] }, i === 0, f.shake);
        // an empty frame still needs its slot, so frame n is always child n + 1
        return g ?? new fabric.Group([], { originX: 'center', originY: 'center', visible: false });
    };
    return { w, h, base, layer, frame };
}

export async function buildFightClipObject(
    clip: FightClip,
    name: string,
    start: number,
    recipe?: FightClipRecipe,
): Promise<fabric.Group | null> {
    const paint = clipPainter(clip);
    const { w, h } = paint;
    const layers: fabric.FabricObject[] = [];
    const bg = await paint.layer(paint.base);
    if (bg) layers.push(bg);
    for (let i = 0; i < clip.frames.length; i++) layers.push(await paint.frame(i));
    const top = await paint.layer(renderScene(clip.base, 'over', clip.near));
    const over = top ? layers.length : -1;
    if (top) layers.push(top);
    if (layers.length < 2) return null;
    const group = frameGroup(layers, w, h) as Runtime;
    const first = bg ? 1 : 0;
    const data: FightClipData = {
        name,
        start: Math.max(0, Math.round(start)),
        fps: clip.fps,
        count: clip.frames.length,
        hits: clip.hits,
        first,
        over,
        fullFrom: clip.fullFrom,
        ...(recipe ? { recipe: JSON.parse(JSON.stringify(recipe)) as FightClipRecipe } : {}),
    };
    (group as WithClip).fightClip = data;
    group.__clipFull = true;
    if (data.recipe)
        remember(JSON.stringify(data.recipe), layers.slice(first + 1, first + data.count));
    group.set({ name } as Partial<fabric.FabricObject>);
    return group;
}

/** Drawings 1… of a recipe: the cached ones when their clip left the canvas, else drawn again (once at a time). */
async function framesFor(key: string, recipe: FightClipRecipe, count: number) {
    const cached = drawn.get(key);
    const owner = cached?.[0]?.group;
    if (cached && cached.length === count - 1 && !owner?.canvas) return cached;
    const busy = drawing.get(key);
    if (busy) return busy;
    const job = (async () => {
        const clip = buildFightClip(recipe.scene, recipe.a, recipe.b, recipe.combo, recipe.options);
        if (!clip || clip.frames.length !== count) return null;
        const paint = clipPainter(clip);
        const frames: fabric.FabricObject[] = [];
        for (let i = 1; i < count; i++) frames.push(await paint.frame(i));
        return frames;
    })().finally(() => drawing.delete(key));
    drawing.set(key, job);
    return job;
}

/** The transform a drawing has inside its clip (the saved slot keeps it: shake offsets). */
const PLACE = [
    'left',
    'top',
    'scaleX',
    'scaleY',
    'angle',
    'skewX',
    'skewY',
    'flipX',
    'flipY',
] as const;

/**
 * A clip loaded as a poster (undo, redo, page switch, reload) gets its drawings back from the recipe. True when
 * it changed (the caller shows the frame for the playhead and renders). Never throws.
 */
export async function restoreFightClipFrames(target: fabric.Group): Promise<boolean> {
    const group = target as Runtime;
    const data = group.fightClip;
    if (group.__clipFull || !data || data.count < 2) return false;
    const recipe = readClipRecipe(data.recipe);
    if (!recipe) return false;
    try {
        const key = JSON.stringify(data.recipe);
        const frames = await framesFor(key, recipe, data.count);
        const slots = group.getObjects().slice(data.first + 1, data.first + data.count);
        if (!frames || group.__clipFull || slots.length !== frames.length) return false;
        const at = slots.map((s) => Object.fromEntries(PLACE.map((k) => [k, s[k]])));
        group.remove(...slots);
        group.insertAt(data.first + 1, ...frames);
        frames.forEach((f, i) => {
            f.set({ ...at[i], visible: false });
            f.setCoords();
        });
        group.__clipFull = true;
        group.set({ dirty: true });
        remember(key, frames);
        return true;
    } catch (err) {
        console.error('[scene] fight clip drawings not restored', err);
        return false;
    }
}
