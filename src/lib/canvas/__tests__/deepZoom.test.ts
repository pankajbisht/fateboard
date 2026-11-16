import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import {
    applyWindow,
    baseTransform,
    canvasClientRect,
    canvasPxPerCss,
    clearWindow,
    needsWindow,
    visibleWindow,
    windowOf,
} from '../deepZoom';
import { MAX_BACKSTORE_PX } from '../renderRatio';
import { cacheTooBig, installCrispCache } from '../crispCache';

/** A page-sized canvas double with the DOM bits deepZoom touches. */
function fakeCanvas(pageW = 1000, pageH = 800) {
    const el = () => {
        const c = document.createElement('canvas');
        return c;
    };
    const lower = el();
    const upper = el();
    const wrapper = document.createElement('div');
    const ctx = () => ({ setTransform: vi.fn() }) as unknown as CanvasRenderingContext2D;
    const canvas = {
        lowerCanvasEl: lower,
        upperCanvasEl: upper,
        wrapperEl: wrapper,
        contextContainer: ctx(),
        contextTop: ctx(),
        getWidth: () => pageW,
        getHeight: () => pageH,
        getRetinaScaling: () => 2,
        enableRetinaScaling: true,
        viewportTransform: [1, 0, 0, 1, 0, 0],
        getZoom: () => 1,
        calcOffset: vi.fn(),
        requestRenderAll: vi.fn(),
        _getPointerImpl: () => new fabric.Point(10, 20),
    };
    return canvas as unknown as fabric.Canvas & typeof canvas;
}

describe('deep zoom window', () => {
    it('is needed only past the full-page buffer limit', () => {
        expect(needsWindow(1000, 800, MAX_BACKSTORE_PX / 1000)).toBe(false);
        expect(needsWindow(1000, 800, MAX_BACKSTORE_PX / 1000 + 0.01)).toBe(true);
    });

    it('covers the visible part of the page (plus a margin), clamped to the page', () => {
        const w = visibleWindow({
            scroll: { x: 5000, y: 3000 },
            view: { w: 800, h: 600 },
            art: { x: 100, y: 100 },
            page: { w: 1000, h: 800 },
            scale: 10, // 1000 % of the page
            dpr: 2,
            margin: 0,
        })!;
        expect(w).toEqual({ ox: 490, oy: 290, ww: 80, wh: 60, scale: 10, ratio: 20 });
        const edge = visibleWindow({
            scroll: { x: 0, y: 0 },
            view: { w: 800, h: 600 },
            art: { x: 100, y: 100 },
            page: { w: 1000, h: 800 },
            scale: 10,
            dpr: 1,
        })!;
        expect(edge.ox).toBe(0);
        expect(edge.oy).toBe(0);
        expect(
            visibleWindow({
                scroll: { x: 0, y: 0 },
                view: { w: 10, h: 10 },
                art: { x: 0, y: 0 },
                page: { w: 0, h: 10 },
                scale: 1,
                dpr: 1,
            }),
        ).toBeNull();
    });

    it('sizes the buffer to the window, translates the contexts and offsets pointer events', () => {
        const c = fakeCanvas();
        const win = { ox: 490, oy: 290, ww: 80, wh: 60, scale: 10, ratio: 20 };
        applyWindow(c, win);
        expect(windowOf(c)).toEqual(win);
        expect(c.lowerCanvasEl.width).toBe(1600); // 80 page px × 20 device px
        expect(c.lowerCanvasEl.style.width).toBe('800px');
        expect(c.contextContainer.setTransform).toHaveBeenCalledWith(20, 0, 0, 20, -9800, -5800);
        expect(c.wrapperEl.style.left).toBe('4900px');
        expect(c.getRetinaScaling()).toBe(20);
        expect(baseTransform(c)).toEqual([20, 0, 0, 20, -9800, -5800]);
        // Fabric maps a pointer into the window; the patch adds the window origin back
        const p = (c as unknown as { _getPointerImpl: () => fabric.Point })._getPointerImpl();
        expect({ x: p.x, y: p.y }).toEqual({ x: 500, y: 310 });
        clearWindow(c);
        expect(windowOf(c)).toBeNull();
        expect(c.wrapperEl.style.position).toBe('relative');
    });

    it('reports the whole page rectangle on screen, also while a window is drawn', () => {
        const c = fakeCanvas();
        c.upperCanvasEl.getBoundingClientRect = () =>
            ({ left: 300, top: 200, width: 800, height: 600 }) as DOMRect;
        applyWindow(c, { ox: 490, oy: 290, ww: 80, wh: 60, scale: 10, ratio: 20 });
        expect(canvasClientRect(c)).toEqual({
            left: -4600,
            top: -2700,
            width: 10000,
            height: 8000,
        });
        expect(canvasPxPerCss(c)).toBeCloseTo(0.1);
        clearWindow(c);
        expect(canvasClientRect(c)).toEqual({ left: 300, top: 200, width: 800, height: 600 });
    });
});

describe('deep zoom: exports and selection handles (reviewer P1s)', () => {
    it('reports retina 1 while Fabric renders an export (no screen-sized shadows)', () => {
        const c = fakeCanvas();
        applyWindow(c, { ox: 10, oy: 20, ww: 80, wh: 60, scale: 10, ratio: 20 });
        expect(c.getRetinaScaling()).toBe(20);
        c.enableRetinaScaling = false; // what toCanvasElement does
        expect(c.getRetinaScaling()).toBe(1);
    });

    it('selection handles keep the window offset when Fabric resets the transform', () => {
        const c = fakeCanvas();
        applyWindow(c, { ox: 10, oy: 20, ww: 80, wh: 60, scale: 10, ratio: 20 });
        const rect = new fabric.Rect({ width: 10, height: 10 });
        (rect as unknown as { canvas: unknown }).canvas = c;
        rect.setCoords();
        const calls: number[][] = [];
        const ctx = new Proxy({} as Record<string, unknown>, {
            get: (t, k) =>
                k in t
                    ? t[k as string]
                    : k === 'setTransform'
                      ? (...m: number[]) => calls.push(m)
                      : () => undefined,
            set: (t, k, v) => ((t[k as string] = v), true),
        }) as unknown as CanvasRenderingContext2D;
        rect.drawControls(ctx);
        expect(calls[0]).toEqual([20, 0, 0, 20, -200, -400]); // retina reset + the window's translation
        clearWindow(c);
        calls.length = 0;
        rect.drawControls(ctx);
        expect(calls[0]?.slice(4)).toEqual([0, 0]);
    });
});

describe('crisp cache', () => {
    it('knows when Fabric would cap (and stretch) a cache', () => {
        expect(cacheTooBig(1000, 1000)).toBe(false);
        expect(cacheTooBig(5000, 10)).toBe(true);
        expect(cacheTooBig(3000, 3000)).toBe(true); // over the total pixel budget
    });

    it('an object too big to cache at the current zoom draws directly', () => {
        installCrispCache();
        const r = new fabric.Rect({ width: 100, height: 100, objectCaching: true });
        const zoom = { value: 1 };
        (r as unknown as { canvas: unknown }).canvas = {
            getZoom: () => zoom.value,
            getRetinaScaling: () => 1,
            viewportTransform: [1, 0, 0, 1, 0, 0],
        };
        r.getTotalObjectScaling = () => new fabric.Point(zoom.value, zoom.value);
        expect(r.shouldCache()).toBe(true);
        zoom.value = 64; // 6400 %: a 6400 px cache side
        expect(r.shouldCache()).toBe(false);
    });
});
