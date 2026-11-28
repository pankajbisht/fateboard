// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { simplifyPolyline } from '../simplifyPath';

describe('simplifyPolyline (P6)', () => {
    it('a straight 1000-point line becomes its two ends', () => {
        const line = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: i * 0.5 }));
        expect(simplifyPolyline(line, 0.25)).toEqual([line[0], line[999]]);
    });

    it('a zig-zag above epsilon keeps every corner', () => {
        const zig = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: i % 2 ? 5 : 0 }));
        expect(simplifyPolyline(zig, 0.25)).toHaveLength(20);
    });

    it('a closed square keeps its corners', () => {
        const sq = [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
            { x: 0, y: 0 },
        ];
        expect(simplifyPolyline(sq, 0.25)).toEqual([sq[0], sq[2], sq[3], sq[4], sq[5]]);
    });

    it('short input and a zero epsilon are returned as they are', () => {
        const two = [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
        ];
        expect(simplifyPolyline(two, 1)).toEqual(two);
        expect(simplifyPolyline([...two, { x: 2, y: 2 }], 0)).toHaveLength(3);
    });
});
