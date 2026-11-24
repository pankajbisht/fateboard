/**
 * Settings > Canvas size is the one place to choose the canvas size (owner, 2026-11-11): a new board
 * starts at it, and a change in Settings resizes the page that was open when the editor loads again
 * (one undo step). Without a change, a saved board keeps its own pages' sizes.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { createMemoryBackend, projectStorage } from '@/lib/storage';
import { CANVAS_PRESETS } from '@/components/organisms/board/board.config';

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
const preset = (id: string) => CANVAS_PRESETS.find((p) => p.id === id)!;

const mount = () => {
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    useStore.setState({ canvas, pages: [], currentPageId: null } as any);
    state().registerCanvasEvents(canvas);
};
const unmount = () => {
    state().unregisterCanvasEvents(canvas);
    state().clearHistory();
};
/** Same steps as `init()` after a reload. */
const reload = async () => {
    unmount();
    mount();
    await state().restoreFromStorage();
    state().initPages();
    state().applyCanvasSizeSetting();
};

beforeEach(() => {
    prev = { ...useStore.getState() };
    projectStorage.useBackend(createMemoryBackend());
    state().resetSettings();
    state().takePendingCanvasSize(); // only changes made by a test count
    mount();
});
afterEach(() => {
    unmount();
    state().resetSettings();
    useStore.setState({
        canvas: prev.canvas,
        pages: prev.pages,
        currentPageId: null,
        selectedPreset: prev.selectedPreset,
    } as any);
});

describe('default canvas size', () => {
    it('the first board, with nothing saved, starts at the default size', async () => {
        state().setDefaultCanvasPreset('instagram-post');
        await state().restoreFromStorage();
        state().initPages();

        expect(state().selectedPreset).toEqual(preset('instagram-post'));
        expect(state().pageWidth).toBe(1080);
        expect(state().pages[0].preset.id).toBe('instagram-post');
    });

    it('New board starts at the default size', async () => {
        state().initPages();
        state().setSelectedPreset(preset('youtube-thumbnail'));
        state().setDefaultCanvasPreset('youtube-channel-art');

        state().clearBoard();
        await tick(200);

        expect(state().selectedPreset).toEqual(preset('youtube-channel-art'));
        expect(state().pages[0].preset.id).toBe('youtube-channel-art');
        // the new size is the base of the new history, not an undo step
        expect(state().canUndo).toBe(false);
    });

    it('Settings > Orientation portrait: a new board starts in portrait', async () => {
        state().initPages();
        state().setCanvasOrientation('portrait');

        state().clearBoard();
        await tick(200);

        expect(state().selectedPreset).toMatchObject({
            id: 'presentation-16-9@swapped',
            width: 1080,
            height: 1920,
        });
    });

    it('without a change in Settings, a saved board keeps its own size', async () => {
        state().initPages();
        state().setSelectedPreset(preset('youtube-thumbnail')); // e.g. from a template
        await tick(400); // autosave

        await reload();

        expect(state().selectedPreset.id).toBe('youtube-thumbnail');
    });

    it('a size chosen in Settings resizes the open page when the editor loads, as one undo step', async () => {
        state().initPages();
        canvas.add({ type: 'rect', id: 'r1' });
        await tick(400); // autosave: Presentation 16:9

        state().setDefaultCanvasPreset('instagram-post');
        await reload();
        await tick(200); // history is debounced

        expect(state().selectedPreset).toEqual(preset('instagram-post'));
        expect(state().canUndo).toBe(true);
        await tick(400);
        const saved = state().captureProject();
        expect(saved.pages[0].preset.id).toBe('instagram-post');

        await state().undo();
        expect(state().selectedPreset.id).toBe('presentation-16-9');

        // applied once: the next load leaves the page alone
        state().setSelectedPreset(preset('youtube-thumbnail'));
        await tick(400);
        await reload();
        expect(state().selectedPreset.id).toBe('youtube-thumbnail');
    });

    it('a whiteboard is not resized; the change waits for the next design board', async () => {
        state().initPages();
        state().setFreehand(true);
        state().setDefaultCanvasPreset('instagram-post');
        state().applyCanvasSizeSetting();
        expect(state().selectedPreset.id).toBe('presentation-16-9');

        state().setFreehand(false);
        state().applyCanvasSizeSetting();
        expect(state().selectedPreset.id).toBe('instagram-post');
    });

    it('resizing a page does not change the setting', () => {
        state().initPages();
        state().setSelectedPreset(preset('youtube-thumbnail'));
        expect(state().settings.defaultCanvasPresetId).toBe('presentation-16-9');
    });

    it('a custom size from Settings resizes the open page and starts new boards', async () => {
        state().initPages();
        canvas.add({ type: 'rect', id: 'r1' });
        await tick(400);

        state().setCustomCanvasSize(800, 600);
        await reload();
        expect(state().selectedPreset).toMatchObject({
            id: 'custom-800x600',
            width: 800,
            height: 600,
        });

        state().clearBoard();
        await tick(200);
        expect(state().selectedPreset).toMatchObject({ width: 800, height: 600 });
    });
});
