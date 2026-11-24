import { createLibrary } from './libraryStorage';
import type { KeyValueBackend } from './types';

/**
 * Scene Studio storage (docs/CHARACTER_STUDIO.md §9): the scene being edited (a draft, kept so closing the tab loses
 * nothing) and the library of saved scenes. Values are returned unvalidated: the Scene slice parses them.
 */
export const SCENE_DRAFT_KEY = 'sceneDraft';
export const SCENE_LIBRARY_KEY = 'sceneLibrary';

export function createSceneStorage(backend: () => KeyValueBackend) {
    const lib = createLibrary(backend, SCENE_LIBRARY_KEY);
    return {
        loadDraft: (): Promise<unknown> => backend().get(SCENE_DRAFT_KEY),
        saveDraft: (draft: unknown) => backend().set(SCENE_DRAFT_KEY, draft),
        loadLibrary: lib.load,
        saveLibrary: lib.save,
        /** Adds the scene or replaces the one with its id; entries it cannot read are kept. */
        upsert: lib.upsert,
        remove: lib.remove,
    };
}

export type SceneStorage = ReturnType<typeof createSceneStorage>;
