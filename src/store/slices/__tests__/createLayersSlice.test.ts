import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createLayersSlice } from '../createLayersSlice';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

const rect = (left = 0, extra: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left,
        top: 0,
        width: 10,
        height: 10,
        originX: 'left',
        originY: 'top',
        ...extra,
    });

function setup(
    objects: any[] = [rect(0), rect(20), new fabric.Circle({ radius: 5, left: 40, top: 0 })],
) {
    const canvas = createFakeCanvas(objects);
    const saveState = vi.fn();
    const h = createHarness([createLayersSlice as never], { canvas, saveState });
    h.get().syncLayers();
    return { canvas, h, saveState, objects };
}

describe('createLayersSlice', () => {
    it('syncLayers lists layers top-first and gives each a unique id and name', () => {
        const { h } = setup();
        const layers = h.get().layers;
        // names are assigned top-first on the first sync
        expect(layers.map((l: any) => l.name)).toEqual(['Circle 1', 'Rectangle 1', 'Rectangle 2']);
        expect(new Set(layers.map((l: any) => String(l.id))).size).toBe(3);
    });

    it('keeps existing names and continues numbering after them', () => {
        const { canvas, h } = setup([rect(0, { name: 'Rectangle 7' })]);
        canvas.add(rect(5));
        h.get().syncLayers();
        expect(h.get().layers.map((l: any) => l.name)).toEqual(['Rectangle 8', 'Rectangle 7']);
    });

    it('skips helper objects', () => {
        const helper = rect(0, { excludeFromExport: true });
        const { h } = setup([rect(0), helper]);
        expect(h.get().layers).toHaveLength(1);
    });

    it('renameLayer renames and records history', () => {
        const { h, saveState } = setup();
        const id = h.get().layers[0].id;
        h.get().renameLayer(id, '  Logo ');
        expect(h.get().layers[0].name).toBe('Logo');
        expect(saveState).toHaveBeenCalled();
    });

    it('toggleVisibility hides and shows', () => {
        const { h } = setup();
        const id = h.get().layers[0].id;
        h.get().toggleVisibility(id);
        expect(h.get().layers[0].visible).toBe(false);
        h.get().toggleVisibility(id);
        expect(h.get().layers[0].visible).toBe(true);
    });

    it('locked layers cannot be removed', () => {
        const { canvas, h } = setup();
        const id = h.get().layers[0].id;
        h.get().toggleLayerLock(id);
        expect(h.get().layers[0].locked).toBe(true);
        h.get().removeLayer(id);
        expect(canvas.getObjects()).toHaveLength(3);
        h.get().toggleLayerLock(id);
        h.get().removeLayer(id);
        expect(canvas.getObjects()).toHaveLength(2);
    });

    it('lock sets the Fabric lock flags and unlock clears them', () => {
        const { canvas, h, objects } = setup();
        canvas.setActiveObject(objects[0]);
        h.get().lock();
        expect(objects[0].lockMovementX).toBe(true);
        expect(objects[0]._locked).toBe(true);
        expect(h.get().isActiveObjectLocked()).toBe(true);
        h.get().unlock();
        expect(objects[0].lockMovementX).toBe(false);
    });

    it('bringToFront / sendToBack reorder the canvas', () => {
        const { canvas, h, objects } = setup();
        canvas.setActiveObject(objects[0]);
        h.get().bringToFront();
        expect(canvas.getObjects()[2]).toBe(objects[0]);
        h.get().sendToBack();
        expect(canvas.getObjects()[0]).toBe(objects[0]);
    });

    it('reorderLayer moves a layer above another', () => {
        const { canvas, h, objects } = setup();
        h.get().reorderLayer(objects[0].id, objects[2].id, 'above');
        expect(canvas.getObjects().indexOf(objects[0])).toBe(2);
    });

    it('groupLayers and ungroupSelected round-trip the objects', () => {
        const { canvas, h, objects } = setup();
        h.get().groupLayers([objects[0].id, objects[1].id]);
        expect(canvas.getObjects()).toHaveLength(2);
        const group = canvas.getObjects().find((o: any) => o instanceof fabric.Group);
        expect(group).toBeTruthy();
        canvas.setActiveObject(group);
        h.get().ungroupSelected();
        expect(canvas.getObjects()).toHaveLength(3);
        expect(canvas.getObjects().some((o: any) => o instanceof fabric.Group)).toBe(false);
    });

    it('copy then paste adds an offset copy with a new id', async () => {
        const { canvas, h, objects } = setup();
        canvas.setActiveObject(objects[0]);
        await h.get().copy();
        expect(h.get().canPaste()).toBe(true);
        await h.get().paste();
        expect(canvas.getObjects()).toHaveLength(4);
        const pasted = canvas.getObjects()[3];
        expect(pasted.id).not.toBe(objects[0].id);
        expect(pasted.left).toBe(objects[0].left + 12);
    });

    it('nothing to paste on a fresh slice', () => {
        const { h } = setup();
        expect(h.get().canPaste()).toBe(false);
    });

    it('alignObjects aligns the left edges of a multi-selection', () => {
        const { canvas, h, objects } = setup([rect(0), rect(30), rect(60)]);
        const sel: any[] = objects;
        (canvas as any).getActiveObjects = () => sel;
        h.get().alignObjects('align-right');
        const rights = sel.map((o) => o.getBoundingRect().left + o.getBoundingRect().width);
        expect(Math.max(...rights) - Math.min(...rights)).toBeLessThan(0.001);
    });
});
