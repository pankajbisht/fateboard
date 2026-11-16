/**
 * Paint bucket (G). A click either recolours the closed shape under it, or fills the area enclosed by whatever
 * is drawn there (strokes, shapes, brush marks) with a new vector shape:
 *   render the visible area (whiteboard) / the page (design) → flood fill the pixels (lib/canvas/floodFill) →
 *   trace the outline (lib/canvas/traceContours) → one `fabric.Path` (even-odd, so holes stay holes), placed
 *   under the line art around it. The fill is a normal object: undo, move, recolour, export.
 * On the whiteboard an area that reaches the edge of the view is "open" and is not filled.
 */
import * as fabric from 'fabric';
import { floodFillMask } from '@/lib/canvas/floodFill';
import { loopArea, loopsToPath, simplifyLoop, traceContours } from '@/lib/canvas/traceContours';
import { pointInPolygon } from '@/lib/canvas/lasso';
import { windowOf } from '@/lib/canvas/deepZoom';
import type { BucketStyle } from './paintToolStyles';

type Pt = { x: number; y: number };
type Obj = fabric.FabricObject & Record<string, unknown>;

export type BucketResult =
    | { kind: 'shape'; target: fabric.FabricObject }
    | { kind: 'region'; object: fabric.Path }
    | { kind: 'open' }
    | { kind: 'none' };

/** Largest side of the rendered area, px (memory / time bound). */
const MAX_RASTER = 2048;

export const isHelperObject = (o: Obj) =>
    !!(o.excludeFromExport || o._isHelper || o.isHelper || o.excludeFromLayers);

const typeOf = (o: Obj) => String(o.type || '').toLowerCase();

/** A path or polygon that ends where it starts (can hold a fill). */
function isClosedPath(o: Obj): boolean {
    const t = typeOf(o);
    if (t === 'polygon') return true;
    if (t !== 'path') return false;
    const cmds = (o as unknown as fabric.Path).path ?? [];
    return cmds.some((c) => String(c[0]).toUpperCase() === 'Z');
}

/** Shapes the bucket recolours instead of filling around (closed outlines, not line art). */
export function isFillableShape(o: Obj): boolean {
    if (!o || isHelperObject(o) || o.visible === false || o._locked) return false;
    return ['rect', 'circle', 'ellipse', 'triangle'].includes(typeOf(o)) || isClosedPath(o);
}

/** Is a scene point inside the shape's own area (not just its box)? */
export function pointInShape(o: Obj, p: Pt): boolean {
    const inv = fabric.util.invertTransform(o.calcTransformMatrix());
    const q = new fabric.Point(p.x, p.y).transform(inv);
    const w = (o.width as number) / 2;
    const h = (o.height as number) / 2;
    const t = typeOf(o);
    if (t === 'circle' || t === 'ellipse')
        return (q.x * q.x) / (w * w) + (q.y * q.y) / (h * h) <= 1;
    if (t === 'rect') return Math.abs(q.x) <= w && Math.abs(q.y) <= h;
    if (t === 'triangle')
        return pointInPolygon(q, [
            { x: 0, y: -h },
            { x: w, y: h },
            { x: -w, y: h },
        ]);
    const off = (o.pathOffset as Pt | undefined) ?? { x: 0, y: 0 };
    const local = { x: q.x + off.x, y: q.y + off.y };
    if (t === 'polygon') return pointInPolygon(local, (o.points as Pt[]) ?? []);
    if (t === 'path') {
        const pts: Pt[] = [];
        for (const c of (o as unknown as fabric.Path).path ?? [])
            if (c.length >= 3) pts.push({ x: Number(c[c.length - 2]), y: Number(c[c.length - 1]) });
        return pts.length > 2 && pointInPolygon(local, pts);
    }
    return o.containsPoint(new fabric.Point(p.x, p.y));
}

/** Objects on top of `target` that overlap it (line art drawn over a shape splits it into areas). */
function coveredByOthers(canvas: fabric.Canvas, target: Obj): boolean {
    const objs = canvas.getObjects() as Obj[];
    const box = target.getBoundingRect();
    for (let i = objs.indexOf(target) + 1; i < objs.length; i++) {
        const o = objs[i];
        if (isHelperObject(o) || o.visible === false) continue;
        const b = o.getBoundingRect();
        if (
            b.left < box.left + box.width &&
            b.left + b.width > box.left &&
            b.top < box.top + box.height &&
            b.top + b.height > box.top
        )
            return true;
    }
    return false;
}

/** Where the new fill goes: above what it was painted over, below the line art around it. */
function fillIndex(
    canvas: fabric.Canvas,
    fill: fabric.Path,
    p: Pt,
    placement: BucketStyle['placement'],
) {
    const objs = canvas.getObjects() as Obj[];
    if (placement === 'top') return objs.length;
    let below = -1;
    objs.forEach((o, i) => {
        const opaque =
            o.fill && o.fill !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(String(o.fill));
        if (!isHelperObject(o) && o.visible !== false && opaque && pointInShape(o, p)) below = i;
    });
    const box = fill.getBoundingRect();
    for (let i = below + 1; i < objs.length; i++) {
        const o = objs[i];
        if (isHelperObject(o) || o.visible === false) continue;
        const b = o.getBoundingRect();
        if (
            b.left <= box.left + box.width &&
            b.left + b.width >= box.left &&
            b.top <= box.top + box.height &&
            b.top + b.height >= box.top
        )
            return i;
    }
    return objs.length;
}

/** Render `area` (canvas px; null = the whole canvas) and flood fill it from scene point `p`. */
function regionFill(
    canvas: fabric.Canvas,
    p: Pt,
    style: BucketStyle,
    screen: number,
    area: { x: number; y: number; w: number; h: number } | null,
) {
    const vpt = canvas.viewportTransform;
    const zoom = vpt[0] || 1;
    const left = area?.x ?? 0;
    const top = area?.y ?? 0;
    const width = area?.w ?? canvas.getWidth();
    const height = area?.h ?? canvas.getHeight();
    const m = Math.min(MAX_RASTER / Math.max(width, height, 1), Math.max(1, screen) / zoom);
    const raster = canvas.toCanvasElement(m, {
        left,
        top,
        width,
        height,
        filter: (o) => !isHelperObject(o as Obj) && o.visible !== false,
    });
    const ctx = raster.getContext('2d', {
        willReadFrequently: true,
    } as CanvasRenderingContext2DSettings);
    if (!ctx) return null;
    const w = raster.width;
    const h = raster.height;
    const img = ctx.getImageData(0, 0, w, h);
    const perScreenPx = (m * zoom) / Math.max(screen, 1e-6);
    const fill = floodFillMask(
        img.data,
        w,
        h,
        m * (zoom * p.x + vpt[4] - left),
        m * (zoom * p.y + vpt[5] - top),
        {
            tolerance: style.tolerance,
            gap: style.gap * perScreenPx,
            expand: style.expand * perScreenPx,
        },
    );
    return { fill, m, left, top, w, h };
}

/**
 * Fill at scene point `p` with `color`. `screen` = screen px per scene unit (gap / expand are screen px),
 * `whiteboard` = an infinite board (an area open to the edge of the view is not filled).
 */
export function bucketFill(
    canvas: fabric.Canvas,
    p: Pt,
    color: string,
    style: BucketStyle,
    opts: { screen: number; whiteboard: boolean },
): BucketResult {
    const objs = canvas.getObjects() as Obj[];
    if (style.mode !== 'region') {
        const hit = [...objs]
            .reverse()
            .find((o) => !isHelperObject(o) && o.visible !== false && pointInShape(o, p));
        if (
            hit &&
            isFillableShape(hit) &&
            (style.mode === 'shape' || !coveredByOthers(canvas, hit))
        ) {
            hit.set({ fill: color, dirty: true });
            return { kind: 'shape', target: hit };
        }
        if (style.mode === 'shape') return { kind: 'none' };
    }

    // deep zoom on the design board: render just the visible window (sharp); if the area reaches its edge it
    // goes on outside the view, so render the whole page instead
    const win = windowOf(canvas);
    let r = regionFill(
        canvas,
        p,
        style,
        opts.screen,
        win ? { x: win.ox, y: win.oy, w: win.ww, h: win.wh } : null,
    );
    if (win && r?.fill.touchesEdge) r = regionFill(canvas, p, style, opts.screen, null);
    if (!r || !r.fill.count) return { kind: 'none' };
    if (r.fill.touchesEdge && opts.whiteboard) return { kind: 'open' };

    const loops = traceContours(r.fill.mask, r.w, r.h)
        .map((l) => simplifyLoop(l, 0.75))
        .filter((l) => Math.abs(loopArea(l)) >= 4);
    if (!loops.length) return { kind: 'none' };
    const vpt = canvas.viewportTransform;
    const zoom = vpt[0] || 1;
    const { m, left, top } = r;
    const toScene = (q: Pt) => ({
        x: (q.x / m + left - vpt[4]) / zoom,
        y: (q.y / m + top - vpt[5]) / zoom,
    });
    const fill = new fabric.Path(loopsToPath(loops, toScene), {
        fill: color,
        fillRule: 'evenodd',
        stroke: null,
        strokeWidth: 0,
        originX: 'left',
        originY: 'top',
        objectCaching: true,
    });
    (fill as unknown as Obj).name = 'Fill';
    canvas.insertAt(fillIndex(canvas, fill, p, style.placement), fill);
    return { kind: 'region', object: fill };
}
