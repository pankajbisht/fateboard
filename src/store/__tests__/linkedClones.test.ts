/**
 * Duplicate / copy-paste / linked clones (Affinity "symbols", Inkscape Alt+D model):
 * - Duplicate (⌘D): independent copy, exactly on top of the original, one layer above it.
 * - Copy / paste: independent copy, offset per paste (unchanged).
 * - Clone (⌥D): LINKED copy on top of the original. All copies in a link share look and shape;
 *   each keeps its own position / rotation / flip. Editing any copy updates the others.
 * - Unlink (⇧⌥D), Link (selection), Select linked. The link is a saved `linkId`, so it survives
 *   undo / redo, page switches and reload.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { CUSTOM_PROPS } from '@/lib/serialization';

/* eslint-disable @typescript-eslint/no-explicit-any */

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
const settle = () => tick(200);
const objs = () => canvas.getObjects() as any[];

const rect = (props: Record<string, unknown> = {}) => {
    const r = new fabric.Rect({
        left: 100,
        top: 100,
        width: 80,
        height: 40,
        fill: '#ff0000',
        originX: 'left',
        originY: 'top',
        ...props,
    });
    r.setCoords();
    return r;
};
const select = (...list: any[]) => {
    canvas.discardActiveObject();
    if (list.length === 1) canvas.setActiveObject(list[0]);
    else canvas.setActiveObject(new fabric.ActiveSelection(list, { canvas }));
};
/** What a style action does: change the SELECTED object, then record one undo step. */
const edit = (obj: any, props: Record<string, unknown>) => {
    if (canvas.getActiveObject() !== obj) canvas.setActiveObject(obj);
    obj.set(props);
    state().saveState();
};

beforeEach(() => {
    prev = { ...useStore.getState() };
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    useStore.setState({ canvas, clipboard: null } as any);
    state().registerCanvasEvents(canvas);
    state().initHistory();
});

afterEach(() => {
    state().unregisterCanvasEvents(canvas);
    state().clearHistory();
    useStore.setState({ canvas: prev.canvas, clipboard: null } as any);
});

describe('duplicate (⌘D)', () => {
    it('lands exactly on top of the original, one layer above it, as an independent copy', async () => {
        const a = rect({ id: 'a', name: 'Box' });
        const top = rect({ left: 400 });
        canvas.add(a, top);
        select(a);

        await state().duplicate();

        expect(objs()).toHaveLength(3);
        const copy = objs()[1]; // right above the original, below the other shape
        expect(copy).not.toBe(a);
        expect(copy).toMatchObject({ left: 100, top: 100, name: 'Box copy' });
        expect(copy.id).not.toBe('a');
        expect(copy.linkId).toBeUndefined();
        expect(canvas.getActiveObject()).toBe(copy);
    });

    it('duplicating a linked clone gives an independent copy', async () => {
        const a = rect();
        canvas.add(a);
        select(a);
        await state().clone();
        await state().duplicate();
        expect(objs()[2].linkId).toBeUndefined();
    });
});

describe('copy / paste (unchanged)', () => {
    it('pastes an independent copy, offset per paste', async () => {
        const a = rect();
        canvas.add(a);
        select(a);
        await state().clone(); // a is linked now
        select(a);
        await state().copy();
        await state().paste();
        const pasted = objs().at(-1);
        expect(pasted.left).toBe(112);
        expect(pasted.linkId).toBeUndefined();
    });
});

describe('copies keep what features rely on', () => {
    it('a pasted or duplicated text shape is still a text shape (custom data kept)', async () => {
        const g: any = new fabric.Group([rect({ left: 0, top: 0 }), new fabric.Textbox('Note')]);
        Object.assign(g, { isTextShape: true, customType: 'shape', textInset: 0.8 });
        canvas.add(g);
        select(g);
        await state().copy();
        await state().paste();
        select(g);
        await state().duplicate();
        for (const copy of objs().slice(1)) {
            expect(copy).toMatchObject({ isTextShape: true, customType: 'shape', textInset: 0.8 });
        }
    });
});

describe('linked clone (⌥D)', () => {
    it('is placed on top of the original and shares a link with it', async () => {
        const a = rect();
        canvas.add(a);
        select(a);
        await state().clone();

        const [orig, clone] = objs();
        expect(clone).toMatchObject({ left: 100, top: 100 });
        expect(orig.linkId).toBeTruthy();
        expect(clone.linkId).toBe(orig.linkId);
        expect(canvas.getActiveObject()).toBe(clone);
        expect(CUSTOM_PROPS).toContain('linkId'); // saved with undo / pages / autosave
    });

    it('editing any copy updates the others: look and size follow, position and rotation stay', async () => {
        const a = rect();
        canvas.add(a);
        select(a);
        await state().clone();
        const [orig, clone] = objs();
        clone.set({ left: 400, angle: 30 });

        edit(orig, { fill: '#00ff00', stroke: '#000000', strokeWidth: 4, scaleX: 2 });
        expect(clone).toMatchObject({
            fill: '#00ff00',
            stroke: '#000000',
            strokeWidth: 4,
            scaleX: 2,
            left: 400,
            angle: 30,
        });

        select(clone);
        edit(clone, { fill: '#0000ff', opacity: 0.5 });
        expect(orig).toMatchObject({ fill: '#0000ff', opacity: 0.5, left: 100, angle: 0 });
    });

    it('text clones share their text', async () => {
        const t = new fabric.Textbox('Hello', { left: 10, top: 10, width: 200 });
        canvas.add(t);
        select(t);
        await state().clone();
        const [orig, clone] = objs();
        clone.set({ left: 300 });
        edit(orig, { text: 'Changed', fontSize: 50 });
        expect(clone).toMatchObject({ text: 'Changed', fontSize: 50, left: 300 });
    });

    it('a linked group (e.g. text shape) syncs its parts', async () => {
        const g: any = new fabric.Group([rect({ left: 0, top: 0 }), new fabric.Textbox('A')]);
        canvas.add(g);
        select(g);
        await state().clone();
        const [orig, clone] = objs();
        orig.getObjects()[0].set({ fill: '#123456' });
        orig.getObjects()[1].set({ text: 'B' });
        edit(orig, {});
        expect(clone.getObjects()[0].fill).toBe('#123456');
        expect(clone.getObjects()[1].text).toBe('B');
    });

    it('when a copy changes kind (node tool turns a rect into a path), the others follow at their place', async () => {
        const a = rect();
        canvas.add(a);
        select(a);
        await state().clone();
        const clone = objs()[1];
        clone.set({ left: 500, top: 300 });
        clone.setCoords();

        select(objs()[0]);
        state().enterNodeMode();
        state().moveSelectedNode(90, 90);
        state().exitNodeMode();
        await settle();

        const [p1, p2] = objs();
        expect(p1).toBeInstanceOf(fabric.Path);
        expect(p2).toBeInstanceOf(fabric.Path);
        expect(p2.linkId).toBe(p1.linkId);
        expect(p2.path).toEqual(p1.path);
        expect(p2.left).not.toBe(p1.left); // still at its own place
    });

    it('stays linked after undo / redo (the link is saved data, not a memory reference)', async () => {
        const a = rect();
        canvas.add(a);
        select(a);
        await state().clone();
        await settle();
        edit(objs()[0], { fill: '#00ff00' });
        await settle();

        await state().undo();
        expect(objs().map((o) => o.fill)).toEqual(['#ff0000', '#ff0000']);
        await state().redo();
        expect(objs().map((o) => o.fill)).toEqual(['#00ff00', '#00ff00']);

        // still linked after the restore: the link is in the saved data (the fake canvas restores
        // plain objects; the live re-sync after a restore is covered by e2e/clone.spec.ts)
        const [o1, o2] = objs();
        expect(o1.linkId).toBeTruthy();
        expect(o2.linkId).toBe(o1.linkId);
    });
});

describe('unlink / link / select linked', () => {
    it('Unlink makes the selected copy independent; a lone remaining copy is unlinked too', async () => {
        const a = rect();
        canvas.add(a);
        select(a);
        await state().clone();
        const [orig, clone] = objs();

        select(clone);
        expect(state().unlinkClone()).toBe(true);
        expect(clone.linkId).toBeUndefined();
        expect(orig.linkId).toBeUndefined();

        edit(orig, { fill: '#00ff00' });
        expect(clone.fill).toBe('#ff0000');
    });

    it('Link copies: the selection takes the look of the bottom-most object and stays in sync', () => {
        const a: any = rect({ fill: '#111111' });
        const b: any = rect({ left: 300, fill: '#222222', width: 20 });
        canvas.add(a, b);
        select(a, b);
        expect(state().linkClones()).toBe(true);
        canvas.discardActiveObject(); // positions are relative while multi-selected
        expect(b).toMatchObject({ fill: '#111111', width: 80, left: 300 });
        expect(b.linkId).toBe(a.linkId);
    });

    it('Link needs objects of the same kind', () => {
        canvas.add(rect(), new fabric.Circle({ radius: 10 }));
        select(...objs());
        expect(state().linkClones()).toBe(false);
        expect(objs().every((o) => !o.linkId)).toBe(true);
    });

    it('Select linked selects every copy in the link', async () => {
        const a = rect();
        canvas.add(a, rect({ left: 500 }));
        select(a);
        await state().clone();
        await state().clone();
        select(a);
        state().selectLinked();
        const selected = canvas.getActiveObjects();
        expect(selected).toHaveLength(3);
        expect(new Set(selected.map((o: any) => o.linkId)).size).toBe(1);
    });
});
