import { describe, expect, it } from 'vitest';
import {
    cmykToRgb,
    formatColor,
    hexToRgb,
    hslToHsv,
    hslToRgb,
    hsvToHsl,
    hsvToRgb,
    normalizeHex,
    rgbToCmyk,
    rgbToHex,
    rgbToHsl,
    rgbToHsv,
} from '../colorMath';

describe('colorMath', () => {
    it('normalizeHex accepts 3 / 6 digits with or without #, rejects the rest', () => {
        expect(normalizeHex('#FB2C36')).toBe('#fb2c36');
        expect(normalizeHex('fb2c36')).toBe('#fb2c36');
        expect(normalizeHex(' #abc ')).toBe('#aabbcc');
        expect(normalizeHex('abcd')).toBeNull();
        expect(normalizeHex('#ggg')).toBeNull();
        expect(normalizeHex('')).toBeNull();
    });

    it('hex <-> rgb', () => {
        expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
        expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe('#ff8000');
        expect(rgbToHex({ r: 300, g: -4, b: 12.6 })).toBe('#ff000d'); // clamped + rounded
    });

    it('rgb <-> hsv round trip', () => {
        expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 });
        expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
        for (const hex of ['#fb2c36', '#2b7fff', '#00c950', '#7f7f7f', '#ffffff', '#123456']) {
            const back = rgbToHex(hsvToRgb(rgbToHsv(hexToRgb(hex)!)));
            expect(back).toBe(hex);
        }
        expect(hsvToRgb({ h: 120, s: 100, v: 100 })).toEqual({ r: 0, g: 255, b: 0 });
    });
});

describe('colorMath: HSL, CMYK and CSS strings', () => {
    it('rgb <-> hsl', () => {
        expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
        expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 });
        expect(hslToRgb({ h: 120, s: 100, l: 25 })).toEqual({ r: 0, g: 128, b: 0 });
        for (const hex of ['#fb2c36', '#2b7fff', '#00c950', '#7f7f7f', '#ffffff', '#123456']) {
            expect(rgbToHex(hslToRgb(rgbToHsl(hexToRgb(hex)!)))).toBe(hex);
        }
    });

    it('hsv <-> hsl keep the hue (also for grays)', () => {
        expect(hsvToHsl({ h: 210, s: 0, v: 50 })).toEqual({ h: 210, s: 0, l: 50 });
        expect(hslToHsv({ h: 210, s: 0, l: 50 })).toEqual({ h: 210, s: 0, v: 50 });
        const hsl = hsvToHsl({ h: 30, s: 80, v: 60 });
        const back = hslToHsv(hsl);
        expect(back.h).toBe(30);
        expect(back.s).toBeCloseTo(80, 6);
        expect(back.v).toBeCloseTo(60, 6);
    });

    it('rgb <-> cmyk', () => {
        expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
        expect(rgbToCmyk({ r: 255, g: 255, b: 255 })).toEqual({ c: 0, m: 0, y: 0, k: 0 });
        expect(rgbToCmyk({ r: 255, g: 0, b: 0 })).toEqual({ c: 0, m: 100, y: 100, k: 0 });
        expect(cmykToRgb({ c: 0, m: 100, y: 100, k: 0 })).toEqual({ r: 255, g: 0, b: 0 });
        expect(cmykToRgb({ c: 0, m: 0, y: 0, k: 50 })).toEqual({ r: 128, g: 128, b: 128 });
        for (const hex of ['#fb2c36', '#2b7fff', '#000000', '#ffffff', '#123456']) {
            expect(rgbToHex(cmykToRgb(rgbToCmyk(hexToRgb(hex)!)))).toBe(hex);
        }
    });

    it('formatColor writes each format the way designers paste it', () => {
        expect(formatColor('#2b7fff', 'hex')).toBe('#2B7FFF');
        expect(formatColor('#2b7fff', 'rgb')).toBe('rgb(43, 127, 255)');
        expect(formatColor('#2b7fff', 'hsl')).toBe('hsl(216, 100%, 58%)');
        expect(formatColor('#2b7fff', 'hsb')).toBe('hsb(216, 83%, 100%)');
        expect(formatColor('#2b7fff', 'cmyk')).toBe('cmyk(83%, 50%, 0%, 0%)');
        expect(formatColor('nope', 'rgb')).toBe('');
    });
});

describe('formatColor with the exact HSV', () => {
    it('writes HSL / HSB from it (typed values, gray hue) and it rounds to the same hex', () => {
        const hsv = { h: 200, s: 10, v: 10.196 };
        const hex = rgbToHex(hsvToRgb(hsv));
        expect(formatColor(hex, 'hsb', hsv)).toBe('hsb(200, 10%, 10%)');
        expect(formatColor('#808080', 'hsl', { h: 200, s: 0, v: 50.2 })).toBe('hsl(200, 0%, 50%)');
        expect(formatColor(hex, 'rgb', hsv)).toBe(formatColor(hex, 'rgb'));
    });
});
