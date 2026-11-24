/**
 * Scene slice (docs/CHARACTER_STUDIO.md §9): Scene mode of the Character Studio. Opening, its own history, the
 * actor ↔ Character mode round trip, the draft, and placing / updating a scene on the page (real Fabric groups,
 * fake canvas).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- the harness and fake canvas are untyped */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { characterStorage, sceneStorage } from '@/lib/storage';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { readSceneData } from '@/scene/board';
import { newScene } from '@/scene/schema/parse';
import { MAX_ACTORS } from '@/scene/schema/types';
import { createCharacterSlice } from '../createCharacterSlice';
import { SCENE_HISTORY, createSceneSlice, type SceneSlice } from '../createSceneSlice';

const make = (extra: Record<string, any> = {}) =>
    createHarness<SceneSlice & Record<string, any>>(
        [createCharacterSlice as any, createSceneSlice as any],
        {
            canvas: createFakeCanvas(),
            saveState: vi.fn(),
            pauseHistory: vi.fn(),
            resumeHistory: vi.fn(),
            showToast: vi.fn(),
            ...extra,
        },
    );

beforeEach(async () => {
    await characterStorage.saveLibrary([]);
    await characterStorage.saveDraft(undefined);
    await sceneStorage.saveDraft(undefined);
    await sceneStorage.saveLibrary([]);
});
afterEach(() => vi.useRealTimers());

describe('opening Scene mode', () => {
    it('starts a scene with the character you were editing, in the studio, selected', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[3], 'ananya'));
        h.get().setStudioMode('scene');
        await vi.waitFor(() => expect(h.get().studioMode).toBe('scene'));
        const s = h.get().studioScene!;
        expect(s.actors).toHaveLength(1);
        expect(s.actors[0].character.id).toBe('ananya');
        expect(h.get().sceneSelectedActor).toBe(s.actors[0].id);
        expect(h.get().characterStudioOpen).toBe(true);
    });

    it('brings back the draft after the studio closes', async () => {
        const h = make();
        await h.get().openSceneStudio();
        h.get().editStudioScene({ kind: 'rename', name: 'Picnic' });
        h.get().closeCharacterStudio();
        await vi.waitFor(async () =>
            expect(await sceneStorage.loadDraft()).toMatchObject({ name: 'Picnic' }),
        );
        const again = make();
        await again.get().openSceneStudio();
        expect(again.get().studioScene!.name).toBe('Picnic');
    });
});

describe('editing', () => {
    it('edits are undoable, a drag is one step, history is capped', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('S'));
        const id = h.get().studioScene!.actors[0].id;
        for (let x = 0; x < 10; x++)
            h.get().editStudioScene({ kind: 'moveActor', id, x, z: 0 }, 'drag');
        expect(h.get().scenePast).toHaveLength(1);
        h.get().sceneUndo();
        expect(h.get().studioScene!.actors[0].x).not.toBe(9);
        h.get().sceneRedo();
        expect(h.get().studioScene!.actors[0].x).toBe(9);
        for (let i = 0; i < SCENE_HISTORY + 5; i++)
            h.get().editStudioScene({ kind: 'turnActor', id, facing: i + 1 });
        expect(h.get().scenePast.length).toBe(SCENE_HISTORY);
    });

    it('adds the next cast member at a free spot, up to five, and says so after', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('S'));
        for (let i = 0; i < MAX_ACTORS + 1; i++) h.get().addSceneActor();
        const actors = h.get().studioScene!.actors;
        expect(actors).toHaveLength(MAX_ACTORS);
        expect(new Set(actors.map((a) => a.character.recipeRef)).size).toBe(MAX_ACTORS);
        expect(new Set(actors.map((a) => a.x)).size).toBe(MAX_ACTORS);
        expect(h.get().showToast).toHaveBeenCalledWith({
            message: 'A scene holds up to 5 characters.',
        });
    });

    it('an actor edited in Character mode changes in the scene too', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('S'));
        h.get().addSceneActor();
        const second = h.get().studioScene!.actors[1];
        h.get().selectSceneActor(second.id);
        h.get().setStudioMode('character');
        expect(h.get().studioCharacter.id).toBe(second.character.id);
        h.get().editStudioCharacter({ name: 'Renamed' });
        expect(h.get().studioScene!.actors[1].character.name).toBe('Renamed');
        // the first actor is untouched
        expect(h.get().studioScene!.actors[0].character.name).not.toBe('Renamed');
    });
});

describe('placing on the page', () => {
    it('places one group the size of the frame carrying the scene; Update on page keeps the same object', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('Street'));
        h.get().editStudioScene({ kind: 'set', patch: { environment: 'city' } });
        expect(await h.get().placeStudioScene()).toBe(true);
        const canvas = h.get().canvas;
        const obj = canvas.getObjects()[0];
        expect(readSceneData(obj)!.scene.set.environment).toBe('city');
        expect(obj.width / obj.height).toBeCloseTo(16 / 9, 1);
        // the picture (its first shape is the full-frame sky) is centred on the object, and so is the clip
        const sky = obj.getObjects()[0].calcTransformMatrix();
        const c = obj.getCenterPoint();
        expect(sky[4]).toBeCloseTo(c.x, 3);
        expect(sky[5]).toBeCloseTo(c.y, 3);
        expect([
            obj.clipPath.left,
            obj.clipPath.top,
            obj.clipPath.width,
            obj.clipPath.height,
        ]).toEqual([0, 0, obj.width, obj.height]);

        h.get().editStudioScene({ kind: 'set', patch: { time: 'night' } });
        h.get().editStudioScene({ kind: 'frame', patch: { aspect: '1:1' } });
        expect(await h.get().placeStudioScene()).toBe(true);
        expect(canvas.getObjects()).toHaveLength(1);
        expect(canvas.getObjects()[0]).toBe(obj);
        expect(readSceneData(obj)!.scene.set.time).toBe('night');
        expect(obj.width / obj.height).toBeCloseTo(1, 1);
        expect(h.get().saveState).toHaveBeenCalled();
    });

    it('with a comic panel selected, the new scene fills that panel; with nothing selected it is placed as before', async () => {
        const fit = vi.fn(() => true);
        const h = make({ fitToPanel: fit });
        await h.get().openSceneStudio(newScene('Wide'));
        expect(await h.get().placeStudioScene()).toBe(true);
        expect(fit).not.toHaveBeenCalled();

        const panel = { comicPanel: true };
        const again = make({ fitToPanel: fit });
        again.get().canvas.setActiveObject(panel);
        await again.get().openSceneStudio(newScene('Panelled'));
        expect(await again.get().placeStudioScene()).toBe(true);
        expect(fit).toHaveBeenCalledTimes(1);
        expect(fit).toHaveBeenCalledWith('fill', panel);
    });

    it('opening with a placed scene selected edits that scene', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('First'));
        await h.get().placeStudioScene();
        const placed = h.get().canvas.getObjects()[0];
        h.get().closeCharacterStudio();
        h.get().canvas.setActiveObject(placed);
        const again = make({ canvas: h.get().canvas });
        await again.get().openSceneStudio();
        expect(again.get().studioScene!.name).toBe('First');
        expect(again.get().sceneEditingPlaced).toBe(true);
    });
});

// fate-reviewer (2026-11-18): the link between Character mode and the scene actor it edits
describe('Character mode and the actor it edits', () => {
    const open2 = async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('S'));
        h.get().addSceneActor();
        return h;
    };

    it('closing ends the link: opening another character later never changes the scene or its draft (P0)', async () => {
        const h = await open2();
        const first = h.get().studioScene!.actors[0];
        h.get().selectSceneActor(first.id);
        h.get().setStudioMode('character');
        h.get().closeCharacterStudio();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[7], 'other-one'));
        h.get().editStudioCharacter({ name: 'Someone else' });
        expect(h.get().studioScene!.actors[0].character.id).toBe(first.character.id);
        expect(h.get().studioMode).toBe('character');
        expect(h.get().sceneEditingActor).toBeNull();
    });

    it('undo after switching actors never copies one actor into another (P1)', async () => {
        const h = await open2();
        const [a, b] = h.get().studioScene!.actors;
        h.get().selectSceneActor(a.id);
        h.get().setStudioMode('character');
        h.get().setStudioMode('scene');
        h.get().selectSceneActor(b.id);
        h.get().setStudioMode('character');
        h.get().studioUndo();
        expect(h.get().studioScene!.actors[1].character.id).toBe(b.character.id);
        expect(h.get().studioScene!.actors[0].character.id).toBe(a.character.id);
    });

    it('a scene change to the edited actor shows in Character mode and survives its edits (P1)', async () => {
        const h = await open2();
        const first = h.get().studioScene!.actors[0];
        h.get().editStudioScene({ kind: 'style', style: 'manga' });
        h.get().selectSceneActor(first.id);
        h.get().setStudioMode('character');
        expect(h.get().studioCharacter.style).toBe('manga');
        h.get().editStudioCharacter({ name: 'Inked' });
        expect(h.get().studioScene!.actors[0].character).toMatchObject({
            name: 'Inked',
            style: 'manga',
        });
    });

    it('a placed scene is updated only while its studio session lasts (P2)', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('S'));
        await h.get().placeStudioScene();
        h.get().closeCharacterStudio();
        await h.get().openCharacterStudio();
        h.get().setStudioMode('scene');
        await vi.waitFor(() => expect(h.get().studioMode).toBe('scene'));
        expect(h.get().sceneEditingPlaced).toBe(false);
    });

    it('entering Scene mode keeps the unsaved character in its draft (P2)', async () => {
        const scene = newScene('Old');
        scene.actors = [
            {
                id: 'x',
                character: fromRecipe(RECIPES[9], 'grace'),
                x: 0,
                z: 0,
                facing: 0,
                lookAt: null,
            },
        ];
        await sceneStorage.saveDraft(scene);
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[4], 'mine'));
        h.get().editStudioCharacter({ name: 'Unsaved work' });
        await h.get().openSceneStudio();
        h.get().editStudioCharacter({ name: 'Grace edited' });
        h.get().closeCharacterStudio();
        await vi.waitFor(async () =>
            expect(((await characterStorage.loadDraft()) as any)?.character?.name).toBe(
                'Unsaved work',
            ),
        );
    });
});

describe('scene names and gestures', () => {
    it('the name keeps spaces while typing and is tidied on the page (P2)', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('S'));
        h.get().editStudioScene({ kind: 'rename', name: 'Class ' }, 'scene-name');
        expect(h.get().studioScene!.name).toBe('Class ');
        h.get().editStudioScene({ kind: 'rename', name: 'Class photo ' }, 'scene-name');
        await h.get().placeStudioScene();
        expect(readSceneData(h.get().canvas.getObjects()[0])!.scene.name).toBe('Class photo');
    });

    it('one drag is one undo step, however slow (P3)', async () => {
        vi.useFakeTimers();
        const h = make();
        await h.get().openSceneStudio(newScene('S'));
        const id = h.get().studioScene!.actors[0].id;
        for (let x = 0; x < 5; x++) {
            h.get().editStudioScene({ kind: 'moveActor', id, x: x * 10, z: 0 }, 'gesture:drag-1');
            vi.advanceTimersByTime(1500);
        }
        expect(h.get().scenePast).toHaveLength(1);
    });
});

describe('templates', () => {
    it('applying one replaces the scene, selects a real character, is one undo step, and Character mode then edits it', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('Mine'));
        const before = h.get().studioScene!;
        h.get().editStudioScene({ kind: 'template', id: 'picnic' });
        const s = h.get().studioScene!;
        expect(s.set.environment).toBe('park');
        expect(s.actors).toHaveLength(4);
        expect(h.get().sceneSelectedActor).toBe(s.actors[0].id);
        expect(h.get().scenePast).toHaveLength(1);
        // Character mode loads the selected new character, not the old one
        h.get().setStudioMode('character');
        expect(h.get().studioCharacter.id).toBe(s.actors[0].character.id);
        h.get().editStudioCharacter({ name: 'Renamed' });
        expect(h.get().studioScene!.actors[0].character.name).toBe('Renamed');
        h.get().setStudioMode('scene');
        h.get().sceneUndo();
        expect(h.get().studioScene!.actors).toEqual(before.actors);
        expect(h.get().sceneSelectedActor).toBeTruthy();
    });
});

describe('saved scenes', () => {
    it('saves the scene being edited (tidy name), lists it, updates the same entry on a second save', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('  Picnic  '));
        expect(await h.get().saveStudioScene()).toBe(true);
        expect(h.get().sceneLibraryStatus).toBe('ready');
        expect(h.get().sceneLibrary).toHaveLength(1);
        expect(h.get().sceneLibrary[0].name).toBe('Picnic');
        h.get().editStudioScene({ kind: 'set', patch: { time: 'night' } });
        await h.get().saveStudioScene();
        expect(h.get().sceneLibrary).toHaveLength(1);
        expect(h.get().sceneLibrary[0].set.time).toBe('night');
        expect(h.get().showToast).toHaveBeenCalledWith({
            message: 'Saved "Picnic" to your scenes',
        });
    });

    it('a new store reads the saved scenes back, repaired; unreadable ones are not listed but not deleted', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('One'));
        await h.get().saveStudioScene();
        await sceneStorage.upsert({ id: 'future', schemaVersion: 99 });
        const again = make();
        await again.get().loadSceneLibrary();
        expect(again.get().sceneLibrary.map((x: any) => x.name)).toEqual(['One']);
        expect(await sceneStorage.loadLibrary()).toHaveLength(2);
    });

    it('opening a saved scene replaces the one being edited (one undo step) and keeps its id, so saving updates it', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('Saved one'));
        h.get().editStudioScene({ kind: 'set', patch: { environment: 'river' } });
        await h.get().saveStudioScene();
        const saved = h.get().sceneLibrary[0];
        h.get().editStudioScene({ kind: 'template', id: 'class-photo' });
        expect(h.get().studioScene!.name).toBe('Class photo');
        h.get().editStudioScene({ kind: 'load', scene: saved });
        expect(h.get().studioScene).toEqual(saved);
        expect(h.get().sceneSelectedActor).toBe(saved.actors[0].id);
        h.get().sceneUndo();
        expect(h.get().studioScene!.name).toBe('Class photo');
        h.get().sceneRedo();
        await h.get().saveStudioScene();
        expect(h.get().sceneLibrary).toHaveLength(1);
    });

    it('deleting removes it from the list and from storage; a failed save or delete is a toast, not a throw', async () => {
        const h = make();
        await h.get().openSceneStudio(newScene('Gone'));
        await h.get().saveStudioScene();
        const id = h.get().sceneLibrary[0].id;
        expect(await h.get().deleteSavedScene(id)).toBe(true);
        expect(h.get().sceneLibrary).toEqual([]);
        expect(await sceneStorage.loadLibrary()).toEqual([]);

        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        const up = vi.spyOn(sceneStorage, 'upsert').mockRejectedValueOnce(new Error('disk full'));
        expect(await h.get().saveStudioScene()).toBe(false);
        expect(h.get().showToast).toHaveBeenCalledWith({ message: 'Could not save the scene.' });
        up.mockRestore();
        const rm = vi.spyOn(sceneStorage, 'remove').mockRejectedValueOnce(new Error('blocked'));
        expect(await h.get().deleteSavedScene('x')).toBe(false);
        expect(h.get().showToast).toHaveBeenCalledWith({ message: 'Could not delete the scene.' });
        rm.mockRestore();
        err.mockRestore();
    });

    it('a library that cannot be read shows an error status and loses nothing', async () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        const load = vi
            .spyOn(sceneStorage, 'loadLibrary')
            .mockRejectedValueOnce(new Error('blocked'));
        const h = make();
        await h.get().loadSceneLibrary();
        expect(h.get().sceneLibraryStatus).toBe('error');
        load.mockRestore();
        err.mockRestore();
    });
});
