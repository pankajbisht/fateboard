/**
 * BUG-011: animated values never reach a saved document (autosave, page capture, undo, files).
 * BUG-010 / Q12: animation tracks are saved, and they belong to a page.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { applyTracksAt, ensureAnimId, readProps, type Track } from '@/animation/engine';
import { serializeCanvas } from '@/lib/serialization';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { createMemoryBackend, projectStorage } from '@/lib/storage';

const rect = (props: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left: 10,
        top: 20,
        width: 50,
        height: 40,
        originX: 'left',
        originY: 'top',
        ...props,
    } as any);

/** left 10 → 310 over 1 s; text reveal 0 → 1 */
const trackFor = (obj: fabric.FabricObject, fullText?: string): Track => ({
    objectId: ensureAnimId(obj),
    label: 'obj',
    rest: readProps(obj),
    ...(fullText !== undefined ? { fullText } : {}),
    keyframes: [
        {
            id: 'a',
            time: 0,
            props: { left: 10, ...(fullText ? { reveal: 0 } : {}) },
            easing: 'linear',
        },
        {
            id: 'b',
            time: 1000,
            props: { left: 310, ...(fullText ? { reveal: 1 } : {}) },
            easing: 'linear',
        },
    ],
});

describe('serializing an animated canvas (BUG-011)', () => {
    it('writes the rest state, and leaves the live (animated) object as it was', () => {
        const canvas = createFakeCanvas();
        const r = rect();
        canvas.add(r);
        const tracks = { [ensureAnimId(r)]: trackFor(r) };

        applyTracksAt(canvas as any, tracks, 500); // mid-animation
        expect(r.left).toBe(160);

        const json: any = serializeCanvas(canvas);
        expect(json.objects[0].left).toBe(10);
        expect(r.left).toBe(160);
    });

    it('a typewriter text mid-way is saved with its full text', () => {
        const canvas = createFakeCanvas();
        const t = new fabric.FabricText('Hello world', { left: 10, top: 0 } as any);
        canvas.add(t);
        const tracks = { [ensureAnimId(t)]: trackFor(t, 'Hello world') };

        applyTracksAt(canvas as any, tracks, 500);
        expect((t as any).text).not.toBe('Hello world');

        const json: any = serializeCanvas(canvas);
        expect(json.objects[0].text).toBe('Hello world');
        expect(json.objects[0].left).toBe(10);
    });
});

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
const settle = () => tick(400);

describe('animation is saved per page (BUG-010, Q12)', () => {
    beforeEach(() => {
        prev = { ...useStore.getState() };
        projectStorage.useBackend(createMemoryBackend());
        canvas = createFakeCanvas();
        canvas.setCursor = () => undefined;
        useStore.setState({ canvas, pages: [], currentPageId: null, tracks: {} } as any);
        state().registerCanvasEvents(canvas);
        state().initPages();
    });

    afterEach(() => {
        state().unregisterCanvasEvents(canvas);
        state().clearHistory();
        state().pause();
        useStore.setState({
            canvas: prev.canvas,
            pages: prev.pages,
            currentPageId: null,
            tracks: {},
        } as any);
    });

    it('each page keeps its own tracks across page switches', async () => {
        const r = rect();
        canvas.add(r);
        const id = ensureAnimId(r);
        useStore.setState({ tracks: { [id]: trackFor(r) }, animDuration: 2000 } as any);
        const page1 = state().currentPageId;

        await state().addPage();
        expect(state().tracks).toEqual({});

        await state().switchPage(page1);
        expect(Object.keys(state().tracks)).toEqual([id]);
        expect(state().animDuration).toBe(2000);
    });

    it('tracks survive a reload, and the saved objects hold their rest values', async () => {
        const r = rect();
        canvas.add(r);
        const id = ensureAnimId(r);
        useStore.setState({ tracks: { [id]: trackFor(r) } } as any);
        state().seek(500); // object shown mid-animation
        await settle();

        state().unregisterCanvasEvents(canvas);
        canvas = createFakeCanvas();
        canvas.setCursor = () => undefined;
        useStore.setState({ canvas, pages: [], currentPageId: null, tracks: {} } as any);
        state().registerCanvasEvents(canvas);
        await state().restoreFromStorage();
        state().initPages();

        expect(Object.keys(state().tracks)).toEqual([id]);
        const page = state().captureProject().pages[0];
        expect(page.canvasJSON.objects[0].left).toBe(10);
        expect(page.animation.tracks[id].keyframes).toHaveLength(2);
    });

    it('editing an object shown at rest updates its rest state (no stale rest)', () => {
        const r = rect();
        canvas.add(r);
        const id = ensureAnimId(r);
        useStore.setState({
            tracks: {
                [id]: {
                    ...trackFor(r),
                    keyframes: [{ id: 'a', time: 0, props: { opacity: 1 }, easing: 'linear' }],
                },
            },
        } as any);
        r.set({ top: 99 });
        canvas.fire('object:modified', { target: r });
        expect(state().tracks[id].rest.top).toBe(99);
    });
});
