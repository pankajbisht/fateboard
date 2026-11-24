/**
 * Gaussian-like blur of RGBA pixels in plain JS (three box passes, W3C "fast gaussian"). Used by the layer
 * blur when the browser's canvas has no `ctx.filter` (docs/LIMITATIONS.md). Pure: no DOM, no Fabric.
 *
 * Works on premultiplied colour, so a blurred edge fades to transparent instead of to a dark fringe.
 */

/** Widths of `n` box filters whose sequence approximates a gaussian of standard deviation `sigma`. */
export function boxesForGauss(sigma: number, n = 3): number[] {
    if (!(sigma > 0)) return Array.from({ length: n }, () => 1);
    const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
    let lower = Math.floor(ideal);
    if (lower % 2 === 0) lower--;
    const upper = lower + 2;
    const m = Math.round(
        (12 * sigma * sigma - n * lower * lower - 4 * n * lower - 3 * n) / (-4 * lower - 4),
    );
    return Array.from({ length: n }, (_, i) => (i < m ? lower : upper));
}

/** One horizontal (`step` 1) or vertical pass of a box of half-width `r` over 4-channel floats. */
function boxPass(
    src: Float32Array,
    dst: Float32Array,
    w: number,
    h: number,
    r: number,
    horizontal: boolean,
) {
    const lines = horizontal ? h : w;
    const len = horizontal ? w : h;
    const stride = horizontal ? 4 : w * 4;
    const inv = 1 / (r + r + 1);
    for (let line = 0; line < lines; line++) {
        const base = horizontal ? line * w * 4 : line * 4;
        for (let c = 0; c < 4; c++) {
            const first = src[base + c];
            const last = src[base + (len - 1) * stride + c];
            let acc = (r + 1) * first;
            for (let j = 0; j < r; j++) acc += src[base + Math.min(j, len - 1) * stride + c];
            for (let i = 0; i < len; i++) {
                const add = i + r < len ? src[base + (i + r) * stride + c] : last;
                const sub = i - r - 1 >= 0 ? src[base + (i - r - 1) * stride + c] : first;
                acc += add - sub;
                dst[base + i * stride + c] = acc * inv;
            }
        }
    }
}

/**
 * Blurs `data` (RGBA bytes, `w` × `h`) in place with standard deviation `sigma` px. Edges are clamped, so
 * give the image a transparent margin of about 3 × sigma to let the blur spread.
 */
export function boxBlurRGBA(data: Uint8ClampedArray, w: number, h: number, sigma: number): void {
    if (!(sigma > 0) || w < 1 || h < 1 || data.length < w * h * 4) return;
    const a = new Float32Array(w * h * 4);
    const b = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
        const alpha = data[i + 3] / 255;
        a[i] = data[i] * alpha;
        a[i + 1] = data[i + 1] * alpha;
        a[i + 2] = data[i + 2] * alpha;
        a[i + 3] = data[i + 3];
    }
    for (const size of boxesForGauss(sigma)) {
        const r = (size - 1) / 2;
        boxPass(a, b, w, h, r, true);
        boxPass(b, a, w, h, r, false);
    }
    for (let i = 0; i < w * h * 4; i += 4) {
        const alpha = a[i + 3];
        const k = alpha > 0 ? 255 / alpha : 0;
        data[i] = a[i] * k;
        data[i + 1] = a[i + 1] * k;
        data[i + 2] = a[i + 2] * k;
        data[i + 3] = alpha;
    }
}
