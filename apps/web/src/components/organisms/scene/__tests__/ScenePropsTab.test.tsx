/**
 * Props in the Scene Studio as people use them (docs/PROPS.md §9): open the Props tab, add a tree, see it on the
 * stage, select it there, resize and move it with keys, undo, remove it, and place the scene with it on the page.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- partial store state and a fake canvas */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { characterStorage, sceneStorage } from '@/lib/storage';
import { readSceneData } from '@/scene/board';
import CharacterStudio from '../../character/CharacterStudio';
import CharactersPanel from '../../character/CharactersPanel';

let prev: any;
let canvas: any;
const RESET = {
    characterStudioOpen: false,
    studioCharacter: null,
    studioScene: null,
    studioMode: 'character',
    sceneSelectedActor: null,
    sceneSelectedProp: null,
    sceneEditingActor: null,
    scenePast: [],
    sceneFuture: [],
};
const scene = () => useStore.getState().studioScene!;
const stage = () => screen.getByRole('group', { name: /Scene stage/ });

beforeEach(async () => {
    prev = useStore.getState().canvas;
    canvas = createFakeCanvas();
    useStore.setState({ canvas, ...RESET } as any);
    await characterStorage.saveDraft(undefined);
    await sceneStorage.saveDraft(undefined);
});
afterEach(() => {
    cleanup();
    useStore.setState({ canvas: prev, ...RESET } as any);
});

async function openPropsTab() {
    render(<CharactersPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'New scene' }));
    await waitFor(() => expect(useStore.getState().studioMode).toBe('scene'));
    cleanup();
    render(<CharacterStudio />);
    fireEvent.click(
        within(screen.getByRole('radiogroup', { name: 'Scene tabs' })).getByRole('radio', {
            name: 'Props',
        }),
    );
}

async function addBench() {
    fireEvent.click(
        within(screen.getByRole('group', { name: 'Prop category' })).getByRole('button', {
            name: 'Street',
        }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Bench' }));
    await waitFor(() => expect(scene().props).toHaveLength(1));
}

describe('Scene mode: Props tab', () => {
    it('lists only props that stand in a place, and searches them', async () => {
        await openPropsTab();
        const cats = screen.getByRole('group', { name: 'Prop category' });
        expect(within(cats).getByRole('button', { name: 'Nature' })).toBeTruthy();
        expect(within(cats).queryByRole('button', { name: 'Effects' })).toBeNull();
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search props' }), {
            target: { value: 'sweat' },
        });
        expect(screen.getByText(/No props match/)).toBeTruthy();
    });

    it('adds a tree in front of the camera, selected, drawn on the stage', async () => {
        await openPropsTab();
        fireEvent.click(screen.getByRole('button', { name: 'Add Round tree' }));
        await waitFor(() => expect(scene().props).toHaveLength(1));
        const [p] = scene().props;
        expect(p).toMatchObject({ propId: 'tree-round', height: 520 });
        expect(useStore.getState().sceneSelectedProp).toBe(p.id);
        expect(document.querySelectorAll(`path[data-prop="${p.id}"]`).length).toBeGreaterThan(3);
        // its inspector: name, height, duplicate, remove
        expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
        expect(
            within(screen.getByRole('group', { name: 'Props in this scene' })).getByRole('button', {
                name: 'Round tree',
            }),
        ).toBeTruthy();
    });

    it('press on the stage selects it; keys move and resize it; undo steps back; Delete removes it', async () => {
        await openPropsTab();
        await addBench();
        const id = scene().props[0].id;
        act(() => useStore.getState().selectSceneActor(scene().actors[0].id));
        fireEvent.pointerDown(document.querySelector(`path[data-prop="${id}"]`)!);
        expect(useStore.getState()).toMatchObject({
            sceneSelectedProp: id,
            sceneSelectedActor: null,
        });
        const x = scene().props[0].x;
        fireEvent.keyDown(stage(), { key: 'ArrowRight' });
        expect(scene().props[0].x).toBe(x + 10);
        const h = scene().props[0].height;
        fireEvent.keyDown(stage(), { key: ']' });
        expect(scene().props[0].height).toBe(Math.round(h * 1.1));
        act(() => useStore.getState().sceneUndo());
        expect(scene().props[0].height).toBe(h);
        fireEvent.keyDown(stage(), { key: 'Delete' });
        expect(scene().props).toEqual([]);
    });

    it('Duplicate puts a copy beside it; Remove offers Undo', async () => {
        await openPropsTab();
        await addBench();
        fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
        expect(scene().props).toHaveLength(2);
        expect(scene().props[1].x).not.toBe(scene().props[0].x);
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
        expect(scene().props).toHaveLength(1);
        expect(useStore.getState().toast?.actionLabel).toBe('Undo');
    });

    it('the scene goes on the page with its props', async () => {
        await openPropsTab();
        await addBench();
        fireEvent.click(screen.getByRole('button', { name: 'Place scene on page' }));
        await waitFor(() => expect(useStore.getState().characterStudioOpen).toBe(false));
        expect(readSceneData(canvas.getObjects()[0])!.scene.props).toHaveLength(1);
    });
});
