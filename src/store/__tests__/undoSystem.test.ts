/**
 * Whole-system undo / redo on the REAL store (all slices composed) with a fake canvas and real
 * Fabric objects: the canvas history is the one behind `undo` / `redo`, every content change is
 * recorded, custom data survives, and each page keeps its own history (owner decision Q7).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
const types = () => canvas.getObjects().map((o: any) => String(o.type).toLowerCase());
const settle = () => tick(200); // history is debounced (150 ms)

const rect = (props: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left: 10,
        top: 10,
        width: 50,
        height: 40,
        originX: 'left',
        originY: 'top',
        ...props,
    });

beforeEach(() => {
    prev = { ...useStore.getState() };
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    useStore.setState({ canvas, pages: [], currentPageId: null } as any);
    state().registerCanvasEvents(canvas);
    state().initHistory();
});

afterEach(() => {
    state().unregisterCanvasEvents(canvas);
    state().clearHistory();
    useStore.setState({ canvas: prev.canvas, pages: prev.pages, currentPageId: null } as any);
});

describe('canvas undo / redo', () => {
    it('adding, moving and deleting are each one undo step, and redo re-applies them', async () => {
        const r = rect();
        canvas.add(r); // object:added
        await settle();
        r.set({ left: 200 });
        canvas.fire('object:modified', { target: r });
        await settle();
        canvas.remove(r); // object:removed
        await settle();
        expect(canvas.getObjects()).toHaveLength(0);

        await state().undo(); // delete undone
        expect(canvas.getObjects()).toHaveLength(1);
        expect(canvas.getObjects()[0].left).toBe(200);

        await state().undo(); // move undone
        expect(canvas.getObjects()[0].left).toBe(10);

        await state().undo(); // add undone
        expect(canvas.getObjects()).toHaveLength(0);
        expect(state().canUndo).toBe(false);

        await state().redo();
        await state().redo();
        expect(canvas.getObjects()[0].left).toBe(200);
        expect(state().canRedo).toBe(true);
    });

    it('fast repeated presses all count (queued, never dropped while a restore runs)', async () => {
        canvas.add(rect());
        await settle();
        canvas.add(rect({ left: 100 }));
        await settle();
        canvas.add(rect({ left: 200 }));
        await settle();

        // three presses in a row, no waiting between them
        await Promise.all([state().undo(), state().undo(), state().undo()]);
        expect(canvas.getObjects()).toHaveLength(0);
        await Promise.all([state().redo(), state().redo()]);
        expect(canvas.getObjects()).toHaveLength(2);
    });

    it('the animation keyframe history is separate (animUndo) and does not touch the canvas', async () => {
        canvas.add(rect());
        await settle();
        expect(typeof state().animUndo).toBe('function');
        state().animUndo();
        expect(canvas.getObjects()).toHaveLength(1);
    });

    it('undo keeps the data features rely on (text shapes, connectors, layers, locks, filters)', async () => {
        const custom = {
            id: 'L1',
            name: 'Logo',
            customType: 'shape',
            customId: 'c1',
            shapeId: 's1',
            textInset: 0.9,
            connectorData: { from: 'a', to: 'b' },
            filterState: { brightness: 0.2 },
            _locked: true,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            animId: 'anim-1',
        };
        canvas.add(rect(custom));
        await settle();
        canvas.add(rect({ left: 300 }));
        await settle();

        await state().undo();
        expect(canvas.getObjects()).toHaveLength(1);
        expect(canvas.getObjects()[0]).toMatchObject(custom);
    });

    it('helpers (node editor path, guides, connector handles) are not recorded', async () => {
        canvas.add(rect({ excludeFromExport: true }));
        await settle();
        expect(state().canUndo).toBe(false);
    });

    it('undo while editing nodes cancels the edit instead of loading over it', async () => {
        const r = rect();
        canvas.add(r);
        await settle();
        canvas.setActiveObject(r);
        state().enterNodeMode();
        expect(state().nodeMode).toBe(true);

        await state().undo();
        expect(state().nodeMode).toBe(false);
        expect(canvas.getObjects()).toEqual([r]); // the shape is back, nothing else undone yet
    });
});

describe('per-page history (Q7)', () => {
    const page = () => state().currentPageId as string;

    it('each page undoes only its own changes, and keeps its history when you come back', async () => {
        canvas.backgroundColor = null; // design pages draw no canvas background; loading a page sets it
        state().initHistory();
        state().initPages();
        const p1 = page();
        canvas.add(rect({ name: 'on page 1' }));
        await settle();

        const p2 = await state().addPage(); // switches to the new page
        expect(page()).toBe(p2);
        await settle();
        expect(state().canUndo).toBe(false); // a new page starts with a clean history

        canvas.add(rect({ name: 'on page 2' }));
        await settle();
        await state().undo();
        expect(canvas.getObjects()).toHaveLength(0); // page 2 back to empty, page 1 untouched
        await state().undo(); // nothing more on page 2: must NOT load page 1 content
        expect(canvas.getObjects()).toHaveLength(0);

        await state().switchPage(p1);
        await settle();
        expect(canvas.getObjects().map((o: any) => o.name)).toEqual(['on page 1']);
        expect(state().canUndo).toBe(true); // page 1 history survived the visit to page 2
        await state().undo();
        expect(canvas.getObjects()).toHaveLength(0);

        await state().switchPage(p2);
        await settle();
        expect(state().canRedo).toBe(true); // page 2 keeps its redo too
        await state().redo();
        expect(canvas.getObjects().map((o: any) => o.name)).toEqual(['on page 2']);
    });

    it('loading a page is not recorded as an edit', async () => {
        state().initPages();
        canvas.add(rect());
        await settle();
        const p1 = page();
        await state().addPage();
        await settle();
        await state().switchPage(p1);
        await settle();
        expect(state().undoStack).toHaveLength(2); // base + the one add
        expect(types()).toEqual(['rect']);
    });
});
