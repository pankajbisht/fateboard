/**
 * Live symmetry ghosts while drawing: every brush draws its stroke-in-progress on the top context through
 * `_render`; after it, the top context's pixels are blitted once per copy with the copy's matrix (in device
 * space: D · m · D⁻¹, D = retina · viewport), at reduced opacity. Works for every brush engine (Fabric brushes,
 * stamp brushes) without knowing how they draw. Brushes that draw only the newest segment are switched to full
 * renders while ghosts are on. Fabric clears the top context when the stroke ends, so no ghost is ever left.
 * Cost: one scratch copy + one blit per ghost per move; ghosts are capped (PREVIEW_MAX).
 */
import type * as fabric from 'fabric';
import { multiply, type Matrix } from '@/lib/canvas/symmetryMath';

export const PREVIEW_MAX = 64;
const WRAPPED = '__fbSymmetryPreview';

type Renderable = {
    _render?: (...args: unknown[]) => void;
    needsFullRender?: () => boolean;
    [WRAPPED]?: boolean;
};

const invert = (m: Matrix): Matrix => {
    const det = m[0] * m[3] - m[1] * m[2] || 1;
    return [
        m[3] / det,
        -m[1] / det,
        -m[2] / det,
        m[0] / det,
        (m[2] * m[5] - m[3] * m[4]) / det,
        (m[1] * m[4] - m[0] * m[5]) / det,
    ];
};

/** Draws the ghosts of what is on the top context now. */
export function drawGhosts(
    canvas: fabric.Canvas,
    matrices: Matrix[],
    scratch: HTMLCanvasElement,
): void {
    const ctx = canvas.contextTop;
    const el = ctx?.canvas;
    if (!ctx || !el || !matrices.length || !el.width || !el.height) return;
    if (scratch.width !== el.width) scratch.width = el.width;
    if (scratch.height !== el.height) scratch.height = el.height;
    const sctx = scratch.getContext('2d');
    if (!sctx) return;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, scratch.width, scratch.height);
    sctx.drawImage(el, 0, 0);
    const r = canvas.getRetinaScaling();
    const v = canvas.viewportTransform;
    const d: Matrix = [v[0] * r, v[1] * r, v[2] * r, v[3] * r, v[4] * r, v[5] * r];
    const dInv = invert(d);
    ctx.save();
    ctx.globalAlpha = 0.6;
    for (const m of matrices.slice(0, PREVIEW_MAX)) {
        const p = multiply(multiply(d, m), dInv);
        ctx.setTransform(p[0], p[1], p[2], p[3], p[4], p[5]);
        ctx.drawImage(scratch, 0, 0);
    }
    ctx.restore();
}

/**
 * Hooks the ghosts into the canvas: on each stroke start (`mouse:down:before` in drawing mode) the current
 * brush is wrapped once and `getMatrices` is read for this stroke. Returns the disposer.
 */
export function installSymmetryPreview(
    canvas: fabric.Canvas,
    getMatrices: () => Matrix[],
): () => void {
    let matrices: Matrix[] = [];
    let scratch: HTMLCanvasElement | null = null;
    const onDown = () => {
        if (!canvas.isDrawingMode) return;
        matrices = getMatrices();
        const brush = canvas.freeDrawingBrush as unknown as Renderable | undefined;
        if (!brush || brush[WRAPPED] || typeof brush._render !== 'function') return;
        const render = brush._render.bind(brush);
        const full = brush.needsFullRender?.bind(brush);
        brush._render = (...args: unknown[]) => {
            render(...args);
            if (!matrices.length || typeof document === 'undefined') return;
            scratch ??= document.createElement('canvas');
            drawGhosts(canvas, matrices, scratch);
        };
        if (full) brush.needsFullRender = () => matrices.length > 0 || full();
        brush[WRAPPED] = true;
    };
    const off = canvas.on('mouse:down:before', onDown);
    return () => {
        off();
        matrices = [];
        if (scratch) {
            scratch.width = 0;
            scratch.height = 0;
            scratch = null;
        }
    };
}
