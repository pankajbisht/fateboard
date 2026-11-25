/**
 * Paint bucket region finding on rendered pixels (pure; Paint tools slice renders the canvas and turns the
 * result into a vector fill with `traceContours.ts`).
 *
 * - tolerance: how different (0 … 255, any RGBA channel) a pixel may be from the clicked one and still fill;
 * - gap: closes openings up to about 2 × gap px in the line art (Clip Studio "close gap"): lines are thickened
 *   by `gap` before the fill and the fill grows back by `gap` after;
 * - expand: the fill grows that many px under the lines, so no thin unpainted rim shows at anti-aliased edges.
 */
export type FillOptions = { tolerance: number; gap: number; expand: number };
export type FillResult = { mask: Uint8Array; count: number; touchesEdge: boolean };

/** Square dilation of a 0/1 mask by radius `r` (two separable sliding-window passes). */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
    if (r <= 0) return mask.slice();
    const tmp = new Uint8Array(w * h);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        let count = 0;
        const row = y * w;
        for (let x = 0; x < Math.min(r, w - 1) + 1; x++) count += mask[row + x];
        for (let x = 0; x < w; x++) {
            tmp[row + x] = count > 0 ? 1 : 0;
            const add = x + r + 1;
            const sub = x - r;
            if (add < w) count += mask[row + add];
            if (sub >= 0) count -= mask[row + sub];
        }
    }
    for (let x = 0; x < w; x++) {
        let count = 0;
        for (let y = 0; y < Math.min(r, h - 1) + 1; y++) count += tmp[y * w + x];
        for (let y = 0; y < h; y++) {
            out[y * w + x] = count > 0 ? 1 : 0;
            const add = y + r + 1;
            const sub = y - r;
            if (add < h) count += tmp[add * w + x];
            if (sub >= 0) count -= tmp[sub * w + x];
        }
    }
    return out;
}

/** Scanline fill of the passable (0) pixels of `walls` from (sx, sy). */
function scanFill(walls: Uint8Array, w: number, h: number, sx: number, sy: number) {
    const mask = new Uint8Array(w * h);
    let count = 0;
    let touchesEdge = false;
    const stack = [sx, sy];
    while (stack.length) {
        const y = stack.pop() as number;
        let x = stack.pop() as number;
        while (x > 0 && !walls[y * w + x - 1] && !mask[y * w + x - 1]) x--;
        let up = false;
        let down = false;
        for (; x < w; x++) {
            const i = y * w + x;
            if (walls[i] || mask[i]) break;
            mask[i] = 1;
            count++;
            if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesEdge = true;
            if (y > 0) {
                const open = !walls[i - w] && !mask[i - w];
                if (open && !up) stack.push(x, y - 1);
                up = open;
            }
            if (y < h - 1) {
                const open = !walls[i + w] && !mask[i + w];
                if (open && !down) stack.push(x, y + 1);
                down = open;
            }
        }
    }
    return { mask, count, touchesEdge };
}

/** The region of `data` (RGBA, w × h) that a click at (sx, sy) fills. */
export function floodFillMask(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    sx: number,
    sy: number,
    opts: FillOptions,
): FillResult {
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h)
        return { mask: new Uint8Array(w * h), count: 0, touchesEdge: false };
    const s = (y0 * w + x0) * 4;
    const [r, g, b, a] = [data[s], data[s + 1], data[s + 2], data[s + 3]];
    const tol = Math.max(0, Math.min(255, opts.tolerance));
    const walls = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < walls.length; i++, p += 4) {
        const d = Math.max(
            Math.abs(data[p] - r),
            Math.abs(data[p + 1] - g),
            Math.abs(data[p + 2] - b),
            Math.abs(data[p + 3] - a),
        );
        walls[i] = d > tol ? 1 : 0;
    }
    const gap = Math.max(0, Math.round(opts.gap));
    let closed = gap > 0 ? dilate(walls, w, h, gap) : walls;
    if (closed[y0 * w + x0]) closed = walls; // clicked right beside a line: no gap closing there
    const fill = scanFill(closed, w, h, x0, y0);
    const grow = (closed === walls ? 0 : gap) + Math.max(0, Math.round(opts.expand));
    const mask = grow > 0 ? dilate(fill.mask, w, h, grow) : fill.mask;
    let count = 0;
    for (let i = 0; i < mask.length; i++) count += mask[i];
    return { mask, count, touchesEdge: fill.touchesEdge };
}
