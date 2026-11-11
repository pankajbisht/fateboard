/**
 * Pen (P), Pencil (Shift + P) and Laser pointer (K).
 * - Pen: click = corner point, drag = smooth point, click the first point = closed shape, Enter /
 *   Escape = finish an open path, Backspace = remove the last point. The result is one path, one undo
 *   step, selected in the Select tool so it can be edited with the Node tool.
 * - Pencil: freehand line in the drawing colour with its own fixed style; the Draw panel's brush
 *   settings are not touched.
 * - Laser: a fading trail on the top canvas; nothing is added to the document.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';

let canvas: fabric.Canvas;
let prev: any;
const state = () => useStore.getState() as any;
const objects = () => canvas.getObjects() as any[];

const pointer = (name: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
    canvas.fire(
        name as any,
        {
            e: { button: 0, preventDefault() {}, ...extra },
            scenePoint: new fabric.Point(x, y),
        } as any,
    );
const click = (x: number, y: number) => {
    pointer('mouse:down', x, y);
    pointer('mouse:up', x, y);
};
const key = (k: string) => {
    const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    window.dispatchEvent(e);
    return e;
};

beforeEach(() => {
    prev = { ...useStore.getState() };
    canvas = new fabric.Canvas(document.createElement('canvas'), {
        width: 1200,
        height: 600,
        renderOnAddRemove: false,
    });
    const noPaint = canvas as unknown as Record<string, () => void>;
    noPaint.renderAll = () => undefined;
    noPaint.renderCanvas = () => undefined;
    noPaint.renderTop = () => undefined;
    noPaint.clearContext = () => undefined;
    // jsdom's 2D context has no paths: the tools skip painting without a top canvas
    Object.defineProperty(canvas, 'contextTop', { value: undefined, configurable: true });
    useStore.setState({
        canvas,
        boardMode: 'whiteboard',
        activeTool: 'select',
        pages: [],
        currentPageId: null,
    } as any);
});
afterEach(() => {
    state().setActiveTool('select');
    useStore.setState({
        canvas: prev.canvas,
        boardMode: prev.boardMode,
        activeTool: 'select',
    } as any);
    void canvas.dispose();
});

describe('Pen tool', () => {
    it('turns selection off and shows a crosshair', () => {
        state().setActiveTool('pen');
        expect(canvas.selection).toBe(false);
        expect(canvas.skipTargetFind).toBe(true);
        expect(canvas.defaultCursor).toBe('crosshair');
    });

    it('clicks and a drag make a closed shape when the first point is clicked again', () => {
        state().setActiveTool('pen');
        click(100, 100);
        click(300, 100);
        pointer('mouse:down', 300, 300);
        pointer('mouse:move', 400, 300); // drag = smooth point
        pointer('mouse:up', 400, 300);
        expect(state().penPointCount).toBe(3);
        click(102, 101); // near the first point

        const [path] = objects();
        expect(objects()).toHaveLength(1);
        expect(path.type).toBe('path');
        const d = path.path.map((c: any[]) => c[0]).join('');
        expect(d).toBe('MLCCZ');
        expect(path.stroke).toBe('#000000');
        expect(path.strokeWidth).toBe(2); // whiteboard at 100 %
        expect(state().activeTool).toBe('select');
        expect(canvas.getActiveObject()).toBe(path);
        expect(state().penPointCount).toBe(0);
    });

    it('Enter finishes an open path; it has no fill', () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(100, 50);
        key('Enter');
        const [path] = objects();
        expect(path.path.map((c: any[]) => c[0]).join('')).toBe('ML');
        expect(path.fill).toBe('rgba(0,0,0,0)'); // the "no fill" of open shapes
    });

    it('Backspace removes the last point and never deletes the selection', () => {
        const other = new fabric.Rect({ width: 10, height: 10 });
        canvas.add(other);
        state().setActiveTool('pen');
        click(0, 0);
        click(50, 50);
        const e = key('Backspace');
        expect(e.defaultPrevented).toBe(true);
        expect(state().penPointCount).toBe(1);
        expect(objects()).toEqual([other]);
    });

    it('Escape with a single point cancels; nothing is added', () => {
        state().setActiveTool('pen');
        click(10, 10);
        key('Escape');
        expect(objects()).toHaveLength(0);
        expect(state().penPointCount).toBe(0);
    });

    it('changing tool keeps a path that has two points or more', () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(80, 0);
        state().setActiveTool('pan');
        expect(objects()).toHaveLength(1);
    });
});

describe('Pencil tool', () => {
    it('draws in the drawing colour with its own style; the Draw brush settings stay', () => {
        state().setBrush({ brush: 'marker', color: '#ff0000' });
        const drawWidth = state().width;
        state().setActiveTool('pencil');

        expect(canvas.isDrawingMode).toBe(true);
        const brush = canvas.freeDrawingBrush as any;
        expect(brush).toBeInstanceOf(fabric.PencilBrush);
        expect(brush.width).toBe(2);
        expect(brush.color).toBe('rgba(255, 0, 0, 1)'); // the drawing colour (#ff0000)
        expect(state().brush).toBe('marker');
        expect(state().width).toBe(drawWidth);

        state().setActiveTool('draw');
        expect((canvas.freeDrawingBrush as any).width).toBe(drawWidth);
    });

    it('a pencil line gets no Draw effects (blend, opacity, mirror)', () => {
        state().setBrush({ brush: 'marker' });
        state().updateBrush({ blend: 'multiply', brushOpacity: 0.3 });
        state().setActiveTool('pencil');
        const path = new fabric.Path('M 0 0 L 10 10');
        canvas.fire('before:path:created', { path } as any);
        expect(path.opacity).toBe(1);
        expect(path.globalCompositeOperation).toBe('source-over');
        expect((path as any).isFreehand).toBe(true);
    });
});

describe('Laser pointer', () => {
    it('draws a trail but never adds anything to the document', () => {
        const saveState = vi.fn();
        const original = state().saveState;
        useStore.setState({ saveState } as any);
        state().setActiveTool('laser');
        expect(canvas.selection).toBe(false);
        pointer('mouse:down', 10, 10);
        pointer('mouse:move', 50, 50);
        pointer('mouse:move', 90, 40);
        pointer('mouse:up', 90, 40);
        expect(objects()).toHaveLength(0);
        expect(state().laserStrokeCount).toBe(1);
        expect(saveState).not.toHaveBeenCalled();
        useStore.setState({ saveState: original } as any);
    });
});
