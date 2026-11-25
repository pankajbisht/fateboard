/**
 * The saved scenes library shares its read-modify-write rules with the saved characters (libraryStorage): a failed
 * read stops the write, unreadable entries are kept, and the draft is separate from the library.
 */
import { describe, expect, it, vi } from 'vitest';
import { SCENE_LIBRARY_KEY, createMemoryBackend, createSceneStorage } from '@/lib/storage';

describe('scene library storage', () => {
    it('upsert adds or replaces by id, keeps entries it does not understand, remove deletes by id', async () => {
        const backend = createMemoryBackend();
        const store = createSceneStorage(() => backend);
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
        expect(await store.loadLibrary()).toHaveLength(2);
    });

    it('a failed read stops the write: nothing saved is lost', async () => {
        const backend = createMemoryBackend();
        await backend.set(SCENE_LIBRARY_KEY, [{ id: 'a' }, { id: 'b' }]);
        const set = vi.spyOn(backend, 'set');
        vi.spyOn(backend, 'get').mockRejectedValueOnce(new Error('IndexedDB blocked'));
        const store = createSceneStorage(() => backend);
        await expect(store.upsert({ id: 'c' })).rejects.toThrow('blocked');
        expect(set).not.toHaveBeenCalled();
        expect(await backend.get(SCENE_LIBRARY_KEY)).toEqual([{ id: 'a' }, { id: 'b' }]);
    });

    it('an empty or damaged store reads as an empty library; the draft is separate', async () => {
        const backend = createMemoryBackend();
        const store = createSceneStorage(() => backend);
        expect(await store.loadLibrary()).toEqual([]);
        await backend.set(SCENE_LIBRARY_KEY, 'not a list');
        expect(await store.loadLibrary()).toEqual([]);
        await store.saveDraft({ id: 'draft' });
        expect(await store.loadDraft()).toEqual({ id: 'draft' });
        expect(await store.loadLibrary()).toEqual([]);
    });
});
