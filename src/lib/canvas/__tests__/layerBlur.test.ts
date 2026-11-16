import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { CUSTOM_PROPS } from '@/lib/serialization';
import {
    LAYER_BLUR_MAX,
    clampLayerBlur,
    deviceBlurPx,
    installLayerBlur,
    setCanvasFilterSupportForTests,
    wrapSvgWithBlur,
} from '../layerBlur';

beforeAll(() => installLayerBlur());
afterEach(() => setCanvasFilterSupportForTests(null));

const rect = (extra: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left: 0,
        top: 0,
        width: 40,
        height: 20,
        fill: '#f00',
        originX: 'left',
        originY: 'top',
        ...extra,
    });

/** A context that records the filter in effect while the object paints. */
function recordingCtx(matrix = { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }) {
    const seen: string[] = [];
    const stack: string[] = [];
    const ctx = {
        filter: 'none',
        getTransform: () => matrix,
        save: vi.fn(() => stack.push(ctx.filter)),
        restore: vi.fn(() => {
            ctx.filter = stack.pop() ?? 'none';
        }),
    } as unknown as CanvasRenderingContext2D & { filter: string };
    return { ctx, seen, stack };
}

describe('layer blur helpers', () => {
    it('clamps the radius to 0 … LAYER_BLUR_MAX with one decimal', () => {
        expect(clampLayerBlur(-3)).toBe(0);
        expect(clampLayerBlur('abc')).toBe(0);
        expect(clampLayerBlur(4.26)).toBe(4.3);
        expect(clampLayerBlur(10_000)).toBe(LAYER_BLUR_MAX);
    });

    it('scales the device radius with the context matrix and the object scale', () => {
        expect(deviceBlurPx(5, null)).toBe(5);
        expect(deviceBlurPx(5, { a: 2, b: 0, c: 0, d: 2 })).toBe(10); // zoom 2 (or retina 2)
        expect(deviceBlurPx(5, { a: 1, b: 0, c: 0, d: 1 }, 3, 3)).toBe(15);
    });

    it('wraps SVG markup in an feGaussianBlur filter', () => {
        const svg = wrapSvgWithBlur('<rect />', 4, 'B1');
        expect(svg).toContain('<filter id="B1"');
        expect(svg).toContain('stdDeviation="4"');
        expect(svg).toContain('<g filter="url(#B1)">');
    });
});

describe('installLayerBlur (Fabric patch)', () => {
    it('is serialized through CUSTOM_PROPS', () => {
        expect(CUSTOM_PROPS).toContain('layerBlur');
        const r = rect({ layerBlur: 6 });
        const json = (r.toObject as (props: string[]) => Record<string, unknown>)([
            ...CUSTOM_PROPS,
        ]);
        expect(json.layerBlur).toBe(6);
    });

    it('paints the object inside ctx.filter = blur(radius × device scale) and restores it', () => {
        setCanvasFilterSupportForTests(true);
        const r = rect({ layerBlur: 3 });
        const { ctx } = recordingCtx();
        let during = '';
        // the original render is what runs inside the patch: capture the filter there
        const spy = vi
            .spyOn(r, 'drawObject')
            .mockImplementation(() => void (during = (ctx as { filter: string }).filter));
        r.set('objectCaching', false);
        (ctx as unknown as Record<string, unknown>).transform = vi.fn();
        (ctx as unknown as Record<string, unknown>).globalAlpha = 1;
        (ctx as unknown as Record<string, unknown>).globalCompositeOperation = 'source-over';
        r.render(ctx);
        expect(spy).toHaveBeenCalled();
        expect(during).toBe('blur(6px)'); // 3 × context scale 2
        expect((ctx as { filter: string }).filter).toBe('none'); // restored
    });

    it('leaves objects without blur untouched', () => {
        setCanvasFilterSupportForTests(true);
        const r = rect();
        const { ctx } = recordingCtx();
        let during = 'unset';
        vi.spyOn(r, 'drawObject').mockImplementation(
            () => void (during = (ctx as { filter: string }).filter),
        );
        r.set('objectCaching', false);
        (ctx as unknown as Record<string, unknown>).transform = vi.fn();
        r.render(ctx);
        expect(during).toBe('none');
    });

    it('exports the blur to SVG for every class (rect, path, text), scaled with the object', () => {
        expect(rect({ layerBlur: 4 }).toSVG()).toContain('stdDeviation="4"');
        expect(rect({ layerBlur: 4, scaleX: 2, scaleY: 2 }).toSVG()).toContain('stdDeviation="8"');
        const path = new fabric.Path('M 0 0 L 10 10', { layerBlur: 2 } as never);
        expect(path.toSVG()).toContain('feGaussianBlur');
        const text = new fabric.FabricText('Hi', { layerBlur: 2 } as never);
        expect(text.toSVG()).toContain('feGaussianBlur');
        expect(rect().toSVG()).not.toContain('feGaussianBlur');
    });
});
