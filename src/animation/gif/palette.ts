/**
 * Colour reduction for GIF: a histogram of the frames (5 bits per channel, but each bin keeps the sum of
 * the real colours), median cut to at most 255 colours (index 255 is kept for "transparent"), then a
 * nearest-colour lookup per bin, filled lazily. A flat colour that has a box of its own is kept exactly.
 * Pure, no DOM: it also runs in the encoder worker.
 */

const BINS = 1 << 15;
export const binOf = (r: number, g: number, b: number) =>
    ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
/** Pixels with less alpha than this are transparent (GIF has no partial alpha). */
export const ALPHA_CUT = 128;

export class ColorHistogram {
    readonly count = new Uint32Array(BINS);
    readonly sum = new Float64Array(BINS * 3);

    /** Adds the opaque pixels of an RGBA image, every `step`-th pixel in each direction. */
    add(rgba: ArrayLike<number>, width: number, height: number, step = 1) {
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const p = (y * width + x) * 4;
                if (rgba[p + 3] < ALPHA_CUT) continue;
                const r = rgba[p];
                const g = rgba[p + 1];
                const b = rgba[p + 2];
                const i = binOf(r, g, b);
                this.count[i]++;
                this.sum[i * 3] += r;
                this.sum[i * 3 + 1] += g;
                this.sum[i * 3 + 2] += b;
            }
        }
    }
}

interface Box {
    bins: number[];
    count: number;
    axis: number;
    range: number;
}

const channel = (bin: number, axis: number) => (bin >> (10 - axis * 5)) & 31;

function makeBox(bins: number[], count: Uint32Array): Box {
    const lo = [31, 31, 31];
    const hi = [0, 0, 0];
    let n = 0;
    for (const bin of bins) {
        n += count[bin];
        for (let a = 0; a < 3; a++) {
            const v = channel(bin, a);
            if (v < lo[a]) lo[a] = v;
            if (v > hi[a]) hi[a] = v;
        }
    }
    let axis = 0;
    for (let a = 1; a < 3; a++) if (hi[a] - lo[a] > hi[axis] - lo[axis]) axis = a;
    return { bins, count: n, axis, range: hi[axis] - lo[axis] };
}

/** Median cut: the box with the most pixels × widest spread is split at its median, until `max` boxes. */
function medianCut(used: number[], count: Uint32Array, max: number): number[][] {
    const boxes = [makeBox(used, count)];
    while (boxes.length < max) {
        let pick = -1;
        let best = 0;
        boxes.forEach((b, i) => {
            const score = b.bins.length > 1 ? b.count * (b.range + 1) : 0;
            if (score > best) {
                best = score;
                pick = i;
            }
        });
        if (pick < 0) break;
        const box = boxes[pick];
        const sorted = [...box.bins].sort((a, b) => channel(a, box.axis) - channel(b, box.axis));
        let acc = 0;
        let cut = 1;
        for (let i = 0; i < sorted.length - 1; i++) {
            acc += count[sorted[i]];
            cut = i + 1;
            if (acc * 2 >= box.count) break;
        }
        boxes.splice(
            pick,
            1,
            makeBox(sorted.slice(0, cut), count),
            makeBox(sorted.slice(cut), count),
        );
    }
    return boxes.map((b) => b.bins);
}

export class Palette {
    /** r, g, b per colour */
    readonly colors: Uint8Array;
    readonly size: number;
    private readonly lut = new Int16Array(BINS).fill(-1);

    constructor(colors: Uint8Array) {
        this.colors = colors;
        this.size = colors.length / 3;
    }

    nearest(r: number, g: number, b: number): number {
        let best = 0;
        let bestD = Infinity;
        const c = this.colors;
        for (let i = 0; i < this.size; i++) {
            const dr = c[i * 3] - r;
            const dg = c[i * 3 + 1] - g;
            const db = c[i * 3 + 2] - b;
            const d = dr * dr + dg * dg + db * db;
            if (d < bestD) {
                bestD = d;
                best = i;
                if (d === 0) break;
            }
        }
        return best;
    }

    /** Palette index for an opaque colour (cached per 5-bit bin; the first colour seen in a bin decides). */
    index(r: number, g: number, b: number): number {
        const bin = binOf(r, g, b);
        let v = this.lut[bin];
        if (v < 0) v = this.lut[bin] = this.nearest(r, g, b);
        return v;
    }
}

/** At most `max` (≤ 255) colours for the histogram; at least one colour, so an empty frame still encodes. */
export function buildPalette(h: ColorHistogram, max = 255): Palette {
    const used: number[] = [];
    for (let i = 0; i < BINS; i++) if (h.count[i]) used.push(i);
    const groups = used.length <= max ? used.map((b) => [b]) : medianCut(used, h.count, max);
    const colors = new Uint8Array(Math.max(1, groups.length) * 3);
    groups.forEach((bins, i) => {
        let n = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        for (const bin of bins) {
            n += h.count[bin];
            r += h.sum[bin * 3];
            g += h.sum[bin * 3 + 1];
            b += h.sum[bin * 3 + 2];
        }
        colors[i * 3] = Math.round(r / n);
        colors[i * 3 + 1] = Math.round(g / n);
        colors[i * 3 + 2] = Math.round(b / n);
    });
    return new Palette(colors);
}

/**
 * RGBA → palette indices. Pixels below `ALPHA_CUT` get `transparentIndex`. With `dither`, Floyd–Steinberg
 * error diffusion (smoother gradients, larger files).
 */
export function indexPixels(
    rgba: ArrayLike<number>,
    width: number,
    height: number,
    pal: Palette,
    o: { dither: boolean; transparentIndex: number },
): Uint8Array {
    const out = new Uint8Array(width * height);
    if (!o.dither) {
        for (let i = 0, p = 0; i < out.length; i++, p += 4) {
            out[i] =
                rgba[p + 3] < ALPHA_CUT
                    ? o.transparentIndex
                    : pal.index(rgba[p], rgba[p + 1], rgba[p + 2]);
        }
        return out;
    }
    let cur = new Float32Array((width + 2) * 3);
    let nxt = new Float32Array((width + 2) * 3);
    const c = pal.colors;
    const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const p = i * 4;
            if (rgba[p + 3] < ALPHA_CUT) {
                out[i] = o.transparentIndex;
                continue;
            }
            const e = (x + 1) * 3;
            const r = clamp(rgba[p] + cur[e]);
            const g = clamp(rgba[p + 1] + cur[e + 1]);
            const b = clamp(rgba[p + 2] + cur[e + 2]);
            const k = pal.index(r, g, b);
            out[i] = k;
            const er = r - c[k * 3];
            const eg = g - c[k * 3 + 1];
            const eb = b - c[k * 3 + 2];
            for (let ch = 0; ch < 3; ch++) {
                const err = ch === 0 ? er : ch === 1 ? eg : eb;
                cur[e + 3 + ch] += (err * 7) / 16;
                nxt[e - 3 + ch] += (err * 3) / 16;
                nxt[e + ch] += (err * 5) / 16;
                nxt[e + 3 + ch] += err / 16;
            }
        }
        [cur, nxt] = [nxt, cur];
        nxt.fill(0);
    }
    return out;
}
