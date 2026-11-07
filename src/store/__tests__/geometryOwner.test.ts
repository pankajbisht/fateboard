/**
 * BUG-007 / decision Q2: ONE owner of canvas geometry.
 *  - design board: CanvasBoard sizes the canvas (backstore = page px, CSS fit, viewport identity);
 *    store actions never write canvas size / viewport. The page size has one source (`selectedPreset`),
 *    saved per page (BUG-109) and part of undo.
 *  - templates set the page size and place content on the page: no artboard rect, clip or own
 *    viewport (BUG-139).
 *  - whiteboard: every zoom goes through `setZoom`, so `zoom` state matches the view (BUG-025).
 * Real store + fake canvas.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import type { DesignTemplate } from '@/components/organisms/effects/designTemplate.types';
import type { CanvasPreset } from '@/components/organisms/board/board.type';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { createMemoryBackend, projectStorage } from '@/lib/storage/projectStorage';

/* eslint-disable @typescript-eslint/no-explicit-any */

const A4: CanvasPreset = {
    id: 'a4',
    label: 'A4',
    category: 'Print',
    width: 2480,
    height: 3508,
    icon: 'file',
} as CanvasPreset;
const SLIDE: CanvasPreset = {
    id: 'presentation-16-9',
    label: 'Presentation',
    category: 'Presentation',
    width: 1920,
    height: 1080,
    icon: 'tv',
} as CanvasPreset;

const TEMPLATE = {
    id: 'geo-template',
    name: 'Geo',
    category: 'Social',
    sizeId: 'youtube-thumbnail', // 1280 x 720
    tags: [],
    objects: [
        { id: 'box', type: 'rect', left: 100, top: 50, width: 200, height: 100, fill: '#f00' },
    ],
} as unknown as DesignTemplate;

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
const settle = () => tick(400);
const size = () => ({ w: state().selectedPreset.width, h: state().selectedPreset.height });

const mount = (boardMode: 'design' | 'whiteboard') => {
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    canvas.setDimensions({ width: 1920, height: 1080 }); // what CanvasBoard set up
    useStore.setState({
        canvas,
        pages: [],
        currentPageId: null,
        selectedPreset: SLIDE,
        designTemplates: [TEMPLATE],
        zoom: 1,
        boardMode,
    } as any);
    state().registerCanvasEvents(canvas);
    state().initHistory();
    state().initPages();
};

beforeEach(() => {
    prev = { ...useStore.getState() };
    projectStorage.useBackend(createMemoryBackend());
});

afterEach(() => {
    state().disablePan();
    state().unregisterCanvasEvents(canvas);
    state().clearHistory();
    state().dismissToast?.();
    useStore.setState({
        canvas: prev.canvas,
        pages: prev.pages,
        currentPageId: null,
        selectedPreset: prev.selectedPreset,
        designTemplates: prev.designTemplates,
        zoom: 1,
        boardMode: prev.boardMode,
    } as any);
});

describe('design board: store actions never write canvas geometry (BUG-007)', () => {
    beforeEach(() => mount('design'));

    it('applyPageSize / page switches leave size and viewport to CanvasBoard', async () => {
        const setDimensions = vi.spyOn(canvas, 'setDimensions');
        const setVpt = vi.spyOn(canvas, 'setViewportTransform');
        state().applyPageSize();
        await state().addPage();
        await state().switchPage(state().pages[0].id);
        expect(setDimensions).not.toHaveBeenCalled();
        expect(setVpt).not.toHaveBeenCalled();
        expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('wheel zoom changes the zoom state, not the viewport', () => {
        const before = state().zoom;
        state().enablePan(); // wheel zoom is a Hand-tool gesture
        canvas.fire('mouse:wheel', {
            e: {
                deltaY: -200,
                offsetX: 10,
                offsetY: 10,
                preventDefault() {},
                stopPropagation() {},
            },
        });
        expect(state().zoom).toBeGreaterThan(before);
        expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 0, 0]);
    });
});

describe('page size has one source and is saved per page (BUG-007, BUG-109)', () => {
    beforeEach(() => mount('design'));

    it('each page keeps its own size across switches', async () => {
        const first = state().currentPageId;
        await state().addPage();
        state().setSelectedPreset(A4);
        await state().switchPage(first);
        expect(size()).toEqual({ w: 1920, h: 1080 });
        await state().switchPage(state().pages[1].id);
        expect(size()).toEqual({ w: 2480, h: 3508 });
    });

    it('the page size survives a reload', async () => {
        state().setSelectedPreset(A4);
        await settle();

        state().unregisterCanvasEvents(canvas);
        mount('design');
        useStore.setState({ pages: [], currentPageId: null } as any);
        await state().restoreFromStorage();
        state().initPages();
        expect(size()).toEqual({ w: 2480, h: 3508 });
    });

    it('changing the page size is one undo step', async () => {
        canvas.add({ type: 'rect', id: 'r1' });
        await tick(200);
        state().setSelectedPreset(A4);
        await tick(200);
        await state().undo();
        expect(size()).toEqual({ w: 1920, h: 1080 });
        expect(canvas.getObjects()).toHaveLength(1);
        await state().redo();
        expect(size()).toEqual({ w: 2480, h: 3508 });
    });
});

describe('templates use the page, not their own artboard (BUG-007, BUG-139)', () => {
    beforeEach(() => mount('design'));

    it('apply sets the page size, adds only the content, no clip and no viewport change', async () => {
        const setVpt = vi.spyOn(canvas, 'setViewportTransform');
        await state().applyDesignTemplate('geo-template');
        expect(size()).toEqual({ w: 1280, h: 720 });
        expect(canvas.getObjects()).toHaveLength(1);
        expect(canvas.clipPath).toBeUndefined();
        expect(setVpt).not.toHaveBeenCalled();
    });

    it('undo brings back the previous content AND page size', async () => {
        canvas.add({ type: 'rect', id: 'mine' });
        await tick(200);
        await state().applyDesignTemplate('geo-template');
        await tick(200);
        await state().undo();
        expect(size()).toEqual({ w: 1920, h: 1080 });
        expect(canvas.getObjects().map((o: any) => o.id)).toEqual(['mine']);
    });
});

describe('whiteboard: one zoom path (BUG-025)', () => {
    beforeEach(() => mount('whiteboard'));

    it('wheel zoom keeps the zoom state in step with the viewport', () => {
        state().enablePan(); // wheel zoom is a Hand-tool gesture
        canvas.fire('mouse:wheel', {
            e: {
                deltaY: -200,
                offsetX: 10,
                offsetY: 10,
                preventDefault() {},
                stopPropagation() {},
            },
        });
        expect(state().zoom).toBeCloseTo(canvas.getZoom(), 5);
        expect(state().zoom).toBeGreaterThan(1);
    });
});
