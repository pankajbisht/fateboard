import { describe, expect, it } from 'vitest';
import type { FabricObject, Rect } from 'fabric';

import { createTemplateSlice, isArtboardObject } from '@/store/slices/templateSlice';
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
    const h = createHarness([createTemplateSlice as any], { canvas });
    h.set({ designTemplates: [TEMPLATE] });
    await h.get().applyDesignTemplate('test-template');
    return { canvas: canvas as any, h };
}

const bounds = (o: FabricObject) => {
    o.setCoords();
    const b = o.getBoundingRect();
    return { left: Math.round(b.left), top: Math.round(b.top) };
};

describe('templateSlice.applyDesignTemplate (BUG-008)', () => {
    it('places the artboard at (0,0)-(W,H), not centred on the origin', async () => {
        const { canvas } = await applyTemplate();
        const artboard = canvas.getObjects().find(isArtboardObject) as Rect;

        expect(artboard).toBeDefined();
        expect(bounds(artboard)).toEqual({ left: 0, top: 0 });
        expect(artboard.width).toBe(W);
        expect(artboard.height).toBe(H);
    });

    it('clips the canvas to (0,0)-(W,H)', async () => {
        const { canvas } = await applyTemplate();
        const clip = canvas.clipPath as Rect;

        expect(clip.originX).toBe('left');
        expect(clip.originY).toBe('top');
        expect(clip.left).toBe(0);
        expect(clip.top).toBe(0);
    });

    it('puts every template object at its declared top-left position', async () => {
        const { canvas } = await applyTemplate();
        const content = canvas.getObjects().filter((o: FabricObject) => !isArtboardObject(o));
        const [bg, box, dot, title] = content; // added in template order

        expect(content).toHaveLength(4);
        expect(bounds(bg)).toEqual({ left: 0, top: 0 });
        expect(bounds(box)).toEqual({ left: 100, top: 50 });
        expect(bounds(dot)).toEqual({ left: 900, top: 400 });
        expect(bounds(title)).toEqual({ left: 80, top: 500 });
    });
});
