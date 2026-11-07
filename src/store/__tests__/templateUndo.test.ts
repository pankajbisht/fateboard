/**
 * BUG-009 / decision Q11: applying a template never destroys work. It is ONE undo step, and a
 * toast offers "Undo" right away. Real store + fake canvas + real Fabric objects.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import type { DesignTemplate } from '@/components/organisms/effects/designTemplate.types';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { createMemoryBackend, projectStorage } from '@/lib/storage/projectStorage';

/* eslint-disable @typescript-eslint/no-explicit-any */

const TEMPLATE = {
    id: 'undo-template',
    name: 'Undo test',
    category: 'Social',
    sizeId: 'youtube-thumbnail',
    tags: [],
    objects: [
        { id: 'box', type: 'rect', left: 100, top: 50, width: 200, height: 100, fill: '#f00' },
        { id: 'dot', type: 'circle', left: 900, top: 400, radius: 50, fill: '#0f0' },
    ],
} as unknown as DesignTemplate;

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
/** my object by id, template objects (no id on canvas) by type */
const ids = () => canvas.getObjects().map((o: any) => o.id ?? String(o.type).toLowerCase());
const settle = () => tick(200); // history is debounced (150 ms)

beforeEach(async () => {
    prev = { ...useStore.getState() };
    projectStorage.useBackend(createMemoryBackend());
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    useStore.setState({
        canvas,
        pages: [],
        currentPageId: null,
        designTemplates: [TEMPLATE],
        toast: null,
    } as any);
    state().registerCanvasEvents(canvas);
    state().initHistory();
    canvas.add(new fabric.Rect({ id: 'mine', left: 10, top: 10, width: 40, height: 40 } as any));
    await settle();
});

afterEach(() => {
    state().unregisterCanvasEvents(canvas);
    state().clearHistory();
    state().dismissToast?.();
    useStore.setState({
        canvas: prev.canvas,
        pages: prev.pages,
        currentPageId: null,
        designTemplates: prev.designTemplates,
    } as any);
});

describe('apply template (BUG-009)', () => {
    it('is one undo step: undo brings the previous content back, redo re-applies', async () => {
        await state().applyDesignTemplate('undo-template');
        await settle();
        expect(ids()).not.toContain('mine');
        expect(ids()).toEqual(expect.arrayContaining(['rect', 'circle']));

        await state().undo();
        expect(ids()).toEqual(['mine']);
        expect(canvas.clipPath).toBeUndefined();

        await state().redo();
        expect(ids()).toEqual(expect.arrayContaining(['rect', 'circle']));
        expect(ids()).not.toContain('mine');
    });

    it('shows a toast whose Undo action restores the previous content', async () => {
        await state().applyDesignTemplate('undo-template');
        await settle();

        const toast = state().toast;
        expect(toast?.message).toMatch(/template/i);
        expect(toast?.actionLabel).toBe('Undo');

        await state().runToastAction();
        expect(ids()).toEqual(['mine']);
        expect(state().toast).toBeNull();
    });
});
