// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { boxBlurRGBA, boxesForGauss } from '../boxBlur';

const px = (data: Uint8ClampedArray, w: number, x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

describe('boxesForGauss', () => {
    it('returns three odd box widths whose variance matches the sigma', () => {
        const boxes = boxesForGauss(4);
        expect(boxes).toHaveLength(3);
        boxes.forEach((b) => expect(b % 2).toBe(1));
        // variance of a box of width w is (w² - 1) / 12; three passes add up
        const variance = boxes.reduce((sum, w) => sum + (w * w - 1) / 12, 0);
        expect(Math.sqrt(variance)).toBeCloseTo(4, 0);
    });

    it('is a no-op filter for sigma 0', () => {
        expect(boxesForGauss(0)).toEqual([1, 1, 1]);
    });
});

describe('boxBlurRGBA', () => {
    it('spreads one opaque pixel to its neighbours and keeps its colour (no dark fringe)', () => {
        const w = 21;
        const h = 21;
        const data = new Uint8ClampedArray(w * h * 4);
        const c = (10 * w + 10) * 4;
        data.set([255, 0, 0, 255], c);
        boxBlurRGBA(data, w, h, 2);
        const center = px(data, w, 10, 10);
        const near = px(data, w, 12, 10);
        expect(center[3]).toBeLessThan(255);
        expect(near[3]).toBeGreaterThan(0);
        // premultiplied blur: a red pixel fades out as red, not as dark red
        expect(near[0]).toBeGreaterThan(250);
        expect(near[1]).toBe(0);
        expect(px(data, w, 0, 0)[3]).toBe(0); // far corner untouched
    });

    it('ignores bad input', () => {
        const data = new Uint8ClampedArray([1, 2, 3, 4]);
        boxBlurRGBA(data, 1, 1, 0);
        boxBlurRGBA(data, 0, 0, 3);
        expect(Array.from(data)).toEqual([1, 2, 3, 4]);
    });
});
