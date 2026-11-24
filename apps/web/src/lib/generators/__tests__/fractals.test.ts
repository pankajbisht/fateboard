import { describe, expect, it } from 'vitest';
import { FRACTAL_LIMITS, fractalPath, type FractalKind } from '../fractals';

const KINDS: FractalKind[] = ['koch', 'sierpinski', 'tree', 'dragon', 'hilbert'];
const segments = (d: string) => (d.match(/L/g) ?? []).length;

describe('fractalPath', () => {
    it.each(KINDS)('%s fits the requested box and starts at the origin', (kind) => {
        const { d, width, height } = fractalPath({ kind, depth: 3, size: 200 });
        expect(d.startsWith('M')).toBe(true);
        expect(Math.max(width, height)).toBeCloseTo(200, 0);
        const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
        expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...nums)).toBeLessThanOrEqual(200.01);
    });

    it('koch snowflake has 3 * 4^depth segments', () => {
        expect(segments(fractalPath({ kind: 'koch', depth: 2, size: 100 }).d)).toBe(3 * 16);
    });

    it('sierpinski draws 3^depth closed triangles', () => {
        const { d } = fractalPath({ kind: 'sierpinski', depth: 3, size: 100 });
        expect((d.match(/Z/g) ?? []).length).toBe(27);
    });

    it('tree has 2^depth - 1 branches', () => {
        const { d } = fractalPath({ kind: 'tree', depth: 5, size: 100 });
        expect((d.match(/M/g) ?? []).length).toBe(31);
    });

    it('dragon curve has 2^depth segments, hilbert 4^depth - 1', () => {
        expect(segments(fractalPath({ kind: 'dragon', depth: 6, size: 100 }).d)).toBe(64);
        expect(segments(fractalPath({ kind: 'hilbert', depth: 3, size: 100 }).d)).toBe(63);
    });

    it('clamps depth to the per-kind limit so huge inputs stay bounded', () => {
        const big = fractalPath({ kind: 'koch', depth: 99, size: 100 });
        const max = fractalPath({ kind: 'koch', depth: FRACTAL_LIMITS.koch, size: 100 });
        expect(big.d).toBe(max.d);
        expect(fractalPath({ kind: 'tree', depth: -4, size: 100 }).d).toBe(
            fractalPath({ kind: 'tree', depth: 1, size: 100 }).d,
        );
    });
});
