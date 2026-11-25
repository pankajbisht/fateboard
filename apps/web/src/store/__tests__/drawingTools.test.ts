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
        penStyle: prev.penStyle,
        penMode: prev.penMode,
        pencilStyle: prev.pencilStyle,
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

describe('Pen tool: options and modifier keys', () => {
    const commands = (o: any) => o.path.map((c: any[]) => c.join(' '));

    it('draws with the Pen style; the fill is used on closed shapes only', () => {
        state().setPenStyle({
            stroke: '#ff0000',
            strokeWidth: 5,
            fill: '#00ff00',
            fillEnabled: true,
        });
        state().setActiveTool('pen');
        click(0, 0);
        click(100, 0);
        click(100, 100);
        click(1, 1); // close
        const [closed] = objects();
        expect(closed.stroke).toBe('#ff0000');
        expect(closed.strokeWidth).toBe(5);
        expect(closed.fill).toBe('#00ff00');

        state().setActiveTool('pen');
        click(0, 200);
        click(100, 200);
        key('Enter');
        expect(objects()[1].fill).toBe('rgba(0,0,0,0)');
    });

    it('rejects a bad style (width clamped, junk colour ignored)', () => {
        const before = state().penStyle.stroke;
        state().setPenStyle({ strokeWidth: -4, stroke: 'not a colour' });
        expect(state().penStyle.strokeWidth).toBe(0.5);
        expect(state().penStyle.stroke).toBe(before);
    });

    it('Shift snaps the new segment to 45° steps', () => {
        state().setActiveTool('pen');
        click(0, 0);
        pointer('mouse:down', 100, 10, { shiftKey: true });
        pointer('mouse:up', 100, 10, { shiftKey: true });
        key('Enter');
        const [, [, x, y]] = objects()[0].path;
        expect(y).toBeCloseTo(0);
        expect(x).toBeCloseTo(100.5, 1);
    });

    it('Shift snaps a dragged handle too', () => {
        state().setActiveTool('pen');
        click(0, 0);
        pointer('mouse:down', 100, 0);
        pointer('mouse:move', 150, 8, { shiftKey: true });
        pointer('mouse:up', 150, 8, { shiftKey: true });
        click(200, 0);
        key('Enter');
        const seg = objects()[0].path[2]; // C out(node 1) in(node 2) end
        expect(seg[2]).toBeCloseTo(0); // handle y snapped to 0°
    });

    it('Alt while dragging moves only the outgoing handle (a sharp curve corner)', () => {
        state().setActiveTool('pen');
        click(0, 0);
        pointer('mouse:down', 100, 0);
        pointer('mouse:move', 150, 0);
        pointer('mouse:move', 150, 50, { altKey: true });
        pointer('mouse:up', 150, 50, { altKey: true });
        click(200, 0);
        key('Enter');
        expect(commands(objects()[0])).toEqual([
            'M 0 0',
            'C 0 0 50 0 100 0', // the incoming handle stayed where the plain drag put it
            'C 150 50 200 0 200 0',
        ]);
    });

    it('clicking the end of an open path continues it: same object, one modify, no add', () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(100, 0);
        key('Enter');
        const [path] = objects();
        path.set({ left: path.left + 50 }); // moved: points are read in scene coordinates
        path.setCoords();
        const added = vi.fn();
        const modified = vi.fn();
        canvas.on('object:added', added);
        canvas.on('object:modified', modified);

        state().setActiveTool('pen');
        click(150, 0); // its end point
        expect(state().penPointCount).toBe(2);
        click(150, 100);
        key('Enter');

        expect(objects()).toEqual([path]);
        expect(added).not.toHaveBeenCalled();
        expect(modified).toHaveBeenCalledOnce();
        const ends = path.path.map((c: any[]) => c.slice(-2));
        expect(ends).toEqual([
            [50, 0],
            [150, 0],
            [150, 100],
        ]);
        expect(path.getBoundingRect().left).toBeCloseTo(49, 0); // stays where it was drawn
    });

    it('clicking the START of an open path continues from there', () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(100, 0);
        key('Enter');
        state().setActiveTool('pen');
        click(0, 0);
        click(0, -100);
        key('Enter');
        expect(objects()).toHaveLength(1);
        expect(objects()[0].path.map((c: any[]) => c.slice(-2))).toEqual([
            [100, 0],
            [0, 0],
            [0, -100],
        ]);
    });

    it('a closed shape is not continued: a click near its corner starts a new path', () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(100, 0);
        click(100, 100);
        click(1, 1);
        state().setActiveTool('pen');
        click(100, 0);
        expect(state().penPointCount).toBe(1);
    });
});

describe('Pen tool: keys inside a popover', () => {
    it('Escape that closes a toolbar popover does not also leave the Pen', () => {
        state().setActiveTool('pen');
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        const option = document.createElement('button');
        dialog.append(option);
        document.body.append(dialog);
        const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        option.dispatchEvent(e);
        expect(state().activeTool).toBe('pen');
        expect(e.defaultPrevented).toBe(false); // left for the popover
        dialog.remove();
    });
});

describe('Pen tool: review fixes (2026-11-13)', () => {
    const openPath = () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(100, 0);
        key('Enter');
        return objects()[0];
    };

    it('a continued path that left the canvas is not edited; the new points make a new path', () => {
        const path = openPath();
        state().setActiveTool('pen');
        click(100, 0); // continue it
        canvas.remove(path); // e.g. undo / another page loaded
        click(100, 100);
        key('Enter');
        expect(objects()).toHaveLength(1);
        expect(objects()[0]).not.toBe(path);
        expect(canvas.getActiveObject()).toBe(objects()[0]);
    });

    it('switching page drops the path being drawn', () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(50, 0);
        useStore.setState({ currentPageId: 'other' } as any);
        expect(state().penPointCount).toBe(0);
    });

    it('clicking an end and leaving without a new point changes nothing (no undo step)', () => {
        const path = openPath();
        path.set({ angle: 30, scaleX: 2 });
        const modified = vi.fn();
        canvas.on('object:modified', modified);
        state().setActiveTool('pen');
        const end = path.calcTransformMatrix();
        const tip = new fabric.Point(100 - path.pathOffset.x, 0 - path.pathOffset.y).transform(end);
        click(tip.x, tip.y);
        expect(state().penPointCount).toBe(2);
        key('Escape');
        expect(modified).not.toHaveBeenCalled();
        expect(path.angle).toBe(30);
        expect(path.scaleX).toBe(2);
    });

    it('changing tool during a Freeform drag keeps the stroke', () => {
        state().setPenMode('freeform');
        state().setActiveTool('pen');
        pointer('mouse:down', 0, 0);
        for (let i = 1; i <= 20; i++) pointer('mouse:move', i * 10, (i % 5) * 8);
        state().setActiveTool('select');
        expect(objects()).toHaveLength(1);
    });

    it('Enter on a focused button activates the button; it does not finish the path', () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(50, 0);
        const button = document.createElement('button');
        document.body.append(button);
        const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        button.dispatchEvent(e);
        expect(e.defaultPrevented).toBe(false);
        expect(state().penPointCount).toBe(2);
        button.remove();
    });
});

describe('Pen tool: modes', () => {
    const ends = (o: any) => o.path.map((c: any[]) => c.slice(-2));
    const letters = (o: any) => o.path.map((c: any[]) => c[0]).join('');

    it('Curvature: clicks make a smooth curve through every point', () => {
        state().setPenMode('curvature');
        state().setActiveTool('pen');
        click(0, 0);
        click(100, 50);
        click(200, 0);
        key('Enter');
        const [path] = objects();
        expect(letters(path)).toBe('MCC');
        expect(ends(path)).toEqual([
            [0, 0],
            [100, 50],
            [200, 0],
        ]);
    });

    it('Curvature: Alt + click places a sharp corner; clicking the first point closes', () => {
        state().setPenMode('curvature');
        state().setActiveTool('pen');
        click(0, 0);
        pointer('mouse:down', 100, 50, { altKey: true });
        pointer('mouse:up', 100, 50, { altKey: true });
        click(200, 0);
        click(1, 1);
        const [path] = objects();
        expect(path.path.at(-1)[0]).toBe('Z');
        const [, into, out] = path.path; // segments into and out of the corner
        expect(into.slice(3, 5)).toEqual([100, 50]); // no incoming handle
        expect(out.slice(1, 3)).toEqual([100, 50]); // no outgoing handle
    });

    it('Freeform: a drag becomes one simplified path, selected in the Select tool', () => {
        state().setPenMode('freeform');
        state().setActiveTool('pen');
        pointer('mouse:down', 0, 0);
        for (let i = 1; i <= 20; i++) pointer('mouse:move', i * 10, 0);
        pointer('mouse:up', 200, 0);
        expect(objects()).toHaveLength(1);
        expect(objects()[0].path).toHaveLength(2); // a straight drag = M + one segment
        expect(state().activeTool).toBe('select');
    });

    it('Freeform: ending near the start closes the shape', () => {
        state().setPenMode('freeform');
        state().setActiveTool('pen');
        pointer('mouse:down', 0, 0);
        for (let i = 1; i <= 36; i++) {
            const a = (i / 36) * Math.PI * 2;
            pointer('mouse:move', 100 - Math.cos(a) * 100, Math.sin(a) * 100);
        }
        pointer('mouse:up', 1, 0);
        expect(objects()[0].path.at(-1)[0]).toBe('Z');
    });

    it('ignores an unknown mode', () => {
        state().setPenMode('curvature');
        state().setPenMode('spray' as any);
        expect(state().penMode).toBe('curvature');
    });
});

describe('Pen tool: stroke shape', () => {
    const draw = () => {
        state().setActiveTool('pen');
        click(0, 0);
        click(100, 0);
        key('Enter');
        return objects().at(-1);
    };

    it('line ends, corners and dashes', () => {
        state().setPenStyle({ strokeWidth: 4, lineCap: 'butt', lineJoin: 'miter', dash: 'dashed' });
        const path = draw();
        expect(path.strokeLineCap).toBe('butt');
        expect(path.strokeLineJoin).toBe('miter');
        expect(path.strokeDashArray).toEqual([12, 8]);
    });

    it('dotted lines get round ends (dots)', () => {
        state().setPenStyle({ strokeWidth: 4, lineCap: 'butt', dash: 'dotted' });
        const path = draw();
        expect(path.strokeLineCap).toBe('round');
        expect(path.strokeDashArray[0]).toBeLessThan(1);
    });

    it('arrowheads on the end or both ends of an open path, never on a closed shape', () => {
        state().setPenStyle({ arrow: 'end' });
        expect(draw().path.filter((c: any[]) => c[0] === 'M')).toHaveLength(2);
        state().setPenStyle({ arrow: 'both' });
        expect(draw().path.filter((c: any[]) => c[0] === 'M')).toHaveLength(3);

        state().setActiveTool('pen');
        click(0, 300);
        click(100, 300);
        click(100, 400);
        click(1, 301);
        expect(
            objects()
                .at(-1)
                .path.filter((c: any[]) => c[0] === 'M'),
        ).toHaveLength(1);
    });

    it('ignores unknown values', () => {
        state().setPenStyle({ lineCap: 'blob', dash: 'zigzag', arrow: 'up' } as any);
        expect(state().penStyle).toMatchObject({ lineCap: 'round', dash: 'solid', arrow: 'none' });
    });

    it('Shape (Inkscape): an open path becomes one filled outline in the stroke colour', () => {
        state().setPenStyle({ shape: 'triangle-out', shapeWidth: 20, stroke: '#ff0000' });
        const path = draw();
        expect(path.fill).toBe('#ff0000');
        expect(path.strokeWidth).toBe(0);
        expect(path.path.filter((c: any[]) => c[0] === 'M')).toHaveLength(1);
        expect(path.path.at(-1)[0]).toBe('Z');
        expect(path.height).toBeGreaterThan(15); // 20 px thick at the start
    });

    it('Shape leaves closed shapes as they are; unknown shapes and widths are rejected', () => {
        state().setPenStyle({ shape: 'ellipse' });
        state().setActiveTool('pen');
        click(0, 300);
        click(100, 300);
        click(100, 400);
        click(1, 301);
        expect(objects().at(-1).strokeWidth).toBeGreaterThan(0);

        state().setPenStyle({ shape: 'star', shapeWidth: 9999 } as any);
        expect(state().penStyle).toMatchObject({ shape: 'ellipse', shapeWidth: 200 });
    });
});

describe('Pencil tool: options', () => {
    it('uses the Pencil style (thickness, opacity, smoothing); Draw settings stay', () => {
        state().setBrush({ brush: 'marker', color: '#ff0000' });
        const drawWidth = state().width;
        state().setActiveTool('pencil');
        state().setPencilStyle({ width: 6, opacity: 0.5, smoothing: 8 });

        const brush = canvas.freeDrawingBrush as any;
        expect(brush.width).toBe(6);
        expect(brush.color).toBe('rgba(255, 0, 0, 0.5)');
        expect(brush.decimate).toBeCloseTo(0.4 + 8 * 0.76);
        expect(state().width).toBe(drawWidth);
        expect(state().brush).toBe('marker');
    });

    it('clamps the style', () => {
        state().setPencilStyle({ width: 999, opacity: 0, smoothing: -3 });
        expect(state().pencilStyle).toMatchObject({ width: 50, opacity: 0.05, smoothing: 0 });
    });

    it('pressure: a stylus sets the width, a mouse keeps it constant', () => {
        state().setActiveTool('pencil');
        state().setPencilStyle({ pressure: true });
        const brush = canvas.freeDrawingBrush as any;
        expect(brush.mode).toBe('ink');
        expect(brush.taper).toBe(0);

        brush.samples = [];
        brush.addSample({ x: 0, y: 0 }, { pointerType: 'mouse' });
        brush.addSample({ x: 300, y: 0 }, { pointerType: 'mouse' }); // fast
        expect(brush.samples.map((s: any) => s.f)).toEqual([1, 1]);

        brush.samples = [];
        brush.addSample({ x: 0, y: 0 }, { pointerType: 'pen', pressure: 0.2 });
        expect(brush.samples[0].f).toBeLessThan(0.5);
    });

    it('Shift draws a straight line with the pressure brush too', () => {
        state().setActiveTool('pencil');
        state().setPencilStyle({ pressure: true });
        const brush = canvas.freeDrawingBrush as any;
        brush.drawPreview = () => undefined;
        brush.onMouseDown({ x: 0, y: 0 }, { e: {} });
        brush.onMouseMove({ x: 50, y: 40 }, { e: {} });
        brush.onMouseMove({ x: 100, y: 0 }, { e: { shiftKey: true } });
        expect(brush.samples.map((s: any) => [s.x, s.y])).toEqual([
            [0, 0],
            [100, 0],
        ]);
    });

    it('auto-close: a stroke that ends near its start becomes a closed shape', () => {
        state().setActiveTool('pencil');
        const loop = new fabric.Path('M 0 0 Q 50 -50 100 0 Q 50 60 3 2');
        canvas.fire('before:path:created', { path: loop } as any);
        expect(loop.path.at(-1)?.[0]).toBe('Z');

        const open = new fabric.Path('M 0 0 L 100 0 L 100 100');
        canvas.fire('before:path:created', { path: open } as any);
        expect(open.path.at(-1)?.[0]).toBe('L');

        state().setPencilStyle({ autoClose: false });
        const off = new fabric.Path('M 0 0 Q 50 -50 100 0 Q 50 60 3 2');
        canvas.fire('before:path:created', { path: off } as any);
        expect(off.path.at(-1)?.[0]).toBe('Q');
    });

    it('auto-close never applies to the Draw tool or a tiny scribble', () => {
        state().setActiveTool('pencil');
        const dot = new fabric.Path('M 0 0 L 2 1 L 1 1');
        canvas.fire('before:path:created', { path: dot } as any);
        expect(dot.path.at(-1)?.[0]).toBe('L');

        state().setActiveTool('draw');
        const loop = new fabric.Path('M 0 0 Q 50 -50 100 0 Q 50 60 3 2');
        canvas.fire('before:path:created', { path: loop } as any);
        expect(loop.path.at(-1)?.[0]).toBe('Q');
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
