import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createPageSlice,
    isFreehand,
    resolvePageSize,
    MAX_ZOOM,
    MIN_ZOOM,
} from '../createPageSlice';
import type { PageFormat } from '@lib/types/page';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';

const fmt = (f: string) => f as PageFormat;

describe('resolvePageSize', () => {
    it('applies orientation regardless of how the size is stored', () => {
        expect(resolvePageSize(fmt('A4'), 'portrait', null)).toEqual({ w: 794, h: 1123 });
        expect(resolvePageSize(fmt('A4'), 'landscape', null)).toEqual({ w: 1123, h: 794 });
    });

    it('matches format keys case-insensitively', () => {
        expect(resolvePageSize(fmt('letter'), 'portrait', null)).toEqual({ w: 816, h: 1056 });
    });

    it('uses the custom size for Custom and returns null for unknown formats', () => {
        expect(resolvePageSize(fmt('Custom'), 'landscape', { w: 300, h: 900 })).toEqual({
            w: 900,
            h: 300,
        });
        expect(resolvePageSize(fmt('Custom'), 'landscape', null)).toBeNull();
        expect(resolvePageSize(fmt('B5'), 'portrait', null)).toBeNull();
    });

    it('isFreehand ignores case', () => {
        expect(isFreehand('FREEHAND')).toBe(true);
        expect(isFreehand('Freehand')).toBe(true);
        expect(isFreehand('A4')).toBe(false);
    });
});

describe('createPageSlice', () => {
    const setup = (cw = 1000, ch = 800) => {
        const canvas = createFakeCanvas();
        const h = createHarness([createPageSlice as never], {
            canvas,
            cw,
            ch,
            drawBackground: () => undefined,
        });
        return { canvas, h };
    };

    // BUG-007 / Q2: on the design board CanvasBoard owns the canvas size + viewport; the page
    // slice only resets zoom and mirrors the page size from `selectedPreset` (the one source).
    it('design board: setPageFormat never writes canvas size or viewport', () => {
        const { canvas, h } = setup(1000, 800);
        h.set({ boardMode: 'design', selectedPreset: { width: 794, height: 1123 }, zoom: 2 });
        const before = canvas.getWidth();
        h.get().setPageFormat(fmt('A4'), 'portrait');
        expect(canvas.getWidth()).toBe(before);
        expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 0, 0]);
        expect(h.get().zoom).toBe(1);
        expect(h.get().pageWidth).toBe(794);
        expect(h.get().pageHeight).toBe(1123);
    });

    it('whiteboard: applyPageSize resets the view to 1:1 at the container size', () => {
        const { canvas, h } = setup(640, 480);
        h.set({ boardMode: 'whiteboard' });
        canvas.setViewportTransform([2, 0, 0, 2, 30, 40]);
        h.get().setPageFormat(fmt('Freehand'));
        expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 0, 0]);
        expect(h.get().pageWidth).toBe(640);
        expect(h.get().scale).toBe(1);
    });

    it('unknown formats leave the canvas untouched', () => {
        const { canvas, h } = setup();
        const before = canvas.getWidth();
        h.get().applyPageSize(fmt('B5'), 'portrait');
        expect(canvas.getWidth()).toBe(before);
    });

    it('setCustomPageSize clamps and derives orientation', () => {
        const { h } = setup();
        h.get().setCustomPageSize(20000, 10);
        expect(h.get().customSize).toEqual({ w: 10000, h: 50 });
        expect(h.get().orientation).toBe('landscape');
        expect(h.get().pageFormat).toBe('Custom');
    });

    it('setOrientation does nothing in freehand', () => {
        const { h } = setup();
        h.get().setOrientation('portrait');
        expect(h.get().orientation).toBe('landscape');
    });

    it('zoom is clamped to [MIN_ZOOM, MAX_ZOOM]', () => {
        const { h } = setup();
        h.get().setZoom(100);
        expect(h.get().zoom).toBe(MAX_ZOOM);
        h.get().setZoom(0);
        expect(h.get().zoom).toBe(MIN_ZOOM);
    });

    it('setPageBackground updates state and the canvas', () => {
        const { canvas, h } = setup();
        h.get().setPageBackground('#123456');
        expect(h.get().pageBackground).toBe('#123456');
        expect(canvas.backgroundColor).toBe('#123456');
    });
});

describe('design board zoom (CanvasBoard owns geometry, ADR Q2)', () => {
    const designSetup = () => {
        const canvas = createFakeCanvas() as unknown as Record<string, unknown>;
        const calls: string[] = [];
        canvas.zoomToPoint = () => calls.push('zoomToPoint');
        canvas.setViewportTransform = () => calls.push('setViewportTransform');
        const setDims = canvas.setDimensions as (...a: unknown[]) => void;
        canvas.setDimensions = (...a: unknown[]) => {
            calls.push('setDimensions');
            setDims(...a);
        };
        const h = createHarness([createPageSlice as never], { canvas });
        h.get().setBoardMode('design');
        return { h, calls };
    };

    it('setZoom only stores the zoom: the board draws page × fit × zoom (no canvas writes)', () => {
        const { h, calls } = designSetup();
        h.get().setZoom(2);
        expect(h.get().zoom).toBe(2);
        h.get().zoomIn();
        expect(h.get().zoom).toBeCloseTo(2.5);
        expect(calls).toEqual([]);
    });

    it('fitToScreen resets the zoom without resizing the canvas element', () => {
        const { h, calls } = designSetup();
        h.get().setZoom(3);
        h.get().fitToScreen();
        expect(h.get().zoom).toBe(1);
        expect(calls).toEqual([]);
    });

    it('whiteboard keeps viewport zoom', () => {
        const { h, calls } = designSetup();
        h.get().setBoardMode('whiteboard');
        h.get().setZoom(2);
        expect(calls).toContain('zoomToPoint');
    });
});

describe('touch navigation (pinch / two-finger pan): through setZoom, the one zoom path', () => {
    const rect = (left: number, top: number, width: number, height: number) =>
        ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

    const touchSetup = (mode: 'design' | 'whiteboard') => {
        const canvas = createFakeCanvas() as unknown as Record<string, unknown> & {
            getWidth: () => number;
        };
        const scroller = { getBoundingClientRect: () => rect(0, 0, 400, 300), scrollBy: vi.fn() };
        const pans: number[][] = [];
        const zooms: { point: { x: number; y: number }; zoom: number }[] = [];
        // the element is shown at half its backstore size: 1 CSS px = 2 canvas px
        canvas.upperCanvasEl = {
            getBoundingClientRect: () => rect(10, 20, canvas.getWidth() / 2, 100),
        };
        canvas.wrapperEl = { closest: () => scroller };
        canvas.relativePan = (p: { x: number; y: number }) => pans.push([p.x, p.y]);
        canvas.zoomToPoint = (point: { x: number; y: number }, zoom: number) =>
            zooms.push({ point: { x: point.x, y: point.y }, zoom });
        const h = createHarness([createPageSlice as never], { canvas });
        h.get().setBoardMode(mode);
        return { h, scroller, pans, zooms };
    };

    beforeEach(() => {
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            cb(0);
            return 1;
        });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('whiteboard: panBy moves the viewport in canvas px', () => {
        const { h, pans } = touchSetup('whiteboard');
        h.get().panBy(30, -10);
        expect(pans).toEqual([[60, -20]]);
    });

    it('whiteboard: pinchZoom zooms at the fingers (client px -> canvas px)', () => {
        const { h, zooms } = touchSetup('whiteboard');
        h.get().pinchZoom(2, 60, 70);
        expect(zooms).toEqual([{ point: { x: 100, y: 100 }, zoom: 2 }]);
        expect(h.get().zoom).toBe(2);
    });

    it('design: panBy scrolls the board (the viewport stays identity, BUG-007)', () => {
        const { h, scroller, pans } = touchSetup('design');
        h.get().panBy(30, -10);
        expect(scroller.scrollBy).toHaveBeenCalledWith(-30, 10);
        expect(pans).toEqual([]);
    });

    it('design: pinchZoom changes the zoom state and keeps the point under the fingers', () => {
        const { h, scroller, zooms } = touchSetup('design');
        h.get().pinchZoom(2, 300, 150); // 100 px right of the board centre
        expect(h.get().zoom).toBe(2);
        expect(zooms).toEqual([]);
        // the board re-centres on zoom; the focal point is then 100 px × (2 - 1) further away
        expect(scroller.scrollBy).toHaveBeenCalledWith(100, 0);
    });

    it('design: no scroll correction once the zoom is clamped', () => {
        const { h, scroller } = touchSetup('design');
        h.get().setZoom(MAX_ZOOM);
        h.get().pinchZoom(2, 300, 150);
        expect(h.get().zoom).toBe(MAX_ZOOM);
        expect(scroller.scrollBy).not.toHaveBeenCalled();
    });

    it('ignores bad input', () => {
        const { h, zooms } = touchSetup('whiteboard');
        h.get().pinchZoom(Number.NaN, 0, 0);
        h.get().pinchZoom(0, 0, 0);
        expect(zooms).toEqual([]);
    });
});
