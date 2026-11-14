import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import {
    attachTouchGestures,
    LONG_PRESS_MS,
    PINCH_WINDOW_MS,
    type TouchGestureHandlers,
    type TouchMode,
} from '../touchGestures';

type Pt = { id: number; x: number; y: number; touchType?: string };

const touch = ({ id, x, y, touchType }: Pt) => ({
    identifier: id,
    clientX: x,
    clientY: y,
    touchType,
});

/** A touch event the way a browser sends it: `touches` = all fingers down, `changedTouches` = these. */
function fire(
    target: EventTarget,
    type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
    down: Pt[],
    changed: Pt[],
) {
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'touches', { value: down.map(touch) });
    Object.defineProperty(e, 'changedTouches', { value: changed.map(touch) });
    target.dispatchEvent(e);
    return e;
}

function pointerDown(target: EventTarget, pointerType: string) {
    const e = new Event('pointerdown', { bubbles: true });
    Object.defineProperty(e, 'pointerType', { value: pointerType });
    target.dispatchEvent(e);
}

describe('attachTouchGestures', () => {
    let root: HTMLDivElement;
    let canvasEl: HTMLCanvasElement;
    let outside: HTMLDivElement;
    let mode: TouchMode;
    let h: { [K in keyof TouchGestureHandlers]: ReturnType<typeof vi.fn> };
    let docSeen: string[];
    let detach: () => void;
    const onDoc = (e: Event) => docSeen.push(e.type);

    beforeEach(() => {
        vi.useFakeTimers();
        root = document.createElement('div');
        canvasEl = document.createElement('canvas');
        outside = document.createElement('div');
        root.append(canvasEl, outside);
        document.body.append(root);
        mode = { panOnly: false, drawing: false, longPress: true, doubleTap: true };
        h = {
            isCanvasTarget: vi.fn((t: EventTarget | null) => t === canvasEl),
            forwardStart: vi.fn(),
            forwardMove: vi.fn(),
            forwardEnd: vi.fn(),
            getMode: vi.fn(() => mode),
            pan: vi.fn(),
            pinch: vi.fn(),
            longPress: vi.fn(),
            doubleTap: vi.fn(),
        };
        docSeen = [];
        // Fabric listens for touchmove / touchend on the document (bubble phase)
        for (const t of ['touchstart', 'touchmove', 'touchend'])
            document.addEventListener(t, onDoc);
        detach = attachTouchGestures(root, h as unknown as TouchGestureHandlers);
    });

    afterEach(() => {
        detach();
        for (const t of ['touchstart', 'touchmove', 'touchend'])
            document.removeEventListener(t, onDoc);
        root.remove();
        vi.useRealTimers();
    });

    const A = (x = 100, y = 100): Pt => ({ id: 1, x, y });
    const B = (x = 200, y = 100): Pt => ({ id: 2, x, y });

    it('pinch with two fingers zooms at their midpoint and never reaches Fabric', () => {
        const s1 = fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchstart', [A(), B()], [B()]);
        // fingers spread from 100 px to 200 px apart around x = 150
        fire(canvasEl, 'touchmove', [A(50), B(250)], [A(50), B(250)]);

        expect(h.pinch).toHaveBeenCalledWith(2, 150, 100);
        expect(h.forwardStart).not.toHaveBeenCalled();
        expect(h.forwardMove).not.toHaveBeenCalled();
        expect(s1.defaultPrevented).toBe(true); // no compat mouse events, no page zoom
        expect(docSeen).toEqual([]);
    });

    it('two fingers moving together pan the board', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchstart', [A(), B()], [B()]);
        fire(canvasEl, 'touchmove', [A(130, 90), B(230, 90)], [A(130, 90), B(230, 90)]);

        expect(h.pan).toHaveBeenCalledWith(30, -10);
        expect(h.pinch).not.toHaveBeenCalled(); // distance unchanged
    });

    it('a one-finger drag is handed to Fabric with the moves it missed', () => {
        const start = fire(canvasEl, 'touchstart', [A()], [A()]);
        const small = fire(canvasEl, 'touchmove', [A(103)], [A(103)]); // inside the tap slop
        expect(h.forwardStart).not.toHaveBeenCalled();

        fire(canvasEl, 'touchmove', [A(140)], [A(140)]);
        expect(h.forwardStart).toHaveBeenCalledWith(start);
        expect(h.forwardMove).toHaveBeenCalledWith(small);
        expect(docSeen).toEqual(['touchmove']); // the move that crossed the slop reaches Fabric

        fire(canvasEl, 'touchend', [], [A(140)]);
        expect(docSeen).toEqual(['touchmove', 'touchend']);
    });

    it('a second finger after a stroke has started is ignored (Fabric would restart the brush)', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchmove', [A(140)], [A(140)]);
        docSeen = [];

        fire(canvasEl, 'touchstart', [A(140), B()], [B()]);
        fire(canvasEl, 'touchmove', [A(140), B(260)], [B(260)]);
        expect(docSeen).toEqual([]);
        expect(h.pinch).not.toHaveBeenCalled();

        fire(canvasEl, 'touchmove', [A(150), B(260)], [A(150)]);
        expect(docSeen).toEqual(['touchmove']);
    });

    it('a tap reaches Fabric as down + up', () => {
        const start = fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchend', [], [A()]);
        expect(h.forwardStart).toHaveBeenCalledWith(start);
        expect(docSeen).toEqual(['touchend']);
    });

    it('two quick taps fire a double tap (touch never sends dblclick)', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchend', [], [A()]);
        vi.advanceTimersByTime(120);
        fire(canvasEl, 'touchstart', [A(104)], [A(104)]);
        fire(canvasEl, 'touchend', [], [A(104)]);
        vi.runOnlyPendingTimers();
        expect(h.doubleTap).toHaveBeenCalledWith(104, 100);
    });

    it('taps far apart or slow are not a double tap', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchend', [], [A()]);
        vi.advanceTimersByTime(600);
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchend', [], [A()]);
        vi.runOnlyPendingTimers();
        expect(h.doubleTap).not.toHaveBeenCalled();
    });

    it('a long press opens the context menu instead of selecting or dragging', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(h.longPress).toHaveBeenCalledWith(100, 100);

        fire(canvasEl, 'touchmove', [A(160)], [A(160)]);
        fire(canvasEl, 'touchend', [], [A(160)]);
        expect(h.forwardStart).not.toHaveBeenCalled();
        expect(docSeen).toEqual([]);
    });

    it('drawing tools: a finger held still starts drawing after the short pinch window, not 500 ms', () => {
        mode = { ...mode, longPress: false, drawing: true };
        const start = fire(canvasEl, 'touchstart', [A()], [A()]);
        vi.advanceTimersByTime(PINCH_WINDOW_MS - 1);
        expect(h.forwardStart).not.toHaveBeenCalled(); // a second finger may still land
        vi.advanceTimersByTime(1);
        expect(h.forwardStart).toHaveBeenCalledWith(start);
        expect(h.longPress).not.toHaveBeenCalled();
        expect(PINCH_WINDOW_MS).toBeLessThanOrEqual(150);
    });

    it('the Hand tool pans with one finger (Fabric pans with mouse movementX only)', () => {
        mode = { ...mode, panOnly: true };
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchmove', [A(80, 130)], [A(80, 130)]);
        expect(h.pan).toHaveBeenCalledWith(-20, 30);
        expect(h.forwardStart).not.toHaveBeenCalled();
    });

    it('a pen draws at once, and a palm resting while it is down is ignored', () => {
        pointerDown(canvasEl, 'pen');
        const pen = { id: 7, x: 10, y: 10 };
        fire(canvasEl, 'touchstart', [pen], [pen]);
        expect(docSeen).toEqual(['touchstart']); // straight to Fabric, no tap delay

        pointerDown(canvasEl, 'touch');
        fire(canvasEl, 'touchstart', [pen, B()], [B()]);
        fire(canvasEl, 'touchmove', [pen, B(260)], [B(260)]);
        expect(docSeen).toEqual(['touchstart']);
        expect(h.pinch).not.toHaveBeenCalled();
    });

    it('iOS: a stylus touch is a pen even without pointer events', () => {
        const pen = { id: 7, x: 10, y: 10, touchType: 'stylus' };
        fire(canvasEl, 'touchstart', [pen], [pen]);
        expect(docSeen).toEqual(['touchstart']);
    });

    it('after a pen was used, one finger pans instead of drawing', () => {
        mode = { ...mode, drawing: true, longPress: false };
        const pen = { id: 7, x: 10, y: 10, touchType: 'stylus' };
        fire(canvasEl, 'touchstart', [pen], [pen]);
        fire(canvasEl, 'touchend', [], [pen]);

        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchmove', [A(110, 120)], [A(110, 120)]);
        expect(h.pan).toHaveBeenCalledWith(10, 20);
        expect(h.forwardStart).not.toHaveBeenCalled();
    });

    it('a palm resting first does not stop the pen: the pen draws, the palm never reaches Fabric', () => {
        mode = { ...mode, drawing: true, longPress: false };
        fire(canvasEl, 'touchstart', [A()], [A()]); // palm, held in the tap window
        const pen = { id: 7, x: 300, y: 300, touchType: 'stylus' };
        fire(canvasEl, 'touchstart', [A(), pen], [pen]);
        fire(canvasEl, 'touchmove', [A(), { ...pen, x: 340 }], [{ ...pen, x: 340 }]);
        expect(docSeen).toEqual(['touchstart', 'touchmove']);
        expect(h.pinch).not.toHaveBeenCalled();
        expect(h.pan).not.toHaveBeenCalled();
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(h.forwardStart).not.toHaveBeenCalled(); // the palm's hold timer was dropped
    });

    it('the pen lifting while a palm stays down ends the stroke, and the next stroke draws', () => {
        const pen = { id: 7, x: 300, y: 300, touchType: 'stylus' };
        fire(canvasEl, 'touchstart', [pen], [pen]);
        fire(canvasEl, 'touchstart', [pen, A()], [A()]); // palm
        docSeen = [];
        fire(canvasEl, 'touchend', [A()], [pen]);
        expect(h.forwardEnd).toHaveBeenCalledTimes(1);
        const end = h.forwardEnd.mock.calls[0][0] as TouchEvent;
        expect(end.type).toBe('touchend');
        expect(end.touches).toHaveLength(0); // what Fabric waits for
        expect(end.changedTouches[0].identifier).toBe(7);
        expect(docSeen).toEqual([]);

        const pen2 = { id: 8, x: 400, y: 300, touchType: 'stylus' };
        fire(canvasEl, 'touchstart', [A(), pen2], [pen2]);
        expect(docSeen).toEqual(['touchstart']);
    });

    it("Fabric's finger lifting before an extra finger ends the drag at once", () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchmove', [A(140)], [A(140)]);
        fire(canvasEl, 'touchstart', [A(140), B()], [B()]);
        fire(canvasEl, 'touchend', [B()], [A(140)]);
        expect(h.forwardEnd).toHaveBeenCalledTimes(1);
        fire(canvasEl, 'touchend', [], [B()]);
        expect(h.forwardEnd).toHaveBeenCalledTimes(1);
    });

    it('touchcancel after Fabric got the finger ends its stroke (Fabric has no touchcancel listener)', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchmove', [A(140)], [A(140)]);
        fire(canvasEl, 'touchcancel', [], [A(140)]);
        expect(h.forwardEnd).toHaveBeenCalledTimes(1);
        expect(docSeen).toEqual(['touchmove']);
    });

    it('a pen with the Hand tool pans too', () => {
        mode = { ...mode, panOnly: true };
        const pen = { id: 7, x: 10, y: 10, touchType: 'stylus' };
        fire(canvasEl, 'touchstart', [pen], [pen]);
        fire(canvasEl, 'touchmove', [{ ...pen, x: 40 }], [{ ...pen, x: 40 }]);
        expect(h.pan).toHaveBeenCalledWith(30, 0);
        expect(docSeen).toEqual([]);
    });

    it('a pen on a toolbar button inside the board is left alone', () => {
        const pen = { id: 7, x: 10, y: 10, touchType: 'stylus' };
        const s = fire(outside, 'touchstart', [pen], [pen]);
        expect(s.defaultPrevented).toBe(false);
    });

    it('one finger outside the canvas is left to the browser (native scroll)', () => {
        const s = fire(outside, 'touchstart', [A()], [A()]);
        fire(outside, 'touchmove', [A(100, 160)], [A(100, 160)]);
        expect(s.defaultPrevented).toBe(false);
        expect(h.pan).not.toHaveBeenCalled();
    });

    it('a pinch that starts outside the canvas still zooms', () => {
        fire(outside, 'touchstart', [A()], [A()]);
        fire(outside, 'touchstart', [A(), B()], [B()]);
        fire(outside, 'touchmove', [A(75), B(225)], [A(75), B(225)]);
        expect(h.pinch).toHaveBeenCalledWith(1.5, 150, 100);
    });

    it('touchcancel during the tap window forwards nothing', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchcancel', [], [A()]);
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(h.forwardStart).not.toHaveBeenCalled();
        expect(h.longPress).not.toHaveBeenCalled();
    });

    it('detach also drops a double tap that is about to fire', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchend', [], [A()]);
        fire(canvasEl, 'touchstart', [A()], [A()]);
        fire(canvasEl, 'touchend', [], [A()]);
        detach();
        vi.runOnlyPendingTimers();
        expect(h.doubleTap).not.toHaveBeenCalled();
        detach = () => undefined;
    });

    it('detach removes every listener and the pending timer', () => {
        fire(canvasEl, 'touchstart', [A()], [A()]);
        detach();
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(h.longPress).not.toHaveBeenCalled();
        fire(canvasEl, 'touchstart', [A(), B()], [B()]);
        expect(docSeen).toEqual(['touchstart']);
        detach = () => undefined;
    });
});

describe('with a real Fabric canvas', () => {
    it("a pen stroke ends through Fabric's own touchend when the pen lifts while a palm is down", () => {
        const el = document.createElement('canvas');
        document.body.append(el);
        const canvas = new fabric.Canvas(el, { width: 400, height: 300 });
        canvas.isDrawingMode = true;
        // a recording brush: jsdom's 2D context cannot paint a PencilBrush stroke
        const brush = {
            onMouseDown: vi.fn(),
            onMouseMove: vi.fn(),
            onMouseUp: vi.fn(() => false), // false = the stroke is finished
        };
        canvas.freeDrawingBrush = brush as unknown as fabric.BaseBrush;
        const root = canvas.wrapperEl;
        const upper = canvas.upperCanvasEl;
        const detach = attachTouchGestures(root, {
            isCanvasTarget: (t) => t === upper,
            forwardStart: (e) => canvas._onTouchStart(e),
            forwardMove: (e) => canvas._onMouseMove(e),
            forwardEnd: (e) => canvas._onTouchEnd(e),
            getMode: () => ({ panOnly: false, drawing: true, longPress: false, doubleTap: false }),
            pan: () => undefined,
            pinch: () => undefined,
            longPress: () => undefined,
            doubleTap: () => undefined,
        });
        const pen = (x: number) => ({ id: 7, x, y: 100, touchType: 'stylus' });
        const palm = { id: 1, x: 350, y: 250 };

        fire(upper, 'touchstart', [pen(50)], [pen(50)]);
        for (const x of [70, 90, 110, 130]) fire(upper, 'touchmove', [pen(x)], [pen(x)]);
        fire(upper, 'touchstart', [pen(130), palm], [palm]);
        fire(upper, 'touchend', [palm], [pen(130)]);

        expect(brush.onMouseDown).toHaveBeenCalledTimes(1); // the palm did not restart it
        expect(brush.onMouseMove).toHaveBeenCalledTimes(4);
        expect(brush.onMouseUp).toHaveBeenCalledTimes(1);
        expect((canvas as unknown as { _isCurrentlyDrawing: boolean })._isCurrentlyDrawing).toBe(
            false,
        );
        fire(upper, 'touchend', [], [palm]);
        expect(brush.onMouseUp).toHaveBeenCalledTimes(1);
        detach();
        void canvas.dispose();
        el.remove();
    });
});
