import { describe, expect, it } from 'vitest';
import {
    CUSTOM_SIZE_LIMITS,
    DEFAULT_SETTINGS,
    GRID_SIZE_LIMITS,
    clampDimension,
    clampGridSize,
    createSettingSlice,
    getCanvasSize,
    isHexColor,
    sanitizeSettings,
} from '../createSettingSlice';
import { createHarness } from '@/test/sliceHarness';

describe('settings helpers', () => {
    it('sanitizeSettings returns defaults for garbage input', () => {
        expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
        expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
        expect(sanitizeSettings({ mode: 'neon', unit: 'furlong', gridSize: 'big' })).toEqual(
            DEFAULT_SETTINGS,
        );
    });

    it('derives format from freehand and remembers the last page format', () => {
        const paged = sanitizeSettings({ freehand: false, lastPageFormat: 'A3' });
        expect(paged.format).toBe('A3');
        const free = sanitizeSettings({ freehand: true, lastPageFormat: 'A3' });
        expect(free.format).toBe('FREEHAND');
        expect(free.lastPageFormat).toBe('A3');
    });

    it('migrates the legacy format and backgroundStyle1 keys', () => {
        const s = sanitizeSettings({ format: 'LETTER', backgroundStyle1: 'dots' });
        expect(s.lastPageFormat).toBe('LETTER');
        expect(s.backgroundStyle).toBe('dots');
    });

    it('lower-cases valid hex colours and rejects others', () => {
        expect(sanitizeSettings({ backgroundColor: '#ABCDEF' }).backgroundColor).toBe('#abcdef');
        expect(sanitizeSettings({ backgroundColor: 'red' }).backgroundColor).toBe(
            DEFAULT_SETTINGS.backgroundColor,
        );
        expect(isHexColor('#123abc')).toBe(true);
        expect(isHexColor('#123')).toBe(false);
    });

    it('clamps dimensions and grid size to their limits', () => {
        expect(clampDimension(1)).toBe(CUSTOM_SIZE_LIMITS.min);
        expect(clampDimension(99999)).toBe(CUSTOM_SIZE_LIMITS.max);
        expect(clampDimension('abc', 123)).toBe(123);
        expect(clampGridSize(0)).toBe(GRID_SIZE_LIMITS.min);
        expect(clampGridSize(10.6)).toBe(11);
    });

    it('getCanvasSize applies orientation and returns null in freehand', () => {
        const base = sanitizeSettings({ freehand: false, lastPageFormat: 'A4' });
        expect(getCanvasSize({ ...base, orientation: 'PORTRAIT' })).toEqual({
            width: 210,
            height: 297,
        });
        expect(getCanvasSize({ ...base, orientation: 'LANDSCAPE' })).toEqual({
            width: 297,
            height: 210,
        });
        expect(getCanvasSize({ ...base, freehand: true })).toBeNull();
        const custom = sanitizeSettings({
            freehand: false,
            lastPageFormat: 'CUSTOM',
            customSize: { width: 100, height: 400 },
        });
        expect(getCanvasSize({ ...custom, orientation: 'LANDSCAPE' })).toEqual({
            width: 400,
            height: 100,
        });
    });
});

describe('createSettingSlice', () => {
    const setup = () => createHarness([createSettingSlice as never]);

    it('starts with the defaults', () => {
        expect(setup().get().settings).toEqual(DEFAULT_SETTINGS);
    });

    it('setters validate before storing', () => {
        const h = setup();
        h.get().setBackgroundColor('not-a-colour');
        expect(h.get().settings.backgroundColor).toBe(DEFAULT_SETTINGS.backgroundColor);
        h.get().setBackgroundColor('#00FF00');
        expect(h.get().settings.backgroundColor).toBe('#00ff00');
        h.get().setGridSize(1000);
        expect(h.get().settings.gridSize).toBe(GRID_SIZE_LIMITS.max);
    });

    it('page format and orientation are ignored in freehand mode', () => {
        const h = setup();
        h.get().setFreehand(true); // default is design (false) since DECISIONS Q3
        expect(h.get().settings.freehand).toBe(true);
        h.get().setFormat('A3');
        expect(h.get().settings.lastPageFormat).toBe(DEFAULT_SETTINGS.lastPageFormat);
        h.get().toggleFreehand();
        h.get().setFormat('A3');
        expect(h.get().settings.format).toBe('A3');
    });

    it('does not write when nothing changed', () => {
        const h = setup();
        const before = h.calls.length;
        h.get().setMode(DEFAULT_SETTINGS.mode);
        expect(h.calls.length).toBe(before);
    });

    it('resetSettings restores the defaults', () => {
        const h = setup();
        h.get().setUnit('mm');
        h.get().resetSettings();
        expect(h.get().settings).toEqual(DEFAULT_SETTINGS);
    });
});
