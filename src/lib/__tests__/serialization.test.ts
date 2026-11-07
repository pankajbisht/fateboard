/**
 * One serializer for undo, autosave and pages: keeps every custom prop (BUG-003) and never saves
 * the temporary lock Fabric puts on a text box while you type in it.
 */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { CUSTOM_PROPS, serializeCanvas } from '../serialization';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('serializeCanvas', () => {
    it('keeps the custom props features rely on', () => {
        const r = new fabric.Rect({ width: 10, height: 10 });
        Object.assign(r, {
            customType: 'shape',
            shapeId: 's1',
            isTextShape: false,
            filterState: { a: 1 },
        });
        const json: any = serializeCanvas(createFakeCanvas([r]) as any);
        expect(json.objects[0]).toMatchObject({
            customType: 'shape',
            shapeId: 's1',
            filterState: { a: 1 },
        });
        expect(CUSTOM_PROPS).toContain('connectorData');
    });

    it('a text box being typed in is saved with its real (unlocked) props', () => {
        const t: any = new fabric.Textbox('Hi', { width: 100 });
        // what Fabric's enterEditing() does: remember, then lock while typing
        t.isEditing = true;
        t._savedProps = { selectable: true, lockMovementX: false, lockMovementY: false };
        t.selectable = false;
        t.lockMovementX = true;
        t.lockMovementY = true;

        const json: any = serializeCanvas(createFakeCanvas([t]) as any);
        expect(json.objects[0]).toMatchObject({
            selectable: true,
            lockMovementX: false,
            lockMovementY: false,
        });
        // the live object is untouched (still in typing mode)
        expect(t).toMatchObject({ selectable: false, lockMovementX: true, lockMovementY: true });
    });

    it('also inside groups', () => {
        const t: any = new fabric.Textbox('Hi');
        const g = new fabric.Group([t]);
        t.isEditing = true;
        t._savedProps = { selectable: true };
        t.selectable = false;
        const json: any = serializeCanvas(createFakeCanvas([g]) as any);
        expect(json.objects[0].objects[0].selectable).toBe(true);
        expect(t.selectable).toBe(false);
    });
});

describe('round trip (undo dedupe)', () => {
    it('serialize → load → serialize gives the same string (no phantom history steps)', async () => {
        const el = document.createElement('canvas');
        const canvas = new fabric.StaticCanvas(el, {
            width: 400,
            height: 300,
            renderOnAddRemove: false,
        });
        // data only: no drawing (jsdom's 2D context mock cannot render)
        canvas.renderAll = () => undefined;
        canvas.requestRenderAll = () => undefined;
        canvas.backgroundColor = null as any; // design pages: no canvas background
        canvas.add(
            new fabric.Textbox('Enter text', { left: 10, top: 10, width: 200 }),
            new fabric.Rect({ left: 50, top: 50, width: 40, height: 30, fill: '#f00' }),
        );

        const first = JSON.stringify(serializeCanvas(canvas as any));
        await canvas.loadFromJSON(first);
        const second = JSON.stringify(serializeCanvas(canvas as any));

        expect(second).toBe(first);
        await canvas.dispose();
    });
});
