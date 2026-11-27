/**
 * A scene or picture in a comic panel is cut to THAT panel (2026-11-27, owner: "large elements should be clipped,
 * the extra area should not be visible"): the Art layer only cut it to all panels together, so a filled scene showed
 * in the neighbouring panels. It can be dragged inside its panel (the cut stays on the panel) and dropped into
 * another one. Panel frames are locked by default (a "Lock panels" switch unlocks the layout).
 */
import * as fabric from 'fabric';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness, type Harness } from '@/test/sliceHarness';
import { createPageLayersSlice, type PageLayersSlice } from '../createPageLayersSlice';
import { createComicSlice, type ComicSlice } from '../createComicSlice';

type S = ComicSlice & PageLayersSlice & { canvas: fabric.Canvas };
type Obj = fabric.FabricObject & Record<string, unknown>;
let h: Harness<S>;
let canvas: fabric.Canvas;
let unbind: () => void;

const objs = () => canvas.getObjects() as Obj[];
const frames = () => objs().filter((o) => o.comicPanel);

beforeEach(() => {
    canvas = new fabric.Canvas(document.createElement('canvas'), { renderOnAddRemove: false });
    h = createHarness<S>([createPageLayersSlice, createComicSlice], {
        canvas,
        pageWidth: 600,
        pageHeight: 800,
        saveState: vi.fn(),
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
});

/** a big scene-sized rect with its centre in panel `i` of a 2 x 2 layout, filled into it */
const placeFilled = (i: number) => {
    h.get().addPanelLayout('grid-4');
    const f = frames()[i];
    const c = f.getCenterPoint();
    const scene = new fabric.Rect({
        left: c.x,
        top: c.y,
        width: 800,
        height: 450,
        originX: 'center',
        originY: 'center',
        strokeWidth: 0,
    }) as unknown as Obj;
    canvas.add(scene);
    canvas.setActiveObject(scene);
    expect(h.get().fitToPanel('fill')).toBe(true);
    return { scene, frame: f };
};

/** the clip's outline on the page */
const clipOnPage = (o: Obj) => {
    const clip = o.clipPath as fabric.Polygon | undefined;
    if (!clip) return null;
    const m = fabric.util.multiplyTransformMatrices(
        o.calcTransformMatrix(),
        clip.calcTransformMatrix(),
    );
    const pts = clip.points.map((p) =>
        fabric.util.transformPoint(
            new fabric.Point(p.x - clip.pathOffset.x, p.y - clip.pathOffset.y),
            m,
        ),
    );
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const panelBox = (f: Obj) => {
    const w = (f.width as number) * (f.scaleX as number);
    const hh = (f.height as number) * (f.scaleY as number);
    const c = f.getCenterPoint();
    return { x0: c.x - w / 2, x1: c.x + w / 2, y0: c.y - hh / 2, y1: c.y + hh / 2 };
};
const expectClipOn = (o: Obj, f: Obj) => {
    const got = clipOnPage(o)!;
    const want = panelBox(f);
    expect(got).not.toBeNull();
    for (const k of ['x0', 'x1', 'y0', 'y1'] as const) expect(got[k]).toBeCloseTo(want[k], 1);
};

describe('cut to its own panel', () => {
    it('Fill binds the scene to the panel and cuts it to that panel only', () => {
        const { scene, frame } = placeFilled(0);
        expect(scene.panelId).toBe(frame.panelId);
        expectClipOn(scene, frame);
    });

    it('dragging it keeps the cut on the panel, live, so it can be adjusted inside', () => {
        const { scene, frame } = placeFilled(1);
        scene.set({ left: (scene.left as number) + 40, top: (scene.top as number) - 25 });
        scene.setCoords();
        canvas.fire('object:moving', { target: scene } as never);
        expectClipOn(scene, frame);
        scene.set({
            scaleX: (scene.scaleX as number) * 1.3,
            scaleY: (scene.scaleY as number) * 1.3,
        });
        canvas.fire('object:scaling', { target: scene } as never);
        expectClipOn(scene, frame);
    });

    it('Zoom in keeps the cut on the panel', () => {
        const { scene, frame } = placeFilled(2);
        h.get().zoomInPanel(1.4);
        expectClipOn(scene, frame);
    });

    it('dropped with its centre in another panel, it moves into that panel', () => {
        const { scene } = placeFilled(0);
        const other = frames()[3];
        scene.setPositionByOrigin(other.getCenterPoint(), 'center', 'center');
        scene.setCoords();
        canvas.fire('object:modified', { target: scene } as never);
        expect(scene.panelId).toBe(other.panelId);
        expectClipOn(scene, other);
    });

    it("a scene's own frame still cuts it: the clip is the panel and the frame together", () => {
        h.get().addPanelLayout('single');
        const f = frames()[0];
        const c = f.getCenterPoint();
        const scene = new fabric.Group([new fabric.Rect({ width: 2000, height: 2000 })], {
            originX: 'center',
            originY: 'center',
            layoutManager: new fabric.LayoutManager(new fabric.FixedLayout()),
            width: 100,
            height: 80,
        }) as unknown as Obj;
        scene.sceneData = { scene: {} };
        scene.setPositionByOrigin(c, 'center', 'center');
        scene.setCoords();
        canvas.add(scene);
        canvas.setActiveObject(scene);
        // fitted, then zoomed out: the frame is smaller than the panel, so the frame is the cut
        expect(h.get().fitToPanel('fit')).toBe(true);
        h.get().zoomInPanel(0.5);
        const got = clipOnPage(scene)!;
        const k = scene.scaleX as number;
        expect(got.x1 - got.x0).toBeCloseTo(100 * k, 1);
        expect(got.y1 - got.y0).toBeCloseTo(80 * k, 1);
    });

    it('deleting its panel lets it go (no cut, no panel)', () => {
        const { scene, frame } = placeFilled(0);
        canvas.remove(frame);
        expect(scene.panelId).toBeUndefined();
        expect(scene.clipPath).toBeUndefined();
    });

    it('moving an unlocked panel moves the cut with it', () => {
        const { scene, frame } = placeFilled(0);
        h.get().setComicStyle({ panelsLocked: false });
        frame.set({ left: (frame.left as number) + 30 });
        frame.setCoords();
        canvas.fire('object:modified', { target: frame } as never);
        expectClipOn(scene, frame);
    });
});

describe('panel lock', () => {
    const locked = (f: Obj) =>
        !!(
            f.lockMovementX &&
            f.lockMovementY &&
            f.lockScalingX &&
            f.lockScalingY &&
            f.lockRotation &&
            // only its border line is hit, so a click inside the panel reaches the scene under it
            f.perPixelTargetFind
        ) && f.hasControls === false;

    it('frames are locked by default but still selectable (to fill or split them)', () => {
        expect(h.get().comicStyle.panelsLocked).toBe(true);
        h.get().addPanelLayout('grid-4');
        expect(frames().every(locked)).toBe(true);
        expect(frames().every((f) => f.selectable !== false)).toBe(true);
    });

    it('the switch unlocks and relocks every frame; a split panel follows it', () => {
        h.get().addPanelLayout('grid-4');
        h.get().setComicStyle({ panelsLocked: false });
        expect(frames().some(locked)).toBe(false);
        h.get().setComicStyle({ panelsLocked: true });
        canvas.setActiveObject(frames()[0]);
        h.get().splitComicPanel('vertical');
        expect(frames()).toHaveLength(5);
        expect(frames().every(locked)).toBe(true);
    });

    it('a frame loaded from a saved page is locked too', () => {
        const f = new fabric.Rect({ width: 50, height: 50 }) as unknown as Obj;
        f.comicPanel = true;
        canvas.add(f);
        expect(locked(f)).toBe(true);
    });
});
