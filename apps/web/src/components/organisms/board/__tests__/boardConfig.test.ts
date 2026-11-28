// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CANVAS_PRESETS, DEFAULT_CANVAS_PRESET, findPreset } from '../board.config';

describe('default canvas size', () => {
    it('is Full HD 16:9 (1920 × 1080), the common default of design tools', () => {
        expect(DEFAULT_CANVAS_PRESET).toMatchObject({
            id: 'presentation-16-9',
            width: 1920,
            height: 1080,
        });
    });

    it('is one of the presets offered in Settings > Canvas size', () => {
        expect(CANVAS_PRESETS).toContain(DEFAULT_CANVAS_PRESET);
    });
});

describe('Settings > Canvas size presets (2026-11-17)', () => {
    const byId = (id: string) => CANVAS_PRESETS.find((p) => p.id === id);
    const inch = (v: number) => Math.round(v * 96);
    const mm = (v: number) => Math.round((v * 96) / 25.4);

    it('one entry per format: Orientation picks the shape, so no label names one', () => {
        for (const p of CANVAS_PRESETS) expect(p.label).not.toMatch(/portrait|landscape/i);
        // the same size twice in one group would look like a duplicate (A4 Portrait / Landscape did)
        const keys = CANVAS_PRESETS.map(
            (p) => `${p.category}:${Math.max(p.width, p.height)}x${Math.min(p.width, p.height)}`,
        );
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('manga / comic, webtoon, digital art and paper sizes (print at 96 px per inch)', () => {
        expect(byId('manga-b4')).toMatchObject({ width: mm(257), height: mm(364) });
        expect(byId('manga-b5')).toMatchObject({ width: mm(182), height: mm(257) });
        expect(byId('manga-a5')).toMatchObject({ width: mm(148), height: mm(210) });
        expect(byId('us-comic')).toMatchObject({ width: inch(6.625), height: inch(10.25) });
        expect(byId('webtoon-panel')).toMatchObject({ width: 800, height: 1280 });
        expect(byId('webtoon-strip')).toMatchObject({ width: 800, height: 6400 });
        expect(byId('square-2048')).toMatchObject({ width: 2048, height: 2048 });
        expect(byId('uhd-4k')).toMatchObject({ width: 3840, height: 2160 });
        expect(byId('ipad-pro')).toMatchObject({ width: 2732, height: 2048 });
        expect(byId('print-18x24')).toMatchObject({ width: inch(18), height: inch(24) });
        expect(byId('a3')).toMatchObject({ width: mm(297), height: mm(420) });
        expect(byId('letter')).toMatchObject({ width: inch(8.5), height: inch(11) });
        expect(byId('tabloid')).toMatchObject({ width: inch(11), height: inch(17) });
        expect(byId('a4-portrait')).toMatchObject({ label: 'A4', width: 794, height: 1123 });
        for (const p of CANVAS_PRESETS) {
            expect(Math.min(p.width, p.height)).toBeGreaterThanOrEqual(50);
            expect(Math.max(p.width, p.height)).toBeLessThanOrEqual(10000);
        }
    });

    it('manga sizes carry a page setup (bleed 3 mm, safe-area margins); others do not', () => {
        const b5 = byId('manga-b5')!;
        expect(b5.pageSetup?.bleed).toBeCloseTo((3 * 96) / 25.4, 1);
        expect(b5.pageSetup?.margins.top).toBeGreaterThan(b5.pageSetup!.bleed);
        expect(byId('us-comic')?.pageSetup).toBeDefined();
        expect(DEFAULT_CANVAS_PRESET.pageSetup).toBeUndefined();
        expect(byId('webtoon-strip')?.pageSetup).toBeUndefined();
    });

    it('a setting saved with the old "A4 Landscape" still finds A4', () => {
        expect(findPreset('a4-landscape')?.id).toBe('a4-portrait');
        expect(findPreset('manga-b5@swapped')?.id).toBe('manga-b5');
        expect(findPreset('nope')).toBeUndefined();
    });
});
