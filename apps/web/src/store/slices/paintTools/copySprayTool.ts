/**
 * Copy spray (Shift + S): the canvas side. When the tool is chosen the selection is snapshotted (clones in scene
 * coordinates, so an undo, a page switch or editing the original later does not break it). A drag previews the
 * copies on the top canvas (the selection drawn once into a bitmap, one blit per copy) and on release the
 * slice adds them as ONE group (one Layers row, one undo step). Placement maths: lib/canvas/copySpray.ts.
 */
import * as fabric from 'fabric';
import {
    createDabEmitter,
    dabMatrix,
    sprayDabLimit,
    type CopySprayStyle,
    type DabEmitter,
    type SprayDab,
} from '@/lib/canvas/copySpray';
import { mulberry32, newSeed } from '@/lib/brushes/stamp/rng';
import { CLONE_PROPS, symmetryClones, transformBy } from '../../brushes/symmetryCopies';
import {
    isPrimary,
    keyIsNotOurs,
    scenePointOf,
    withSceneContext,
    type Pointer,
} from '../drawingTools/shared';
import { isHelperObject } from './bucketFill';

type Box = { left: number; top: number; width: number; height: number };

export type SpraySource = {
    /** Clones of the selected objects in scene coordinates, bottom to top. */
    objects: fabric.FabricObject[];
    /** The selection's box (scene) and its centre. */
    box: Box;
    center: { x: number; y: number };
    /** The box's larger side: the copy size at 100 %. */
    size: number;
    /** Objects in the selection, counting the ones inside groups: what one copy adds. */
    leaves: number;
    /** Photos in the selection (inside groups too): each copy saves the photo again. */
    images: number;
};

/** Longest side of the preview bitmap, px. */
const PREVIEW_MAX = 2048;
export const COPY_SPRAY_NAME = 'Copy spray';

/** Objects among `objects`, counting each object inside a group (not the group itself). */
export function leafCount(objects: fabric.FabricObject[]): number {
    let n = 0;
    for (const o of objects) n += o instanceof fabric.Group ? leafCount(o.getObjects()) : 1;
    return n;
}

/** Photos among `objects`, counting those inside groups. */
export function imageCount(objects: fabric.FabricObject[]): number {
    let n = 0;
    for (const o of objects) {
        if (o instanceof fabric.FabricImage) n += 1;
        else if (o instanceof fabric.Group) n += imageCount(o.getObjects());
    }
    return n;
}

/**
 * Snapshot of the canvas selection, or null when nothing (but helpers) is selected. The objects' data is read
 * now (clone serialises synchronously): call it before the selection is cleared.
 */
export function takeSpraySource(
    canvas: fabric.Canvas,
    objects: fabric.FabricObject[] = canvas.getActiveObjects(),
): Promise<SpraySource> | null {
    const order = canvas.getObjects();
    const picked = objects
        .filter((o) => !isHelperObject(o as fabric.FabricObject & Record<string, unknown>))
        .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    if (!picked.length) return null;
    // a member of an ActiveSelection is placed relative to it: the clone gets the selection's matrix
    const parents = picked.map((o) => o.group?.calcTransformMatrix() ?? null);
    const clones = picked.map((o) => o.clone(CLONE_PROPS));
    return Promise.all(clones).then((objects) => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        objects.forEach((o, i) => {
            const m = parents[i];
            if (m) transformBy(o, m as Parameters<typeof transformBy>[1]);
            o.setCoords();
            o.objectCaching = false; // drawn into the preview bitmap at the board's zoom, not a 1× cache
            for (const p of o.getCoords()) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
        });
        const box = { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
        return {
            objects,
            box,
            center: { x: minX + box.width / 2, y: minY + box.height / 2 },
            size: Math.max(box.width, box.height, 1),
            leaves: leafCount(objects),
            images: imageCount(objects),
        };
    });
}

/** The topmost object under a scene point that can be a spray source (not a helper, locked-out or hidden). */
export function sourceObjectAt(canvas: fabric.Canvas, p: { x: number; y: number }) {
    const at = new fabric.Point(p.x, p.y);
    return [...canvas.getObjects()]
        .reverse()
        .find(
            (o) =>
                o.visible !== false &&
                o.selectable !== false &&
                !isHelperObject(o as fabric.FabricObject & Record<string, unknown>) &&
                o.containsPoint(at),
        );
}

/** What the bar calls a source: the object's name / type, or how many objects. */
export function sourceLabel(objects: fabric.FabricObject[]): string {
    if (objects.length !== 1) return `${objects.length} objects`;
    const o = objects[0] as fabric.FabricObject & { name?: unknown };
    const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : o.type;
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * The copies for a finished drag: per dab, a clone of every source object (keeping the selection's stacking),
 * moved / scaled / turned by the dab. More than one object → one group named "Copy spray". Not added.
 */
export async function sprayCopyObject(
    source: SpraySource,
    dabs: SprayDab[],
): Promise<{ object: fabric.FabricObject; count: number } | null> {
    if (!dabs.length) return null;
    const matrices = dabs.map((d) => dabMatrix(d, source.center));
    const perSource = await Promise.all(source.objects.map((o) => symmetryClones(o, matrices)));
    const copies: fabric.FabricObject[] = [];
    dabs.forEach((d, i) =>
        perSource.forEach((clones, s) => {
            const copy = clones[i];
            copy.set({ opacity: (source.objects[s].opacity ?? 1) * d.opacity });
            copies.push(copy);
        }),
    );
    if (copies.length === 1) return { object: copies[0], count: 1 };
    const group = new fabric.Group(copies, { originX: 'left', originY: 'top' });
    (group as unknown as Record<string, unknown>).name = COPY_SPRAY_NAME;
    return { object: group, count: copies.length };
}

/**
 * The source drawn once at `pxPerUnit`, for the live preview. Null when it cannot be drawn (no 2D context, an
 * object that fails to render): the spray then works without a preview.
 */
function previewBitmap(source: SpraySource, pxPerUnit: number) {
    const { box } = source;
    const k = Math.min(pxPerUnit, PREVIEW_MAX / Math.max(box.width, box.height, 1e-6));
    try {
        const el = document.createElement('canvas');
        el.width = Math.max(1, Math.ceil(box.width * k));
        el.height = Math.max(1, Math.ceil(box.height * k));
        const ctx = el.getContext('2d');
        if (!ctx) return null;
        ctx.scale(k, k);
        ctx.translate(-box.left, -box.top);
        for (const o of source.objects) o.render(ctx);
        return el;
    } catch (err) {
        console.error('[paintTools] copy spray preview failed', err);
        return null;
    }
}

export type CopySprayDeps = {
    style: () => CopySprayStyle;
    /** The snapshot: ready, still loading (images), or none (nothing was selected). */
    source: () => SpraySource | 'loading' | null;
    /** Adds the copies (async: clones load); the preview stays until it resolves. */
    onSpray: (dabs: SprayDab[]) => Promise<unknown>;
    /** Click with no source, or Alt + click: make what is under the pointer the source. */
    onPick: (p: { x: number; y: number }) => void;
    onEscape: () => void;
    /** Screen px per scene unit (preview sharpness). */
    screen: () => number;
};

/** Listens on the canvas while Copy spray is active; returns the detach function. */
export function attachCopySpray(canvas: fabric.Canvas, deps: CopySprayDeps): () => void {
    let emitter: DabEmitter | null = null;
    let src: SpraySource | null = null;
    let bitmap: HTMLCanvasElement | null = null;
    let frame = 0;
    let drawn: SprayDab[] = []; // what the preview shows (also between release and the group landing)
    let stroke = 0;
    let detached = false;

    const paint = () => {
        frame = 0;
        const bmp = bitmap;
        const s = src;
        withSceneContext(canvas, (ctx) => {
            if (!bmp || !s) return;
            for (const d of drawn) {
                ctx.save();
                ctx.transform(...dabMatrix(d, s.center));
                ctx.globalAlpha = d.opacity;
                ctx.drawImage(bmp, s.box.left, s.box.top, s.box.width, s.box.height);
                ctx.restore();
            }
        });
    };
    const schedule = () => {
        if (!frame && typeof requestAnimationFrame === 'function')
            frame = requestAnimationFrame(paint);
    };
    const clear = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        drawn = [];
        bitmap = null;
        withSceneContext(canvas, () => undefined);
    };

    const onDown = (opt: Pointer) => {
        const p = scenePointOf(opt);
        if (!isPrimary(opt) || !p) return;
        const s = deps.source();
        if (!s || opt.e?.altKey) return deps.onPick(p);
        if (s === 'loading') return; // the snapshot's images are still loading: a moment
        const style = deps.style();
        src = s;
        stroke += 1;
        emitter = createDabEmitter(
            style,
            s.size,
            mulberry32(newSeed()),
            sprayDabLimit(s.leaves, s.images),
        );
        emitter.start(p);
        drawn = emitter.dabs;
        const retina = (canvas as { getRetinaScaling?: () => number }).getRetinaScaling?.() ?? 1;
        bitmap = previewBitmap(s, deps.screen() * retina * Math.max(1, style.scale));
        schedule();
    };
    const onMove = (opt: Pointer) => {
        const p = scenePointOf(opt);
        if (!emitter || !p) return;
        if (emitter.move(p).length) schedule();
    };
    const onUp = () => {
        if (!emitter) return;
        const dabs = emitter.dabs.slice();
        const mine = stroke;
        emitter = null;
        drawn = dabs;
        deps.onSpray(dabs).finally(() => {
            // the group is on the board now; once detached, the top canvas belongs to the next tool
            if (!detached && mine === stroke && !emitter) clear();
        });
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || keyIsNotOurs(e)) return;
        emitter = null;
        clear();
        deps.onEscape();
    };
    const offs = [
        canvas.on('mouse:down', onDown as never),
        canvas.on('mouse:move', onMove as never),
        canvas.on('mouse:up', onUp as never),
    ];
    window.addEventListener('keydown', onKey);
    return () => {
        detached = true;
        offs.forEach((off) => off());
        window.removeEventListener('keydown', onKey);
        emitter = null;
        clear();
    };
}
