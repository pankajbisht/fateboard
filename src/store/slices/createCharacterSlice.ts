import type { Canvas, FabricObject } from 'fabric';
import { characterStorage } from '@/lib/storage';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { mirrorPose } from '@/character/rig/poseOps';
import { DEFAULT_CAMERA, newId, parseCamera, parseCharacter } from '@/character/schema/parse';
import type { Character, CharacterCamera } from '@/character/schema/types';
import {
    applyEdit,
    cleanName,
    recolorEdit,
    type StudioEdit,
    type StudioPart,
} from '@/character/studio/edit';
import type { SliceCreator } from '../types';

/**
 * Character Studio (docs/CHARACTER_STUDIO.md): the character being edited, the studio camera, its own undo
 * history (30 steps, like the Animation slice's), the saved library, the autosaved draft, and placing /
 * updating a character on the page (one board undo step). The renderer, the recipes and the Fabric builder
 * load on first use (dynamic imports), so the editor does not download them until the studio is used.
 *
 * Data safety: library saves are read-modify-write in storage (a failed read never wipes it); the draft is
 * written only after an edit, at once when the studio closes, and never over an unreadable one unasked.
 */
export const STUDIO_HISTORY = 30;
const COALESCE_MS = 800;
const DRAFT_DELAY_MS = 1500;

export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CharacterSlice {
    characterStudioOpen: boolean;
    studioCharacter: Character | null;
    studioCamera: CharacterCamera;
    studioSelectedPart: StudioPart | null;
    /** the studio edits a character that is on the page: Place becomes "Update on page" */
    studioEditingPlaced: boolean;
    characterLibrary: Character[];
    characterLibraryStatus: LibraryStatus;
    studioPast: Character[];
    studioFuture: Character[];
    /**
     * Opens with `start`, else the selected character on the page, else the character you were editing, else
     * the draft, else a recipe. A character replaced by opening stays one undo step away.
     */
    openCharacterStudio: (start?: Character) => Promise<void>;
    /** Saves the draft at once. */
    closeCharacterStudio: () => void;
    /** One change; edits sharing `historyKey` within 0.8 s are one undo step (a slider drag). */
    editStudioCharacter: (edit: StudioEdit, historyKey?: string) => void;
    /**
     * Replace the character being edited (a recipe, a saved one, Surprise me): undoable. `fromScene`: a scene
     * actor's character (Scene slice): its own history starts here, and the standalone draft is saved first and
     * then left alone.
     */
    loadStudioCharacter: (c: Character, opts?: { fromScene?: boolean }) => void;
    setStudioCamera: (patch: Partial<CharacterCamera>) => void;
    selectStudioPart: (part: StudioPart | null) => void;
    recolorStudioPart: (color: string) => void;
    mirrorStudioPose: () => void;
    studioUndo: () => void;
    studioRedo: () => void;
    surpriseStudioCharacter: () => Promise<void>;
    loadCharacterLibrary: () => Promise<void>;
    saveStudioToLibrary: () => Promise<boolean>;
    deleteFromLibrary: (id: string) => Promise<boolean>;
    /** Place on the page, or update the character being edited there (the same object). */
    placeStudioCharacter: () => Promise<boolean>;
}

type Peers = CharacterSlice & {
    canvas?: Canvas | null;
    boardMode?: 'design' | 'whiteboard' | null;
    pageWidth?: number;
    pageHeight?: number;
    saveState?: (immediate?: boolean) => void;
    pauseHistory?: () => void;
    resumeHistory?: () => void;
    showToast?: (o: { message: string; tone?: string }) => void;
    /** Scene slice: the actor whose character is being edited (its scene draft keeps it, not ours) */
    sceneEditingActor?: string | null;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const LOAD_FAILED = 'The Character Studio could not load. Check your connection and try again.';

export const createCharacterSlice: SliceCreator<CharacterSlice> = (set, get, store) => {
    const peers = () => get() as Peers;
    let lastKey = '';
    let lastAt = 0;
    let draftTimer: ReturnType<typeof setTimeout> | null = null;
    /** an edit not yet in the stored draft */
    let dirty = false;
    /** the page object being edited (runtime only) */
    let editing: FabricObject | null = null;

    const toast = (message: string) => peers().showToast?.({ message });

    const remember = (key?: string) => {
        const now = Date.now();
        if (key && key === lastKey && now - lastAt < COALESCE_MS) {
            lastAt = now;
            return;
        }
        lastKey = key ?? '';
        lastAt = now;
        const cur = peers().studioCharacter;
        if (cur)
            set({
                studioPast: [...peers().studioPast, cur].slice(-STUDIO_HISTORY),
                studioFuture: [],
            });
    };

    const writeDraft = () => {
        if (draftTimer) clearTimeout(draftTimer);
        draftTimer = null;
        const { studioCharacter: character, studioCamera: camera } = peers();
        // a scene actor is kept by the scene's draft; this draft keeps the standalone character
        if (!dirty || !character || peers().sceneEditingActor) return;
        dirty = false;
        characterStorage
            .saveDraft({ character, camera })
            .catch((err) => console.error('[character] draft not saved', err));
    };

    // closing the tab within the draft delay loses nothing (BUG-254)
    if (typeof window !== 'undefined') window.addEventListener('pagehide', writeDraft);

    // the edit in progress is kept (IndexedDB): closing the tab or the studio loses nothing
    store?.subscribe?.((next: Peers, prev: Peers) => {
        if (!dirty || !next.characterStudioOpen) return;
        if (
            next.studioCharacter === prev.studioCharacter &&
            next.studioCamera === prev.studioCamera
        )
            return;
        if (draftTimer) clearTimeout(draftTimer);
        draftTimer = setTimeout(writeDraft, DRAFT_DELAY_MS);
    });

    const step = (from: 'studioPast' | 'studioFuture', to: 'studioPast' | 'studioFuture') => {
        const s = peers();
        const list = s[from];
        if (!list.length || !s.studioCharacter) return;
        dirty = true;
        set({
            studioCharacter: list[list.length - 1],
            [from]: list.slice(0, -1),
            [to]: [...s[to], s.studioCharacter].slice(-STUDIO_HISTORY),
        });
        lastKey = '';
    };

    const readDraft = async (): Promise<{
        character: Character;
        camera: CharacterCamera;
    } | null> => {
        try {
            const raw = (await characterStorage.loadDraft()) as
                { character?: unknown; camera?: unknown } | null | undefined;
            if (raw === undefined || raw === null) return null;
            const character = parseCharacter(raw.character);
            if (character) return { character, camera: parseCamera(raw.camera) };
        } catch (err) {
            console.error('[character] draft not read', err);
        }
        toast(
            'Your last unsaved character could not be read. It is kept until you change this one.',
        );
        return null;
    };

    const setLibrary = (raw: unknown[]) =>
        set({
            characterLibrary: raw.map((c) => parseCharacter(c)).filter((c): c is Character => !!c),
            characterLibraryStatus: 'ready',
        });

    return {
        characterStudioOpen: false,
        studioCharacter: null,
        studioCamera: DEFAULT_CAMERA,
        studioSelectedPart: null,
        studioEditingPlaced: false,
        characterLibrary: [],
        characterLibraryStatus: 'idle',
        studioPast: [],
        studioFuture: [],

        openCharacterStudio: async (start) => {
            let mods: [
                typeof import('@/character/board'),
                typeof import('@/character/data/recipes'),
            ];
            try {
                mods = await Promise.all([
                    import('@/character/board'),
                    import('@/character/data/recipes'),
                ]);
            } catch (err) {
                console.error('[character] studio code not loaded', err);
                toast(LOAD_FAILED);
                return;
            }
            const [{ readCharacterData }, { RECIPES, fromRecipe }] = mods;
            const current = peers().studioCharacter;
            const active = peers().canvas?.getActiveObject() ?? null;
            const placed = start ? null : readCharacterData(active);
            editing = placed ? active : null;

            let character = start ?? placed?.character ?? null;
            let camera = placed?.camera ?? DEFAULT_CAMERA;
            // what this replaces stays one undo step away (unsaved work is never dropped by opening)
            let previous: Character | null = null;
            if (character) previous = current ?? (await readDraft())?.character ?? null;
            else if (current) {
                character = current;
                camera = peers().studioCamera;
            } else {
                const draft = await readDraft();
                character = draft?.character ?? null;
                camera = draft?.camera ?? DEFAULT_CAMERA;
            }
            character ??= fromRecipe(RECIPES[0], newId());
            dirty = false;
            set({
                characterStudioOpen: true,
                studioCharacter: character,
                studioCamera: camera,
                studioSelectedPart: null,
                studioEditingPlaced: !!editing,
                studioPast: previous && !same(previous, character) ? [previous] : [],
                studioFuture: [],
            });
            lastKey = '';
            if (peers().characterLibraryStatus === 'idle') void peers().loadCharacterLibrary();
        },

        closeCharacterStudio: () => {
            writeDraft();
            editing = null;
            set({ characterStudioOpen: false, studioSelectedPart: null });
        },

        editStudioCharacter: (edit, historyKey) => {
            const cur = peers().studioCharacter;
            if (!cur) return;
            const next = applyEdit(cur, edit);
            if (same(next, cur)) return;
            remember(historyKey);
            dirty = true;
            set({ studioCharacter: next });
        },

        loadStudioCharacter: (c, opts) => {
            if (opts?.fromScene) {
                writeDraft();
                lastKey = '';
                set({
                    studioCharacter: c,
                    studioSelectedPart: null,
                    studioPast: [],
                    studioFuture: [],
                });
                return;
            }
            remember();
            dirty = true;
            set({ studioCharacter: c, studioSelectedPart: null });
        },

        setStudioCamera: (patch) => {
            dirty = true;
            set({ studioCamera: parseCamera({ ...peers().studioCamera, ...patch }) });
        },

        selectStudioPart: (part) => set({ studioSelectedPart: part }),

        recolorStudioPart: (color) => {
            const { studioCharacter: c, studioSelectedPart: part } = peers();
            if (c && part)
                peers().editStudioCharacter(recolorEdit(c, part, color), `color-${part}`);
        },

        mirrorStudioPose: () => {
            const c = peers().studioCharacter;
            if (c) peers().editStudioCharacter({ pose: mirrorPose(c.rig.pose) });
        },

        studioUndo: () => step('studioPast', 'studioFuture'),
        studioRedo: () => step('studioFuture', 'studioPast'),

        surpriseStudioCharacter: async () => {
            try {
                const { surpriseCharacter } = await import('@/character/studio/surprise');
                peers().loadStudioCharacter(surpriseCharacter(Math.random, newId()));
            } catch (err) {
                console.error('[character] surprise not loaded', err);
                toast(LOAD_FAILED);
            }
        },

        loadCharacterLibrary: async () => {
            set({ characterLibraryStatus: 'loading' });
            try {
                setLibrary(await characterStorage.loadLibrary());
            } catch (err) {
                console.error('[character] library not read', err);
                set({ characterLibraryStatus: 'error' });
            }
        },

        saveStudioToLibrary: async () => {
            const cur = peers().studioCharacter;
            if (!cur) return false;
            const c = cleanName(cur);
            try {
                setLibrary(await characterStorage.upsert(c));
                toast(`Saved "${c.name}" to your characters`);
                return true;
            } catch (err) {
                console.error('[character] library not saved', err);
                toast('Could not save the character.');
                return false;
            }
        },

        deleteFromLibrary: async (id) => {
            try {
                setLibrary(await characterStorage.remove(id));
                return true;
            } catch (err) {
                console.error('[character] library not saved', err);
                toast('Could not delete the character.');
                return false;
            }
        },

        placeStudioCharacter: async () => {
            const { canvas, studioCharacter: cur, studioCamera: camera } = peers();
            if (!canvas || !cur) return false;
            const data = { character: cleanName(cur), camera };
            try {
                const board = await import('@/character/board');
                const fresh = await board.buildCharacterObject(data);
                if (!fresh) return false;
                const e = editing;
                const target =
                    e && canvas.getObjects().includes(e) && board.isCharacterGroup(e) ? e : null;
                if (target) {
                    // the same object: its id, animation track, notes, connectors and locks stay
                    peers().pauseHistory?.();
                    try {
                        board.swapCharacterDrawing(target, fresh, data);
                        canvas.fire('object:modified', { target });
                    } finally {
                        peers().resumeHistory?.();
                    }
                    peers().saveState?.(true);
                    canvas.setActiveObject(target);
                } else {
                    const center = canvas.getVpCenter();
                    fresh.scale(creationScaleOf(peers()));
                    fresh.set({ left: center.x, top: center.y });
                    fresh.setCoords();
                    canvas.add(fresh);
                    canvas.setActiveObject(fresh);
                    editing = fresh;
                }
                canvas.requestRenderAll();
                set({ studioEditingPlaced: true });
                return true;
            } catch (err) {
                console.error('[character] could not place the character', err);
                toast('Could not place the character on the page.');
                return false;
            }
        },
    };
};
