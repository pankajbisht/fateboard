import { describe, expect, it, vi } from 'vitest';
import type { FabricObject } from 'fabric';

import { createTemplateSlice } from '@/store/slices/templateSlice';
import type { DesignTemplate } from '@/components/organisms/effects/designTemplate.types';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

// youtube-thumbnail preset = 1280 x 720
const W = 1280;
const H = 720;

const TEMPLATE = {
    id: 'test-template',
    name: 'Test',
    category: 'Social',
    sizeId: 'youtube-thumbnail',
    tags: [],
    objects: [
        // full-bleed background: content bounds == artboard, so centering is a no-op
        { id: 'bg', type: 'rect', left: 0, top: 0, width: W, height: H, fill: '#000' },
        { id: 'box', type: 'rect', left: 100, top: 50, width: 200, height: 100, fill: '#f00' },
        { id: 'dot', type: 'circle', left: 900, top: 400, radius: 50, fill: '#0f0' },
        { id: 'title', type: 'text', left: 80, top: 500, width: 600, text: 'Hello' },
    ],
} as unknown as DesignTemplate;

async function applyTemplate() {
    const canvas = createFakeCanvas();
    const setSelectedPreset = vi.fn();
    const h = createHarness([createTemplateSlice as any], { canvas, setSelectedPreset });
    h.set({ designTemplates: [TEMPLATE] });
    await h.get().applyDesignTemplate('test-template');
    return { canvas: canvas as any, h, setSelectedPreset };
}

const bounds = (o: FabricObject) => {
    o.setCoords();
    const b = o.getBoundingRect();
    return { left: Math.round(b.left), top: Math.round(b.top) };
};

describe('templateSlice.applyDesignTemplate (BUG-008, BUG-007)', () => {
    it('the page is the artboard: page size = template size, no artboard rect, no clip', async () => {
        const { canvas, setSelectedPreset } = await applyTemplate();
        expect(setSelectedPreset).toHaveBeenCalledWith(
            expect.objectContaining({ width: W, height: H }),
        );
        expect(canvas.getObjects()).toHaveLength(4); // template content only
        expect(canvas.clipPath).toBeUndefined();
        expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('keeps the page background', async () => {
        const canvas = createFakeCanvas();
        canvas.backgroundColor = '#fafafa';
        const h = createHarness([createTemplateSlice as any], { canvas });
        h.set({ designTemplates: [TEMPLATE] });
        await h.get().applyDesignTemplate('test-template');
        expect(canvas.backgroundColor).toBe('#fafafa');
    });

    it('puts every template object at its declared top-left position on the page', async () => {
        const { canvas } = await applyTemplate();
        const [bg, box, dot, title] = canvas.getObjects() as FabricObject[]; // template order

        expect(bounds(bg)).toEqual({ left: 0, top: 0 });
        expect(bounds(box)).toEqual({ left: 100, top: 50 });
        expect(bounds(dot)).toEqual({ left: 900, top: 400 });
        expect(bounds(title)).toEqual({ left: 80, top: 500 });
    });
});
