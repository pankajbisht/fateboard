// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mmToPx } from '../drafter';
import {
    arcPath,
    pointsNeeded,
    scaleEnd,
    setSquareAngles,
    setSquareCorners,
    setSquareEnd,
    sweepTo,
} from '../geometry';

describe('geometry instruments', () => {
    it('an angle and an arc take three points, everything else two', () => {
        expect(pointsNeeded('drafter', 'circle')).toBe(2);
        expect(pointsNeeded('scale', 'circle')).toBe(2);
        expect(pointsNeeded('setSquare', 'arc')).toBe(2);
        expect(pointsNeeded('protractor', 'circle')).toBe(3);
        expect(pointsNeeded('compass', 'circle')).toBe(2);
        expect(pointsNeeded('compass', 'arc')).toBe(3);
    });

    it('Scale: the length snaps to the ticks, the angle stays free (Shift = stepped)', () => {
        const mm = mmToPx(1);
        const r = scaleEnd({ x: 0, y: 0 }, { x: 10.4 * mm, y: 0 }, 5 * mm);
        expect(r.length).toBeCloseTo(10 * mm);
        expect(r.end.x).toBeCloseTo(10 * mm);
        const free = scaleEnd({ x: 0, y: 0 }, { x: 30, y: 40 }, 0);
        expect(free.length).toBeCloseTo(50);
        expect(free.end).toMatchObject({ x: expect.closeTo(30), y: expect.closeTo(40) });
        const stepped = scaleEnd({ x: 0, y: 0 }, { x: 100, y: 8 }, 0, 15);
        expect(stepped.angle).toBe(0);
    });

    it('Set square: 45° gives eight directions, 30 / 60 twelve, turned by the base', () => {
        expect(setSquareAngles('45', 0).sort((a, b) => a - b)).toEqual([
            0, 45, 90, 135, 180, 225, 270, 315,
        ]);
        expect(setSquareAngles('30-60', 0)).toHaveLength(12);
        expect(setSquareAngles('45', 10)).toContain(55);
    });

    it('Set square: the line locks to the nearest edge', () => {
        const r = setSquareEnd({ x: 0, y: 0 }, { x: 100, y: 90 }, '45', 0);
        expect(r.angle).toBeCloseTo(45);
        const s = setSquareEnd({ x: 0, y: 0 }, { x: 100, y: 50 }, '30-60', 0);
        expect(s.angle).toBeCloseTo(30);
    });

    it('sweepTo stays continuous past 180° and snaps to the step', () => {
        expect(sweepTo(0, 90, 0, 0)).toBe(90);
        expect(sweepTo(0, 200, 170, 0)).toBe(200); // keeps going clockwise
        expect(sweepTo(0, 200, 0, 0)).toBe(-160); // the short way from a fresh start
        expect(sweepTo(0, 47, 0, 15)).toBe(45);
        expect(sweepTo(0, 10, 355, 0)).toBe(360); // clamped full turn
    });

    it('arcPath: large-arc and sweep flags follow the sweep; a full turn is two arcs', () => {
        expect(arcPath({ x: 0, y: 0 }, 10, 0, 90)).toMatch(/A 10 10 0 0 1 /);
        expect(arcPath({ x: 0, y: 0 }, 10, 0, -270)).toMatch(/A 10 10 0 1 0 /);
        expect(arcPath({ x: 0, y: 0 }, 10, 0, 360).match(/A /g)).toHaveLength(2);
    });

    it("Set square corners: the edge the line runs along starts at the line's start", () => {
        const a = { x: 0, y: 0 };
        // along a leg (0°): right angle at a
        const [, p, q] = setSquareCorners(a, 0, '45', 0, 100);
        expect(p).toMatchObject({ x: expect.closeTo(100), y: expect.closeTo(0) });
        expect(Math.hypot(q.x, q.y)).toBeCloseTo(100);
        expect(p.x * q.x + p.y * q.y).toBeCloseTo(0);
        // along the 30° hypotenuse: the right angle is on the base axis, legs cos / sin 30°
        const [, h, c] = setSquareCorners(a, -30, '30-60', 0, 100);
        expect(Math.hypot(h.x, h.y)).toBeCloseTo(100);
        expect(c).toMatchObject({
            x: expect.closeTo(100 * Math.cos(Math.PI / 6)),
            y: expect.closeTo(0),
        });
        expect(h.x - c.x).toBeCloseTo(0); // second leg at 90° to the base
    });
});
