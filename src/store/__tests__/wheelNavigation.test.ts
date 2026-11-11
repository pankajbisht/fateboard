/**
 * Mouse wheel and trackpad, like whiteboard and design tools (FigJam, Excalidraw, Figma):
 * - whiteboard: scroll moves the board (Shift + wheel sideways); Ctrl / ⌘ + wheel or a trackpad
 *   pinch (the browser sends it as Ctrl + wheel) zooms at the pointer. Any tool, not only the Hand.
 * - design page: scroll is left to the browser (the board scrolls); Ctrl / ⌘ + wheel zooms the
 *   page instead of the whole browser page.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;

const wheel = (props: Partial<WheelEvent>) => {
    const e = {
        deltaX: 0,
        deltaY: 0,
        deltaMode: 0,
        offsetX: 400,
        offsetY: 300,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...props,
    };
    canvas.fire('mouse:wheel', { e });
    return e;
};

const mount = (boardMode: 'design' | 'whiteboard') => {
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    canvas.relativePan = ({ x, y }: { x: number; y: number }) => {
        canvas.viewportTransform[4] += x;
        canvas.viewportTransform[5] += y;
    };
    useStore.setState({ canvas, boardMode, zoom: 1, activeTool: 'select' } as any);
    state().registerCanvasEvents(canvas);
};

beforeEach(() => {
    prev = { ...useStore.getState() };
});
afterEach(() => {
    state().unregisterCanvasEvents(canvas);
    useStore.setState({ canvas: prev.canvas, boardMode: prev.boardMode, zoom: 1 } as any);
});

describe('whiteboard', () => {
    beforeEach(() => mount('whiteboard'));

    it('a plain wheel moves the board with the select tool, and nothing zooms', () => {
        const e = wheel({ deltaY: 120 });
        expect(canvas.viewportTransform[5]).toBe(-120);
        expect(state().zoom).toBe(1);
        expect(e.preventDefault).toHaveBeenCalled();
    });

    it('a trackpad scrolls both ways; Shift + wheel scrolls sideways', () => {
        wheel({ deltaX: 30, deltaY: 40 });
        expect(canvas.viewportTransform.slice(4)).toEqual([-30, -40]);
        wheel({ deltaY: 100, shiftKey: true });
        expect(canvas.viewportTransform.slice(4)).toEqual([-130, -40]);
    });

    it('Ctrl / ⌘ + wheel and a trackpad pinch zoom in and out', () => {
        wheel({ deltaY: -100, ctrlKey: true });
        expect(state().zoom).toBeGreaterThan(1);
        const zoomed = state().zoom;
        wheel({ deltaY: 100, metaKey: true });
        expect(state().zoom).toBeLessThan(zoomed);
        expect(state().zoom).toBeCloseTo(canvas.getZoom(), 5);
    });

    it('a line-based wheel (Firefox) scrolls by lines', () => {
        wheel({ deltaY: 3, deltaMode: 1 });
        expect(canvas.viewportTransform[5]).toBe(-48);
    });
});

describe('design page', () => {
    beforeEach(() => mount('design'));

    it('a plain wheel is left to the browser: the board scrolls', () => {
        const e = wheel({ deltaY: 120 });
        expect(e.preventDefault).not.toHaveBeenCalled();
        expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('Ctrl / ⌘ + wheel zooms the page, never the browser', () => {
        const e = wheel({ deltaY: -100, ctrlKey: true });
        expect(e.preventDefault).toHaveBeenCalled();
        expect(state().zoom).toBeGreaterThan(1);
        expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('the same action serves the grey area around the page', () => {
        const e = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, cancelable: true });
        expect(state().wheelNavigate(e)).toBe(true);
        expect(state().zoom).toBeGreaterThan(1);
        expect(state().wheelNavigate(new WheelEvent('wheel', { deltaY: 100 }))).toBe(false);
    });
});
