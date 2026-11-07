/**
 * The one text float (CanvasBoard) is positioned from `selectedObject`: text shapes / sticky
 * notes must hand over the object itself (other groups keep the 'shape' marker).
 */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { createCanvasSlice } from '@/store/slices/createCanvasSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

function setup() {
    const canvas = createFakeCanvas() as any;
    const h = createHarness([createCanvasSlice as any], { canvas });
    h.set({ canvas });
    return { canvas, h };
}

const select = (canvas: any, obj: any) => {
    canvas.add(obj);
    canvas.setActiveObject(obj);
};

describe('setToolbar: selectedObject for the text float', () => {
    it('a text shape / sticky note is handed over as the object (the float anchors to it)', () => {
        const { canvas, h } = setup();
        const text = new fabric.Textbox('Note');
        const sticky: any = new fabric.Group([new fabric.Rect({ width: 130, height: 130 }), text]);
        Object.assign(sticky, { isTextShape: true, __text: text });
        select(canvas, sticky);
        h.get().setToolbar({ selected: [sticky] });
        expect(h.get().selectedObject).toBe(sticky);
        expect(h.get().showTextToolbar).toBe(false); // header text tools stay for plain text only
    });

    it('other groups and shapes keep the "shape" marker', () => {
        const { canvas, h } = setup();
        const g = new fabric.Group([new fabric.Rect(), new fabric.Circle({ radius: 4 })]);
        select(canvas, g);
        h.get().setToolbar({ selected: [g] });
        expect(h.get().selectedObject).toBe('shape');
    });
});
