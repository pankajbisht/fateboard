import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_SETTINGS,
    createSettingSlice,
    getDefaultCanvasPreset,
    sanitizeSettings,
} from '../createSettingSlice';
import { CANVAS_PRESETS, DEFAULT_CANVAS_PRESET } from '@/components/organisms/board/board.config';
import { createHarness } from '@/test/sliceHarness';

const html = () => document.documentElement;

describe('settings defaults', () => {
    it('a new user gets Light, Fate Blue, small icons, px and Full HD 16:9 (owner, 2026-11-11)', () => {
        expect(DEFAULT_SETTINGS).toEqual({
            mode: 'light',
            colorTheme: 'fate',
            iconSize: 'sm',
            unit: 'px',
            freehand: false,
            defaultCanvasPresetId: DEFAULT_CANVAS_PRESET.id,
            canvasOrientation: 'landscape',
            customCanvasSize: { width: 1920, height: 1080 },
            grid: {
                design: { style: 'lines', size: 20 },
                whiteboard: { style: 'dots', size: 20 },
            },
        });
    });
});

describe('sanitizeSettings', () => {
    it('returns the defaults for garbage input', () => {
        expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
        expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
        expect(
            sanitizeSettings({ mode: 'neon', unit: 'furlong', defaultCanvasPresetId: 42 }),
        ).toEqual(DEFAULT_SETTINGS);
    });

    it('loads settings saved by older versions and drops the fields nothing reads', () => {
        const old = {
            mode: 'dark',
            colorTheme: 'violet',
            iconSize: 'lg',
            unit: 'mm',
            freehand: true,
            backgroundStyle: 'dots',
            backgroundColor: '#123456',
            gridSize: 30,
            snapToGrid: true,
            showRulers: false,
            orientation: 'PORTRAIT',
            format: 'FREEHAND',
            lastPageFormat: 'A3',
            customSize: { width: 100, height: 200 },
        };
        expect(sanitizeSettings(old)).toEqual({
            mode: 'dark',
            colorTheme: 'violet',
            iconSize: 'lg',
            unit: 'mm',
            freehand: true,
            defaultCanvasPresetId: DEFAULT_CANVAS_PRESET.id,
            canvasOrientation: 'landscape',
            customCanvasSize: { width: 1920, height: 1080 },
            grid: DEFAULT_SETTINGS.grid,
        });
    });

    it('keeps the grid style and size per mode; bad values fall back to the defaults', () => {
        expect(
            sanitizeSettings({
                grid: { design: { style: 'isometric', size: 32 }, whiteboard: { style: 'x' } },
            }).grid,
        ).toEqual({
            design: { style: 'isometric', size: 32 },
            whiteboard: { style: 'dots', size: 20 },
        });
    });

    it('keeps a default canvas size only when it is one of the canvas presets', () => {
        const instagram = CANVAS_PRESETS.find((p) => p.id === 'instagram-post')!;
        expect(sanitizeSettings({ defaultCanvasPresetId: 'instagram-post' })).toMatchObject({
            defaultCanvasPresetId: 'instagram-post',
        });
        expect(
            getDefaultCanvasPreset(sanitizeSettings({ defaultCanvasPresetId: 'instagram-post' })),
        ).toEqual(instagram);
        expect(
            sanitizeSettings({ defaultCanvasPresetId: 'custom-1x1' }).defaultCanvasPresetId,
        ).toBe(DEFAULT_CANVAS_PRESET.id);
    });

    it('orientation is landscape or portrait; anything else is landscape', () => {
        expect(sanitizeSettings({ canvasOrientation: 'portrait' }).canvasOrientation).toBe(
            'portrait',
        );
        expect(sanitizeSettings({ canvasOrientation: 'sideways' }).canvasOrientation).toBe(
            'landscape',
        );
    });

    it('the default canvas size follows the orientation; a square size stays square', () => {
        const portrait = sanitizeSettings({ canvasOrientation: 'portrait' });
        expect(getDefaultCanvasPreset(portrait)).toMatchObject({
            id: 'presentation-16-9@swapped',
            label: 'Presentation 16:9',
            width: 1080,
            height: 1920,
        });
        const shorts = sanitizeSettings({ defaultCanvasPresetId: 'youtube-shorts' });
        expect(getDefaultCanvasPreset(shorts)).toMatchObject({ width: 1920, height: 1080 });
        const square = sanitizeSettings({
            defaultCanvasPresetId: 'instagram-post',
            canvasOrientation: 'portrait',
        });
        expect(getDefaultCanvasPreset(square)).toMatchObject({
            id: 'instagram-post',
            width: 1080,
            height: 1080,
        });
    });

    it('a custom size is whole px between 1 and 10,000; anything else falls back', () => {
        const ok = sanitizeSettings({
            defaultCanvasPresetId: 'custom',
            customCanvasSize: { width: 800, height: 600 },
        });
        expect(ok).toMatchObject({
            defaultCanvasPresetId: 'custom',
            customCanvasSize: { width: 800, height: 600 },
        });
        for (const bad of [
            { width: 0, height: 600 },
            { width: 10001, height: 5 },
            { width: 1.5, height: 2 },
            'big',
        ])
            expect(sanitizeSettings({ customCanvasSize: bad }).customCanvasSize).toEqual(
                DEFAULT_SETTINGS.customCanvasSize,
            );
    });

    it('the custom size is used as typed when its orientation is the chosen one, else turned', () => {
        const custom = {
            defaultCanvasPresetId: 'custom',
            customCanvasSize: { width: 800, height: 600 },
        };
        expect(getDefaultCanvasPreset(sanitizeSettings(custom))).toMatchObject({
            id: 'custom-800x600',
            label: 'Custom size',
            category: 'Custom',
            width: 800,
            height: 600,
        });
        expect(
            getDefaultCanvasPreset(sanitizeSettings({ ...custom, canvasOrientation: 'portrait' })),
        ).toMatchObject({ width: 600, height: 800 });
    });

    it('getDefaultCanvasPreset returns a copy, so a page can never change the setting', () => {
        const preset = getDefaultCanvasPreset(DEFAULT_SETTINGS);
        expect(preset).toEqual(DEFAULT_CANVAS_PRESET);
        expect(preset).not.toBe(DEFAULT_CANVAS_PRESET);
    });
});

describe('createSettingSlice', () => {
    const setup = () => createHarness([createSettingSlice as never]);

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts with the defaults', () => {
        expect(setup().get().settings).toEqual(DEFAULT_SETTINGS);
    });

    it('does not write when nothing changed', () => {
        const h = setup();
        const before = h.calls.length;
        h.get().setMode(DEFAULT_SETTINGS.mode);
        expect(h.calls.length).toBe(before);
    });

    it('setGridPrefs saves the style and size of one mode only', () => {
        const h = setup();
        h.get().setGridPrefs('design', { style: 'crosses' });
        h.get().setGridPrefs('design', { size: 999 });
        expect(h.get().settings.grid.design).toEqual({ style: 'crosses', size: 200 });
        expect(h.get().settings.grid.whiteboard).toEqual(DEFAULT_SETTINGS.grid.whiteboard);
    });

    it('setDefaultCanvasPreset accepts canvas presets only', () => {
        const h = setup();
        h.get().setDefaultCanvasPreset('youtube-shorts');
        expect(h.get().settings.defaultCanvasPresetId).toBe('youtube-shorts');
        h.get().setDefaultCanvasPreset('not-a-preset');
        expect(h.get().settings.defaultCanvasPresetId).toBe('youtube-shorts');
    });

    it('resetSettings restores every setting and the page shows them', () => {
        const h = setup();
        h.get().setMode('dark');
        h.get().setColorTheme('violet');
        h.get().setIconSize('lg');
        h.get().setUnit('mm');
        h.get().setFreehand(true);
        h.get().setDefaultCanvasPreset('youtube-shorts');
        h.get().setCanvasOrientation('portrait');
        h.get().setGridPrefs('whiteboard', { style: 'isometric', size: 40 });

        h.get().resetSettings();

        expect(h.get().settings).toEqual(DEFAULT_SETTINGS);
        expect(html().classList.contains('dark')).toBe(false);
        expect(html().dataset.theme).toBe('fate');
        expect(html().dataset.iconSize).toBe('sm');
    });

    it('after Reset the app is light even when the device is in dark mode', () => {
        vi.spyOn(window, 'matchMedia').mockImplementation(
            (query: string) =>
                ({
                    matches: query.includes('dark'),
                    media: query,
                    addEventListener: () => undefined,
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList,
        );
        const h = setup();
        h.get().setMode('system');
        expect(html().classList.contains('dark')).toBe(true);

        h.get().resetSettings();

        expect(html().classList.contains('dark')).toBe(false);
    });

    it('a canvas size or orientation change is waiting for the editor until it is taken once', () => {
        const h = setup();
        h.get().takePendingCanvasSize(); // start clean
        h.get().setMode('dark');
        expect(h.get().takePendingCanvasSize()).toBe(false);

        h.get().setDefaultCanvasPreset('youtube-thumbnail');
        expect(h.get().takePendingCanvasSize()).toBe(true);
        expect(h.get().takePendingCanvasSize()).toBe(false);

        h.get().setCanvasOrientation('portrait');
        expect(h.get().takePendingCanvasSize()).toBe(true);

        // a square size looks the same either way: nothing to resize
        h.get().setDefaultCanvasPreset('instagram-post');
        h.get().takePendingCanvasSize();
        h.get().setCanvasOrientation('landscape');
        expect(h.get().takePendingCanvasSize()).toBe(false);
    });

    it('loading saved settings is not a change', () => {
        const h = setup();
        h.get().takePendingCanvasSize();
        h.get().hydrate({ defaultCanvasPresetId: 'youtube-shorts' });
        expect(h.get().takePendingCanvasSize()).toBe(false);
    });

    it('setCustomCanvasSize uses the size as typed: it selects Custom and sets the orientation', () => {
        const h = setup();
        h.get().takePendingCanvasSize();
        expect(h.get().setCustomCanvasSize(600, 800)).toBe(true);
        expect(h.get().settings).toMatchObject({
            defaultCanvasPresetId: 'custom',
            customCanvasSize: { width: 600, height: 800 },
            canvasOrientation: 'portrait',
        });
        expect(getDefaultCanvasPreset(h.get().settings)).toMatchObject({ width: 600, height: 800 });
        expect(h.get().takePendingCanvasSize()).toBe(true);

        // a square keeps the orientation that was chosen
        h.get().setCustomCanvasSize(500, 500);
        expect(h.get().settings.canvasOrientation).toBe('portrait');
    });

    it('setCustomCanvasSize refuses sizes outside the limits and changes nothing', () => {
        const h = setup();
        const before = h.get().settings;
        expect(h.get().setCustomCanvasSize(0, 600)).toBe(false);
        expect(h.get().setCustomCanvasSize(20000, 600)).toBe(false);
        expect(h.get().setCustomCanvasSize(10.5, 600)).toBe(false);
        expect(h.get().settings).toBe(before);
    });
});
