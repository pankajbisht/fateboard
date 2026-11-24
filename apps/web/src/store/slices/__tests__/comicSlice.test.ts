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

describe('a scene or picture in a panel', () => {
    /** a 16:9 "scene" (any object with a size works) on panel `i` of a 2 x 2 layout */
    const place = (i: number) => {
        h.get().addPanelLayout('grid-4');
        const f = frames()[i];
        // a big 16:9 scene dropped so that its centre is in panel `i` (it spills over the others)
        const scene = new fabric.Rect({
            left: f.left + f.width / 2,
            top: f.top + f.height / 2,
            width: 800,
            height: 450,
            fill: '#888',
            strokeWidth: 0,
            originX: 'center',
            originY: 'center',
        }) as unknown as Obj;
        canvas.add(scene);
        canvas.setActiveObject(scene);
        return { scene, frame: f };
    };
    /** a frame's own box (the stroke is not part of the panel) */
    const panelBox = (f: Obj) => {
        const w = (f.width as number) * (f.scaleX as number);
        const hh = (f.height as number) * (f.scaleY as number);
        const c = f.getCenterPoint();
        return { left: c.x - w / 2, top: c.y - hh / 2, width: w, height: hh };
    };
    const box = (o: Obj) => {
        const r = o.getBoundingRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
    };

    it('Fill covers the panel it overlaps most, centred, on the Art layer (so the panel cuts the overflow)', () => {
        const { scene, frame } = place(2);
        expect(h.get().fitToPanel('fill')).toBe(true);
        const b = box(scene);
        const fb = panelBox(frame);
        expect(b.cx).toBeCloseTo(fb.left + fb.width / 2, 1);
        expect(b.cy).toBeCloseTo(fb.top + fb.height / 2, 1);
        expect(b.w).toBeGreaterThanOrEqual(fb.width - 0.5);
        expect(b.h).toBeGreaterThanOrEqual(fb.height - 0.5);
        // one of the two sides fits exactly (the other is cropped)
        expect(Math.min(b.w - fb.width, b.h - fb.height)).toBeCloseTo(0, 0);
        expect(scene.layerId).toBe(layerNamed('Art').id);
        expect(saveState).toHaveBeenCalled();
    });

    it('Fit shows the whole scene inside the panel', () => {
        const { scene, frame } = place(1);
        expect(h.get().fitToPanel('fit')).toBe(true);
        const b = box(scene);
        const fb = panelBox(frame);
        expect(b.w).toBeLessThanOrEqual(fb.width + 0.5);
        expect(b.h).toBeLessThanOrEqual(fb.height + 0.5);
        expect(Math.max(b.w - fb.width, b.h - fb.height)).toBeCloseTo(0, 0);
    });

    it('a rotated picture is turned upright to fit', () => {
        const { scene } = place(0);
        scene.set({ angle: 30 });
        h.get().fitToPanel('fill');
        expect(scene.angle).toBe(0);
    });

    it('an explicit panel wins over the nearest one', () => {
        const { scene } = place(0);
        const other = frames()[3];
        expect(h.get().fitToPanel('fill', other)).toBe(true);
        const fb = panelBox(other);
        expect(box(scene).cx).toBeCloseTo(fb.left + fb.width / 2, 1);
    });

    it('Zoom in and out scale about the centre, so the shot stays framed', () => {
        const { scene } = place(0);
        h.get().fitToPanel('fill');
        const before = box(scene);
        expect(h.get().zoomInPanel(1.25)).toBe(true);
        const after = box(scene);
        expect(after.w).toBeCloseTo(before.w * 1.25, 1);
        expect(after.cx).toBeCloseTo(before.cx, 1);
        expect(after.cy).toBeCloseTo(before.cy, 1);
        h.get().zoomInPanel(0.8);
        expect(box(scene).w).toBeCloseTo(before.w, 1);
        expect(h.get().zoomInPanel(0)).toBe(false);
        expect(h.get().zoomInPanel(Number.NaN)).toBe(false);
    });

    it('does nothing for a panel frame, nothing selected, or a page without panels (and says so)', () => {
        const toast = vi.fn();
        h.set({ showToast: toast } as never);
        const rect = new fabric.Rect({ left: 0, top: 0, width: 50, height: 50 });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        expect(h.get().fitToPanel('fill')).toBe(false);
        expect(toast).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringMatching(/panels first/i) }),
        );
        h.get().addPanelLayout('single');
        canvas.setActiveObject(frames()[0]);
        expect(h.get().fitToPanel('fill')).toBe(false);
        canvas.discardActiveObject();
        expect(h.get().fitToPanel('fill')).toBe(false);
        expect(h.get().zoomInPanel(1.1)).toBe(false);
    });
});
