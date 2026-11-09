import { describe, expect, it } from 'vitest';
import { rulerTicks, PX_PER_UNIT } from '../Ruler';

const labels = (t: ReturnType<typeof rulerTicks>) => t.filter((k) => k.label).map((k) => k.label);

describe('rulerTicks', () => {
    it('px: labels in document px, placed at origin + value × scale', () => {
        const t = rulerTicks({ length: 1000, origin: 100, scale: 1, unit: 'px' });
        expect(labels(t)).toContain('0');
        expect(labels(t)).toContain('100');
        const zero = t.find((k) => k.label === '0')!;
        const hundred = t.find((k) => k.label === '100')!;
        expect(zero.u).toBeCloseTo(100);
        expect(hundred.u).toBeCloseTo(200);
    });

    it('labels stay at least ~70 screen px apart at any zoom', () => {
        for (const scale of [0.1, 0.5, 1, 3]) {
            const majors = rulerTicks({ length: 1200, origin: 0, scale, unit: 'px' }).filter(
                (k) => k.label,
            );
            const gaps = majors.slice(1).map((k, i) => k.u - majors[i].u);
            expect(Math.min(...gaps)).toBeGreaterThanOrEqual(70);
        }
    });

    it('mm / cm / in: labels in the chosen unit (96 px per inch)', () => {
        const mm = rulerTicks({ length: 1000, origin: 0, scale: 1, unit: 'mm' });
        const ten = mm.find((k) => k.label === '10' || k.label === '20')!;
        expect(ten.u).toBeCloseTo(Number(ten.label) * PX_PER_UNIT.mm);

        const inch = rulerTicks({ length: 1000, origin: 0, scale: 1, unit: 'in' });
        const one = inch.find((k) => k.label === '1')!;
        expect(one.u).toBeCloseTo(96);
    });

    it('only returns ticks inside the visible length', () => {
        const t = rulerTicks({ length: 300, origin: -500, scale: 1, unit: 'px' });
        expect(t.every((k) => k.u >= -1 && k.u <= 301)).toBe(true);
    });
});
