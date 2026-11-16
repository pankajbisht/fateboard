import { describe, expect, it } from 'vitest';
import { DabWalker, dabBounds, fireColor, mixHex, strokeDabs, type StrokePoint } from '../dabs';
import { DEFAULT_STAMP, resolveStamp } from '../stampParams';
import { mulberry32 } from '../rng';

const line = (n: number, step = 5, p = 1, dt = 16): StrokePoint[] =>
    Array.from({ length: n }, (_, i) => ({ x: i * step, y: 0, p, t: i * dt }));

describe('seeded random', () => {
    it('repeats the same sequence for the same seed', () => {
        const a = mulberry32(42);
        const b = mulberry32(42);
        expect([a(), a(), a()]).toEqual([b(), b(), b()]);
        expect(mulberry32(43)()).not.toBe(mulberry32(42)());
    });
});

describe('stamp settings', () => {
    it('fills missing keys from the defaults and clamps bad values', () => {
        const p = resolveStamp({
            spacing: 99,
            flow: -1,
            tip: 'nope' as never,
            color2: 'red',
            count: 3.6,
        });
        expect(p.spacing).toBe(3);
        expect(p.flow).toBe(0.01);
        expect(p.tip).toBe(DEFAULT_STAMP.tip);
        expect(p.color2).toBe(DEFAULT_STAMP.color2);
        expect(p.count).toBe(4);
        expect(resolveStamp(null)).toEqual(DEFAULT_STAMP);
    });
});

describe('DabWalker', () => {
    const params = resolveStamp({ spacing: 0.5, pressureSize: 0 });

    it('places dabs every spacing × size along the stroke, starting at the first point', () => {
        const dabs = strokeDabs(line(21), params, 10, '#000000', 1); // 100 px long, a dab every 5 px
        expect(dabs[0]).toMatchObject({ x: 0, y: 0 });
        expect(dabs.length).toBe(21);
        expect(dabs[1].x).toBeCloseTo(5);
    });

    it('incremental (live) and one-shot (saved) walks give the same dabs', () => {
        const pts = line(30, 3.3);
        const scattered = resolveStamp({ scatter: 2, sizeJitter: 0.5, angleJitter: 1, count: 3 });
        const once = strokeDabs(pts, scattered, 12, '#ff0000', 7);
        const walker = new DabWalker(scattered, 12, '#ff0000', 7, Infinity); // no end taper here
        const live = pts.flatMap((p) => walker.push(p));
        expect(live).toEqual(once);
    });

    it('stylus pressure scales the size; a mouse (pressure 1) keeps it', () => {
        const pressure = resolveStamp({ pressureSize: 1 });
        const soft = strokeDabs(line(5, 1, 0.25), pressure, 20, '#000000', 1);
        const full = strokeDabs(line(5, 1, 1), pressure, 20, '#000000', 1);
        expect(soft[0].size).toBeCloseTo(5);
        expect(full[0].size).toBeCloseTo(20);
    });

    it('tapers both ends of a finished stroke', () => {
        const tapered = resolveStamp({
            taperStart: 3,
            taperEnd: 3,
            spacing: 0.25,
            pressureSize: 0,
        });
        const dabs = strokeDabs(line(41, 5), tapered, 10, '#000000', 1);
        const mid = dabs[Math.floor(dabs.length / 2)].size;
        expect(dabs[0].size).toBeLessThan(mid * 0.2);
        expect(dabs[dabs.length - 1].size).toBeLessThan(mid * 0.3);
        expect(mid).toBeCloseTo(10);
    });

    it('a spray builds up while the pointer is held still', () => {
        const spray = resolveStamp({ spray: true, sprayRate: 500, particle: 0.1 });
        const still: StrokePoint[] = Array.from({ length: 11 }, (_, i) => ({
            x: 0,
            y: 0,
            p: 1,
            t: i * 100,
        }));
        const dabs = strokeDabs(still, spray, 40, '#000000', 3);
        expect(dabs.length).toBeGreaterThanOrEqual(500); // 1 s at 500 / s (+ the first dab)
        for (const d of dabs) expect(Math.hypot(d.x, d.y)).toBeLessThanOrEqual(20.0001); // inside the nozzle
        expect(dabs[5].size).toBeLessThanOrEqual(4);
    });

    it('fire colours run from the cool colour to white-hot', () => {
        expect(fireColor('#ff6a00', '#550000', 0)).toBe('#550000');
        expect(fireColor('#ff6a00', '#550000', 0.45)).toBe('#ff6a00');
        expect(fireColor('#ff6a00', '#550000', 1)).toBe('#fff4d6');
        expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    });

    it('smoke grows along the stroke and drifts up', () => {
        const smoke = resolveStamp({ grow: 1, drift: 1, pressureSize: 0, spacing: 0.3 });
        const dabs = strokeDabs(line(80, 5), smoke, 10, '#888888', 9);
        expect(dabs[dabs.length - 1].size).toBeGreaterThan(dabs[0].size * 2);
        expect(dabs.some((d) => d.y < -1)).toBe(true);
        expect(dabs.every((d) => d.y <= 0.0001)).toBe(true);
    });

    it('bounds cover every dab and its glow', () => {
        const dabs = strokeDabs(line(3, 10), params, 10, '#000000', 1);
        const b = dabBounds(dabs, 0.5)!;
        expect(b.minX).toBeLessThan(-7);
        expect(b.maxX).toBeGreaterThan(27);
        expect(dabBounds([], 0)).toBeNull();
    });
});
