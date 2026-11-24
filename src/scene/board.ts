import * as fabric from 'fabric';
import { applyTone, tonePatterns } from '@/character/board';
import { FRAME_W } from './camera/projection';
import { renderScene } from './render/renderScene';
import { sceneSvg } from './render/toSvg';
import { parseScene } from './schema/parse';
import type { Scene } from './schema/types';

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

/**
 * A group exactly the size of the frame: fixed layout (it never refits to its children), the children shifted so
 * the frame's centre is the group's centre, and a clip of the frame's size at that centre.
 */
function frameGroup(objects: fabric.FabricObject[], w: number, h: number): fabric.Group {
    const group = new fabric.Group(objects, {
        originX: 'center',
        originY: 'center',
        layoutManager: new fabric.LayoutManager(new fabric.FixedLayout()),
        width: w,
        height: h,
    });
    const c = group.getCenterPoint();
    const dx = c.x - w / 2;
    const dy = c.y - h / 2;
    for (const o of group.getObjects()) {
        o.set({ left: o.left + dx, top: o.top + dy });
        o.setCoords();
    }
    group.clipPath = frameClip(w, h);
    group.set({ width: w, height: h, dirty: true });
    group.setCoords();
    return group;
}

const frameClip = (w: number, h: number) =>
    new fabric.Rect({ width: w, height: h, originX: 'center', originY: 'center', left: 0, top: 0 });

export async function buildSceneObject(data: SceneData): Promise<fabric.Group | null> {
    const model = renderScene(data.scene);
    const w = FRAME_W * SCENE_PX;
    const h = (w * model.height) / model.width;
    const loaded = await fabric.loadSVGFromString(sceneSvg(model, w));
    const objects = (loaded?.objects ?? []).filter(Boolean) as fabric.FabricObject[];
    if (!objects.length) return null;
    // manga: screentone by index (the SVG has one path per drawable, in order)
    if (model.items.some((d) => d.tone)) {
        if (objects.length === model.items.length) {
            const tone = tonePatterns();
            model.items.forEach((d, i) => {
                if (d.tone) applyTone(objects[i], tone(d.tone));
            });
        } else
            console.warn('[scene] screentone left grey: the drawing did not load shape for shape');
    }
    const group = frameGroup(objects, w, h);
    (group as WithData).sceneData = JSON.parse(JSON.stringify(data));
    group.set({ name: data.scene.name } as Partial<fabric.FabricObject>);
    return group;
}

/** "Update on page": the fresh drawing goes into the SAME group (id, animation, notes, locks stay). */
export function swapSceneDrawing(target: fabric.Group, fresh: fabric.Group, data: SceneData) {
    fresh.set({
        originX: target.originX,
        originY: target.originY,
        left: target.left,
        top: target.top,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        angle: target.angle,
        flipX: target.flipX,
        flipY: target.flipY,
        skewX: target.skewX,
        skewY: target.skewY,
    });
    fresh.setCoords();
    // leaving `fresh` puts each shape in page coordinates; joining the target (same transform) turns them back
    // into the same frame-relative place. The fixed layout does not refit, so the frame stays where it is
    const kids = [...fresh.getObjects()];
    fresh.remove(...kids);
    target.remove(...target.getObjects());
    target.add(...kids);
    // the frame may have changed shape (aspect): the target takes the fresh frame's size and clip
    target.set({ width: fresh.width, height: fresh.height });
    target.clipPath = frameClip(fresh.width, fresh.height);
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
