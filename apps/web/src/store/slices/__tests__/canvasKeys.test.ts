/** Select all, arrow-key nudge and hold-Space pan: the store actions behind the keys. */
import * as fabric from 'fabric';
import { describe, expect, it, vi } from 'vitest';

import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

import { createCanvasSlice } from '../createCanvasSlice';
import { createLayersSlice } from '../createLayersSlice';
import { createTransformSlice } from '../createTransformSlice';

/* eslint-disable @typescript-eslint/no-explicit-any */

const rect = (left = 0, extra: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left,
        top: 5,
        width: 10,
        height: 10,
        originX: 'left',
        originY: 'top',
        ...extra,
    });

describe('selectAllObjects', () => {
    const setup = (objects: any[]) => {
        const canvas = createFakeCanvas(objects);
        const h = createHarness([createLayersSlice as never], { canvas, saveState: vi.fn() });
        return { canvas, h };
    };

    it('selects every object, as one selection', () => {
        const a = rect(0);
        const b = rect(20);
        const { canvas, h } = setup([a, b]);

        expect(h.get().selectAllObjects()).toBe(true);

        expect(canvas.getActiveObject()).toBeInstanceOf(fabric.ActiveSelection);
        expect(canvas.getActiveObject().getObjects()).toEqual([a, b]);
    });

    it('selects a lone object directly', () => {
        const a = rect(0);
        const { canvas, h } = setup([a]);
        h.get().selectAllObjects();
        expect(canvas.getActiveObject()).toBe(a);
    });

    it('leaves out locked, hidden, unselectable and helper objects', () => {
        const a = rect(0);
        const { canvas, h } = setup([
            a,
            rect(20, { _locked: true }),
            rect(40, { visible: false }),
            rect(60, { selectable: false }),
            rect(80, { excludeFromExport: true }),
        ]);
        h.get().selectAllObjects();
        expect(canvas.getActiveObject()).toBe(a);
    });

    it('reports nothing to select on an empty board', () => {
        const { canvas, h } = setup([]);
        expect(h.get().selectAllObjects()).toBe(false);
        expect(canvas.getActiveObject()).toBeFalsy();
    });
});

describe('nudgeSelection', () => {
    const setup = (object: any) => {
        const canvas = createFakeCanvas([object]);
        canvas.setActiveObject(object);
        const modified = vi.fn();
        canvas.on('object:modified', modified);
        const h = createHarness([createTransformSlice as never], { canvas });
        return { canvas, h, modified };
    };

    it('moves the selection and records it as a change', () => {
        const a = rect(10);
        const { canvas, h, modified } = setup(a);
        const renders = canvas.renderCount();

        expect(h.get().nudgeSelection(-1, 10)).toBe(true);

        expect(a.left).toBe(9);
        expect(a.top).toBe(15);
        expect(modified).toHaveBeenCalledWith({ target: a });
        expect(canvas.renderCount()).toBeGreaterThan(renders);
    });

    it.each([
        ['locked horizontally', { lockMovementX: true }],
        ['locked vertically', { lockMovementY: true }],
        ['a helper', { excludeFromExport: true }],
    ])('does not move an object that is %s', (_name, extra) => {
        const a = rect(10, extra);
        const { h, modified } = setup(a);

        expect(h.get().nudgeSelection(1, 0)).toBe(false);

        expect(a.left).toBe(10);
        expect(modified).not.toHaveBeenCalled();
    });

    it('does nothing with no selection', () => {
        const canvas = createFakeCanvas([]);
        const h = createHarness([createTransformSlice as never], { canvas });
        expect(h.get().nudgeSelection(1, 0)).toBe(false);
    });
});

describe('temporary pan', () => {
    const setup = (objects: any[] = [], activeTool = 'select') => {
        const canvas: any = Object.assign(createFakeCanvas(objects), {
            setCursor: vi.fn(),
            selection: activeTool === 'select',
            isDrawingMode: activeTool === 'draw',
            skipTargetFind: false,
            defaultCursor: 'default',
        });
        const h = createHarness([createCanvasSlice as never], { boardMode: 'whiteboard' });
        h.set({ canvas, activeTool });
        return { canvas, h };
    };

    it('turns the pointer into a hand, and puts everything back', () => {
        const { canvas, h } = setup();

        expect(h.get().beginTemporaryPan()).toBe(true);
        expect(canvas.selection).toBe(false);
        expect(canvas.skipTargetFind).toBe(true);
        expect(canvas.defaultCursor).toBe('grab');
        expect(h.get().activeTool).toBe('select');

        h.get().endTemporaryPan();
        expect(canvas.selection).toBe(true);
        expect(canvas.skipTargetFind).toBe(false);
        expect(canvas.defaultCursor).toBe('default');
    });

    it('stops drawing for the moment, and goes back to it', () => {
        const { canvas, h } = setup([], 'draw');
        h.get().beginTemporaryPan();
        expect(canvas.isDrawingMode).toBe(false);
        h.get().endTemporaryPan();
        expect(canvas.isDrawingMode).toBe(true);
    });

    it('drags the view while held', () => {
        const { canvas, h } = setup();
        h.get().beginTemporaryPan();

        canvas.fire('mouse:down', { e: { button: 0 } });
        expect(h.get().isPanning).toBe(true);

        canvas.fire('mouse:up', {});
        expect(h.get().isPanning).toBe(false);
    });

    it('stops listening to the pointer after release', () => {
        const { canvas, h } = setup();
        h.get().beginTemporaryPan();
        h.get().endTemporaryPan();

        canvas.fire('mouse:down', { e: { button: 0 } });
        expect(h.get().isPanning).toBeFalsy();
    });

    it('brings back a selection that a click on the board dropped', () => {
        const a = rect(0);
        const { canvas, h } = setup([a]);
        canvas.setActiveObject(a);

        h.get().beginTemporaryPan();
        canvas.discardActiveObject();
        h.get().endTemporaryPan();

        expect(canvas.getActiveObject()).toBe(a);
    });

    it('does not bring back an object that was removed meanwhile', () => {
        const a = rect(0);
        const { canvas, h } = setup([a]);
        canvas.setActiveObject(a);

        h.get().beginTemporaryPan();
        canvas.discardActiveObject();
        canvas.remove(a);
        h.get().endTemporaryPan();

        expect(canvas.getActiveObject()).toBeFalsy();
    });

    it.each(['pan', 'node'])('stays out of the way of the %s tool', (tool) => {
        const { h } = setup([], tool);
        expect(h.get().beginTemporaryPan()).toBe(false);
    });

    it('stays out of the way of a session that owns the pointer (line drawing)', () => {
        const { canvas, h } = setup();
        canvas.selection = false;
        expect(h.get().beginTemporaryPan()).toBe(false);
    });

    it('starts only once while the key repeats', () => {
        const { canvas, h } = setup();
        h.get().beginTemporaryPan();
        expect(h.get().beginTemporaryPan()).toBe(false);
        h.get().endTemporaryPan();
        expect(canvas.selection).toBe(true);
    });
});
