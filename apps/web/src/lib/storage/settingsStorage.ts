import type { SyncKeyValue } from './types';

/**
 * Where the Setting slice keeps its data. The slice validates (`sanitizeSettings`); this module only
 * knows the keys. Never throws: reads of blocked storage are `undefined`, failed writes `false`.
 */

export const SETTINGS_KEY = 'fateboard-settings';
/** Set when the page size setting changes, applied once by the next new board. */
export const CANVAS_SIZE_PENDING_KEY = 'fateboard-canvas-size-pending';

/** `store` is called on each use, so tests can swap the browser storage underneath. */
export function createSettingsStorage(store: () => SyncKeyValue) {
    return {
        /** The saved settings, unvalidated, or `undefined`. */
        load: (): unknown => store().get(SETTINGS_KEY),

        save: (settings: unknown): boolean => store().set(SETTINGS_KEY, settings),

        markCanvasSizePending: (): boolean => store().set(CANVAS_SIZE_PENDING_KEY, true),

        /** True once after a canvas size change, then false until the next change. */
        takeCanvasSizePending: (): boolean => {
            const pending = store().get(CANVAS_SIZE_PENDING_KEY) === true;
            if (pending) store().remove(CANVAS_SIZE_PENDING_KEY);
            return pending;
        },
    };
}

export type SettingsStorage = ReturnType<typeof createSettingsStorage>;
