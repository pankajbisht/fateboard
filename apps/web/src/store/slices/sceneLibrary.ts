import { sceneStorage } from '@/lib/storage';
import { cleanScene, parseScene } from '@/scene/schema/parse';
import type { Scene } from '@/scene/schema/types';

/**
 * What the Scene slice reads and writes in storage (docs/CHARACTER_STUDIO.md phase 4): the saved scenes (load, save and
 * delete, spread into the slice) and the autosaved draft's reader. Storage is
 * read-modify-write (a failed read never wipes the library); failures are toasts and falsy results, never throws.
 * Entries this app cannot read (a newer schema) are not listed but stay in storage.
 */
type Library = {
    sceneLibrary: Scene[];
    sceneLibraryStatus: 'idle' | 'loading' | 'ready' | 'error';
};

export function createSceneLibraryActions(
    set: (partial: Partial<Library>) => void,
    current: () => Scene | null,
    toast: (message: string) => void,
) {
    const setLibrary = (raw: unknown[]) =>
        set({
            sceneLibrary: raw.map((x) => parseScene(x)).filter((x): x is Scene => !!x),
            sceneLibraryStatus: 'ready',
        });

    return {
        loadSceneLibrary: async (): Promise<void> => {
            set({ sceneLibraryStatus: 'loading' });
            try {
                setLibrary(await sceneStorage.loadLibrary());
            } catch (err) {
                console.error('[scene] library not read', err);
                set({ sceneLibraryStatus: 'error' });
            }
        },

        saveStudioScene: async (): Promise<boolean> => {
            const cur = current();
            if (!cur) return false;
            const scene = cleanScene(cur);
            try {
                setLibrary(await sceneStorage.upsert(scene));
                toast(`Saved "${scene.name}" to your scenes`);
                return true;
            } catch (err) {
                console.error('[scene] library not saved', err);
                toast('Could not save the scene.');
                return false;
            }
        },

        deleteSavedScene: async (id: string): Promise<boolean> => {
            try {
                setLibrary(await sceneStorage.remove(id));
                return true;
            } catch (err) {
                console.error('[scene] library not saved', err);
                toast('Could not delete the scene.');
                return false;
            }
        },
    };
}

/** The autosaved scene draft, repaired; an unreadable one is reported (and left alone), never replaced silently. */
export async function readSceneDraft(toast: (message: string) => void): Promise<Scene | null> {
    try {
        const raw = await sceneStorage.loadDraft();
        if (raw === undefined || raw === null) return null;
        const scene = parseScene(raw);
        if (scene) return scene;
    } catch (err) {
        console.error('[scene] draft not read', err);
    }
    toast('Your last unsaved scene could not be read. It is kept until you change this one.');
    return null;
}
