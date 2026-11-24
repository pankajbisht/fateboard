/**
 * Scene mode of the Character Studio as people use it (docs/CHARACTER_STUDIO.md §9): start a scene from the
 * Characters panel, pick a place, add people, arrange them, change the camera, undo, place it on the page.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- partial store state and a fake canvas */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { characterStorage, sceneStorage } from '@/lib/storage';
import { readSceneData } from '@/scene/board';
import CharacterStudio from '../../character/CharacterStudio';
import CharactersPanel from '../../character/CharactersPanel';

vi.mock('@/lib/export/svgToPdf', () => ({
    svgToPdf: vi.fn(async () => new Blob(['%PDF'], { type: 'application/pdf' })),
}));
vi.mock('@/lib/export/svgToPng', async (orig) => ({
    ...(await orig<typeof import('@/lib/export/svgToPng')>()),
    svgToPng: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}));

let prev: any;
let canvas: any;
const RESET = {
    characterStudioOpen: false,
    studioCharacter: null,
    studioScene: null,
    studioMode: 'character',
    sceneSelectedActor: null,
    sceneEditingActor: null,
    scenePast: [],
    sceneFuture: [],
};
const sceneTab = (name: string) =>
    fireEvent.click(
        within(screen.getByRole('radiogroup', { name: 'Scene tabs' })).getByRole('radio', { name }),
    );
const scene = () => useStore.getState().studioScene!;

beforeEach(async () => {
    prev = useStore.getState().canvas;
    canvas = createFakeCanvas();
    useStore.setState({ canvas, ...RESET } as any);
    await characterStorage.saveDraft(undefined);
    await sceneStorage.saveDraft(undefined);
    await sceneStorage.saveLibrary([]);
    useStore.setState({ sceneLibrary: [], sceneLibraryStatus: 'idle' } as any);
});
afterEach(() => {
    cleanup();
    useStore.setState({ canvas: prev, ...RESET } as any);
});

async function newSceneFromPanel() {
    render(<CharactersPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'New scene' }));
    await waitFor(() => expect(useStore.getState().studioMode).toBe('scene'));
    cleanup();
    render(<CharacterStudio />);
}

describe('Scene mode', () => {
    it('starts from the Characters panel with one character on the studio set', async () => {
        await newSceneFromPanel();
        expect(screen.getByRole('radio', { name: 'Scene', checked: true })).toBeTruthy();
        expect(screen.getByRole('img', { name: /Scene: Studio, 1 character/ })).toBeTruthy();
        expect(
            (screen.getByRole('textbox', { name: 'Scene name' }) as HTMLInputElement).value,
        ).toBe('Scene');
    });

    it('picks a place, adds people, arranges them and turns the camera; undo steps back', async () => {
        await newSceneFromPanel();
        fireEvent.click(screen.getByRole('button', { name: 'Classroom' }));
        expect(scene().set.environment).toBe('classroom');
        expect(screen.getByRole('img', { name: /Classroom, 1 character/ })).toBeTruthy();
        fireEvent.click(
            within(screen.getByRole('radiogroup', { name: 'Time of day' })).getByRole('radio', {
                name: 'Night',
            }),
        );
        expect(scene().set.time).toBe('night');

        sceneTab('Cast');
        fireEvent.click(screen.getByRole('button', { name: 'Add character' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add character' }));
        expect(scene().actors).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', { name: 'Class photo' }));
        expect(new Set(scene().actors.map((a) => a.z)).size).toBe(2);

        sceneTab('Camera');
        fireEvent.click(screen.getByRole('button', { name: '¾ corner' }));
        expect(scene().camera.yaw).toBe(35);
        fireEvent.click(screen.getByRole('switch', { name: 'Horizon' }));
        expect(useStore.getState().sceneGuides).toContain('horizon');

        const dialog = screen.getByRole('dialog', { name: 'Character Studio' });
        act(() => {
            fireEvent.keyDown(dialog, { key: 'z', code: 'KeyZ', metaKey: true, ctrlKey: true });
        });
        expect(scene().camera.yaw).not.toBe(35);
    });

    it('arrow keys move the selected character on the stage', async () => {
        await newSceneFromPanel();
        const before = scene().actors[0].x;
        fireEvent.keyDown(screen.getByRole('group', { name: /Scene stage/ }), {
            key: 'ArrowRight',
        });
        expect(scene().actors[0].x).toBe(before + 10);
        // seen from behind, right on screen is -x in the world (fate-reviewer P3)
        act(() => {
            useStore.getState().editStudioScene({ kind: 'camera', patch: { yaw: 180 } });
        });
        fireEvent.keyDown(screen.getByRole('group', { name: /Scene stage/ }), {
            key: 'ArrowRight',
        });
        expect(scene().actors[0].x).toBe(before);
    });

    it('Edit character opens the selected actor in Character mode; changes come back to the scene', async () => {
        await newSceneFromPanel();
        sceneTab('Cast');
        fireEvent.click(screen.getByRole('button', { name: 'Add character' }));
        const second = scene().actors[1];
        fireEvent.click(screen.getByRole('button', { name: 'Edit character' }));
        expect(useStore.getState().studioMode).toBe('character');
        const name = screen.getByRole('textbox', { name: 'Character name' }) as HTMLInputElement;
        expect(name.value).toBe(second.character.name);
        fireEvent.change(name, { target: { value: 'Lead' } });
        expect(scene().actors[1].character.name).toBe('Lead');
        fireEvent.click(screen.getByRole('radio', { name: 'Scene' }));
        expect(useStore.getState().studioMode).toBe('scene');
    });

    it('places the scene on the page as one object and closes', async () => {
        await newSceneFromPanel();
        fireEvent.click(screen.getByRole('button', { name: 'Place scene on page' }));
        await waitFor(() => expect(useStore.getState().characterStudioOpen).toBe(false));
        expect(readSceneData(canvas.getObjects()[0])!.scene.actors).toHaveLength(1);
    });
});

describe('body style per actor', () => {
    it('the selected actor switches between manga and classic; the relaxed idle and plain stand follow', async () => {
        await newSceneFromPanel();
        sceneTab('Cast');
        const actor = () => scene().actors[0].character;
        fireEvent.click(
            within(screen.getByRole('list', { name: 'Characters in the scene' })).getAllByRole(
                'button',
            )[0],
        );
        const body = screen.getByRole('radiogroup', { name: 'Body style' });
        expect(actor().body.bodyStyle).toBe('manga');
        expect(actor().rig.pose.id).toBe('manga-idle');
        fireEvent.click(within(body).getByRole('radio', { name: 'Classic' }));
        expect(actor().body.bodyStyle).toBe('classic');
        expect(actor().rig.pose.id).toBe('stand');
        fireEvent.click(within(body).getByRole('radio', { name: 'Manga' }));
        expect(actor().body.bodyStyle).toBe('manga');
        expect(actor().rig.pose.id).toBe('manga-idle');
    });
});

describe('export', () => {
    it('downloads the layers as a ZIP, the picture as SVG and the scene file as JSON, named after the scene', async () => {
        await newSceneFromPanel();
        fireEvent.change(screen.getByRole('textbox', { name: 'Scene name' }), {
            target: { value: 'Class Photo' },
        });
        sceneTab('Frame');
        const blobs: Blob[] = [];
        const names: string[] = [];
        URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:x')) as never;
        URL.revokeObjectURL = vi.fn();
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
            this: HTMLAnchorElement,
        ) {
            names.push(this.download);
        });
        fireEvent.click(screen.getByRole('button', { name: 'Download layers (ZIP)' }));
        fireEvent.click(screen.getByRole('button', { name: 'Download picture (SVG)' }));
        fireEvent.click(screen.getByRole('button', { name: 'Download scene file (JSON)' }));
        click.mockRestore();
        expect(names).toEqual(['class-photo.zip', 'class-photo.svg', 'class-photo.json']);
        expect(blobs.map((b) => b.type)).toEqual([
            'application/zip',
            'image/svg+xml',
            'application/json',
        ]);
        expect(blobs[0].size).toBeGreaterThan(5000);
        expect(JSON.parse(await blobs[2].text()).name).toBe('Class Photo');
    });
});

describe('templates tab', () => {
    it('lists 30 templates a page at a time, searches them, and applies one (then undo brings the scene back)', async () => {
        await newSceneFromPanel();
        sceneTab('Start');
        expect(screen.getByText('Templates (30)')).toBeTruthy();
        const cards = () => screen.getAllByTitle(/^Use the "/);
        expect(cards()).toHaveLength(12);
        fireEvent.click(screen.getByRole('button', { name: /Show more \(18 left\)/ }));
        expect(cards()).toHaveLength(24);

        fireEvent.change(screen.getByRole('textbox', { name: 'Search templates' }), {
            target: { value: 'picnic' },
        });
        expect(cards()).toHaveLength(1);
        fireEvent.click(cards()[0]);
        expect(scene().name).toBe('Picnic');
        expect(scene().set.environment).toBe('park');
        expect(scene().actors).toHaveLength(4);
        expect(screen.getByRole('img', { name: /Picnic: Park, 4 characters/ })).toBeTruthy();

        const dialog = screen.getByRole('dialog', { name: 'Character Studio' });
        act(() => {
            fireEvent.keyDown(dialog, { key: 'z', code: 'KeyZ', metaKey: true, ctrlKey: true });
        });
        expect(scene().actors).toHaveLength(1);

        fireEvent.change(screen.getByRole('textbox', { name: 'Search templates' }), {
            target: { value: 'zzzz' },
        });
        expect(screen.getByText('No template matches.')).toBeTruthy();
    });
});

describe('PNG export', () => {
    it('downloads the picture as a PNG at the size the SVG declares, named after the scene', async () => {
        const { svgToPng } = await import('@/lib/export/svgToPng');
        await newSceneFromPanel();
        sceneTab('Frame');
        const names: string[] = [];
        URL.createObjectURL = vi.fn(() => 'blob:x') as never;
        URL.revokeObjectURL = vi.fn();
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
            this: HTMLAnchorElement,
        ) {
            names.push(this.download);
        });
        fireEvent.click(screen.getByRole('button', { name: 'Download picture (PNG)' }));
        await waitFor(() => expect(names).toEqual(['scene.png']));
        click.mockRestore();
        const [svg, w, h] = vi.mocked(svgToPng).mock.calls[0];
        expect(svg.startsWith('<svg')).toBe(true);
        expect([w, h]).toEqual([1920, 1080]);
    });

    it('a failure is a toast, not a throw', async () => {
        const { svgToPng } = await import('@/lib/export/svgToPng');
        vi.mocked(svgToPng).mockRejectedValueOnce(new Error('boom'));
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        await newSceneFromPanel();
        sceneTab('Frame');
        const toast = vi.fn();
        act(() => {
            useStore.setState({ showToast: toast } as any);
        });
        fireEvent.click(screen.getByRole('button', { name: 'Download picture (PNG)' }));
        await waitFor(() =>
            expect(toast).toHaveBeenCalledWith({ message: 'Could not export the scene.' }),
        );
        err.mockRestore();
    });
});

describe('saved scenes', () => {
    it('saves from the top bar, lists the scene, opens it again over a changed scene, and deletes it after asking', async () => {
        await newSceneFromPanel();
        fireEvent.change(screen.getByRole('textbox', { name: 'Scene name' }), {
            target: { value: 'My park' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Park' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save to my scenes' }));
        await waitFor(() => expect(useStore.getState().sceneLibrary).toHaveLength(1));

        // change the scene, then open the saved one from the Start tab
        fireEvent.click(screen.getByRole('button', { name: 'Classroom' }));
        expect(scene().set.environment).toBe('classroom');
        sceneTab('Start');
        expect(await screen.findByText('Your scenes (1)')).toBeTruthy();
        fireEvent.click(screen.getByTitle('Open "My park"'));
        expect(scene().set.environment).toBe('park');
        expect(scene().name).toBe('My park');

        const ask = vi.fn(async () => false);
        act(() => {
            useStore.setState({ confirmDialog: ask } as any);
        });
        fireEvent.click(screen.getByRole('button', { name: 'Delete My park' }));
        await waitFor(() => expect(ask).toHaveBeenCalled());
        expect(useStore.getState().sceneLibrary).toHaveLength(1); // declined: still there
        ask.mockResolvedValueOnce(true);
        fireEvent.click(screen.getByRole('button', { name: 'Delete My park' }));
        await waitFor(() => expect(useStore.getState().sceneLibrary).toHaveLength(0));
        expect(await screen.findByText('No saved scenes yet')).toBeTruthy();
    });
});

describe('crowd', () => {
    it('the Crowd slider fills the place with extras; a template can bring its own crowd', async () => {
        await newSceneFromPanel();
        const before = screen
            .getByRole('img', { name: /Scene: Studio/ })
            .querySelectorAll('path').length;
        fireEvent.change(screen.getByRole('slider', { name: /People in the background/ }), {
            target: { value: '40' },
        });
        expect(scene().set.crowd).toBe(40);
        expect(
            screen.getByRole('img', { name: /Scene: Studio/ }).querySelectorAll('path').length,
        ).toBeGreaterThan(before + 60);

        sceneTab('Start');
        fireEvent.change(screen.getByRole('textbox', { name: 'Search templates' }), {
            target: { value: 'festival' },
        });
        fireEvent.click(screen.getAllByTitle(/^Use the "/)[0]);
        expect(scene().set.crowd).toBe(50);
    });
});

describe('PDF export', () => {
    it('downloads the picture as a PDF named after the scene, with the scene name as its title', async () => {
        const { svgToPdf } = await import('@/lib/export/svgToPdf');
        await newSceneFromPanel();
        fireEvent.change(screen.getByRole('textbox', { name: 'Scene name' }), {
            target: { value: 'Class Photo' },
        });
        sceneTab('Frame');
        const names: string[] = [];
        URL.createObjectURL = vi.fn(() => 'blob:x') as never;
        URL.revokeObjectURL = vi.fn();
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
            this: HTMLAnchorElement,
        ) {
            names.push(this.download);
        });
        fireEvent.click(screen.getByRole('button', { name: 'Download picture (PDF)' }));
        await waitFor(() => expect(names).toEqual(['class-photo.pdf']));
        click.mockRestore();
        const [svg, w, h, title] = vi.mocked(svgToPdf).mock.calls[0];
        expect(svg.startsWith('<svg')).toBe(true);
        expect([w, h, title]).toEqual([1920, 1080, 'Class Photo']);
    });
});

describe('pair poses', () => {
    it('picks a partner and a pose: both are placed facing each other with hands meeting; undo brings the old poses back', async () => {
        await newSceneFromPanel();
        sceneTab('Cast');
        fireEvent.click(screen.getByRole('button', { name: 'Add character' }));
        expect(screen.getByText('Together')).toBeTruthy();
        const before = scene().actors.map((a) => [a.x, a.facing, a.character.rig.pose.id]);
        fireEvent.click(screen.getByRole('button', { name: 'Handshake' }));
        // the selected character (the newly added one) is the first of the pair, placed on the left
        const me = useStore.getState().sceneSelectedActor;
        const a = scene().actors.find((x) => x.id === me)!;
        const b = scene().actors.find((x) => x.id !== me)!;
        expect([a.facing, b.facing]).toEqual([90, 270]);
        expect(a.x).toBeLessThan(b.x);
        expect(a.character.rig.pose.id).toBe('pair-handshake');
        expect(a.lookAt).toBe(b.id);
        expect(a.character.rig.pose.handShapeR).toBe('grip');
        const dialog = screen.getByRole('dialog', { name: 'Character Studio' });
        act(() => {
            fireEvent.keyDown(dialog, { key: 'z', code: 'KeyZ', metaKey: true, ctrlKey: true });
        });
        expect(scene().actors.map((x) => [x.x, x.facing, x.character.rig.pose.id])).toEqual(before);
    });

    it('a pose that needs similar heights is greyed out for a child and a tall adult', async () => {
        await newSceneFromPanel();
        sceneTab('Cast');
        act(() => {
            useStore.getState().addSceneActor();
        });
        // meera (111 cm) and kenji (189 cm)
        const { RECIPES, fromRecipe } = await import('@/character/data/recipes');
        act(() => {
            useStore.getState().editStudioScene({
                kind: 'actorCharacter',
                id: scene().actors[0].id,
                character: { ...fromRecipe(RECIPES[8], 'k'), id: scene().actors[0].character.id },
            });
            useStore.getState().editStudioScene({
                kind: 'actorCharacter',
                id: scene().actors[1].id,
                character: { ...fromRecipe(RECIPES[1], 'm'), id: scene().actors[1].character.id },
            });
        });
        expect(
            (screen.getByRole('button', { name: 'Dance hold' }) as HTMLButtonElement).disabled,
        ).toBe(true);
        expect((screen.getByRole('button', { name: 'Hug' }) as HTMLButtonElement).disabled).toBe(
            false,
        );
    });
});
