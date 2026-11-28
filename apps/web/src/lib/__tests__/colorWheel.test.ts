// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    hueFromKey,
    hueFromPoint,
    inscribedSquare,
    onRing,
    pointFromHue,
    svFromKey,
} from '../colorWheel';

describe('colour wheel geometry', () => {
    it('puts red at the top and runs clockwise like conic-gradient', () => {
        expect(hueFromPoint(0, -10)).toBe(0); // top
        expect(hueFromPoint(10, 0)).toBe(90); // right
        expect(hueFromPoint(0, 10)).toBe(180); // bottom
        expect(hueFromPoint(-10, 0)).toBe(270); // left
        expect(hueFromPoint(0, 0)).toBe(0);
    });

    it('round-trips hue -> point -> hue', () => {
        for (const h of [0, 33, 120, 200, 359]) {
            const p = pointFromHue(h, 50);
            expect(hueFromPoint(p.x, p.y)).toBeCloseTo(h, 6);
            expect(Math.hypot(p.x, p.y)).toBeCloseTo(50, 6);
        }
    });

    it('knows the ring and the inscribed square', () => {
        expect(onRing(0, -90, 80, 100)).toBe(true);
        expect(onRing(0, -50, 80, 100)).toBe(false);
        expect(onRing(0, -101, 80, 100)).toBe(false);
        expect(inscribedSquare(10)).toBeCloseTo(14.142, 3);
    });

    it('moves saturation / brightness with arrows and clamps', () => {
        const hsv = { h: 10, s: 50, v: 99 };
        expect(svFromKey(hsv, 'ArrowRight', false)).toEqual({ h: 10, s: 51, v: 99 });
        expect(svFromKey(hsv, 'ArrowUp', true)).toEqual({ h: 10, s: 50, v: 100 });
        expect(svFromKey(hsv, 'a', false)).toBeNull();
    });

    it('wraps the hue on the ring but clamps it on the bar', () => {
        const hsv = { h: 359, s: 50, v: 50 };
        expect(hueFromKey(hsv, 'ArrowRight', false, true)?.h).toBe(0);
        expect(hueFromKey(hsv, 'ArrowRight', true, false)?.h).toBe(360);
        expect(hueFromKey({ ...hsv, h: 0 }, 'ArrowLeft', false, true)?.h).toBe(359);
        expect(hueFromKey(hsv, 'Home', false)?.h).toBe(0);
        expect(hueFromKey(hsv, 'x', false)).toBeNull();
    });
});
