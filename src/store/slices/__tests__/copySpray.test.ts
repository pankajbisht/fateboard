import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createHarness, tick } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { DEFAULT_COPY_SPRAY_STYLE, MAX_SPRAY_IMAGES } from '@/lib/canvas/copySpray';
import { createPaintToolsSlice } from '../createPaintToolsSlice';
import { imageCount, leafCount } from '../paintTools/copySprayTool';

const rect = (left: number, top: number, extra: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left,
        top,
        width: 40,
        height: 40,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
        fill: '#336699',
        ...extra,
    });

/** Scene centre of an object, inside a group or not. */
const centre = (o: fabric.FabricObject) => {
    const p = new fabric.Point(0, 0).transform(o.calcTransformMatrix());
    return { x: Math.round(p.x * 1e6) / 1e6, y: Math.round(p.y * 1e6) / 1e6 };
};
const dab = (x: number, y: number, extra: Partial<{ scale: number; angle: number }> = {}) => ({
    x,
    y,
    scale: 1,
    angle: 0,
    opacity: 1,
    ...extra,
});

function setup(objects: fabric.FabricObject[] = []) {
    const canvas = createFakeCanvas(objects) as unknown as fabric.Canvas &
        Record<string, unknown> & { fire: (name: string, e?: unknown) => void };
    Object.assign(canvas, {
        setActiveObject: vi.fn(function (o: fabric.FabricObject) {
            (canvas as unknown as { __active: unknown }).__active = o;
        }),
        getActiveObject: () => (canvas as unknown as { __active?: fabric.FabricObject }).__active,
        getActiveObjects: () => {
            const a = (canvas as unknown as { __active?: fabric.FabricObject }).__active;
            return a instanceof fabric.ActiveSelection ? a.getObjects() : a ? [a] : [];
        },
        discardActiveObject: () => {
            (canvas as unknown as { __active?: unknown }).__active = undefined;
        },
    });
    const setActiveTool = vi.fn();
    const showToast = vi.fn();
    const h = createHarness([createPaintToolsSlice as never], {
        canvas,
        activeTool: 'select',
        color: '#ff0000',
        setActiveTool,
        showToast,
        boardMode: 'design',
    });
    /** Choose the tool the way setActiveTool does: the store first, the selection is cleared after. */
    const choose = async () => {
        h.set({ activeTool: 'copySpray' });
        canvas.discardActiveObject();
        await tick();
    };
    const added = () => canvas.getObjects().slice(objects.length);
    return { h, canvas, setActiveTool, showToast, choose, added };
}

describe('Copy spray (Shift + S)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('sanitises its settings', () => {
        const { h } = setup();
        h.get().setCopySprayStyle({ scale: 50, spread: -2, align: true });
        expect(h.get().copySprayStyle).toMatchObject({ scale: 4, spread: 0, align: true });
        expect(h.get().copySprayStyle.spacing).toBe(DEFAULT_COPY_SPRAY_STYLE.spacing);
    });

    it('adds the copies of the selection as one group, each centred on its dab', async () => {
        const a = rect(0, 0);
        const { h, canvas, choose, added } = setup([a]);
        canvas.setActiveObject(a);
        await choose();
        expect(await h.get().sprayCopies([dab(100, 100), dab(200, 50), dab(300, 300)])).toBe(3);
        const [group] = added() as fabric.Group[];
        expect(added()).toHaveLength(1);
        expect(group).toBeInstanceOf(fabric.Group);
        expect((group as unknown as { name?: string }).name).toBe('Copy spray');
        expect(group.getObjects().map(centre)).toEqual([
            { x: 100, y: 100 },
            { x: 200, y: 50 },
            { x: 300, y: 300 },
        ]);
        expect(centre(a)).toEqual({ x: 20, y: 20 }); // the original stays
    });

    it('a single copy of a single object is added as it is (no group of one)', async () => {
        const a = rect(0, 0);
        const { h, canvas, choose, added } = setup([a]);
        canvas.setActiveObject(a);
        await choose();
        expect(await h.get().sprayCopies([dab(60, 60, { scale: 2, angle: 90 })])).toBe(1);
        const [copy] = added();
        expect(copy).toBeInstanceOf(fabric.Rect);
        expect(centre(copy)).toEqual({ x: 60, y: 60 });
        expect(copy.getScaledWidth()).toBeCloseTo(80, 6);
        expect(copy.angle).toBeCloseTo(90, 6);
    });

    it('a multi-selection keeps its layout and stacking in every copy', async () => {
        const a = rect(0, 0);
        const b = rect(60, 0, { fill: '#cc3300' });
        const { h, canvas, choose, added } = setup([a, b]);
        canvas.setActiveObject(new fabric.ActiveSelection([b, a], { canvas }));
        await choose();
        expect(await h.get().sprayCopies([dab(500, 500), dab(800, 500)])).toBe(4);
        const kids = (added()[0] as fabric.Group).getObjects();
        // selection box 0…100 × 0…40, centre (50, 20): a is 30 left of it, b 30 right
        expect(kids.map(centre)).toEqual([
            { x: 470, y: 500 },
            { x: 530, y: 500 },
            { x: 770, y: 500 },
            { x: 830, y: 500 },
        ]);
        expect(kids.map((k) => k.fill)).toEqual(['#336699', '#cc3300', '#336699', '#cc3300']);
    });

    it('sprays what was selected when the tool was chosen, even after the original changes', async () => {
        const a = rect(0, 0);
        const { h, canvas, choose, added } = setup([a]);
        canvas.setActiveObject(a);
        await choose();
        a.set({ fill: '#000000' });
        canvas.remove(a);
        expect(await h.get().sprayCopies([dab(10, 10)])).toBe(1);
        expect(added()[0]?.fill ?? canvas.getObjects()[0].fill).toBe('#336699');
    });

    it('a drag with the pointer adds one group along it (the preview is optional)', async () => {
        // jsdom's 2D context stub cannot draw the preview: the spray must still work without it
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const a = rect(0, 0);
        const { h, canvas, choose, added } = setup([a]);
        canvas.setActiveObject(a);
        h.get().setCopySprayStyle({
            spacing: 1,
            spread: 0,
            sizeJitter: 0,
            rotateJitter: 0,
            opacityJitter: 0,
        });
        await choose();
        canvas.fire('mouse:down', { e: { button: 0 }, scenePoint: { x: 100, y: 100 } });
        canvas.fire('mouse:move', { e: {}, scenePoint: { x: 260, y: 100 } });
        canvas.fire('mouse:up', { e: {}, scenePoint: { x: 260, y: 100 } });
        await vi.waitFor(() => expect(added()).toHaveLength(1));
        // a 40 px square, spacing 1 → every 40 px: 100, 140, 180, 220, 260
        expect((added()[0] as fabric.Group).getObjects().map((o) => centre(o).x)).toEqual([
            100, 140, 180, 220, 260,
        ]);
        error.mockRestore();
    });

    it('counts photos, inside groups too (a drag of photos is capped lower)', () => {
        const photo = () => new fabric.FabricImage(document.createElement('canvas'));
        expect(imageCount([rect(0, 0), photo()])).toBe(1);
        expect(imageCount([new fabric.Group([photo(), rect(0, 0), photo()])])).toBe(2);
        expect(imageCount([rect(0, 0)])).toBe(0);
    });

    it('a long drag of a photo stops at 30 copies', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const el = document.createElement('canvas');
        el.width = 20;
        el.height = 20;
        const photo = new fabric.FabricImage(el, {
            left: 0,
            top: 0,
            originX: 'left',
            originY: 'top',
        });
        const { h, canvas, choose, added } = setup([photo]);
        canvas.setActiveObject(photo);
        h.get().setCopySprayStyle({ spacing: 0.1, spread: 0 });
        await choose();
        canvas.fire('mouse:down', { e: { button: 0 }, scenePoint: { x: 0, y: 0 } });
        canvas.fire('mouse:move', { e: {}, scenePoint: { x: 5000, y: 0 } });
        canvas.fire('mouse:up', { e: {}, scenePoint: { x: 5000, y: 0 } });
        await vi.waitFor(() => expect(added()).toHaveLength(1));
        expect((added()[0] as fabric.Group).getObjects()).toHaveLength(MAX_SPRAY_IMAGES);
        error.mockRestore();
    });

    it('without a selection: a toast, nothing added', async () => {
        const { h, canvas, showToast, choose, added } = setup([rect(0, 0)]);
        await choose();
        canvas.fire('mouse:down', { e: { button: 0 }, scenePoint: { x: 10, y: 10 } });
        canvas.fire('mouse:up', { e: {}, scenePoint: { x: 10, y: 10 } });
        await tick();
        expect(showToast).toHaveBeenCalledWith({ message: expect.stringMatching(/select/i) });
        expect(await h.get().sprayCopies([dab(1, 1)])).toBe(0);
        expect(added()).toHaveLength(0);
    });

    it('adds nothing while the page is switching', async () => {
        const a = rect(0, 0);
        const { h, canvas, choose, added } = setup([a]);
        canvas.setActiveObject(a);
        await choose();
        h.set({ isPageSwitching: true });
        expect(await h.get().sprayCopies([dab(10, 10)])).toBe(0);
        expect(added()).toHaveLength(0);
    });

    it('the 400-object cap counts the objects inside a selected group', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined); // jsdom: no preview
        expect(
            leafCount([rect(0, 0), new fabric.Group([rect(0, 0), new fabric.Group([rect(0, 0)])])]),
        ).toBe(3);
        const icon = new fabric.Group(
            Array.from({ length: 100 }, (_, i) => rect((i % 10) * 4, Math.floor(i / 10) * 4)),
        );
        const { h, canvas, choose, added } = setup([icon]);
        canvas.setActiveObject(icon);
        h.get().setCopySprayStyle({ scale: 0.1, spacing: 0.1, spread: 0 });
        await choose();
        canvas.fire('mouse:down', { e: { button: 0 }, scenePoint: { x: 0, y: 0 } });
        canvas.fire('mouse:move', { e: {}, scenePoint: { x: 5000, y: 0 } });
        canvas.fire('mouse:up', { e: {}, scenePoint: { x: 5000, y: 0 } });
        await vi.waitFor(() => expect(added()).toHaveLength(1));
        expect((added()[0] as fabric.Group).getObjects()).toHaveLength(4); // 400 / 100 objects each
    });

    it('a spray still cloning when the page changes is not added to the new page', async () => {
        const a = rect(0, 0);
        const { h, canvas, choose, added } = setup([a]);
        h.set({ currentPageId: 'p1' });
        canvas.setActiveObject(a);
        await choose();
        const pending = h.get().sprayCopies([dab(10, 10), dab(90, 10)]);
        h.set({ currentPageId: 'p2' }); // the switch finished while the clones loaded
        expect(await pending).toBe(0);
        expect(added()).toHaveLength(0);
    });

    it("a spray finishing after the tool closed leaves the next tool's top canvas alone", async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined); // jsdom: no preview
        const a = rect(0, 0);
        const { h, canvas, choose } = setup([a]);
        const clearContext = vi.fn();
        const ctx = { save: vi.fn(), restore: vi.fn(), transform: vi.fn() };
        Object.assign(canvas, { contextTop: ctx, clearContext });
        canvas.setActiveObject(a);
        await choose();
        canvas.fire('mouse:down', { e: { button: 0 }, scenePoint: { x: 10, y: 10 } });
        canvas.fire('mouse:up', { e: {}, scenePoint: { x: 10, y: 10 } });
        h.set({ activeTool: 'draw' }); // the next tool starts drawing on the top canvas
        clearContext.mockClear();
        await tick();
        await tick();
        expect(clearContext).not.toHaveBeenCalled();
    });

    it('Escape returns to Select; leaving the tool stops listening and drops the source', async () => {
        const a = rect(0, 0);
        const { h, canvas, setActiveTool, choose, added } = setup([a]);
        canvas.setActiveObject(a);
        await choose();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(setActiveTool).toHaveBeenCalledWith('select');
        h.set({ activeTool: 'select' });
        canvas.fire('mouse:down', { e: { button: 0 }, scenePoint: { x: 10, y: 10 } });
        canvas.fire('mouse:up', { e: {}, scenePoint: { x: 10, y: 10 } });
        await tick();
        expect(added()).toHaveLength(0);
        expect(await h.get().sprayCopies([dab(10, 10)])).toBe(0);
    });
});
