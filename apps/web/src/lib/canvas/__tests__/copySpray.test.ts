// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/brushes/stamp/rng';
import { applyToPoint } from '../symmetry';
import {
    COPY_SPRAY_LIMITS,
    DEFAULT_COPY_SPRAY_STYLE,
    MAX_SPRAY_IMAGES,
    MAX_SPRAY_OBJECTS,
    createDabEmitter,
    dabMatrix,
    sanitizeCopySprayStyle,
    sprayDabLimit,
    type CopySprayStyle,
} from '../copySpray';

/** No scatter and no jitter: every copy lands exactly on the drag, same size, upright. */
const exact: CopySprayStyle = {
    ...DEFAULT_COPY_SPRAY_STYLE,
    scale: 1,
    spacing: 1,
    spread: 0,
    sizeJitter: 0,
    rotateJitter: 0,
    opacityJitter: 0,
    align: false,
};
const rnd = () => mulberry32(7);

describe('copy spray: settings', () => {
    it('clamps numbers to the limits, keeps the base value for junk', () => {
        const s = sanitizeCopySprayStyle(DEFAULT_COPY_SPRAY_STYLE, {
            scale: 99,
            spacing: -1,
            spread: Number.NaN,
            rotateJitter: 400,
            opacityJitter: 'x',
            align: 'yes',
        });
        expect(s.scale).toBe(COPY_SPRAY_LIMITS.scale.max);
        expect(s.spacing).toBe(COPY_SPRAY_LIMITS.spacing.min);
        expect(s.spread).toBe(DEFAULT_COPY_SPRAY_STYLE.spread);
        expect(s.rotateJitter).toBe(180);
        expect(s.opacityJitter).toBe(DEFAULT_COPY_SPRAY_STYLE.opacityJitter);
        expect(s.align).toBe(DEFAULT_COPY_SPRAY_STYLE.align);
        expect(sanitizeCopySprayStyle(s, { align: true }).align).toBe(true);
    });
});

describe('copy spray: where the copies land', () => {
    it('a press places one copy under the pointer', () => {
        const e = createDabEmitter(exact, 10, rnd(), 100);
        expect(e.start({ x: 5, y: 5 })).toEqual([{ x: 5, y: 5, scale: 1, angle: 0, opacity: 1 }]);
    });

    it('a drag places one copy every `spacing` × copy size, however the moves are split', () => {
        const whole = createDabEmitter(exact, 10, rnd(), 100);
        whole.start({ x: 0, y: 0 });
        const a = whole.move({ x: 100, y: 0 });
        expect(a.map((d) => d.x)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
        expect(a.every((d) => d.y === 0)).toBe(true);

        const split = createDabEmitter(exact, 10, rnd(), 100);
        split.start({ x: 0, y: 0 });
        const b = [7, 33, 34, 100].flatMap((x) => split.move({ x, y: 0 }));
        expect(b.map((d) => Math.round(d.x * 1e6) / 1e6)).toEqual(a.map((d) => d.x));
        expect(split.dabs).toHaveLength(11); // the press + 10
    });

    it('spacing and size scale the step', () => {
        const e = createDabEmitter({ ...exact, scale: 2, spacing: 0.5 }, 10, rnd(), 100);
        e.start({ x: 0, y: 0 });
        expect(e.move({ x: 50, y: 0 }).map((d) => d.x)).toEqual([10, 20, 30, 40, 50]);
    });

    it('the first copy lands on the clicked point, even with Spread; the default does not scatter', () => {
        const e = createDabEmitter({ ...exact, spread: 5 }, 10, rnd(), 100);
        expect(e.start({ x: 40, y: 70 })[0]).toMatchObject({ x: 40, y: 70 });
        expect(DEFAULT_COPY_SPRAY_STYLE.spread).toBe(0);
    });

    it('spread scatters copies within spread × copy size of the drag', () => {
        const e = createDabEmitter({ ...exact, spread: 2 }, 10, rnd(), 500);
        e.start({ x: 0, y: 0 });
        e.move({ x: 300, y: 0 });
        expect(e.dabs.every((d) => Math.abs(d.y) <= 20 + 1e-9)).toBe(true);
        expect(e.dabs.some((d) => Math.abs(d.y) > 1)).toBe(true);
    });

    it('jitter stays in range: size ±, turn ±, opacity down only', () => {
        const style = { ...exact, scale: 2, sizeJitter: 0.5, rotateJitter: 45, opacityJitter: 0.6 };
        const e = createDabEmitter(style, 10, rnd(), 500);
        e.start({ x: 0, y: 0 });
        e.move({ x: 2000, y: 0 });
        for (const d of e.dabs) {
            expect(d.scale).toBeGreaterThanOrEqual(1);
            expect(d.scale).toBeLessThanOrEqual(3);
            expect(Math.abs(d.angle)).toBeLessThanOrEqual(45);
            expect(d.opacity).toBeGreaterThanOrEqual(0.4);
            expect(d.opacity).toBeLessThanOrEqual(1);
        }
        expect(new Set(e.dabs.map((d) => d.scale)).size).toBeGreaterThan(10);
    });

    it('align turns copies to follow the drag', () => {
        const e = createDabEmitter({ ...exact, align: true }, 10, rnd(), 100);
        e.start({ x: 0, y: 0 });
        const down = e.move({ x: 0, y: 50 });
        expect(down.every((d) => Math.abs(d.angle - 90) < 1e-9)).toBe(true);
    });

    it('stops at the cap', () => {
        const e = createDabEmitter(exact, 1, rnd(), 25);
        e.start({ x: 0, y: 0 });
        e.move({ x: 1000, y: 0 });
        expect(e.dabs).toHaveLength(25);
        expect(e.move({ x: 2000, y: 0 })).toEqual([]);
    });

    it('the cap: 400 objects per drag, 30 photos (each copy saves the photo again)', () => {
        expect(sprayDabLimit(1, 0)).toBe(MAX_SPRAY_OBJECTS);
        expect(sprayDabLimit(3, 0)).toBe(133);
        expect(sprayDabLimit(2, 1)).toBe(MAX_SPRAY_IMAGES);
        expect(sprayDabLimit(4, 2)).toBe(15);
        expect(sprayDabLimit(1000, 0)).toBe(1); // a huge selection still places one copy per click
        expect(sprayDabLimit(1, 100)).toBe(1);
    });

    it('the same seed places the same copies', () => {
        const style = { ...DEFAULT_COPY_SPRAY_STYLE, spread: 1.5, sizeJitter: 0.4 };
        const run = () => {
            const e = createDabEmitter(style, 12, mulberry32(42), 100);
            e.start({ x: 3, y: 4 });
            e.move({ x: 200, y: 80 });
            return e.dabs;
        };
        expect(run()).toEqual(run());
    });
});

describe('copy spray: dab matrix', () => {
    it('moves the selection centre onto the dab, scales and turns around it', () => {
        const c = { x: 100, y: 50 };
        const m = dabMatrix({ x: 300, y: 200, scale: 2, angle: 90, opacity: 1 }, c);
        const centre = applyToPoint(m, c);
        expect(centre.x).toBeCloseTo(300, 9);
        expect(centre.y).toBeCloseTo(200, 9);
        // 10 to the right of the centre: × 2, then a quarter turn clockwise (y down) → 20 below the dab
        const right = applyToPoint(m, { x: 110, y: 50 });
        expect(right.x).toBeCloseTo(300, 9);
        expect(right.y).toBeCloseTo(220, 9);
    });
});
