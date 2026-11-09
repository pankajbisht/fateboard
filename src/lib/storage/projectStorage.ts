import db from 'opendb-store';

/**
 * Autosave storage for the whole project (BUG-004, decision Q5).
 *
 * One versioned project document (`{ app, version, currentPageId, pages }`, the same shape as a
 * saved `.fateboard` file) lives in IndexedDB under one key. IndexedDB has no ~5 MB quota like
 * localStorage, so pages with photos and thumbnails fit.
 *
 * Migration: boards saved before this change sit in localStorage under `drawJson` (one canvas). They
 * are returned as `{ kind: 'legacy' }`, the caller adopts them as Page 1, and the old key is removed
 * after the first successful project save.
 *
 * Every method is async and may reject; callers catch and log (store actions never throw to React).
 */

export const PROJECT_KEY = 'project';
export const LEGACY_DRAW_KEY = 'drawJson';
const DB_NAME = 'fateboard';
const STORE_NAME = 'kv';

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

export interface KeyValueBackend {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
}

/** In-memory backend: tests, and environments without IndexedDB (jsdom). Not persistent. */
export function createMemoryBackend(): KeyValueBackend {
    const map = new Map<string, unknown>();
    return {
        async get(key) {
            return map.has(key) ? structuredClone(map.get(key)) : undefined;
        },
        async set(key, value) {
            map.set(key, structuredClone(value));
        },
        async delete(key) {
            map.delete(key);
        },
    };
}

/** IndexedDB key/value backend. The connection is opened once and reused. */
export function createIndexedDbBackend(dbName = DB_NAME, storeName = STORE_NAME): KeyValueBackend {
    let opening: Promise<IDBDatabase> | null = null;

    const open = (): Promise<IDBDatabase> => {
        if (!opening) {
            opening = new Promise<IDBDatabase>((resolve, reject) => {
                const req = indexedDB.open(dbName, 1);
                req.onupgradeneeded = () => {
                    if (!req.result.objectStoreNames.contains(storeName)) {
                        req.result.createObjectStore(storeName);
                    }
                };
                req.onsuccess = () => {
                    const conn = req.result;
                    // Another tab upgrades the schema: let it, reopen on next use.
                    conn.onversionchange = () => {
                        conn.close();
                        opening = null;
                    };
                    resolve(conn);
                };
                req.onerror = () => reject(req.error);
            });
            opening.catch(() => {
                opening = null;
            });
        }
        return opening;
    };

    // Transactions are created in call order on one shared connection, so a save that starts
    // before a load (mode switch: flush, then restore) is committed before the load reads.
    const run = async <T>(
        mode: IDBTransactionMode,
        op: (store: IDBObjectStore) => IDBRequest<T> | undefined,
    ): Promise<T | undefined> => {
        const conn = await open();
        return new Promise<T | undefined>((resolve, reject) => {
            const tx = conn.transaction(storeName, mode);
            const req = op(tx.objectStore(storeName));
            tx.oncomplete = () => resolve(req?.result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
        });
    };

    return {
        get: (key) => run('readonly', (s) => s.get(key)),
        set: async (key, value) => {
            await run('readwrite', (s) => s.put(value, key));
        },
        delete: async (key) => {
            await run('readwrite', (s) => s.delete(key));
        },
    };
}

const isProjectDoc = (raw: unknown): raw is ProjectDoc =>
    !!raw && typeof raw === 'object' && Array.isArray((raw as ProjectDoc).pages);

const readLegacy = (): Record<string, unknown> | null => {
    try {
        const raw: unknown = db.local.get(LEGACY_DRAW_KEY);
        if (raw === null || raw === undefined || raw === '') return null;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
};

const removeLegacy = () => {
    try {
        db.local.remove(LEGACY_DRAW_KEY);
    } catch {
        // localStorage blocked: nothing to migrate anyway
    }
};

const createProjectStorage = () => {
    let backend: KeyValueBackend | null = null;
    const current = (): KeyValueBackend =>
        (backend ??=
            typeof indexedDB !== 'undefined' ? createIndexedDbBackend() : createMemoryBackend());

    return {
        /** Swap the backend (tests). */
        useBackend(next: KeyValueBackend) {
            backend = next;
        },

        /** The saved project, else the pre-project single canvas, else null. */
        async load(): Promise<StoredBoard | null> {
            const raw = await current().get(PROJECT_KEY);
            if (isProjectDoc(raw)) return { kind: 'project', project: raw };
            const legacy = readLegacy();
            return legacy ? { kind: 'legacy', canvasJSON: legacy } : null;
        },

        async save(doc: ProjectDoc): Promise<void> {
            await current().set(PROJECT_KEY, doc);
            removeLegacy();
        },

        async clear(): Promise<void> {
            await current().delete(PROJECT_KEY);
            removeLegacy();
        },
    };
};

export const projectStorage = createProjectStorage();
