/** BUG-059: a saved template puts every object back exactly where it was (centre-origin objects shifted by half). */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { createTemplateSlice } from '@/store/slices/templateSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

describe('save canvas as template (BUG-059)', () => {
    it('stores top-left positions whatever the object origin', () => {
        const canvas: any = createFakeCanvas();
        const centred = new fabric.Rect({
            left: 100,
            top: 100,
            width: 40,
            height: 20,
            originX: 'center',
            originY: 'center',
        } as any);
        const corner = new fabric.Circle({
            left: 10,
            top: 30,
            radius: 5,
            originX: 'left',
            originY: 'top',
        } as any);
        canvas.add(centred, corner);
        const h = createHarness([createTemplateSlice as any], { canvas });
        const t = h.get().saveCanvasAsTemplate({
            id: 't',
            name: 'T',
            category: 'Social',
            sizeId: 'instagram-square',
            thumbnail: '',
            tags: [],
        });
        const [rect, circle] = t.objects;
        expect(rect.left).toBeCloseTo(79.5); // 100 - (40 + 1 px stroke) / 2
        expect(rect.top).toBeCloseTo(89.5);
        expect(circle.left).toBeCloseTo(10);
        expect(circle.top).toBeCloseTo(30);
    });
});
