import { describe, expect, it } from 'vitest';
import { hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv } from '../colorMath';

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
