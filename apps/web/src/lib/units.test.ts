/** BUG-082: one unit converter for rulers and size fields (Settings > Units); documents stay in px. */
import { describe, expect, it } from 'vitest';
import { PX_PER_UNIT, formatSize, fromUnit, toUnit, unitPrecision } from './units';

describe('units', () => {
    it('uses the CSS reference: 96 px = 1 in = 25.4 mm', () => {
        expect(PX_PER_UNIT.in).toBe(96);
        expect(toUnit(96, 'in')).toBe(1);
        expect(toUnit(96, 'mm')).toBeCloseTo(25.4);
        expect(toUnit(96, 'cm')).toBeCloseTo(2.54);
        expect(toUnit(123, 'px')).toBe(123);
    });

    it('round-trips through a unit back to px', () => {
        for (const unit of ['px', 'mm', 'cm', 'in'] as const) {
            expect(fromUnit(toUnit(1920, unit), unit)).toBeCloseTo(1920);
        }
    });

    it('formats a page size in the chosen unit', () => {
        expect(formatSize(1920, 1080, 'px')).toBe('1920 × 1080 px');
        expect(formatSize(794, 1123, 'mm')).toBe('210.1 × 297.1 mm');
        expect(formatSize(96, 192, 'in')).toBe('1 × 2 in');
    });

    it('shows sensible decimals per unit', () => {
        expect(unitPrecision('px')).toBe(0);
        expect(unitPrecision('mm')).toBe(1);
        expect(unitPrecision('cm')).toBe(2);
        expect(unitPrecision('in')).toBe(2);
    });
});
