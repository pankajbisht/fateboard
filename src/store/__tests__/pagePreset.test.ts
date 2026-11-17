/**
 * Settings > Canvas size applied to boards (2026-11-17): the size and, for manga / comic sizes, their page setup
 * (bleed + safe-area margins). New boards get it silently; a size changed in Settings with the editor open is
 * one more edit of the open page.
 */
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/store/slices/createSettingSlice';
import { CANVAS_PRESETS } from '@/components/organisms/board/board.config';
import { applySizeSetting, presetPageSetup, startBoardPreset } from '../pagePreset';

const b5 = CANVAS_PRESETS.find((p) => p.id === 'manga-b5')!;

describe('presetPageSetup', () => {
    it('manga sizes (also rotated) carry bleed + margins; other and custom sizes none', () => {
        expect(presetPageSetup(b5)).toEqual(b5.pageSetup);
        expect(presetPageSetup({ ...b5, id: 'manga-b5@swapped' })).toEqual(b5.pageSetup);
        expect(presetPageSetup(CANVAS_PRESETS[0])).toBeNull();
        expect(presetPageSetup({ ...b5, id: 'custom-600x800' })).toBeNull();
    });
});

describe('startBoardPreset (a new board)', () => {
    const run = (presetId: string) => {
        let state: Record<string, unknown> = {
            settings: {
                ...DEFAULT_SETTINGS,
                defaultCanvasPresetId: presetId,
                canvasOrientation: 'portrait',
            },
            canvas: { pageSetup: undefined },
            saveState: vi.fn(),
        };
        const get = () => state as never;
        const set = (p: Record<string, unknown>) => (state = { ...state, ...p });
        startBoardPreset(get, set as never);
        return state as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- test peek
    };

    it('takes the Settings size; a manga size also sets the page setup, without an undo step', () => {
        const s = run('manga-b5');
        expect(s.selectedPreset).toMatchObject({ width: 688, height: 971 });
        expect(s.pageWidth).toBe(688);
        expect(s.canvas.pageSetup.bleed).toBeCloseTo(b5.pageSetup!.bleed, 6);
        expect(s.canvas.pageSetup.margins).toEqual(b5.pageSetup!.margins);
        expect(s.canvas.pageSetup.guides).toBe(true);
        expect(s.saveState).not.toHaveBeenCalled();
    });

    it('other sizes leave the page setup alone', () => {
        expect(run('presentation-16-9').canvas.pageSetup).toBeUndefined();
    });
});

describe('applySizeSetting (Settings changed, editor open)', () => {
    const run = (presetId: string, pending = true) => {
        const state = {
            canvas: {},
            settings: {
                ...DEFAULT_SETTINGS,
                defaultCanvasPresetId: presetId,
                canvasOrientation: 'portrait',
            },
            takePendingCanvasSize: vi.fn(() => pending),
            setSelectedPreset: vi.fn(),
            setPageSetup: vi.fn(),
        };
        applySizeSetting(() => state as never);
        return state;
    };

    it('resizes the open page and, for a manga size, sets its bleed and margins', () => {
        const s = run('manga-b5');
        expect(s.setSelectedPreset).toHaveBeenCalledWith(expect.objectContaining({ width: 688 }));
        expect(s.setPageSetup).toHaveBeenCalledWith(b5.pageSetup);
    });

    it('a non-manga size only resizes; nothing pending does nothing', () => {
        const s = run('instagram-post');
        expect(s.setSelectedPreset).toHaveBeenCalled();
        expect(s.setPageSetup).not.toHaveBeenCalled();
        const none = run('manga-b5', false);
        expect(none.setSelectedPreset).not.toHaveBeenCalled();
        expect(none.setPageSetup).not.toHaveBeenCalled();
    });
});
