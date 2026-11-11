import type { LegacySource } from '../types';

/**
 * The IndexedDB layout used before opendb-store 3 (one database, one object store, raw keys).
 * Read once by `projectStorage` and deleted after its entries are copied. Remove this file (and
 * its use in `../index.ts`) once no returning user can still have the old database.
 */
export function createLegacyIndexedDbSource({
    database,
    store,
}: {
    database: string;
    store: string;
}): LegacySource {
    /** Opens the old database, or resolves `null` when it does not exist (without creating it). */
    const open = () =>
        new Promise<IDBDatabase | null>((resolve, reject) => {
            const req = indexedDB.open(database);
            let missing = false;
            req.onupgradeneeded = (event) => {
                if (event.oldVersion === 0) {
                    missing = true;
                    req.transaction?.abort(); // never create an empty old database
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = (event) => {
                if (missing) {
                    event.preventDefault();
                    resolve(null);
                } else {
                    reject(req.error);
                }
            };
        });

    return {
        async read() {
            const db = await open();
            if (!db) return null;
            try {
                if (!db.objectStoreNames.contains(store)) return null;
                return await new Promise<Record<string, unknown> | null>((resolve, reject) => {
                    const tx = db.transaction(store, 'readonly');
                    const keys = tx.objectStore(store).getAllKeys();
                    const values = tx.objectStore(store).getAll();
                    tx.oncomplete = () => {
                        const entries = keys.result.map((k, i) => [String(k), values.result[i]]);
                        resolve(entries.length ? Object.fromEntries(entries) : null);
                    };
                    tx.onerror = () => reject(tx.error);
                    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB read aborted'));
                });
            } finally {
                db.close();
            }
        },

        discard: () =>
            new Promise<void>((resolve, reject) => {
                const req = indexedDB.deleteDatabase(database);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
                // An open tab of an older version holds a connection; deletion finishes when it closes.
                req.onblocked = () => resolve();
            }),
    };
}
