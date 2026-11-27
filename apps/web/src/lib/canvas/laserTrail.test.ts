/** Laser pointer trail: points fade out and are dropped after LASER_LIFE_MS. */
import { describe, expect, it } from 'vitest';
import {
    LASER_LIFE_MS,
    laserAlpha,
    laserOutline,
    liveLaserStrokes,
    smoothLaserLine,
} from './laserTrail';

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

describe('laser trail shape', () => {
    const line = [
        { x: 0, y: 0, t: 0 },
        { x: 10, y: 0, t: 500 },
        { x: 20, y: 10, t: 1000 },
    ];

    it('rounds corners: the centre line gets more points than the samples', () => {
        const c = smoothLaserLine(line);
        expect(c.length).toBeGreaterThan(line.length);
        expect(c[0]).toEqual(line[0]);
        expect(c[c.length - 1]).toEqual(line[2]);
    });

    it('tapers from full width at the newest point to nothing at the end of its life', () => {
        const { left, right } = laserOutline(line, 1000, 8);
        const width = (i: number) => Math.hypot(left[i].x - right[i].x, left[i].y - right[i].y);
        expect(width(left.length - 1)).toBeCloseTo(8);
        expect(width(0)).toBeCloseTo(0);
        for (let i = 1; i < left.length; i++)
            expect(width(i)).toBeGreaterThanOrEqual(width(i - 1) - 1e-9);
    });

    it('survives repeated points without NaN', () => {
        const dup = [
            { x: 5, y: 5, t: 900 },
            { x: 5, y: 5, t: 950 },
            { x: 5, y: 5, t: 1000 },
        ];
        const { left, right } = laserOutline(dup, 1000, 8);
        for (const p of [...left, ...right]) {
            expect(Number.isFinite(p.x)).toBe(true);
            expect(Number.isFinite(p.y)).toBe(true);
        }
    });
});
