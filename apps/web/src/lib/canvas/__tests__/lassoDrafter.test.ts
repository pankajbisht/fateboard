// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { lassoPicks, pointInPolygon, thinLasso } from '../lasso';
import {
    angleOf,
    dimensionGeometry,
    drafterEnd,
    formatLength,
    mmToPx,
    protractorAngle,
    snapAngle,
    uprightAngle,
} from '../drafter';

const square = (x: number, y: number, s: number) => [
    { x, y },
    { x: x + s, y },
    { x: x + s, y: y + s },
    { x, y: y + s },
];

describe('lasso', () => {
    const loop = square(0, 0, 100);

    it('knows inside from outside', () => {
        expect(pointInPolygon({ x: 50, y: 50 }, loop)).toBe(true);
        expect(pointInPolygon({ x: 150, y: 50 }, loop)).toBe(false);
    });

    it('contain needs the whole object inside; touch any overlap', () => {
        const inside = square(10, 10, 20);
        const across = square(90, 10, 20);
        const around = square(-50, -50, 200); // the loop is drawn inside a big object
        expect(lassoPicks(loop, inside, inside, 'contain')).toBe(true);
        expect(lassoPicks(loop, across, across, 'contain')).toBe(false);
        expect(lassoPicks(loop, across, across, 'touch')).toBe(true);
        expect(lassoPicks(loop, around, around, 'touch')).toBe(true);
        expect(lassoPicks(loop, square(200, 200, 5), square(200, 200, 5), 'touch')).toBe(false);
    });

    it('drops pointer noise', () => {
        expect(
            thinLasso([
                { x: 0, y: 0 },
                { x: 0.5, y: 0 },
                { x: 3, y: 0 },
            ]),
        ).toHaveLength(2);
    });
});

describe('drafter', () => {
    it('snaps to the head steps from a rotated base', () => {
        expect(snapAngle(37, 15)).toBe(30);
        expect(snapAngle(37, 15, 10)).toBe(40);
        expect(snapAngle(359, 90)).toBe(0);
    });

    it('a snapped line keeps the pointer distance', () => {
        const r = drafterEnd({ x: 0, y: 0 }, { x: 100, y: 8 }, { step: 15, base: 0 });
        expect(r.angle).toBe(0);
        expect(r.end.x).toBeCloseTo(Math.hypot(100, 8));
        expect(r.end.y).toBeCloseTo(0);
    });

    it('parallel / perpendicular lock projects the pointer on the reference direction', () => {
        const r = drafterEnd(
            { x: 0, y: 0 },
            { x: 30, y: 40 },
            { step: 15, base: 0, lockAngle: 90 },
        );
        expect(r.end).toEqual({ x: expect.closeTo(0), y: 40 });
        expect(r.length).toBeCloseTo(40);
        const back = drafterEnd(
            { x: 0, y: 0 },
            { x: 0, y: -10 },
            { step: 15, base: 0, lockAngle: 90 },
        );
        expect(back.angle).toBe(270);
    });

    it('free mode follows the pointer', () => {
        expect(
            drafterEnd({ x: 0, y: 0 }, { x: 3, y: 4 }, { step: 15, base: 0, free: true }).length,
        ).toBe(5);
    });

    it('reads lengths in the document unit and angles like a protractor', () => {
        expect(formatLength(96, 'in')).toBe('1.00 in');
        expect(formatLength(mmToPx(25), 'mm')).toBe('25.0 mm');
        expect(formatLength(12.4, 'px')).toBe('12 px');
        expect(protractorAngle(angleOf({ x: 0, y: 0 }, { x: 0, y: -1 }))).toBe(90); // up on screen
        expect(uprightAngle(180)).toBe(0);
        expect(uprightAngle(45)).toBe(45);
    });

    it('dimension line: offset parallel line, two arrowheads, label in the middle', () => {
        const g = dimensionGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, 20, 8);
        expect(g.line[0]).toEqual({ x: 0, y: -20 });
        expect(g.line[1]).toEqual({ x: 100, y: -20 });
        expect(g.heads).toHaveLength(2);
        expect(g.heads[1][1]).toEqual(g.line[1]);
        expect(g.label.x).toBeCloseTo(50);
        expect(g.labelAngle).toBe(0);
    });
});
