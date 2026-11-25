/**
 * Settings go through `settingsStorage` (one place for keys and the storage library). Settings saved
 * by opendb-store 2 (`app.<key>` = `{"value": ...}` in localStorage) must still load after the
 * upgrade to opendb-store 3.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    SETTINGS_KEY,
    createMemorySyncStore,
    createSettingsStorage,
    settingsStorage,
} from '@/lib/storage';

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('settings storage', () => {
    it('reads settings written by opendb-store 2', () => {
        localStorage.setItem(
            `app.${SETTINGS_KEY}`,
            JSON.stringify({ value: { mode: 'dark', units: 'mm' } }),
        );
        expect(settingsStorage.load()).toEqual({ mode: 'dark', units: 'mm' });
    });

    it('saves and loads settings; nothing saved reads as undefined', () => {
        expect(settingsStorage.load()).toBeUndefined();
        expect(settingsStorage.save({ mode: 'light' })).toBe(true);
        expect(settingsStorage.load()).toEqual({ mode: 'light' });
    });

    it('the canvas size change flag is taken once', () => {
        settingsStorage.markCanvasSizePending();
        expect(settingsStorage.takeCanvasSizePending()).toBe(true);
        expect(settingsStorage.takeCanvasSizePending()).toBe(false);
    });

    it('a store that fails reports false instead of throwing', () => {
        const broken = createSettingsStorage(() => ({
            ...createMemorySyncStore(),
            set: () => false,
        }));
        expect(broken.save({ mode: 'dark' })).toBe(false);
        expect(broken.markCanvasSizePending()).toBe(false);
    });
});
