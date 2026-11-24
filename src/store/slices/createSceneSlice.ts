import type { Canvas, FabricObject } from 'fabric';
import { sceneStorage } from '@/lib/storage';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { newId } from '@/character/schema/parse';
import type { Character } from '@/character/schema/types';
import { cleanScene, newScene } from '@/scene/schema/parse';
import { createSceneLibraryActions, readSceneDraft } from './sceneLibrary';
import type { Scene } from '@/scene/schema/types';
import type { SceneEdit } from '@/scene/studio/edit';
import type { SliceCreator } from '../types';

/**
 * Scene mode of the Character Studio (docs/CHARACTER_STUDIO.md §9): the scene being edited (place, actors,
 * camera, frame), its own undo history, the autosaved draft, and placing / updating it on the page. All logic is
 * pure in src/scene (applySceneEdit); the renderer, the environments and the Fabric builder load on first use.
 *
 * Character edits of an actor go through the Character mode: the actor's character is loaded there, and every
 * change to it is copied back into the scene (`sceneEditingActor`), so the two never disagree.
 */
export const SCENE_HISTORY = 30;
const COALESCE_MS = 800;
const DRAFT_DELAY_MS = 1500;

export type StudioMode = 'character' | 'scene';
export type SceneGuide = 'thirds' | 'horizon' | 'grid';

export interface SceneSlice {
    studioMode: StudioMode;
    studioScene: Scene | null;
    sceneSelectedActor: string | null;
    /** the actor whose character Character mode edits (its changes flow back into the scene) */
    sceneEditingActor: string | null;
    /** the studio edits a scene that is on the page: Place becomes "Update on page" */
    sceneEditingPlaced: boolean;
    scenePast: Scene[];
    sceneFuture: Scene[];
    /** studio-only overlays, never exported */
    sceneGuides: SceneGuide[];
    /** Opens the studio in Scene mode with `start`, else the selected scene on the page, else the scene you were editing, else the draft, else a new scene with the current character. */
    openSceneStudio: (start?: Scene) => Promise<void>;
    setStudioMode: (mode: StudioMode) => void;
    editStudioScene: (edit: SceneEdit, historyKey?: string) => void;
    selectSceneActor: (id: string | null) => void;
    /** adds `character` (or the next cast member not in the scene) at a free spot, selected */
    addSceneActor: (character?: Character) => void;
    sceneUndo: () => void;
    sceneRedo: () => void;
    toggleSceneGuide: (guide: SceneGuide) => void;
    placeStudioScene: () => Promise<boolean>;
    /** your saved scenes (the library) */
    sceneLibrary: Scene[];
    sceneLibraryStatus: 'idle' | 'loading' | 'ready' | 'error';
    loadSceneLibrary: () => Promise<void>;
    /** saves the scene being edited (a second save of the same scene updates it) */
    saveStudioScene: () => Promise<boolean>;
    deleteSavedScene: (id: string) => Promise<boolean>;
}

type Peers = SceneSlice & {
    canvas?: Canvas | null;
    boardMode?: 'design' | 'whiteboard' | null;
    pageWidth?: number;
    pageHeight?: number;
    characterStudioOpen?: boolean;
    studioCharacter?: Character | null;
    openCharacterStudio?: (start?: Character) => Promise<void>;
    loadStudioCharacter?: (c: Character, opts?: { fromScene?: boolean }) => void;
    saveState?: (immediate?: boolean) => void;
    pauseHistory?: () => void;
    resumeHistory?: () => void;
    showToast?: (o: { message: string; tone?: string }) => void;
    fitToPanel?: (mode: 'fill' | 'fit', panel?: FabricObject) => boolean;
};

type Mods = {
    edit: typeof import('@/scene/studio/edit');
    arrange: typeof import('@/scene/layout/arrange');
    board: typeof import('@/scene/board');
    recipes: typeof import('@/character/data/recipes');
    envs: typeof import('@/scene/sets/registry');
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const LOAD_FAILED = 'Scenes could not load. Check your connection and try again.';

export const createSceneSlice: SliceCreator<SceneSlice> = (set, get, store) => {
    const peers = () => get() as Peers;
    let mods: Mods | null = null;
    let lastKey = '';
    let lastAt = 0;
    let draftTimer: ReturnType<typeof setTimeout> | null = null;
    let dirty = false;
    /** the page object being edited (runtime only) */
    let editing: FabricObject | null = null;

    const toast = (message: string) => peers().showToast?.({ message });

    const load = async (): Promise<Mods | null> => {
        if (mods) return mods;
        try {
            const [edit, arrange, board, recipes, envs] = await Promise.all([
                import('@/scene/studio/edit'),
                import('@/scene/layout/arrange'),
                import('@/scene/board'),
                import('@/character/data/recipes'),
                import('@/scene/sets/registry'),
            ]);
            mods = { edit, arrange, board, recipes, envs };
            return mods;
        } catch (err) {
            console.error('[scene] studio code not loaded', err);
            toast(LOAD_FAILED);
            return null;
        }
    };

    const remember = (key?: string) => {
        const now = Date.now();
        // `gesture:` keys are unique per gesture (a drag): one step however slow; others merge within 0.8 s
        if (key && key === lastKey && (key.startsWith('gesture:') || now - lastAt < COALESCE_MS)) {
            lastAt = now;
            return;
        }
        lastKey = key ?? '';
        lastAt = now;
        const cur = peers().studioScene;
        if (cur)
            set({ scenePast: [...peers().scenePast, cur].slice(-SCENE_HISTORY), sceneFuture: [] });
    };

    const writeDraft = () => {
        if (draftTimer) clearTimeout(draftTimer);
        draftTimer = null;
        const scene = peers().studioScene;
        if (!dirty || !scene) return;
        dirty = false;
        sceneStorage
            .saveDraft(cleanScene(scene))
            .catch((err) => console.error('[scene] draft not saved', err));
    };

    // closing the tab within the draft delay loses nothing
    if (typeof window !== 'undefined') window.addEventListener('pagehide', writeDraft);

    store?.subscribe?.((next: Peers, prev: Peers) => {
        // an actor's character edited in Character mode flows back into the scene (no scene history step:
        // the character has its own)
        const id = next.sceneEditingActor;
        if (
            id &&
            next.studioMode === 'character' &&
            next.studioScene &&
            next.studioCharacter &&
            next.studioCharacter !== prev.studioCharacter &&
            mods
        ) {
            const actor = next.studioScene.actors.find((a) => a.id === id);
            if (actor && actor.character !== next.studioCharacter) {
                dirty = true;
                set({
                    studioScene: mods.edit.applySceneEdit(next.studioScene, {
                        kind: 'actorCharacter',
                        id,
                        character: next.studioCharacter,
                    }),
                });
            }
        }
        // the draft: after edits, and at once when the studio closes
        if (prev.characterStudioOpen && !next.characterStudioOpen) {
            writeDraft();
            editing = null;
            // closing ends the session: the link to an actor, the placed object, Scene mode (the scene stays)
            if (
                next.sceneEditingActor ||
                next.sceneEditingPlaced ||
                next.studioMode !== 'character'
            )
                set({
                    sceneEditingActor: null,
                    sceneEditingPlaced: false,
                    studioMode: 'character',
                });
            return;
        }
        if (dirty && next.studioScene !== prev.studioScene) {
            if (draftTimer) clearTimeout(draftTimer);
            draftTimer = setTimeout(writeDraft, DRAFT_DELAY_MS);
        }
    });

    const step = (from: 'scenePast' | 'sceneFuture', to: 'scenePast' | 'sceneFuture') => {
        const s = peers();
        const list = s[from];
        if (!list.length || !s.studioScene) return;
        dirty = true;
        const scene = list[list.length - 1];
        set({
            studioScene: scene,
            [from]: list.slice(0, -1),
            [to]: [...s[to], s.studioScene].slice(-SCENE_HISTORY),
            // the selected character may not exist in that scene (a template swapped everyone): the first one
            ...(s.sceneSelectedActor && !scene.actors.some((a) => a.id === s.sceneSelectedActor)
                ? { sceneSelectedActor: scene.actors[0]?.id ?? null }
                : {}),
        });
        lastKey = '';
    };

    const readDraft = () => readSceneDraft(toast);

    /** The next cast member not in the scene yet (by recipe), as a fresh copy. */
    const nextCast = (m: Mods, scene: Scene): Character => {
        const used = new Set(scene.actors.map((a) => a.character.recipeRef));
        const r = m.recipes.RECIPES.find((x) => !used.has(x.id)) ?? m.recipes.RECIPES[0];
        return m.recipes.fromRecipe(r, newId());
    };

    return {
        studioMode: 'character',
        studioScene: null,
        sceneSelectedActor: null,
        sceneEditingActor: null,
        sceneEditingPlaced: false,
        scenePast: [],
        sceneFuture: [],
        sceneGuides: ['thirds'],
        sceneLibrary: [],
        sceneLibraryStatus: 'idle',

        openSceneStudio: async (start) => {
            const m = await load();
            if (!m) return;
            const active = start ? null : (peers().canvas?.getActiveObject() ?? null);
            const placed = m.board.readSceneData(active);
            editing = placed ? active : null;
            const current = peers().studioScene;
            let scene = start ?? placed?.scene ?? current ?? (await readDraft()) ?? null;
            const fresh = !scene;
            scene ??= newScene();
            if (!scene.actors.length) {
                const c = peers().studioCharacter ?? nextCast(m, scene);
                const spot = m.arrange.freeSpot(
                    [],
                    m.envs.ENVIRONMENTS.get(scene.set.environment).stage,
                );
                scene = m.edit.applySceneEdit(scene, {
                    kind: 'addActor',
                    actor: { id: newId(), character: c, ...spot, facing: 0, lookAt: null },
                });
            }
            const first = scene.actors[0];
            if (!peers().characterStudioOpen) await peers().openCharacterStudio?.(first.character);
            // the actor's own history; an unsaved standalone character is saved to its draft first
            if (
                peers().sceneEditingActor !== first.id ||
                peers().studioCharacter !== first.character
            )
                peers().loadStudioCharacter?.(first.character, { fromScene: true });
            dirty = fresh;
            set({
                studioMode: 'scene',
                studioScene: scene,
                sceneSelectedActor: first.id,
                sceneEditingActor: first.id,
                sceneEditingPlaced: !!editing,
                // what this replaces stays one undo step away
                scenePast: current && current !== scene && !same(current, scene) ? [current] : [],
                sceneFuture: [],
            });
            lastKey = '';
        },

        setStudioMode: (mode) => {
            const s = peers();
            if (mode === 'scene') {
                if (!mods || !s.studioScene) {
                    void s.openSceneStudio();
                    return;
                }
                set({ studioMode: 'scene' });
                return;
            }
            // the selected actor (else the linked one) as the scene has it now: a scene change to it (a style for
            // everyone, an undo) is never lost to a stale copy; switching actors starts a fresh history
            const actors = s.studioScene?.actors ?? [];
            const actor =
                actors.find((a) => a.id === s.sceneSelectedActor) ??
                actors.find((a) => a.id === s.sceneEditingActor);
            if (
                actor &&
                (s.sceneEditingActor !== actor.id || s.studioCharacter !== actor.character)
            ) {
                s.loadStudioCharacter?.(actor.character, { fromScene: true });
                set({ sceneEditingActor: actor.id });
            }
            set({ studioMode: 'character' });
        },

        editStudioScene: (edit, historyKey) => {
            const cur = peers().studioScene;
            if (!cur || !mods) return;
            const next = mods.edit.applySceneEdit(cur, edit);
            if (next === cur || same(next, cur)) return;
            remember(historyKey);
            dirty = true;
            set({
                studioScene: next,
                ...(edit.kind === 'removeActor' && peers().sceneSelectedActor === edit.id
                    ? { sceneSelectedActor: null }
                    : {}),
                ...(edit.kind === 'removeActor' && peers().sceneEditingActor === edit.id
                    ? { sceneEditingActor: null }
                    : {}),
                // a template or a saved scene replaces everyone: select the first new character, and let Character mode load it
                ...(edit.kind === 'template' || edit.kind === 'load'
                    ? { sceneSelectedActor: next.actors[0]?.id ?? null, sceneEditingActor: null }
                    : {}),
            });
        },

        selectSceneActor: (id) => set({ sceneSelectedActor: id }),

        addSceneActor: (character) => {
            const s = peers();
            if (!mods || !s.studioScene) return;
            const scene = s.studioScene;
            const c = character ? { ...character, id: newId() } : nextCast(mods, scene);
            const spot = mods.arrange.freeSpot(
                scene.actors,
                mods.envs.ENVIRONMENTS.get(scene.set.environment).stage,
            );
            const id = newId();
            const before = scene.actors.length;
            s.editStudioScene({
                kind: 'addActor',
                actor: { id, character: c, ...spot, facing: 0, lookAt: null },
            });
            if ((peers().studioScene?.actors.length ?? 0) > before) set({ sceneSelectedActor: id });
            else toast('A scene holds up to 5 characters.');
        },

        sceneUndo: () => step('scenePast', 'sceneFuture'),
        sceneRedo: () => step('sceneFuture', 'scenePast'),

        toggleSceneGuide: (guide) => {
            const g = peers().sceneGuides;
            set({ sceneGuides: g.includes(guide) ? g.filter((x) => x !== guide) : [...g, guide] });
        },

        ...createSceneLibraryActions(set, () => peers().studioScene, toast),

        placeStudioScene: async () => {
            const { canvas, studioScene: scene } = peers();
            if (!canvas || !scene) return false;
            const m = await load();
            if (!m) return false;
            const data = { scene: cleanScene(scene) };
            try {
                const fresh = await m.board.buildSceneObject(data);
                if (!fresh) return false;
                const e = editing;
                const target =
                    e && canvas.getObjects().includes(e) && m.board.isSceneGroup(e) ? e : null;
                if (target) {
                    peers().pauseHistory?.();
                    try {
                        m.board.swapSceneDrawing(target, fresh, data);
                        canvas.fire('object:modified', { target });
                    } finally {
                        peers().resumeHistory?.();
                    }
                    peers().saveState?.(true);
                    canvas.setActiveObject(target);
                } else {
                    // a comic panel selected: the scene fills it (the Art layer cuts the overflow)
                    const sel = canvas.getActiveObject() as
                        (FabricObject & { comicPanel?: boolean }) | undefined;
                    const panel = sel?.comicPanel ? sel : undefined;
                    const center = canvas.getVpCenter();
                    fresh.scale(creationScaleOf(peers()));
                    fresh.set({ left: center.x, top: center.y });
                    fresh.setCoords();
                    canvas.add(fresh);
                    canvas.setActiveObject(fresh);
                    if (panel) peers().fitToPanel?.('fill', panel);
                    editing = fresh;
                }
                canvas.requestRenderAll();
                set({ sceneEditingPlaced: true });
                return true;
            } catch (err) {
                console.error('[scene] could not place the scene', err);
                toast('Could not place the scene on the page.');
                return false;
            }
        },
    };
};
