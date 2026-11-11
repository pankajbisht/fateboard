/** Pen tool geometry: anchors with optional bezier handles -> SVG path data. */
import { describe, expect, it } from 'vitest';
import { mirrorHandle, penPathData } from './penPath';

describe('penPathData', () => {
    it('corner points make straight segments', () => {
        expect(
            penPathData([
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 50 },
            ]),
        ).toBe('M 0 0 L 100 0 L 100 50');
    });

    it('a point with handles makes cubic curves on both sides', () => {
        expect(
            penPathData([
                { x: 0, y: 0 },
                { x: 100, y: 0, in: { x: 80, y: -20 }, out: { x: 120, y: 20 } },
                { x: 200, y: 0 },
            ]),
        ).toBe('M 0 0 C 0 0 80 -20 100 0 C 120 20 200 0 200 0');
    });

    it('a closed path goes back to the first point and ends with Z', () => {
        expect(
            penPathData(
                [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 50, y: 80 },
                ],
                true,
            ),
        ).toBe('M 0 0 L 100 0 L 50 80 L 0 0 Z');
    });

    it('no path for fewer than two points', () => {
        expect(penPathData([])).toBe('');
        expect(penPathData([{ x: 1, y: 2 }])).toBe('');
    });

    it('mirrorHandle gives the smooth opposite handle', () => {
        expect(mirrorHandle({ x: 10, y: 10 }, { x: 30, y: 0 })).toEqual({ x: -10, y: 20 });
    });
});
