import type { KeyValueBackend, LegacySource, SyncKeyValue } from './types';

/**
 * Autosave storage for the whole project (BUG-004, decision Q5).
 *
 * One versioned project document (`{ app, version, currentPageId, pages }`, the same shape as a
 * saved `.fateboard` file) lives under one key of a `KeyValueBackend` (IndexedDB in the app, see
 * `./index.ts`). IndexedDB has no ~5 MB quota like localStorage, so pages with photos fit.
 *
 * Older saves are adopted on load, newest layout first:
 * 1. the pre-opendb IndexedDB database (`legacy`): every entry is copied once, a marker is written,
 *    then the old database is deleted;
 * 2. boards saved before projects existed sit in localStorage under `drawJson` (one canvas): they
 *    are returned as `{ kind: 'legacy' }`, the caller adopts them as Page 1, and the old key is
 *    removed after the first successful project save.
 *
 * Every method is async and may reject; callers catch and log (store actions never throw to React).
 */

export const PROJECT_KEY = 'project';
export const LEGACY_DRAW_KEY = 'drawJson';
/** One slot: the last saved board that could not be opened (BUG-154). */
export const UNREADABLE_KEY = 'project.unreadable';
/** Set once the pre-opendb IndexedDB database was copied; it is never read again after that. */
export const LEGACY_ADOPTED_KEY = 'legacy-indexeddb-adopted';

export type ProjectDoc = {
    app: 'fateboard';
    version: number;
    currentPageId: string | null;
    pages: unknown[];
    savedAt?: string;
    exportedAt?: string;
};

export type StoredBoard =
    | { kind: 'project'; project: ProjectDoc }
    | { kind: 'legacy'; canvasJSON: Record<string, unknown> };

export type ProjectStorageDeps = {
    backend: KeyValueBackend;
    /** The pre-opendb IndexedDB layout, adopted once. */
    legacy?: LegacySource | null;
    /** Where `drawJson` (pre-project boards) lives. */
    prefs?: SyncKeyValue;
};

const isProjectDoc = (raw: unknown): raw is ProjectDoc =>
    !!raw && typeof raw === 'object' && Array.isArray((raw as ProjectDoc).pages);

/** `deps` is called once, on first use, so nothing touches storage at import time. */
export function createProjectStorage(deps: () => ProjectStorageDeps) {
    let resolved: ProjectStorageDeps | null = null;
    const current = (): ProjectStorageDeps => (resolved ??= deps());

    const readLegacyDraw = (): Record<string, unknown> | null => {
        try {
            const raw = current().prefs?.get(LEGACY_DRAW_KEY);
            if (raw === null || raw === undefined || raw === '') return null;
            const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return parsed && typeof parsed === 'object'
                ? (parsed as Record<string, unknown>)
                : null;
        } catch {
            return null;
        }
    };

    const removeLegacyDraw = () => {
        current().prefs?.remove(LEGACY_DRAW_KEY);
    };

    /** Copies the old database once; returns its project (if any). Rejects if copying fails. */
    const adoptLegacyStore = async (): Promise<unknown> => {
        const { backend, legacy } = current();
        if (!legacy || (await backend.get(LEGACY_ADOPTED_KEY)) === true) return undefined;

        const old = await legacy.read();
        for (const [key, value] of Object.entries(old ?? {})) {
            await backend.set(key, value);
        }
        await backend.set(LEGACY_ADOPTED_KEY, true);
        try {
            await legacy.discard();
        } catch (error) {
            // copied and marked: the old database is never read again, only left behind
            console.error('[storage] could not delete the old database', error);
        }
        return old?.[PROJECT_KEY];
    };

    return {
        /** Swap the backend (tests). Old layouts are not adopted from then on. */
        useBackend(next: KeyValueBackend) {
            resolved = { ...current(), backend: next, legacy: null };
        },

        /** The saved project, else the pre-project single canvas, else null. */
        async load(): Promise<StoredBoard | null> {
            let raw = await current().backend.get(PROJECT_KEY);
            if (raw === undefined) raw = await adoptLegacyStore();
            if (isProjectDoc(raw)) return { kind: 'project', project: raw };
            const legacy = readLegacyDraw();
            return legacy ? { kind: 'legacy', canvasJSON: legacy } : null;
        },

        async save(doc: ProjectDoc): Promise<void> {
            await current().backend.set(PROJECT_KEY, doc);
            removeLegacyDraw();
        },

        /**
         * Keeps a saved board that could not be opened under its own key, so the next autosave
         * (which starts from an empty board) cannot overwrite the only copy (BUG-154).
         */
        async keepUnreadable(saved: unknown): Promise<void> {
            await current().backend.set(UNREADABLE_KEY, saved);
        },

        async clear(): Promise<void> {
            await current().backend.delete(PROJECT_KEY);
            removeLegacyDraw();
        },
    };
}

export type ProjectStorage = ReturnType<typeof createProjectStorage>;
