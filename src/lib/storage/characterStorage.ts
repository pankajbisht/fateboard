import { createLibrary } from './libraryStorage';
import type { KeyValueBackend } from './types';

/**
 * The Character Studio's library (saved characters) and its autosaved draft, in the project database
 * (IndexedDB). Values are returned unvalidated: the Character slice parses them (`parseCharacter`). Reads
 * reject when the store fails, so a failed read is never mistaken for "nothing saved" (libraryStorage.ts).
 */
export const CHARACTER_LIBRARY_KEY = 'characterLibrary';
export const CHARACTER_DRAFT_KEY = 'characterDraft';

export function createCharacterStorage(backend: () => KeyValueBackend) {
    const lib = createLibrary(backend, CHARACTER_LIBRARY_KEY);
    return {
        loadLibrary: lib.load,
        saveLibrary: lib.save,
        /** Adds the character or replaces the one with its id; entries it cannot read are kept. */
        upsert: lib.upsert,
        remove: lib.remove,
        loadDraft: (): Promise<unknown> => backend().get(CHARACTER_DRAFT_KEY),
        saveDraft: (draft: unknown) => backend().set(CHARACTER_DRAFT_KEY, draft),
    };
}

export type CharacterStorage = ReturnType<typeof createCharacterStorage>;
