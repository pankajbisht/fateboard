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

/** Header tools: lock / group / align (2026-11-12 audit, BUG-188 to BUG-191). */
describe('createLayersSlice: lock, group and align rules', () => {
    const select = (canvas: any, objs: any[]) =>
        canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));

    it('locking a multi-selection also locks the selection box (BUG-188)', () => {
        const { canvas, h, objects } = setup();
        select(canvas, objects.slice(0, 2));
        h.get().lock();
        const sel = canvas.getActiveObject();
        // otherwise dragging / nudging / resizing the box moves the locked objects
        expect(sel.lockMovementX && sel.lockMovementY && sel.lockScalingX).toBe(true);
        expect(sel.lockRotation).toBe(true);
        expect(sel.hasControls).toBe(false);
        h.get().unlock();
        expect(sel.lockMovementX).toBe(false);
        expect(sel.hasControls).toBe(true);
    });

    it('toggleLayerLock on a multi-selection locks the selection box too (BUG-188)', () => {
        const { canvas, h, objects } = setup();
        select(canvas, objects.slice(0, 2));
        h.get().toggleLayerLock();
        expect(canvas.getActiveObject().lockMovementX).toBe(true);
        h.get().toggleLayerLock();
        expect(canvas.getActiveObject().lockMovementX).toBe(false);
    });

    it('a locked group is not ungrouped (its content would come out unlocked) (BUG-190)', () => {
        const { canvas, h, objects } = setup();
        h.get().groupLayers([objects[0].id, objects[1].id]);
        const group = canvas.getObjects().find((o: any) => o instanceof fabric.Group);
        canvas.setActiveObject(group);
        h.get().lock();
        h.get().ungroupSelected();
        expect(canvas.getObjects()).toContain(group);
        expect(h.get().isGroupSelected()).toBe(false);
    });

    it('locked layers are left out of a new group (BUG-190)', () => {
        const { canvas, h, objects } = setup();
        h.get().toggleLayerLock(objects[0].id);
        h.get().groupLayers([objects[0].id, objects[1].id]);
        // only one unlocked layer left: nothing to group
        expect(canvas.getObjects()).toHaveLength(3);
        h.get().groupLayers([objects[0].id, objects[1].id, objects[2].id]);
        const group = canvas.getObjects().find((o: any) => o instanceof fabric.Group);
        expect(group.getObjects()).not.toContain(objects[0]);
        expect(canvas.getObjects()).toContain(objects[0]);
    });

    it('ungroups every group of a multi-selection and keeps positions', () => {
        const [a, b, c, d]: any[] = [rect(0), rect(20), rect(100), rect(140)];
        const { canvas, h } = setup([a, b, c, d]);
        h.get().groupLayers([a.id, b.id]);
        h.get().groupLayers([c.id, d.id]);
        const groups = canvas.getObjects().filter((o: any) => o instanceof fabric.Group);
        expect(groups).toHaveLength(2);
        select(canvas, groups);
        expect(h.get().isGroupSelected()).toBe(true);
        h.get().ungroupSelected();
        expect(canvas.getObjects()).toEqual([a, b, c, d]);
        expect(canvas.getActiveObjects()).toHaveLength(4);
        canvas.discardActiveObject(); // back to scene coordinates before measuring
        expect([a, b, c, d].map((o) => Math.round(o.getBoundingRect().left))).toEqual([
            0, 20, 100, 140,
        ]);
    });

    it('ungrouping a mixed selection keeps the other objects selected, in stack order', () => {
        const [a, b, c]: any[] = [rect(0), rect(20), rect(100)];
        const { canvas, h } = setup([a, b, c]);
        h.get().groupLayers([a.id, b.id]);
        const group = canvas.getObjects()[0];
        select(canvas, [group, c]);
        h.get().ungroupSelected();
        expect(canvas.getObjects()).toEqual([a, b, c]);
        expect(canvas.getActiveObjects()).toEqual([a, b, c]);
    });

    it('a multi-selection keeps text shapes whole; one alone still ungroups (BUG-194)', () => {
        const [a, b, c]: any[] = [rect(0), rect(20), rect(100)];
        const { canvas, h } = setup([a, b, c]);
        h.get().groupLayers([a.id, b.id]);
        const sticky = canvas.getObjects()[0];
        sticky.isTextShape = true;
        select(canvas, [sticky, c]);
        expect(h.get().isGroupSelected()).toBe(false);
        h.get().ungroupSelected();
        expect(canvas.getObjects()).toContain(sticky);
        canvas.discardActiveObject();
        canvas.setActiveObject(sticky);
        h.get().ungroupSelected();
        expect(canvas.getObjects()).toEqual([a, b, c]);
    });

    it('in design (identity viewport, canvas = page) one object aligns to the page', () => {
        const r = rect(300);
        const { canvas, h } = setup([r]); // fake canvas = an 800 × 600 page
        canvas.setActiveObject(r);
        h.get().alignObjects('align-right');
        expect(r.getBoundingRect().left + r.getBoundingRect().width).toBeCloseTo(800);
        h.get().alignObjects('align-vcenter');
        expect(r.getBoundingRect().top + r.getBoundingRect().height / 2).toBeCloseTo(300);
    });

    it('a single object aligns to the visible view of a panned / zoomed board (BUG-191)', () => {
        const r = rect(500);
        const { canvas, h } = setup([r]);
        // zoom 2, panned: the view (800 × 600 px) shows scene x 100…500, y 50…350
        canvas.viewportTransform = [2, 0, 0, 2, -200, -100];
        (canvas as any).getZoom = () => 2;
        canvas.setActiveObject(r);
        h.get().alignObjects('align-left');
        expect(r.getBoundingRect().left).toBeCloseTo(100);
        h.get().alignObjects('align-bottom');
        expect(r.getBoundingRect().top + r.getBoundingRect().height).toBeCloseTo(350);
    });
});
