/**
 * Project storage on its real adapters (fake-indexeddb): boards saved by the hand-written IndexedDB
 * code (DB `fateboard`, store `kv`) move into the opendb store once and are never lost or brought
 * back after "New board".
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
    PROJECT_KEY,
    UNREADABLE_KEY,
    createMemoryBackend,
    createProjectStorage,
    type KeyValueBackend,
    type ProjectDoc,
} from '@/lib/storage';
import { createOpendbBackend } from '../adapters/opendbIndexed';
import { createLegacyIndexedDbSource } from '../adapters/legacyIndexedDb';

const OLD_DB = 'fateboard';
const OLD_STORE = 'kv';
const project = (id: string): ProjectDoc => ({
    app: 'fateboard',
    version: 1,
    currentPageId: id,
    pages: [{ id }],
});

/** Writes like the pre-opendb code did: version 1, one object store, raw keys. */
const seedOldDatabase = (entries: Record<string, unknown>) =>
    new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(OLD_DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(OLD_STORE);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction(OLD_STORE, 'readwrite');
            Object.entries(entries).forEach(([k, v]) => tx.objectStore(OLD_STORE).put(v, k));
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        };
    });

const databaseNames = async () => (await indexedDB.databases()).map((d) => d.name);

let n = 0;
let backend: KeyValueBackend;
const storage = () =>
    createProjectStorage(() => ({
        backend,
        legacy: createLegacyIndexedDbSource({ database: OLD_DB, store: OLD_STORE }),
    }));

beforeEach(() => {
    globalThis.indexedDB = new IDBFactory(); // empty browser profile per test
    backend = createOpendbBackend({ database: `project-storage-test-${++n}` });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('moving boards out of the old IndexedDB database', () => {
    it('adopts the saved project and its unreadable backup, then deletes the old database', async () => {
        await seedOldDatabase({ [PROJECT_KEY]: project('p1'), [UNREADABLE_KEY]: { broken: true } });

        const saved = await storage().load();

        expect(saved).toEqual({ kind: 'project', project: project('p1') });
        expect(await backend.get(PROJECT_KEY)).toEqual(project('p1'));
        expect(await backend.get(UNREADABLE_KEY)).toEqual({ broken: true });
        expect(await databaseNames()).not.toContain(OLD_DB);
    });

    it('new users: nothing to adopt, and no empty old database is created', async () => {
        expect(await storage().load()).toBeNull();
        expect(await databaseNames()).not.toContain(OLD_DB);
    });

    it('"New board" after the move does not bring the old board back', async () => {
        await seedOldDatabase({ [PROJECT_KEY]: project('p1') });
        const store = storage();
        await store.load();

        await store.clear();

        expect(await store.load()).toBeNull();
    });

    it('a board saved after the move wins over anything left in the old database', async () => {
        await seedOldDatabase({ [PROJECT_KEY]: project('old') });
        const store = storage();
        await store.load();
        await store.save(project('new'));
        await seedOldDatabase({ [PROJECT_KEY]: project('old') }); // e.g. an old tab wrote again

        expect(await store.load()).toEqual({ kind: 'project', project: project('new') });
    });

    it('if copying fails, loading rejects and the old database is kept for the next try', async () => {
        await seedOldDatabase({ [PROJECT_KEY]: project('p1') });
        const failing: KeyValueBackend = {
            ...createMemoryBackend(),
            set: () => Promise.reject(new Error('quota')),
        };
        backend = failing;

        await expect(storage().load()).rejects.toThrow('quota');
        expect(await databaseNames()).toContain(OLD_DB);
    });
});
