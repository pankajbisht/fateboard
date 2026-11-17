/**
 * Page layers slice (2026-11-17): real layers that hold objects. The canvas keeps the list
 * (`canvas.docLayers`, saved with the page); the store mirrors it for the panel.
 */
import * as fabric from 'fabric';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness, type Harness } from '@/test/sliceHarness';
import { serializeCanvas } from '@/lib/serialization';
import type { DocLayer } from '@/lib/canvas/docLayers';
import { createPageLayersSlice, type PageLayersSlice } from '../createPageLayersSlice';

type S = PageLayersSlice & { canvas: fabric.Canvas };
let h: Harness<S>;
let canvas: fabric.Canvas;
let unbind: () => void;
const saveState = vi.fn();
const showToast = vi.fn();
const syncLayers = vi.fn();

const flush = () => Promise.resolve();
const rect = (patch: Record<string, unknown> = {}) =>
    Object.assign(
        new fabric.Rect({
            left: 0,
            top: 0,
            width: 10,
            height: 10,
            originX: 'left',
            originY: 'top',
        }),
        patch,
    );
const layerOf = (o: fabric.FabricObject) => (o as unknown as { layerId?: string }).layerId;
const docLayers = () => (canvas as unknown as { docLayers: DocLayer[] }).docLayers;

beforeEach(() => {
    canvas = new fabric.Canvas(document.createElement('canvas'), { renderOnAddRemove: false });
    h = createHarness<S>([createPageLayersSlice], {
        canvas,
        saveState,
        showToast,
        syncLayers,
        undo: vi.fn(),
    });
    unbind = h.get().bindPageLayers(canvas);
});
afterEach(() => {
    unbind();
    canvas.dispose();
    vi.clearAllMocks();
});

describe('page layers', () => {
    it('a page starts with one layer, saved with the page and mirrored in the store', async () => {
        expect(h.get().pageLayers).toHaveLength(1);
        expect(h.get().pageLayers[0].name).toBe('Layer 1');
        expect(h.get().activeLayerId).toBe(h.get().pageLayers[0].id);
        const r = rect();
        canvas.add(r);
        await flush();
        const json = serializeCanvas(canvas) as {
            docLayers: DocLayer[];
            objects: { layerId: string }[];
        };
        expect(json.docLayers.map((l) => l.name)).toEqual(['Layer 1']);
        expect(json.objects[0].layerId).toBe(h.get().activeLayerId);
    });

    it('new layer: above the active one, becomes active, new objects go into it (one undo step)', async () => {
        const first = h.get().activeLayerId;
        const id = h.get().addPageLayer()!;
        expect(h.get().pageLayers.map((l) => l.id)).toEqual([first, id]);
        expect(h.get().activeLayerId).toBe(id);
        expect(saveState).toHaveBeenCalled();
        const r = rect();
        canvas.add(r);
        await flush();
        expect(layerOf(r)).toBe(id);
    });

    it('drawing while the active layer is hidden or locked goes to the top editable layer', async () => {
        const first = h.get().activeLayerId!;
        const second = h.get().addPageLayer()!;
        h.get().updatePageLayer(second, { locked: true });
        const r = rect();
        canvas.add(r);
        await flush();
        expect(layerOf(r)).toBe(first);
    });

    it('a saved page loads with its layers and object layers; an old page gets one "Layer 1"', async () => {
        const top = h.get().addPageLayer()!;
        h.get().updatePageLayer(top, { name: 'Ink', opacity: 0.5 });
        canvas.add(rect());
        await flush();
        const saved = serializeCanvas(canvas);
        await canvas.loadFromJSON({ objects: [{ type: 'Rect', width: 5, height: 5 }] });
        await flush();
        expect(h.get().pageLayers.map((l) => l.name)).toEqual(['Layer 1']);
        expect(layerOf(canvas.getObjects()[0])).toBe(h.get().pageLayers[0].id);
        await canvas.loadFromJSON(saved);
        await flush();
        expect(h.get().pageLayers.map((l) => [l.name, l.opacity])).toEqual([
            ['Layer 1', 1],
            ['Ink', 0.5],
        ]);
        expect(layerOf(canvas.getObjects()[0])).toBe(top); // not re-assigned while loading
    });

    it('hiding or locking a layer drops its objects from the selection', async () => {
        const r = rect();
        canvas.add(r);
        await flush();
        canvas.setActiveObject(r);
        h.get().updatePageLayer(h.get().activeLayerId!, { visible: false });
        expect(canvas.getActiveObject()).toBeUndefined();
    });

    it('folding a folder is not an undo step; other changes are', () => {
        const f = h.get().addPageLayer('folder')!;
        saveState.mockClear();
        h.get().updatePageLayer(f, { collapsed: true });
        expect(saveState).not.toHaveBeenCalled();
        h.get().updatePageLayer(f, { opacity: 0.3 });
        expect(saveState).toHaveBeenCalled();
    });

    it('deleting a layer deletes its objects, offers Undo, and always leaves one layer', async () => {
        const id = h.get().activeLayerId!;
        canvas.add(rect(), rect());
        await flush();
        h.get().removePageLayer(id);
        expect(canvas.getObjects()).toHaveLength(0);
        expect(h.get().pageLayers).toHaveLength(1);
        expect(h.get().pageLayers[0].id).not.toBe(id);
        expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ actionLabel: 'Undo' }));
    });

    it('moves the selection to another layer', async () => {
        const first = h.get().activeLayerId!;
        const r = rect();
        canvas.add(r);
        await flush();
        const second = h.get().addPageLayer()!;
        canvas.setActiveObject(r);
        expect(h.get().moveSelectionToLayer(second)).toBe(1);
        expect(layerOf(r)).toBe(second);
        expect(first).not.toBe(second);
    });

    it('a new shape selected as soon as it is added keeps the active layer', () => {
        const second = h.get().addPageLayer()!;
        const r = rect();
        canvas.add(r); // tools add, then select, in the same tick
        canvas.setActiveObject(r);
        canvas.fire('selection:created', { selected: [r] } as never);
        expect(h.get().activeLayerId).toBe(second);
        expect(layerOf(r)).toBe(second);
    });

    it('selecting an object makes its layer active', async () => {
        const first = h.get().activeLayerId!;
        const r = rect();
        canvas.add(r);
        await flush();
        h.get().addPageLayer();
        canvas.setActiveObject(r);
        canvas.fire('selection:created', { selected: [r] } as never);
        expect(h.get().activeLayerId).toBe(first);
    });

    it('merge down: objects join the layer below with the layer opacity baked in', async () => {
        const bottom = h.get().activeLayerId!;
        const top = h.get().addPageLayer()!;
        const r = rect({ opacity: 0.8 });
        canvas.add(r);
        await flush();
        h.get().updatePageLayer(top, { opacity: 0.5, blend: 'multiply' });
        expect(h.get().mergeLayerDown(top)).toBe(true);
        expect(layerOf(r)).toBe(bottom);
        expect(r.opacity).toBeCloseTo(0.4);
        expect(r.globalCompositeOperation).toBe('multiply');
        expect(h.get().pageLayers.map((l) => l.id)).toEqual([bottom]);
        expect(h.get().mergeLayerDown(bottom)).toBe(false);
    });

    it('flatten: every shown layer becomes one; hidden layers stay', async () => {
        const a = h.get().activeLayerId!;
        const ra = rect();
        canvas.add(ra);
        await flush();
        const b = h.get().addPageLayer()!;
        const rb = rect();
        canvas.add(rb);
        await flush();
        const hidden = h.get().addPageLayer()!;
        h.get().updatePageLayer(hidden, { visible: false });
        expect(h.get().flattenLayers()).toBe(true);
        expect(h.get().pageLayers.map((l) => l.id)).toEqual([a, hidden]);
        expect([layerOf(ra), layerOf(rb)]).toEqual([a, a]);
        expect(b).toBeTruthy();
    });

    it('unbind leaves a plain value behind and stops listening', async () => {
        unbind();
        unbind = () => {};
        const r = rect();
        canvas.add(r);
        await flush();
        expect(layerOf(r)).toBeUndefined();
        expect(Array.isArray(docLayers())).toBe(true);
    });
});
