/**
 * GIF export (owner request 2026-11-17, from the "Anime Studio" brief): an in-house GIF89a encoder.
 * Every file is read back with an independent decoder (decodeGif.ts), so the bytes are what is tested.
 */
import { describe, expect, it } from 'vitest';
import { GifEncoder, TRANSPARENT_INDEX, changedBox, gifDelays } from '../gifEncoder';
import { ByteWriter, writeLzw } from '../lzw';
import { ColorHistogram, buildPalette, indexPixels } from '../palette';
import { compose, decodeGif, lzwDecode } from './decodeGif';

type RGBA = [number, number, number, number];
const W = 8;
const H = 6;

/** A W × H image: background colour, plus a filled rectangle. */
function image(bg: RGBA, rect?: { x: number; y: number; w: number; h: number; c: RGBA }) {
    const px = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
            const inside =
                rect && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
            px.set(inside ? rect!.c : bg, (y * W + x) * 4);
        }
    return px;
}

const WHITE: RGBA = [255, 255, 255, 255];
const BLUE: RGBA = [0, 0, 255, 255];
const CLEAR: RGBA = [0, 0, 0, 0];

function paletteOf(...frames: Uint8ClampedArray[]) {
    const h = new ColorHistogram();
    for (const f of frames) h.add(f, W, H);
    return buildPalette(h).colors;
}

/** Palette colour of what the viewer shows at (x, y) after frame `i`. */
const colorAt = (gif: ReturnType<typeof decodeGif>, i: number, x: number, y: number) => {
    const k = compose(gif)[i][y * gif.width + x];
    return k < 0 ? null : [...gif.palette.slice(k * 3, k * 3 + 3)];
};

describe('LZW', () => {
    it('round-trips short, long and repetitive streams (table resets past 4096 codes)', () => {
        const streams = [
            new Uint8Array([7]),
            new Uint8Array(1000).fill(3),
            Uint8Array.from({ length: 70_000 }, (_, i) => (i * 7919 + (i >> 5)) % 251),
        ];
        for (const s of streams) {
            const out = new ByteWriter();
            writeLzw(out, s, 8);
            const bytes = out.result();
            expect(bytes[0]).toBe(8); // minimum code size
            const data: number[] = [];
            let p = 1;
            for (let len = bytes[p++]; len; len = bytes[p++]) {
                expect(len).toBeLessThanOrEqual(255);
                data.push(...bytes.subarray(p, p + len));
                p += len;
            }
            expect(p).toBe(bytes.length); // ends with the block terminator
            expect(lzwDecode(new Uint8Array(data), 8, s.length)).toEqual(s);
        }
    });
});

describe('palette', () => {
    it('keeps flat colours exactly', () => {
        const pal = paletteOf(image(WHITE, { x: 1, y: 1, w: 3, h: 2, c: [16, 185, 129, 255] }));
        const colors = [];
        for (let i = 0; i < pal.length; i += 3) colors.push([...pal.slice(i, i + 3)]);
        expect(colors).toContainEqual([255, 255, 255]);
        expect(colors).toContainEqual([16, 185, 129]);
    });

    it('reduces many colours to at most 255', () => {
        const h = new ColorHistogram();
        const px = new Uint8ClampedArray(64 * 64 * 4);
        for (let i = 0; i < 64 * 64; i++)
            px.set([(i * 37) % 256, (i * 91) % 256, i % 256, 255], i * 4);
        h.add(px, 64, 64);
        const pal = buildPalette(h);
        expect(pal.size).toBeLessThanOrEqual(255);
        expect(pal.size).toBeGreaterThan(200);
        // every pixel maps to a colour close to it
        const idx = indexPixels(px, 64, 64, pal, { dither: false, transparentIndex: 255 });
        expect(Math.max(...idx)).toBeLessThan(pal.size);
    });

    it('transparent pixels get the transparent index; dithering stays inside the palette', () => {
        const pal = buildPalette(Object.assign(new ColorHistogram(), {}));
        expect(pal.size).toBe(1); // an empty histogram still gives a usable palette
        const h = new ColorHistogram();
        const px = image(CLEAR, { x: 0, y: 0, w: 4, h: H, c: [120, 60, 30, 255] });
        h.add(px, W, H);
        const p2 = buildPalette(h);
        const idx = indexPixels(px, W, H, p2, { dither: true, transparentIndex: 255 });
        expect(idx[0]).toBe(0);
        expect(idx[W - 1]).toBe(255);
    });
});

describe('GIF file', () => {
    const encode = (frames: Uint8ClampedArray[], delays: number[], opts = {}) => {
        const enc = new GifEncoder({
            width: W,
            height: H,
            palette: paletteOf(...frames),
            loop: true,
            dither: false,
            transparent: false,
            ...opts,
        });
        frames.forEach((f, i) => enc.addFrame(f, delays[i]));
        return { gif: decodeGif(enc.finish()), written: enc.frames };
    };

    it('is a looping GIF89a of the right size that shows each frame', () => {
        const a = image(WHITE, { x: 0, y: 0, w: 2, h: 2, c: BLUE });
        const b = image(WHITE, { x: 4, y: 3, w: 2, h: 2, c: BLUE });
        const { gif } = encode([a, b], [7, 6]);
        expect(gif).toMatchObject({ width: W, height: H, loop: true });
        expect(gif.frames.map((f) => f.delay)).toEqual([7, 6]);
        expect(colorAt(gif, 0, 0, 0)).toEqual([0, 0, 255]);
        expect(colorAt(gif, 0, 4, 3)).toEqual([255, 255, 255]);
        expect(colorAt(gif, 1, 0, 0)).toEqual([255, 255, 255]); // the square moved away
        expect(colorAt(gif, 1, 4, 3)).toEqual([0, 0, 255]);
    });

    it('stores only the box that changed, unchanged pixels inside it transparent', () => {
        const a = image(WHITE, { x: 1, y: 1, w: 2, h: 2, c: BLUE });
        const b = image(WHITE, { x: 2, y: 1, w: 2, h: 2, c: BLUE });
        const { gif } = encode([a, b], [5, 5]);
        expect(gif.frames[1]).toMatchObject({ x: 1, y: 1, w: 3, h: 2, disposal: 1 });
        expect(gif.frames[1].transparentIndex).toBe(TRANSPARENT_INDEX);
        // the pixel that stayed blue is written as "keep"
        expect(gif.frames[1].indices[1]).toBe(TRANSPARENT_INDEX);
        expect(colorAt(gif, 1, 1, 1)).toEqual([255, 255, 255]);
        expect(colorAt(gif, 1, 3, 2)).toEqual([0, 0, 255]);
    });

    it('a frame like the one before only makes it last longer (the hold at the end)', () => {
        const a = image(WHITE);
        const b = image(WHITE, { x: 0, y: 0, w: 1, h: 1, c: BLUE });
        const { gif, written } = encode([a, b, b, b], [7, 6, 7, 7]);
        expect(written).toBe(2);
        expect(gif.frames.map((f) => f.delay)).toEqual([7, 20]);
    });

    it('transparent background: full frames, cleared between frames, without the loop when asked', () => {
        const a = image(CLEAR, { x: 0, y: 0, w: 2, h: 2, c: BLUE });
        const b = image(CLEAR, { x: 5, y: 3, w: 2, h: 2, c: BLUE });
        const { gif } = encode([a, b], [10, 10], { transparent: true, loop: false });
        expect(gif.loop).toBe(false);
        expect(gif.frames.map((f) => [f.w, f.h, f.disposal])).toEqual([
            [W, H, 2],
            [W, H, 2],
        ]);
        expect(colorAt(gif, 0, 0, 0)).toEqual([0, 0, 255]);
        expect(colorAt(gif, 0, 7, 5)).toBeNull();
        expect(colorAt(gif, 1, 0, 0)).toBeNull(); // the old square does not stay behind
    });

    it('large frames survive LZW table resets', () => {
        const big = 300;
        const px = new Uint8ClampedArray(big * big * 4);
        for (let i = 0; i < big * big; i++)
            px.set([(i * 13) % 256, (i * 7) % 256, (i >> 4) % 256, 255], i * 4);
        const h = new ColorHistogram();
        h.add(px, big, big);
        const pal = buildPalette(h);
        const enc = new GifEncoder({
            width: big,
            height: big,
            palette: pal.colors,
            loop: false,
            dither: false,
            transparent: false,
        });
        enc.addFrame(px, 10);
        const gif = decodeGif(enc.finish());
        expect(gif.frames[0].indices).toEqual(
            indexPixels(px, big, big, pal, { dither: false, transparentIndex: 255 }),
        );
    });
});

describe('timing', () => {
    it('delays add up to the exact duration (GIF counts in 1/100 s)', () => {
        const d = gifDelays(15, 15);
        expect(d.slice(0, 3)).toEqual([7, 6, 7]);
        expect(d.reduce((a, b) => a + b, 0)).toBe(100);
        expect(gifDelays(25, 25).every((v) => v === 4)).toBe(true);
    });

    it('changedBox finds the smallest box, or none', () => {
        const a = new Uint8Array(W * H);
        const b = a.slice();
        expect(changedBox(a, b, W, H)).toBeNull();
        b[2 * W + 3] = 1;
        b[4 * W + 6] = 1;
        expect(changedBox(a, b, W, H)).toEqual({ x: 3, y: 2, w: 4, h: 3 });
    });
});
