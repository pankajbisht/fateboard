// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { newScene } from '@/scene/schema/parse';
import type { Scene } from '@/scene/schema/types';
import { applySceneEdit, type SceneEdit } from '@/scene/studio/edit';
import { createScenePropsSlice } from '../createScenePropsSlice';

/** The scene slice's editStudioScene, reduced to the pure edit (its history is tested on its own). */
const make = (scene: Scene | null = newScene()) => {
    const h = createHarness([createScenePropsSlice as never], {
        studioScene: scene,
        sceneSelectedActor: 'a1',
    });
    h.set({
        editStudioScene: (e: SceneEdit) => {
            const cur = h.get().studioScene as Scene | null;
            if (cur) h.set({ studioScene: applySceneEdit(cur, e) });
        },
    });
    return h;
};
const scene = (h: ReturnType<typeof make>) => h.get().studioScene as Scene;

describe('scene props slice', () => {
    it('starts with nothing selected', () => expect(make().get().sceneSelectedProp).toBeNull());

    it('selecting a prop deselects the character; clearing it leaves the character alone', () => {
        const h = make();
        h.get().selectSceneProp(null);
        expect(h.get().sceneSelectedActor).toBe('a1');
        h.get().selectSceneProp('p');
        expect(h.get()).toMatchObject({ sceneSelectedProp: 'p', sceneSelectedActor: null });
    });

    it('adds a catalogue prop in front of the camera at its real size, selected', async () => {
        const h = make();
        expect(await h.get().addSceneProp('tree-round')).toBe(true);
        const [p] = scene(h).props;
        expect(p).toMatchObject({ propId: 'tree-round', variant: 0, height: 520 });
        // the default camera looks toward -z from z = 760: in front of it, on its side of the world
        expect(p.z).toBeLessThan(760);
        expect(h.get().sceneSelectedProp).toBe(p.id);
    });

    it('adds at a drop point, and never on top of another prop', async () => {
        const h = make();
        await h.get().addSceneProp('bench', { x: 100, z: 50 });
        await h.get().addSceneProp('bench', { x: 100, z: 50 });
        const [a, b] = scene(h).props;
        expect(a).toMatchObject({ x: 100, z: 50 });
        expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThanOrEqual(40);
    });

    it('refuses unknown props, props that do not stand in a place, and no scene', async () => {
        expect(await make().get().addSceneProp('no-such-prop')).toBe(false);
        expect(await make().get().addSceneProp('sweat-drop')).toBe(false);
        expect(await make(null).get().addSceneProp('bench')).toBe(false);
    });

    it('duplicates the selected prop beside it, selected', async () => {
        const h = make();
        await h.get().addSceneProp('bench', { x: 0, z: 0 });
        const first = scene(h).props[0];
        h.get().duplicateSceneProp(first.id);
        const copy = scene(h).props[1];
        expect(copy).toMatchObject({ propId: 'bench', height: first.height, z: first.z });
        expect(copy.id).not.toBe(first.id);
        expect(h.get().sceneSelectedProp).toBe(copy.id);
    });
});
