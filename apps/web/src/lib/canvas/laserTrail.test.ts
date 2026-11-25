/** Laser pointer trail: points fade out and are dropped after LASER_LIFE_MS. */
import { describe, expect, it } from 'vitest';
import { LASER_LIFE_MS, laserAlpha, liveLaserStrokes } from './laserTrail';

describe('laser trail', () => {
    it('drops points older than the life time and strokes left empty', () => {
        const strokes = [
            [
                { x: 0, y: 0, t: 0 },
                { x: 1, y: 1, t: 500 },
            ],
            [{ x: 5, y: 5, t: 100 }],
        ];
        expect(liveLaserStrokes(strokes, 1200)).toEqual([[{ x: 1, y: 1, t: 500 }]]);
        expect(liveLaserStrokes(strokes, 500 + LASER_LIFE_MS + 1)).toEqual([]);
    });

    it('fades from fully visible to invisible over its life', () => {
        expect(laserAlpha(0)).toBe(1);
        expect(laserAlpha(LASER_LIFE_MS / 2)).toBeCloseTo(0.5);
        expect(laserAlpha(LASER_LIFE_MS)).toBe(0);
        expect(laserAlpha(LASER_LIFE_MS * 2)).toBe(0);
    });
});
