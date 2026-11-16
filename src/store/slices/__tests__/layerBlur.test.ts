import { describe, expect, it, vi } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createFilterSlice } from '../createFilterSlice';
import { LAYER_BLUR_MAX } from '@/lib/canvas/layerBlur';

/** BUG-220: the Fill & Shadow "Blur" only blurred the drop shadow; objects had no blur of their own. */
function setup(objects: Record<string, unknown>[]) {
    const canvas = {
        getActiveObjects: () => objects,
        requestRenderAll: vi.fn(),
    };
    const saveState = vi.fn();
    const h = createHarness([createFilterSlice as never], { canvas, saveState });
    return { h, canvas, saveState };
}

const obj = () => {
    const o: Record<string, unknown> = {};
    o.set = (patch: Record<string, unknown> | string, value?: unknown) =>
        Object.assign(o, typeof patch === 'string' ? { [patch]: value } : patch);
    return o;
};

describe('Filter slice: setLayerBlur', () => {
    it('blurs every selected object, redraws once and records one undo step', () => {
        const a = obj();
        const b = obj();
        const { h, canvas, saveState } = setup([a, b]);
        h.get().setLayerBlur(8);
        expect(a.layerBlur).toBe(8);
        expect(b.layerBlur).toBe(8);
        expect(a.dirty).toBe(true);
        expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1);
        expect(saveState).toHaveBeenCalledTimes(1);
    });

    it('previews without an undo step and clamps the radius', () => {
        const a = obj();
        const { h, saveState } = setup([a]);
        h.get().setLayerBlur(9999, { history: false });
        expect(a.layerBlur).toBe(LAYER_BLUR_MAX);
        h.get().setLayerBlur(-1, { history: false });
        expect(a.layerBlur).toBe(0);
        expect(saveState).not.toHaveBeenCalled();
    });

    it('marks a cached parent group dirty so it redraws', () => {
        const group = obj();
        const child = obj();
        child.group = group;
        const { h } = setup([child]);
        h.get().setLayerBlur(2);
        expect(group.dirty).toBe(true);
    });

    it('does nothing without a canvas or a selection', () => {
        const { h, saveState } = setup([]);
        h.get().setLayerBlur(5);
        expect(saveState).not.toHaveBeenCalled();
        const h2 = createHarness([createFilterSlice as never], { canvas: null });
        expect(() => h2.get().setLayerBlur(5)).not.toThrow();
    });
});
