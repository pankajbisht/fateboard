import { describe, expect, it } from 'vitest';
import { HARMONIES, harmonyColors, harmonyGradient, hasHue } from '../colorHarmony';
import { hexToRgb, rgbToHsl, rgbToHsv } from '../colorMath';

const hue = (hex: string) => Math.round(rgbToHsl(hexToRgb(hex)!).h) % 360;

describe('colorHarmony', () => {
    it('lists the eight schemes in order, each with a hint', () => {
        expect(HARMONIES.map((h) => h.id)).toEqual([
            'analogous',
            'complementary',
            'split-complementary',
            'triadic',
            'square',
            'compound',
            'shades',
            'monochromatic',
        ]);
        for (const h of HARMONIES) expect(h.hint).toBeTruthy();
    });

    it('rotates the hue on the color wheel and keeps the base color itself', () => {
        const base = '#ff0000';
        expect(harmonyColors(base, 'complementary')).toEqual(['#ff0000', '#00ffff']);
        expect(harmonyColors(base, 'triadic')).toEqual(['#ff0000', '#00ff00', '#0000ff']);
        expect(harmonyColors(base, 'analogous').map(hue)).toEqual([330, 0, 30]);
        expect(harmonyColors(base, 'split-complementary').map(hue)).toEqual([0, 150, 210]);
        expect(harmonyColors(base, 'square').map(hue)).toEqual([0, 90, 180, 270]);
        expect(harmonyColors(base, 'compound').map(hue)).toEqual([0, 30, 180, 210]);
    });

    it('monochromatic: five distinct shades of one hue, including the base', () => {
        for (const base of ['#2b7fff', '#000000', '#ffffff', '#fef3c6']) {
            const mono = harmonyColors(base, 'monochromatic');
            expect(mono).toHaveLength(5);
            expect(new Set(mono).size).toBe(5);
            expect(mono).toContain(base);
        }
        // dark to light
        const ls = harmonyColors('#2b7fff', 'monochromatic').map((h) => rgbToHsl(hexToRgb(h)!).l);
        expect([...ls].sort((a, b) => a - b)).toEqual(ls);
        for (const h of harmonyColors('#2b7fff', 'monochromatic')) {
            expect(Math.abs(hue(h) - 216)).toBeLessThanOrEqual(2); // one hue (RGB rounding aside)
        }
    });

    it('shades: five brightness steps of one hue and saturation, dark -> light, base included', () => {
        for (const base of ['#2b7fff', '#000000', '#ffffff', '#336699']) {
            const shades = harmonyColors(base, 'shades');
            expect(shades).toHaveLength(5);
            expect(new Set(shades).size).toBe(5);
            expect(shades).toContain(base);
        }
        const vs = harmonyColors('#ff0000', 'shades').map((h) => rgbToHsv(hexToRgb(h)!).v);
        expect([...vs].sort((a, b) => a - b)).toEqual(vs);
        expect(vs[4]).toBe(100); // the pure color itself, nothing lighter (no white added)
        for (const h of harmonyColors('#ff0000', 'shades')) expect(hue(h)).toBe(0);
    });

    it('invalid input gives no colors', () => {
        expect(harmonyColors('nope', 'triadic')).toEqual([]);
    });
});

describe('hasHue', () => {
    it('is false for grays, black, white and invalid input', () => {
        expect(hasHue('#ff0000')).toBe(true);
        expect(hasHue('#7f7f80')).toBe(true);
        for (const c of ['#808080', '#000000', '#ffffff', 'nope']) expect(hasHue(c)).toBe(false);
    });
});

describe('harmonyGradient', () => {
    it('spaces the colors evenly and keeps the current gradient settings', () => {
        const g = harmonyGradient(['#ff0000', '#00ff00', '#0000ff']);
        expect(g.type).toBe('linear');
        expect(g.stops.map((s) => s.offset)).toEqual([0, 0.5, 1]);
        const radial = harmonyGradient(['#ff0000', '#00ffff'], {
            ...g,
            type: 'radial',
            center: { x: 0.2, y: 0.8 },
        });
        expect(radial.type).toBe('radial');
        expect(radial.center).toEqual({ x: 0.2, y: 0.8 });
        expect(radial.stops).toEqual([
            { offset: 0, color: '#ff0000' },
            { offset: 1, color: '#00ffff' },
        ]);
    });
});
