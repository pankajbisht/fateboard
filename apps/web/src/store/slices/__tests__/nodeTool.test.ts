/**
 * Node tool (left rail): pick it, click a shape or drawn path, drag its nodes, Enter / click
 * outside / another tool to finish. Real store + fake canvas + real Fabric objects.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

let canvas: any;
let prev: any;

const rect = (props: Record<string, unknown> = {}) => {
    const r = new fabric.Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        originX: 'left',
        originY: 'top',
        fill: '#ff0000',
        ...props,
    });
    r.setCoords();
    return r;
};

const pointer = (type: string, x: number, y: number) =>
    canvas.fire(type, { e: { button: 0 }, scenePoint: new fabric.Point(x, y) });
const click = (x: number, y: number) => {
    pointer('mouse:down', x, y);
    pointer('mouse:up', x, y);
};
const drag = (from: [number, number], to: [number, number]) => {
    pointer('mouse:down', ...from);
    pointer('mouse:move', (from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
    pointer('mouse:move', ...to);
    pointer('mouse:up', ...to);
};
const key = (k: string) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
const state = () => useStore.getState() as any;

beforeEach(() => {
    prev = useStore.getState();
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    canvas.selection = true;
    canvas.skipTargetFind = false;
    canvas.defaultCursor = 'default';
    useStore.setState({ canvas } as any);
});

afterEach(() => {
    state().nodeEditor?.cancel();
    if (state().activeTool !== 'select') state().setActiveTool('select');
    useStore.setState({ canvas: prev.canvas } as any);
});

describe('node tool', () => {
    it('with nothing selected, clicking a shape starts editing it', () => {
        const r = rect();
        canvas.add(r);
        state().setActiveTool('node');
        expect(state().nodeMode).toBe(false);

        click(150, 125);

        expect(state().nodeMode).toBe(true);
        expect(state().activePath).toBeInstanceOf(fabric.Path);
    });

    it('a shape selected before picking the tool is edited right away', () => {
        const r = rect();
        canvas.add(r);
        canvas.setActiveObject(r);
        state().setActiveTool('node');
        expect(state().nodeMode).toBe(true);
    });

    it('commit keeps the result selectable, movable and keeps its identity', () => {
        const r = rect({ id: 'r1', name: 'Box', customType: 'shape' } as any);
        canvas.add(r);
        state().setActiveTool('node');
        click(150, 125);

        drag([100, 100], [80, 70]); // top-left node
        key('Enter');

        const objs = canvas.getObjects();
        expect(objs).toHaveLength(1);
        const out = objs[0];
        expect(out).toBeInstanceOf(fabric.Path);
        expect(out).toMatchObject({
            selectable: true,
            evented: true,
            lockMovementX: false,
            lockMovementY: false,
            visible: true,
            id: 'r1',
            name: 'Box',
            customType: 'shape',
        });
        expect(out.getBoundingRect().left).toBeCloseTo(80, 0);
        expect(state().nodeMode).toBe(false);
        expect(state().activeTool).toBe('node');
    });

    it('after a commit, clicking another shape edits that one', () => {
        const a = rect();
        const b = rect({ left: 400 });
        canvas.add(a, b);
        state().setActiveTool('node');
        click(150, 125);
        key('Enter');

        click(450, 125);

        expect(state().nodeMode).toBe(true);
        expect(canvas.getObjects().includes(b)).toBe(true);
        expect(b.visible).toBe(true);
    });

    it('while editing, clicking another shape switches to it; empty canvas ends editing', () => {
        const a = rect();
        const b = rect({ left: 400 });
        canvas.add(a, b);
        state().setActiveTool('node');
        click(150, 125);
        const first = state().nodeEditor;

        click(450, 125);
        expect(state().nodeMode).toBe(true);
        expect(state().nodeEditor).not.toBe(first);

        click(700, 500);
        expect(state().nodeMode).toBe(false);
        expect(state().activeTool).toBe('node');
    });

    it('switching to another tool finishes the edit (no hidden source, no working path left)', () => {
        const r = rect();
        canvas.add(r);
        state().setActiveTool('node');
        click(150, 125);
        drag([100, 100], [90, 90]);

        state().setActiveTool('select');

        expect(state().nodeMode).toBe(false);
        expect(canvas.getObjects()).toHaveLength(1);
        expect(canvas.getObjects()[0]).toBeInstanceOf(fabric.Path);
        expect(canvas.selection).toBe(true);
        expect(canvas.skipTargetFind).toBe(false);
    });

    it('picking and leaving the tool does not touch other objects (locks survive, BUG-024)', () => {
        const locked = new fabric.Path('M 0 0 L 50 50', {
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            _locked: true,
        } as any);
        const free = new fabric.Path('M 0 0 L 80 10');
        canvas.add(locked, free);

        state().setActiveTool('node');
        expect(free).toMatchObject({ selectable: true, evented: true });
        state().setActiveTool('select');

        expect(locked).toMatchObject({
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
        });
    });

    it('locked objects and connectors are not editable', () => {
        canvas.add(
            rect({ _locked: true } as any),
            rect({ left: 400, customType: 'connector' } as any),
        );
        state().setActiveTool('node');
        click(150, 125);
        expect(state().nodeMode).toBe(false);
        click(450, 125);
        expect(state().nodeMode).toBe(false);
    });

    it('the shape being edited stays visible in saved data (autosave / page capture mid-edit)', () => {
        const r = rect();
        canvas.add(r);
        state().setActiveTool('node');
        click(150, 125);

        expect(r.visible).toBe(true);
        expect(r.toObject().visible).toBe(true);
    });

    it('Escape with no edit in progress goes back to the Select tool', () => {
        canvas.add(rect());
        state().setActiveTool('node');
        click(150, 125);
        key('Escape'); // finishes the edit
        expect(state().activeTool).toBe('node');
        key('Escape'); // leaves the tool
        expect(state().activeTool).toBe('select');
    });

    it('nodes are grabbable at the on-screen size when the page is shown scaled (design fit)', () => {
        // page drawn at half size: 1 screen px = 2 canvas px
        canvas.upperCanvasEl = { getBoundingClientRect: () => ({ width: 400, height: 300 }) };
        const r = rect();
        canvas.add(r);
        state().setActiveTool('node');
        click(150, 125);

        // 7 screen px right of the top-left node = 14 canvas px
        drag([114, 100], [114, 60]);

        const out = state().activePath as fabric.Path;
        expect(out.getBoundingRect().top).toBeCloseTo(60, 0);
    });
});

/** A text shape like the Shapes panel builds it: Group(box + Textbox), 200 × 100 at (100, 100). */
function textShape(box: fabric.FabricObject) {
    const text = new fabric.Textbox('Hi', {
        width: 150,
        originX: 'center',
        originY: 'center',
        left: 0,
        top: 0,
    });
    const group: any = new fabric.Group([box, text], {
        left: 100,
        top: 100,
        originX: 'left',
        originY: 'top',
        customType: 'shape',
    } as any);
    Object.assign(group, { isTextShape: true, textInset: 0.9, __box: box, __text: text });
    (text as any).__group = group;
    group.setCoords();
    return { group, box, text };
}

const sceneBox = (o: fabric.FabricObject) => {
    const b = o.getBoundingRect();
    return { left: b.left, top: b.top, width: b.width, height: b.height };
};

describe('node tool on text shapes (shape + text groups)', () => {
    const centered = { originX: 'center', originY: 'center', left: 0, top: 0 } as const;

    it('clicking a text shape edits its outline in place; the text stays', () => {
        const { group, box } = textShape(
            new fabric.Rect({ ...centered, width: 200, height: 100, fill: '#fff', strokeWidth: 0 }),
        );
        canvas.add(group);
        state().setActiveTool('node');

        click(200, 150);

        expect(state().nodeMode).toBe(true);
        expect(state().nodeEditor.source).toBe(box);
        // the editable outline sits exactly on the box (no jump)
        const wp = sceneBox(state().activePath);
        const b = sceneBox(box);
        expect(wp.left).toBeCloseTo(b.left, 3);
        expect(wp.top).toBeCloseTo(b.top, 3);
        expect(wp.width).toBeCloseTo(b.width, 3);
        expect(wp.height).toBeCloseTo(b.height, 3);
    });

    it('commit puts the new outline back into the same group, text kept, still a text shape', () => {
        const { group, text } = textShape(
            new fabric.Rect({ ...centered, width: 200, height: 100, fill: '#fff', strokeWidth: 0 }),
        );
        canvas.add(group);
        state().setActiveTool('node');
        click(200, 150);

        drag([100, 100], [60, 70]); // top-left node of the box
        key('Enter');

        expect(canvas.getObjects()).toEqual([group]);
        const objs = group.getObjects();
        expect(objs).toHaveLength(2);
        const outline = objs[0];
        expect(outline).toBeInstanceOf(fabric.Path);
        expect(group.__box).toBe(outline);
        expect(group.__text).toBe(text);
        expect(objs[1]).toBe(text);
        expect(group.isTextShape).toBe(true);
        expect(group.selectable).not.toBe(false);
        const out = sceneBox(outline);
        expect(out.left).toBeCloseTo(60, 0);
        expect(out.top).toBeCloseTo(70, 0);
        expect(out.left + out.width).toBeCloseTo(300, 0); // other corners did not move
        expect(out.top + out.height).toBeCloseTo(200, 0);
        // the text follows: centred on the new outline, wrapped inside it
        const t = sceneBox(text);
        expect(t.left + t.width / 2).toBeCloseTo(out.left + out.width / 2, 0);
        expect(t.top + t.height / 2).toBeCloseTo(out.top + out.height / 2, 0);
        expect(t.width).toBeLessThan(out.width);
    });

    it('a path outline (sticky note) is edited in place', () => {
        const path = new fabric.Path('M 0 0 H 100 V 70 L 70 100 H 0 Z', {
            ...centered,
            scaleX: 2,
            scaleY: 1,
            strokeWidth: 0,
        });
        const { group } = textShape(path);
        canvas.add(group);
        const before = sceneBox(path);
        state().setActiveTool('node');
        click(before.left + before.width / 2, before.top + before.height / 2);
        expect(state().nodeEditor.source).toBe(path);

        drag([before.left, before.top], [before.left - 20, before.top]);
        key('Enter');

        expect(group.getObjects()[0]).toBe(path);
        const after = sceneBox(path);
        expect(after.left).toBeCloseTo(before.left - 20, 0);
        expect(after.left + after.width).toBeCloseTo(before.left + before.width, 0);
    });

    it('cancel leaves the text shape untouched', () => {
        const { group, box } = textShape(
            new fabric.Ellipse({ ...centered, rx: 100, ry: 50, strokeWidth: 0 }),
        );
        canvas.add(group);
        state().setActiveTool('node');
        click(200, 150);
        drag([300, 150], [340, 150]);
        state().cancelNodeMode();

        expect(group.getObjects()[0]).toBe(box);
        expect(sceneBox(box).width).toBeCloseTo(200, 0);
    });
});

describe('switching between Select and node editing', () => {
    const dblclick = (target: unknown, x: number, y: number) =>
        canvas.fire('mouse:dblclick', {
            e: { button: 0 },
            target,
            scenePoint: new fabric.Point(x, y),
        });

    it('double-click a shape in Select edits its nodes; Enter goes back to Select with it selected', () => {
        const r = rect();
        canvas.add(r);
        canvas.setActiveObject(r);

        dblclick(r, 150, 125);
        expect(state().activeTool).toBe('node');
        expect(state().nodeMode).toBe(true);

        key('Enter');
        expect(state().activeTool).toBe('select');
        expect(state().nodeMode).toBe(false);
        expect(canvas.getActiveObject()).toBe(canvas.getObjects()[0]);
    });

    it('after a double-click edit, Escape and a click away also return to Select', () => {
        const a = rect();
        const b = rect({ left: 400 });
        canvas.add(a, b);

        dblclick(a, 150, 125);
        key('Escape');
        expect(state().activeTool).toBe('select');

        dblclick(a, 150, 125);
        click(450, 125); // on the other shape: it gets selected, no node editing
        expect(state().activeTool).toBe('select');
        expect(state().nodeMode).toBe(false);
        expect(canvas.getActiveObject()).toBe(b);
    });

    it('double-click on a text shape keeps editing its text (no node mode)', () => {
        const { group } = textShape(
            new fabric.Rect({ originX: 'center', originY: 'center', width: 200, height: 100 }),
        );
        canvas.add(group);
        dblclick(group, 200, 150);
        expect(state().activeTool).toBe('select');
        expect(state().nodeMode).toBe(false);
    });

    it('picking the Node tool from the rail stays in the tool after Enter', () => {
        canvas.add(rect());
        state().setActiveTool('node');
        click(150, 125);
        key('Enter');
        expect(state().activeTool).toBe('node');
    });
});
