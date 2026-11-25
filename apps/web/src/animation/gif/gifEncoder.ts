import { ByteWriter, writeLzw } from './lzw';
import { Palette, indexPixels } from './palette';

/**
 * Animated GIF89a writer. One global colour table (≤ 255 colours + index 255 for "transparent"), a loop
 * extension, then frames. Small files for motion graphics:
 *  - opaque: each frame stores only the box that changed since the previous one, with unchanged pixels in
 *    that box written as transparent (they keep what is shown), disposal "keep";
 *  - transparent background: full frames, disposal "restore to background" (a pixel can turn transparent);
 *  - a frame identical to the previous one only makes the previous one last longer.
 * Pure, no DOM: it runs in the encoder worker (gif.worker.ts) or inline.
 */
export const TRANSPARENT_INDEX = 255;
const MAX_DELAY = 0xffff;

export interface GifInit {
    width: number;
    height: number;
    /** r, g, b per colour, at most 255 colours */
    palette: Uint8Array;
    loop: boolean;
    dither: boolean;
    transparent: boolean;
}

interface PendingFrame {
    x: number;
    y: number;
    w: number;
    h: number;
    data: Uint8Array;
    /** centiseconds */
    delay: number;
    disposal: 1 | 2;
    transparency: boolean;
}

export class GifEncoder {
    private readonly out = new ByteWriter();
    private readonly pal: Palette;
    private prev: Uint8Array | null = null;
    private pending: PendingFrame | null = null;
    /** frames written to the file (after merging identical ones) */
    frames = 0;
    private readonly o: GifInit;

    constructor(o: GifInit) {
        this.o = o;
        if (o.palette.length > 255 * 3)
            throw new Error('A GIF palette holds at most 255 colours here.');
        this.pal = new Palette(o.palette);
        const out = this.out;
        out.text('GIF89a');
        out.u16(o.width);
        out.u16(o.height);
        out.byte(0xf7); // global colour table, 8-bit colour resolution, 256 entries
        out.byte(o.transparent ? TRANSPARENT_INDEX : 0); // background colour index
        out.byte(0); // square pixels
        const table = new Uint8Array(256 * 3);
        table.set(o.palette);
        out.bytes(table);
        if (o.loop) {
            out.bytes([0x21, 0xff, 0x0b]);
            out.text('NETSCAPE2.0');
            out.bytes([0x03, 0x01, 0x00, 0x00, 0x00]); // loop forever
        }
    }

    /** Adds a frame of `width × height` RGBA pixels shown for `delay` centiseconds. */
    addFrame(rgba: ArrayLike<number>, delay: number) {
        const { width, height, dither, transparent } = this.o;
        const idx = indexPixels(rgba, width, height, this.pal, {
            dither,
            transparentIndex: TRANSPARENT_INDEX,
        });
        const prev = this.prev;
        this.prev = idx;
        if (!prev) {
            this.pending = full(idx, width, height, delay, transparent);
            return;
        }
        const box = changedBox(prev, idx, width, height);
        if (!box) {
            this.pending!.delay = Math.min(MAX_DELAY, this.pending!.delay + delay);
            return;
        }
        this.flush();
        if (transparent) {
            this.pending = full(idx, width, height, delay, true);
            return;
        }
        const data = new Uint8Array(box.w * box.h);
        for (let y = 0; y < box.h; y++) {
            for (let x = 0; x < box.w; x++) {
                const i = (box.y + y) * width + box.x + x;
                data[y * box.w + x] = idx[i] === prev[i] ? TRANSPARENT_INDEX : idx[i];
            }
        }
        this.pending = { ...box, data, delay, disposal: 1, transparency: true };
    }

    /** The finished file. */
    finish(): Uint8Array {
        this.flush();
        this.out.byte(0x3b); // trailer
        return this.out.result();
    }

    private flush() {
        const f = this.pending;
        if (!f) return;
        this.pending = null;
        const out = this.out;
        out.bytes([0x21, 0xf9, 0x04, (f.disposal << 2) | (f.transparency ? 1 : 0)]);
        out.u16(Math.max(1, Math.round(f.delay)));
        out.byte(TRANSPARENT_INDEX);
        out.byte(0);
        out.byte(0x2c);
        out.u16(f.x);
        out.u16(f.y);
        out.u16(f.w);
        out.u16(f.h);
        out.byte(0); // no local colour table, not interlaced
        writeLzw(out, f.data, 8);
        this.frames++;
    }
}

function full(
    data: Uint8Array,
    w: number,
    h: number,
    delay: number,
    transparent: boolean,
): PendingFrame {
    return {
        x: 0,
        y: 0,
        w,
        h,
        data,
        delay,
        disposal: transparent ? 2 : 1,
        transparency: transparent,
    };
}

/** Smallest box holding every pixel that differs, or null when the frames are the same. */
export function changedBox(a: Uint8Array, b: Uint8Array, width: number, height: number) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) {
            if (a[row + x] === b[row + x]) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Centiseconds per frame for `total` frames at `fps`, rounded so the sum stays exact (15 fps: 7, 6, 7, …).
 */
export function gifDelays(total: number, fps: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < total; i++)
        out.push(Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps));
    return out;
}
