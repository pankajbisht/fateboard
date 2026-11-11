/**
 * The IndexedDB adapter over opendb-store 3 (decision Q5 follow-up). opendb promises never reject:
 * a failed read looks like "nothing saved" and a refused database silently becomes memory. A
 * document store must not hide either, or the next autosave replaces the user's board (BUG-154).
 * These tests run against the real library on fake-indexeddb, so an opendb change that breaks the
 * contract fails here.
 */
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpendbBackend } from '../adapters/opendbIndexed';

let n = 0;
// opendb shares one connection per database name, so every test gets its own database
const fresh = () => createOpendbBackend({ database: `opendb-backend-test-${++n}` });

afterEach(() => {
    vi.restoreAllMocks();
});

describe('opendb IndexedDB backend', () => {
    it('round-trips a project document and reads a missing key as undefined', async () => {
        const backend = fresh();
        const doc = { app: 'fateboard', version: 1, pages: [{ id: 'p1', objects: [{ id: 'a' }] }] };

        expect(await backend.get('project')).toBeUndefined();
        await backend.set('project', doc);
        expect(await backend.get('project')).toEqual(doc);

        await backend.delete('project');
        expect(await backend.get('project')).toBeUndefined();
    });

    it('a save started before a load is committed before the load reads (flush, then restore)', async () => {
        const backend = fresh();
        await backend.set('project', { pages: ['old'] });

        const saving = backend.set('project', { pages: ['new'] });
        const loading = backend.get('project');

        await saving;
        expect(await loading).toEqual({ pages: ['new'] });
    });

    it('a failed read rejects instead of reading as "nothing saved"', async () => {
        const backend = fresh();
        await backend.set('project', { pages: [] });
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
            throw new DOMException('disk error', 'UnknownError');
        });

        await expect(backend.get('project')).rejects.toThrow(/read/);
    });

    it('a failed write rejects instead of resolving', async () => {
        const backend = fresh();
        // functions cannot be stored in IndexedDB (DataCloneError)
        await expect(backend.set('project', { fn: () => 1 })).rejects.toThrow(/write/);
    });

    it('when IndexedDB cannot be opened, every call rejects (no silent in-memory saves)', async () => {
        vi.spyOn(indexedDB, 'open').mockImplementation(() => {
            throw new DOMException('blocked in private mode', 'InvalidStateError');
        });
        const backend = fresh();

        await expect(backend.get('project')).rejects.toThrow();
        await expect(backend.set('project', { pages: [] })).rejects.toThrow();
        await expect(backend.get('project')).rejects.toThrow();
    });
});
