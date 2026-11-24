import { describe, expect, it } from 'vitest';
import { nibOutline, nibWidthFactor, type NibSample } from '../nibOutline';

const BASE = { width: 20, angle: 0, fixation: 1, caps: 0 };
const horizontal: NibSample[] = [0, 25, 50, 75, 100].map((x) => ({ x, y: 0, f: 1 }));
const vertical: NibSample[] = [0, 25, 50, 75, 100].map((y) => ({ x: 0, y, f: 1 }));
const height = (poly: { y: number }[]) =>
    Math.max(...poly.map((p) => p.y)) - Math.min(...poly.map((p) => p.y));
const widthOf = (poly: { x: number }[]) =>
    Math.max(...poly.map((p) => p.x)) - Math.min(...poly.map((p) => p.x));

describe('nibOutline (Inkscape calligraphy)', () => {
    it('fixation 1: a flat nib at 0° makes horizontal strokes hairlines and vertical ones full width', () => {
        expect(height(nibOutline(horizontal, BASE))).toBeCloseTo(0, 5);
        expect(widthOf(nibOutline(vertical, BASE))).toBeCloseTo(20, 5);
    });

    it('fixation 0: the nib turns across the stroke, so every direction is full width', () => {
        const free = { ...BASE, fixation: 0 };
        expect(height(nibOutline(horizontal, free))).toBeCloseTo(20, 5);
        expect(widthOf(nibOutline(vertical, free))).toBeCloseTo(20, 5);
    });

    it('caps add round ends past the first and last point', () => {
        const free = { ...BASE, fixation: 0 };
        expect(widthOf(nibOutline(horizontal, free))).toBeCloseTo(100, 5);
        expect(widthOf(nibOutline(horizontal, { ...free, caps: 1 }))).toBeGreaterThan(105);
    });

    it('the sample factor scales the width', () => {
        const half = horizontal.map((s) => ({ ...s, f: 0.5 }));
        expect(height(nibOutline(half, { ...BASE, fixation: 0 }))).toBeCloseTo(10, 5);
    });

    it('returns no outline for an empty stroke', () => {
        expect(nibOutline([], BASE)).toEqual([]);
    });
});

describe('nibWidthFactor', () => {
    it('thinning makes fast strokes thinner; negative thinning makes them thicker', () => {
        expect(nibWidthFactor({ speed: 0, thinning: 0.5 })).toBe(1);
        expect(nibWidthFactor({ speed: 2, thinning: 0.5 })).toBeLessThan(1);
        expect(nibWidthFactor({ speed: 2, thinning: -0.5 })).toBeGreaterThan(1);
        expect(nibWidthFactor({ speed: 100, thinning: 1 })).toBeGreaterThan(0); // never vanishes
    });

    it('stylus pressure multiplies the width', () => {
        expect(nibWidthFactor({ speed: 0, thinning: 0, pressure: 0.5 })).toBeCloseTo(0.5);
    });
});
