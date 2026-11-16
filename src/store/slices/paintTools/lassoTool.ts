/**
 * Lasso (L): drag a freehand loop. "Select" picks the objects it touches (or fully contains) and switches to the
 * Select tool so they can be moved at once; Shift adds to the selection, Alt removes. "Fill" turns the loop
 * into a filled shape in the drawing colour (Procreate's lasso fill). The loop is drawn on the top canvas only.
 */
import * as fabric from 'fabric';
import { lassoPicks, thinLasso, type LassoMode, type Pt } from '@/lib/canvas/lasso';
import { unpackPoints } from '@/lib/brushes/stamp/StampStroke';
import {
    isPrimary,
    keyIsNotOurs,
    scenePointOf,
    withSceneContext,
    type Pointer,
} from '../drawingTools/shared';
import { isHelperObject } from './bucketFill';

type Obj = fabric.FabricObject & Record<string, unknown>;
const MAX_OUTLINE = 240;

/** Points on the object's outline in scene coordinates (path points, stroke samples, else its box). */
export function outlinePoints(o: Obj): Pt[] {
    const m = o.calcTransformMatrix();
    const at = (x: number, y: number) => new fabric.Point(x, y).transform(m);
    const type = String(o.type || '').toLowerCase();
    let local: Pt[] = [];
    if (type === 'path' && Array.isArray((o as unknown as fabric.Path).path)) {
        const off = (o.pathOffset as Pt | undefined) ?? { x: 0, y: 0 };
        for (const c of (o as unknown as fabric.Path).path)
            if (c.length >= 3)
                local.push({
                    x: Number(c[c.length - 2]) - off.x,
                    y: Number(c[c.length - 1]) - off.y,
                });
    } else if (type === 'stampstroke') {
        local = unpackPoints(o.stampPoints).map((p) => ({
            x: p.x - (o.width as number) / 2,
            y: p.y - (o.height as number) / 2,
        }));
    }
    if (!local.length) {
        const w = (o.width as number) / 2;
        const h = (o.height as number) / 2;
        local = [
            { x: -w, y: -h },
            { x: 0, y: -h },
            { x: w, y: -h },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h },
            { x: -w, y: h },
            { x: -w, y: 0 },
        ];
    }
    const step = Math.max(1, Math.ceil(local.length / MAX_OUTLINE));
    return local.filter((_, i) => i % step === 0).map((p) => at(p.x, p.y));
}

/** Objects the loop picks (selectable, visible, unlocked, not helpers), bottom to top. */
export function lassoTargets(
    canvas: fabric.Canvas,
    loop: Pt[],
    match: LassoMode,
): fabric.FabricObject[] {
    return (canvas.getObjects() as Obj[]).filter(
        (o) =>
            !isHelperObject(o) &&
            o.visible !== false &&
            o.selectable !== false &&
            o.evented !== false &&
            !o._locked &&
            lassoPicks(loop, outlinePoints(o), o.getCoords(), match),
    );
}

/** Make `objects` the canvas selection (one object, or an ActiveSelection). */
export function selectObjects(canvas: fabric.Canvas, objects: fabric.FabricObject[]): void {
    canvas.discardActiveObject();
    if (objects.length === 1) canvas.setActiveObject(objects[0]);
    else if (objects.length > 1)
        canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
    canvas.requestRenderAll();
}

export type LassoDeps = {
    style: () => { action: 'select' | 'fill'; match: LassoMode };
    /** Pick objects (keeps or edits the current selection per the modifier keys). */
    onSelect: (loop: Pt[], mode: 'replace' | 'add' | 'subtract') => void;
    onFill: (loop: Pt[]) => void;
    onEscape: () => void;
    /** Screen px per scene unit (line width of the loop). */
    screen: () => number;
};

/** Listens on the canvas while the Lasso is active; returns the detach function. */
export function attachLasso(canvas: fabric.Canvas, deps: LassoDeps): () => void {
    let loop: Pt[] | null = null;
    let frame = 0;
    const paint = () => {
        frame = 0;
        const pts = loop;
        withSceneContext(canvas, (ctx) => {
            if (!pts || pts.length < 2) return;
            const k = 1 / Math.max(deps.screen(), 1e-6);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (const p of pts) ctx.lineTo(p.x, p.y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
            ctx.fill();
            ctx.lineWidth = 1.5 * k;
            ctx.setLineDash([5 * k, 4 * k]);
            ctx.strokeStyle = '#2563eb';
            ctx.stroke();
            ctx.lineDashOffset = 5 * k;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        });
    };
    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(paint);
    };
    const onDown = (opt: Pointer) => {
        const p = scenePointOf(opt);
        if (!isPrimary(opt) || !p) return;
        loop = [p];
    };
    const onMove = (opt: Pointer) => {
        const p = scenePointOf(opt);
        if (!loop || !p) return;
        loop.push(p);
        schedule();
    };
    const onUp = (opt: Pointer) => {
        const pts = loop ? thinLasso(loop, 1 / Math.max(deps.screen(), 1e-6)) : [];
        loop = null;
        withSceneContext(canvas, () => undefined);
        if (pts.length < 3) return;
        if (deps.style().action === 'fill') return deps.onFill(pts);
        const e = opt?.e;
        deps.onSelect(pts, e?.altKey ? 'subtract' : e?.shiftKey ? 'add' : 'replace');
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || keyIsNotOurs(e)) return;
        loop = null;
        withSceneContext(canvas, () => undefined);
        deps.onEscape();
    };
    const offs = [
        canvas.on('mouse:down', onDown as never),
        canvas.on('mouse:move', onMove as never),
        canvas.on('mouse:up', onUp as never),
    ];
    window.addEventListener('keydown', onKey);
    return () => {
        offs.forEach((off) => off());
        window.removeEventListener('keydown', onKey);
        if (frame) cancelAnimationFrame(frame);
        withSceneContext(canvas, () => undefined);
    };
}
