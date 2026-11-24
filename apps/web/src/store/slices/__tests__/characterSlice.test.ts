/**
 * Character Studio slice (docs/CHARACTER_STUDIO.md, phase 1): editing with its own 30-step history, the
 * library and draft in storage, and placing / updating a character on the page as one board undo step.
 * The page objects are real Fabric groups (built from the rendered SVG); the canvas is the fake.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- the harness and fake canvas are untyped */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pattern } from 'fabric';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { characterStorage } from '@/lib/storage';
import { readCharacterData } from '@/character/board';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { POSES } from '@/character/data/poses';
import { STUDIO_HISTORY, createCharacterSlice, type CharacterSlice } from '../createCharacterSlice';

const make = (extra: Record<string, any> = {}) =>
    createHarness<CharacterSlice & Record<string, any>>([createCharacterSlice as any], {
        canvas: createFakeCanvas(),
        saveState: vi.fn(),
        pauseHistory: vi.fn(),
        resumeHistory: vi.fn(),
        showToast: vi.fn(),
        ...extra,
    });

beforeEach(async () => {
    await characterStorage.saveLibrary([]);
    await characterStorage.saveDraft(undefined);
});
afterEach(() => vi.useRealTimers());

describe('opening the studio', () => {
    it('starts from a recipe when there is nothing to edit, and loads the library', async () => {
        const h = make();
        await h.get().openCharacterStudio();
        expect(h.get().characterStudioOpen).toBe(true);
        expect(h.get().studioCharacter?.recipeRef).toBe(RECIPES[0].id);
        await vi.waitFor(() => expect(h.get().characterLibraryStatus).toBe('ready'));
    });

    it('brings back the autosaved draft', async () => {
        vi.useFakeTimers();
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[5], 'draft-1'));
        h.get().editStudioCharacter({ name: 'Draft Priya' });
        await vi.advanceTimersByTimeAsync(2000);
        vi.useRealTimers();
        h.get().closeCharacterStudio();

        const again = make();
        await again.get().openCharacterStudio();
        expect(again.get().studioCharacter).toMatchObject({ id: 'draft-1', name: 'Draft Priya' });
    });
});

describe('the draft when the tab closes (BUG-254)', () => {
    it('an edit made a moment before the tab closes is kept, without waiting for the autosave timer', async () => {
        vi.useFakeTimers();
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[6], 'closing'));
        h.get().editStudioCharacter({ name: 'Last second edit' });
        // nothing is written yet: the timer (1.5 s) has not fired
        expect(await characterStorage.loadDraft()).toBeUndefined();
        window.dispatchEvent(new Event('pagehide'));
        vi.useRealTimers();
        await vi.waitFor(async () =>
            expect(((await characterStorage.loadDraft()) as any)?.character).toMatchObject({
                id: 'closing',
                name: 'Last second edit',
            }),
        );
    });

    it('closing the tab with nothing changed writes nothing', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[6], 'untouched'));
        window.dispatchEvent(new Event('pagehide'));
        await new Promise((r) => setTimeout(r, 20));
        expect(await characterStorage.loadDraft()).toBeUndefined();
        void h;
    });
});

describe('editing and history', () => {
    it('edits are undoable; a slider drag is one step; 30 steps at most', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[4], 'r'));
        for (let i = 1; i <= 10; i++) h.get().editStudioCharacter({ body: { fat: i / 10 } }, 'fat');
        expect(h.get().studioPast).toHaveLength(1);
        h.get().studioUndo();
        expect(h.get().studioCharacter!.body.fat).toBe(fromRecipe(RECIPES[4], 'r').body.fat);
        h.get().studioRedo();
        expect(h.get().studioCharacter!.body.fat).toBe(1);

        for (let i = 0; i < STUDIO_HISTORY + 10; i++)
            h.get().editStudioCharacter({ name: `n${i}` });
        expect(h.get().studioPast).toHaveLength(STUDIO_HISTORY);
    });

    it('an edit that changes nothing is not a step', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[4], 'r'));
        h.get().editStudioCharacter({ name: h.get().studioCharacter!.name });
        expect(h.get().studioPast).toHaveLength(0);
    });

    it('recolouring a part changes the colour it shows (sleeve = top, shin in shorts = skin)', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[0], 'a')); // t-shirt + shorts
        h.get().selectStudioPart('upperArmL');
        h.get().recolorStudioPart('#123456');
        expect(h.get().studioCharacter!.dress.top.color).toBe('#123456');
        h.get().selectStudioPart('lowerLegR');
        h.get().recolorStudioPart('#654321');
        expect(h.get().studioCharacter!.body.skinTone).toBe('#654321');
        h.get().selectStudioPart('hair');
        h.get().recolorStudioPart('#e4e4e4');
        expect(h.get().studioCharacter!.body.overridden).toContain('hairColor');
    });

    it('poses apply and mirror; Surprise me is a new person and undoable', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[4], 'r'));
        const wave = POSES.find((p) => p.id === 'wave')!;
        h.get().editStudioCharacter({ pose: wave });
        h.get().mirrorStudioPose();
        expect(h.get().studioCharacter!.rig.pose.handShapeL).toBe('wave');
        const before = h.get().studioCharacter!;
        await h.get().surpriseStudioCharacter();
        expect(h.get().studioCharacter!.id).not.toBe(before.id);
        h.get().studioUndo();
        expect(h.get().studioCharacter).toEqual(before);
    });
});

describe('library', () => {
    it('saves, replaces by id, deletes; survives a new store', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[2], 'k1'));
        expect(await h.get().saveStudioToLibrary()).toBe(true);
        h.get().editStudioCharacter({ name: 'Kabir 2' });
        await h.get().saveStudioToLibrary();
        expect(h.get().characterLibrary.map((c) => c.name)).toEqual(['Kabir 2']);

        const next = make();
        await next.get().loadCharacterLibrary();
        expect(next.get().characterLibrary).toHaveLength(1);
        await next.get().deleteFromLibrary('k1');
        expect(next.get().characterLibrary).toEqual([]);
    });

    it('a storage failure is reported, not thrown', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[2], 'k1'));
        vi.spyOn(characterStorage, 'upsert').mockRejectedValueOnce(new Error('quota'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(await h.get().saveStudioToLibrary()).toBe(false);
        expect(h.get().showToast).toHaveBeenCalledWith({
            message: 'Could not save the character.',
        });
        vi.restoreAllMocks();
    });
});

describe('on the page', () => {
    it('Place adds a character group carrying its data; the studio then updates that one', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        await h.get().openCharacterStudio(fromRecipe(RECIPES[1], 'm1'));
        h.get().setStudioCamera({ yaw: 40 });
        expect(await h.get().placeStudioCharacter()).toBe(true);
        expect(canvas.getObjects()).toHaveLength(1);
        const placed = canvas.getObjects()[0];
        expect(readCharacterData(placed)).toMatchObject({
            character: { id: 'm1', name: 'Meera' },
            camera: { yaw: 40 },
        });
        expect(placed.name).toBe('Meera');
        expect(h.get().studioEditingPlaced).toBe(true);

        // a change, then Update: the same object, same place and turn, one board history step
        placed.set({ left: 300, top: 200, angle: 15 });
        h.get().editStudioCharacter({ hair: { style: 'bun' } });
        expect(await h.get().placeStudioCharacter()).toBe(true);
        expect(canvas.getObjects()).toHaveLength(1);
        const updated = canvas.getObjects()[0];
        expect(updated).toBe(placed);
        expect(updated.angle).toBe(15);
        expect(updated.getCenterPoint().x).toBeCloseTo(300, 0);
        expect(readCharacterData(updated)!.character.hair.style).toBe('bun');
        expect(h.get().pauseHistory).toHaveBeenCalledTimes(1);
        expect(h.get().resumeHistory).toHaveBeenCalledTimes(1);
        expect(h.get().saveState).toHaveBeenCalledWith(true);
    });

    it('opening the studio with a character selected edits that character', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        await h.get().openCharacterStudio(fromRecipe(RECIPES[9], 'g1'));
        await h.get().placeStudioCharacter();
        h.get().closeCharacterStudio();

        canvas.setActiveObject(canvas.getObjects()[0]);
        await h.get().openCharacterStudio();
        expect(h.get().studioCharacter!.id).toBe('g1');
        expect(h.get().studioEditingPlaced).toBe(true);
    });
});

// fate-reviewer findings (2026-11-18)
describe('data safety', () => {
    it('saving before the library was read keeps every saved character (P0)', async () => {
        await characterStorage.saveLibrary([
            { ...fromRecipe(RECIPES[0], 'a') },
            { id: 'future', schemaVersion: 99 },
        ]);
        const h = make();
        // the library was never read: the in-memory list is empty
        h.set({ studioCharacter: fromRecipe(RECIPES[1], 'c'), characterStudioOpen: true });
        expect(await h.get().saveStudioToLibrary()).toBe(true);
        const stored = (await characterStorage.loadLibrary()) as { id: string }[];
        expect(stored.map((c) => c.id)).toEqual(['a', 'future', 'c']);
        expect(h.get().characterLibrary.map((c) => c.id)).toEqual(['a', 'c']);
    });

    it('opening another character keeps the current one one undo away, and the draft until you edit (P1)', async () => {
        vi.useFakeTimers();
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[4], 'mine'));
        h.get().editStudioCharacter({ name: 'My unsaved hero' });
        await vi.advanceTimersByTimeAsync(2000);
        await h.get().openCharacterStudio(fromRecipe(RECIPES[2], 'kabir'));
        await vi.advanceTimersByTimeAsync(2000);
        vi.useRealTimers();
        expect(((await characterStorage.loadDraft()) as any).character.name).toBe(
            'My unsaved hero',
        );
        h.get().studioUndo();
        expect(h.get().studioCharacter!.name).toBe('My unsaved hero');
    });

    it('closing saves the draft at once; reopening continues the character in memory (P1)', async () => {
        const h = make();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[4], 'r'));
        h.get().editStudioCharacter({ name: 'Renamed' });
        h.get().closeCharacterStudio();
        await vi.waitFor(async () =>
            expect(((await characterStorage.loadDraft()) as any)?.character?.name).toBe('Renamed'),
        );
        await h.get().openCharacterStudio();
        expect(h.get().studioCharacter!.name).toBe('Renamed');
    });

    it('the name keeps spaces while typing and may be empty; the page gets a real name (P1)', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        await h.get().openCharacterStudio(fromRecipe(RECIPES[4], 'r'));
        h.get().editStudioCharacter({ name: 'Mary ' }, 'name');
        expect(h.get().studioCharacter!.name).toBe('Mary ');
        h.get().editStudioCharacter({ name: '' }, 'name');
        expect(h.get().studioCharacter!.name).toBe('');
        await h.get().placeStudioCharacter();
        expect(canvas.getObjects()[0].name).toBe('Character');
    });

    it('Update on page changes the same object: animation, locks, id and pins stay (P1)', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        await h.get().openCharacterStudio(fromRecipe(RECIPES[1], 'm1'));
        await h.get().placeStudioCharacter();
        const placed = canvas.getObjects()[0];
        Object.assign(placed, {
            animId: 'track-1',
            id: 'obj-1',
            lockMovementX: true,
            layerId: 'L2',
        });
        const kidsBefore = placed.getObjects().length;
        placed.set({ left: 300, top: 200 });
        h.get().editStudioCharacter({ hair: { style: 'bald' } });
        await h.get().placeStudioCharacter();
        expect(canvas.getObjects()).toEqual([placed]);
        expect(placed).toMatchObject({
            animId: 'track-1',
            id: 'obj-1',
            lockMovementX: true,
            layerId: 'L2',
        });
        expect(readCharacterData(placed)!.character.hair.style).toBe('bald');
        expect(placed.getObjects().length).toBeLessThan(kidsBefore); // no hair shapes
        expect(placed.getCenterPoint().x).toBeCloseTo(300, 0);
        expect(h.get().saveState).toHaveBeenCalledWith(true);
    });

    it('size on the page follows the body: a child is smaller than an adult, and stays so after Update (P2)', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        await h.get().openCharacterStudio(fromRecipe(RECIPES[4], 'adult'));
        await h.get().placeStudioCharacter();
        await h.get().openCharacterStudio(fromRecipe(RECIPES[0], 'kid'));
        await h.get().placeStudioCharacter();
        const [adult, kid] = canvas.getObjects();
        expect(kid.getScaledHeight() / adult.getScaledHeight()).toBeLessThan(0.8);

        canvas.setActiveObject(adult);
        await h.get().openCharacterStudio();
        const before = adult.getScaledHeight();
        h.get().editStudioCharacter({ body: { age: 6, height: 0 } });
        await h.get().placeStudioCharacter();
        expect(adult.getScaledHeight()).toBeLessThan(before * 0.8);
    });
});

// style packs S1 (2026-11-18)
describe('styles on the page', () => {
    it('a manga character gets real screentone fills (the Comic tone), the others none', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        await h.get().openCharacterStudio({ ...fromRecipe(RECIPES[3], 'manga-1'), style: 'manga' });
        await h.get().placeStudioCharacter();
        const toned = canvas
            .getObjects()[0]
            .getObjects()
            .filter((o: any) => o.toneParams);
        expect(toned.length).toBeGreaterThan(3);
        expect(toned[0].fill).toBeInstanceOf(Pattern);

        await h.get().openCharacterStudio({ ...fromRecipe(RECIPES[3], 'anime-1'), style: 'anime' });
        await h.get().placeStudioCharacter();
        const anime = canvas.getObjects()[1].getObjects();
        expect(anime.some((o: any) => o.toneParams)).toBe(false);
        // anime hair keeps its gradient on the page
        expect(
            anime.some(
                (o: any) => o.fill && typeof o.fill === 'object' && o.fill.type === 'linear',
            ),
        ).toBe(true);
    });
});
