/** Comic slice (2026-11-17, Clip Studio style): panel layouts on layers, split, tones, effect lines. */
import * as fabric from 'fabric';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness, type Harness } from '@/test/sliceHarness';
import type { DocLayer } from '@/lib/canvas/docLayers';
import { createPageLayersSlice, type PageLayersSlice } from '../createPageLayersSlice';
import { createComicSlice, type ComicSlice } from '../createComicSlice';

type S = ComicSlice & PageLayersSlice & { canvas: fabric.Canvas };
type Obj = fabric.FabricObject & Record<string, unknown>;
let h: Harness<S>;
let canvas: fabric.Canvas;
let unbind: () => void;
const saveState = vi.fn();

const objs = () => canvas.getObjects() as Obj[];
const frames = () => objs().filter((o) => o.comicPanel);
const areas = () => objs().filter((o) => o.comicPanelArea);
const layerNamed = (name: string) => h.get().pageLayers.find((l: DocLayer) => l.name === name)!;

beforeEach(() => {
    canvas = new fabric.Canvas(document.createElement('canvas'), { renderOnAddRemove: false });
    h = createHarness<S>([createPageLayersSlice, createComicSlice], {
        canvas,
        pageWidth: 600,
        pageHeight: 800,
        saveState,
        syncLayers: vi.fn(),
    });
    const a = h.get().bindPageLayers(canvas);
    const b = h.get().bindComic(canvas);
    unbind = () => {
        b();
        a();
    };
});
afterEach(() => {
    unbind();
    canvas.dispose();
    vi.clearAllMocks();
});

describe('panel layouts', () => {
    it('a preset makes frames on top, white panel areas below and a clipped Art layer to draw in', () => {
        expect(h.get().addPanelLayout('grid-4')).toBe(4);
        expect(frames()).toHaveLength(4);
        expect(areas()).toHaveLength(4);
        const folder = layerNamed('Comic panels');
        expect(folder.kind).toBe('folder');
        expect(layerNamed('Art')).toMatchObject({ clip: true, parentId: folder.id });
        expect(layerNamed('Panel area')).toMatchObject({ locked: true });
        expect(h.get().activeLayerId).toBe(layerNamed('Art').id);
        expect(frames().every((f) => f.layerId === layerNamed('Panel borders').id)).toBe(true);
        // a new layout replaces the old panels and reuses the layers
        expect(h.get().addPanelLayout('single')).toBe(1);
        expect(frames()).toHaveLength(1);
        expect(h.get().pageLayers.filter((l: DocLayer) => l.name === 'Art')).toHaveLength(1);
    });

    it('panels fit inside the page margins with the gutter between them', () => {
        h.get().setComicStyle({ gutter: 20 });
        h.get().addPanelLayout('two-cols');
        const [a, b] = frames();
        expect(a.left).toBe(36); // default margin
        expect((b.left as number) - ((a.left as number) + (a.width as number))).toBeCloseTo(20);
    });

    it('split cuts the selected panel (and its area) in two', () => {
        h.get().addPanelLayout('single');
        canvas.setActiveObject(frames()[0]);
        expect(h.get().splitComicPanel('horizontal')).toBe(true);
        expect(frames()).toHaveLength(2);
        expect(areas()).toHaveLength(2);
        const [top, bottom] = frames();
        expect((bottom.top as number) > (top.top as number)).toBe(true);
    });

    it('moving or deleting a frame moves or deletes its panel area', () => {
        h.get().addPanelLayout('single');
        const frame = frames()[0];
        frame.set({ left: 100 });
        canvas.fire('object:modified', { target: frame } as never);
        const area = areas()[0];
        expect(area.getCenterPoint().x).toBeCloseTo(frame.getCenterPoint().x);
        canvas.remove(frame);
        expect(areas()).toHaveLength(0);
    });
});

describe('tones and effects', () => {
    it('a screentone fills the selection with a pattern and can be removed', () => {
        const r = new fabric.Rect({ width: 50, height: 50, fill: '#ff0000' });
        canvas.add(r);
        canvas.setActiveObject(r);
        expect(h.get().applyTone({ kind: 'lines', density: 0.4 })).toBe(1);
        expect(r.fill).toBeInstanceOf(fabric.Pattern);
        expect((r as unknown as Obj).toneParams).toMatchObject({ kind: 'lines', density: 0.4 });
        expect(h.get().removeTone()).toBe(1);
        expect(r.fill).toBe('#ff0000');
    });

    it('focus lines, speed lines and bursts fill the selected panel', () => {
        h.get().addPanelLayout('single');
        const frame = frames()[0];
        canvas.setActiveObject(frame);
        expect(h.get().addMangaEffect('focus')).toBe(true);
        const fx = objs().at(-1)!;
        expect(fx.type).toBe('path');
        expect(fx.name).toBe('Focus lines');
        const box = fx.getBoundingRect();
        const panel = frame.getBoundingRect();
        expect(box.left).toBeGreaterThanOrEqual(panel.left - 1);
        expect(box.left + box.width).toBeLessThanOrEqual(panel.left + panel.width + 1);
        expect(fx.layerId).toBe(layerNamed('Art').id); // drawn into the clipped art layer
        canvas.discardActiveObject();
        expect(h.get().addMangaEffect('speed')).toBe(true);
        expect(h.get().addMangaEffect('burst')).toBe(true);
    });
});
