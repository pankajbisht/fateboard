import type { SyncKeyValue } from './types';

/**
 * Per-browser view preferences that are not part of a document (where a dock sits, how tall it is, which
 * overlays are on). One key, one object of named sections; each feature reads and writes its own section and
 * validates what it reads. Never throws: a blocked store reads `undefined` and a failed write returns `false`.
 */
export const UI_PREFS_KEY = 'fateboard-ui';

const sections = (raw: unknown): Record<string, unknown> =>
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

/** `store` is called on each use, so tests can swap the browser storage underneath. */
export function createUiPrefsStorage(store: () => SyncKeyValue) {
    return {
        /** One section, unvalidated, or `undefined`. */
        load: (section: string): unknown => sections(store().get(UI_PREFS_KEY))[section],

        /** Replaces one section and keeps the others. */
        save: (section: string, value: unknown): boolean =>
            store().set(UI_PREFS_KEY, { ...sections(store().get(UI_PREFS_KEY)), [section]: value }),
    };
}

export type UiPrefsStorage = ReturnType<typeof createUiPrefsStorage>;
