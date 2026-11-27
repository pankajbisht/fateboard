import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Point } from 'fabric';

let liveDabs = 0;
vi.mock('../renderDabs', () => ({
    renderDabs: (_ctx: unknown, dabs: unknown[]) => void (liveDabs += dabs.length),
    applyStrokeTexture: () => undefined,
}));

import { StampBrush } from '../StampBrush';
import { StampStroke } from '../StampStroke';
import { resolveStamp } from '../stampParams';
import { attachPenInput } from '@/lib/canvas/penInput';

/** A 2D context that accepts any call (jsdom has none). */
const anyCtx = (canvas: HTMLCanvasElement) =>
    new Proxy({ canvas } as Record<string | symbol, unknown>, {
        get: (t, k) =>
            k in t
                ? t[k]
                : k === 'getTransform'
                  ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
                  : () => undefined,
    }) as unknown as CanvasRenderingContext2D;

let frames: FrameRequestCallback[] = [];
beforeEach(() => {
    liveDabs = 0;
    frames = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
        this: HTMLCanvasElement,
    ) {
        return anyCtx(this) as never;
    });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function setup(params = resolveStamp({ spray: true, sprayRate: 600, particle: 0.05 })) {
    const top = document.createElement('canvas');
    const added: unknown[] = [];
    const canvas = {
        contextTop: anyCtx(top),
        getRetinaScaling: () => 1,
        getZoom: () => 1,
        viewportTransform: [1, 0, 0, 1, 0, 0],
        clearContext: vi.fn(),
        isDrawingMode: true,
        freeDrawingBrush: null as unknown,
        fire: vi.fn(),
        add: (o: unknown) => added.push(o),
        requestRenderAll: vi.fn(),
    };
    const brush = new StampBrush(canvas as never, {
        params,
        brushId: 'spray-paint',
        label: 'Spray paint',
        opacity: 1,
        smoothing: 0,
    });
    brush.width = 40;
    brush.color = '#ff0000';
    canvas.freeDrawingBrush = brush;
    return { brush, canvas, added };
}

describe('StampBrush', () => {
    it('a spray stops when another brush takes over mid-stroke (reviewer P2: it sprayed forever)', () => {
        const { brush, canvas } = setup();
        brush.onMouseDown(new Point(10, 10), { e: {} } as never);
        expect(frames).toHaveLength(1);
        canvas.freeDrawingBrush = {}; // `[` / `]` rebuilt the brush; Fabric sends the mouse-up to the new one
        frames.shift()!(0);
        expect(frames).toHaveLength(0); // no next frame: the loop ended
    });

    it('the saved stroke redraws exactly the dabs of the preview, all inside its box (reviewer P2)', () => {
        const { brush, added } = setup(
            resolveStamp({ scatter: 2, sizeJitter: 0.6, count: 3, spacing: 0.3 }),
        );
        brush.onMouseDown(new Point(10.123, 20.456), { e: {} } as never);
        for (let i = 1; i <= 20; i++)
            brush.onMouseMove(new Point(10.123 + i * 7.3333, 20.456 + Math.sin(i) * 9.87), {
                e: {},
            } as never);
        brush.onMouseUp();
        const stroke = added[0] as StampStroke;
        expect(stroke).toBeInstanceOf(StampStroke);
        const { dabs } = stroke.getDabs();
        expect(dabs.length).toBe(liveDabs);
        for (const d of dabs) {
            expect(d.x).toBeGreaterThanOrEqual(0);
            expect(d.y).toBeGreaterThanOrEqual(0);
            expect(d.x).toBeLessThanOrEqual(stroke.width);
            expect(d.y).toBeLessThanOrEqual(stroke.height);
        }
    });

    // BUG-234 / P3: Fabric gives brushes a MouseEvent (no pressure); the pen's pointer event is looked up
    it('a pen stroke stores the pressure of the pointer event behind the mouse event', () => {
        const { brush, canvas } = setup(resolveStamp({}));
        const el = document.createElement('canvas');
        document.body.appendChild(el);
        Object.assign(canvas, { upperCanvasEl: el });
        const detach = attachPenInput(el);
        const pe = new Event('pointerdown', { bubbles: true });
        for (const [k, v] of Object.entries({ isPrimary: true, pointerType: 'pen', pressure: 0.4 }))
            Object.defineProperty(pe, k, { value: v });
        el.dispatchEvent(pe);
        brush.onMouseDown(new Point(10, 10), { e: { timeStamp: pe.timeStamp } } as never);
        detach();
        expect((brush as unknown as { points: { p: number }[] }).points[0].p).toBe(0.4);
    });

    it('merged (coalesced) samples of a move are all stored, with one blit', () => {
        const { brush, canvas } = setup(resolveStamp({}));
        Object.assign(canvas, { _getPointerImpl: (s: { x: number }) => ({ x: s.x, y: 0 }) });
        brush.onMouseDown(new Point(0, 0), { e: {} } as never);
        const merged = [{ x: 10 }, { x: 20 }, { x: 30 }];
        brush.onMouseMove(new Point(30, 0), { e: { getCoalescedEvents: () => merged } } as never);
        const xs = (brush as unknown as { points: { x: number }[] }).points.map((p) => p.x);
        expect(xs).toEqual([0, 10, 20, 30]);
    });
});
