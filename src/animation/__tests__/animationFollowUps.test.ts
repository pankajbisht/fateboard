/**
 * BUG-140: after canvas undo / redo the canvas shows the animation at the playhead again.
 * BUG-141: keyframe history (animUndo / animRedo) is kept per page (Q7), not wiped by a page switch.
 * BUG-142: moving several animated objects together updates each one's rest state.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { ensureAnimId, readProps, type Track } from '@/animation/engine';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { createMemoryBackend, projectStorage } from '@/lib/storage/projectStorage';

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;

const rect = (left: number, top = 20) =>
    new fabric.Rect({ left, top, width: 50, height: 40, originX: 'left', originY: 'top' } as any);
const slide = (o: fabric.FabricObject): Track => ({
    objectId: ensureAnimId(o),
    label: 'o',
    rest: readProps(o),
    keyframes: [
        { id: 'a', time: 0, props: { opacity: 0 }, easing: 'linear' },
        { id: 'b', time: 1000, props: { opacity: 1 }, easing: 'linear' },
    ],
});

beforeEach(() => {
    prev = { ...useStore.getState() };
    projectStorage.useBackend(createMemoryBackend());
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    useStore.setState({
        canvas,
        pages: [],
        currentPageId: null,
        tracks: {},
        past: [],
        future: [],
    } as any);
    state().registerCanvasEvents(canvas);
    state().initHistory();
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

describe('animation follow-ups', () => {
    it('BUG-140: canvas undo / redo re-applies the animation at the playhead', async () => {
        const r = rect(10);
        useStore.setState({ tracks: { [ensureAnimId(r)]: slide(r) }, currentTime: 500 } as any);
        const seek = vi.fn();
        const realSeek = state().seek;
        useStore.setState({ seek } as any);
        canvas.add(r);
        await tick(200);

        await state().undo();
        expect(seek).toHaveBeenLastCalledWith(500);
        await state().redo();
        expect(seek).toHaveBeenCalledTimes(2);
        useStore.setState({ seek: realSeek } as any);
    });

    it('BUG-141: keyframe history survives a page switch', async () => {
        state().setAnimDuration(3000); // one keyframe-history step on page 1
        const page1 = state().currentPageId;
        await state().addPage();
        await state().switchPage(page1);
        expect(state().animDuration).toBe(3000);
        state().animUndo();
        expect(state().animDuration).toBe(5000);
    });

    it('BUG-142: moving a multi-selection updates every object’s rest position', () => {
        const a = rect(10);
        const b = rect(200);
        canvas.add(a, b);
        useStore.setState({
            tracks: { [ensureAnimId(a)]: slide(a), [ensureAnimId(b)]: slide(b) },
        } as any);
        const sel = new fabric.ActiveSelection([a, b], { canvas } as any);
        sel.set({ left: sel.left + 100 });
        sel.setCoords();
        canvas.fire('object:modified', { target: sel });
        expect(state().tracks[ensureAnimId(a)].rest.left).toBeCloseTo(110, 0);
        expect(state().tracks[ensureAnimId(b)].rest.left).toBeCloseTo(300, 0);
    });
});
