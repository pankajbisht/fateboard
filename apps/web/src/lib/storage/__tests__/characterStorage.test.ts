// @vitest-environment node
/**
 * fate-reviewer (2026-11-18), P0: saving built the library from the in-memory list, so a failed or unfinished
 * read wiped every saved character. Saves are now read-modify-write in storage: a read failure stops the
 * write, and entries the app cannot read (a newer schema) are kept.
 */
import { describe, expect, it, vi } from 'vitest';
import { createCharacterStorage, createMemoryBackend } from '@/lib/storage';

describe('character library storage', () => {
    it('upsert adds or replaces by id and keeps entries it does not understand', async () => {
        const backend = createMemoryBackend();
        const store = createCharacterStorage(() => backend);
        await store.saveLibrary([
            { id: 'a', name: 'A' },
            { id: 'z', schemaVersion: 99 },
        ]);
        expect(await store.upsert({ id: 'b', name: 'B' })).toEqual([
            { id: 'a', name: 'A' },
            { id: 'z', schemaVersion: 99 },
            { id: 'b', name: 'B' },
        ]);
        await store.upsert({ id: 'a', name: 'A2' });
        expect(await store.remove('b')).toEqual([
            { id: 'a', name: 'A2' },
            { id: 'z', schemaVersion: 99 },
        ]);
    });

    it('a failed read stops the write (nothing saved is lost)', async () => {
        const backend = createMemoryBackend();
        await backend.set('characterLibrary', [{ id: 'a' }, { id: 'b' }]);
        const set = vi.spyOn(backend, 'set');
        vi.spyOn(backend, 'get').mockRejectedValueOnce(new Error('IndexedDB blocked'));
        const store = createCharacterStorage(() => backend);
        await expect(store.upsert({ id: 'c' })).rejects.toThrow('blocked');
        expect(set).not.toHaveBeenCalled();
        expect(await backend.get('characterLibrary')).toEqual([{ id: 'a' }, { id: 'b' }]);
    });
});
