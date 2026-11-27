import { describe, expect, it, vi } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { readPropData } from '@/props/board';
import { uiPrefsStorage } from '@/lib/storage';
import { PROP_DRAG_TYPE, createPropsSlice } from '../createPropsSlice';

const make = (extra: Record<string, unknown> = {}) =>
    createHarness([createPropsSlice as never], {
        canvas: null,
        boardMode: 'design',
        pageWidth: 1200,
        pageHeight: 1200,
        showToast: vi.fn(),
        ...extra,
    });

/** A drag event with our payload (jsdom has no DataTransfer). */
const dragEvent = (types: string[], data = '') => ({
    dataTransfer: { types, getData: (t: string) => (types.includes(t) ? data : '') },
    preventDefault: vi.fn(),
});

describe('props slice', () => {
    it('adds a prop at the view centre, scaled for the page, and selects it', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        expect(await h.get().addProp('tree-round')).toBe(true);
        const [obj] = canvas.getObjects();
        expect(readPropData(obj)).toMatchObject({ propId: 'tree-round' });
        const c = canvas.getVpCenter();
        expect(obj.left).toBe(c.x);
        expect(obj.top).toBe(c.y);
        expect(obj.scaleX).toBe(2); // 1200 px page / 600 reference side
        expect(canvas.getActiveObject()).toBe(obj);
    });

    it('adds a prop where it was dropped', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        expect(await h.get().addProp('cloud-puffy', { at: { x: 40, y: 70 } })).toBe(true);
        const [obj] = canvas.getObjects();
        expect([obj.left, obj.top]).toEqual([40, 70]);
    });

    it('refuses an unknown prop or a missing canvas without throwing', async () => {
        expect(await make().get().addProp('tree-round')).toBe(false);
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        expect(await h.get().addProp('no-such-prop')).toBe(false);
        expect(canvas.getObjects()).toHaveLength(0);
    });

    it('a prop dragged from the panel lands on the drop point', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        const off = h.get().bindProps(canvas as never);

        const over = dragEvent([PROP_DRAG_TYPE]);
        canvas.fire('dragover', { e: over });
        expect(over.preventDefault).toHaveBeenCalled(); // allows the drop

        const drop = dragEvent([PROP_DRAG_TYPE], 'moon-crescent');
        canvas.fire('drop', { e: drop, scenePoint: { x: 12, y: 34 } });
        await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(1));
        const [obj] = canvas.getObjects();
        expect(readPropData(obj)).toMatchObject({ propId: 'moon-crescent' });
        expect([obj.left, obj.top]).toEqual([12, 34]);
        off();
    });

    it('ignores other drags (files, layers) so their own handlers keep working', () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        h.get().bindProps(canvas as never);
        const over = dragEvent(['Files']);
        canvas.fire('dragover', { e: over });
        expect(over.preventDefault).not.toHaveBeenCalled();
        canvas.fire('drop', { e: dragEvent(['Files']), scenePoint: { x: 0, y: 0 } });
        expect(canvas.getObjects()).toHaveLength(0);
    });

    it('does not take drops while a page is loading', () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas, isPageSwitching: true });
        h.get().bindProps(canvas as never);
        canvas.fire('drop', { e: dragEvent([PROP_DRAG_TYPE], 'sun'), scenePoint: { x: 0, y: 0 } });
        expect(canvas.getObjects()).toHaveLength(0);
    });

    it('binds itself to each new board and lets go of the old one', async () => {
        const h = make();
        const first = createFakeCanvas();
        h.set({ canvas: first });
        const second = createFakeCanvas();
        h.set({ canvas: second });
        const drop = { e: dragEvent([PROP_DRAG_TYPE], 'star'), scenePoint: { x: 5, y: 6 } };
        first.fire('drop', drop);
        second.fire('drop', drop);
        await vi.waitFor(() => expect(second.getObjects()).toHaveLength(1));
        expect(first.getObjects()).toHaveLength(0);
    });

    it('remembers recently added props, newest first, without repeats, at most 12', async () => {
        uiPrefsStorage.save('props', undefined);
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        await h.get().addProp('sun');
        await h.get().addProp('cat');
        await h.get().addProp('sun');
        expect(h.get().propRecent).toEqual(['sun', 'cat']);
        for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11'])
            h.get().notePropUsed(id);
        expect(h.get().propRecent).toHaveLength(12);
        expect(h.get().propRecent[0]).toBe('a11');
    });

    it('stars and unstars favourites; both lists survive a new store', () => {
        uiPrefsStorage.save('props', undefined);
        const h = make();
        h.get().togglePropFavorite('torii');
        h.get().togglePropFavorite('cat');
        h.get().togglePropFavorite('torii');
        expect(h.get().propFavorites).toEqual(['cat']);
        h.get().notePropUsed('sun');
        const again = make();
        expect(again.get().propFavorites).toEqual(['cat']);
        expect(again.get().propRecent).toEqual(['sun']);
    });

    it('ignores saved junk', () => {
        uiPrefsStorage.save('props', { favorites: ['ok-id', 5, 'Bad Id!'], recent: 'x' });
        const h = make();
        expect(h.get().propFavorites).toEqual(['ok-id']);
        expect(h.get().propRecent).toEqual([]);
    });

    describe('styling the selected prop', () => {
        const placed = async () => {
            const canvas = createFakeCanvas();
            const saveState = vi.fn();
            const pauseHistory = vi.fn();
            const resumeHistory = vi.fn();
            const h = make({ canvas, saveState, pauseHistory, resumeHistory });
            await h.get().addProp('tree-round');
            const obj = canvas.getObjects()[0];
            return { canvas, h, obj, saveState, pauseHistory, resumeHistory };
        };

        it('recolours, re-outlines and tones the same object in one undo step', async () => {
            const { canvas, h, obj, saveState, pauseHistory, resumeHistory } = await placed();
            obj.set({ left: 210, angle: 12 });
            expect(
                await h.get().updateSelectedProp({ colors: { leaf: '#123456' }, outlineWidth: 6 }),
            ).toBe(true);
            expect(canvas.getObjects()).toEqual([obj]);
            expect(readPropData(obj)).toMatchObject({
                colors: { leaf: '#123456' },
                outlineWidth: 6,
            });
            expect([obj.left, obj.angle]).toEqual([210, 12]);
            expect(pauseHistory).toHaveBeenCalledTimes(1);
            expect(resumeHistory).toHaveBeenCalledTimes(1);
            expect(saveState).toHaveBeenCalledWith(true);
            await h.get().updateSelectedProp({ tone: { kind: 'lines', density: 0.6 } });
            expect(readPropData(obj)!.tone).toEqual({ kind: 'lines', density: 0.6 });
        });

        it('Randomize picks another variant', async () => {
            const { h, obj } = await placed();
            const before = readPropData(obj)!.variant;
            expect(await h.get().randomizeSelectedProp()).toBe(true);
            expect(readPropData(obj)!.variant).not.toBe(before);
        });

        it('does nothing without a selected prop', async () => {
            const canvas = createFakeCanvas();
            const h = make({ canvas });
            expect(await h.get().updateSelectedProp({ outlineWidth: 2 })).toBe(false);
            expect(await h.get().randomizeSelectedProp()).toBe(false);
        });
    });

    describe('phase 4: scenes, time of day, shadows, ground line', () => {
        it('a new grounded prop has a shadow, a cloud has none', async () => {
            const canvas = createFakeCanvas();
            const h = make({ canvas });
            await h.get().addProp('tree-round');
            await h.get().addProp('cloud-puffy');
            const [tree, cloud] = canvas.getObjects();
            expect(readPropData(tree)!.shadow).toBe(true);
            expect(readPropData(cloud)!.shadow).toBe(false);
        });

        it('time of day restyles every prop on the page in one undo step; new props follow it', async () => {
            const canvas = createFakeCanvas();
            const saveState = vi.fn();
            const h = make({ canvas, saveState, pauseHistory: vi.fn(), resumeHistory: vi.fn() });
            await h.get().addProp('tree-round');
            await h.get().addProp('house-village');
            const [a, b] = canvas.getObjects();
            expect(await h.get().setPropTimeOfDay('night')).toBe(2);
            expect(canvas.getObjects()).toEqual([a, b]);
            expect([readPropData(a)!.light, readPropData(b)!.light]).toEqual(['night', 'night']);
            expect(saveState).toHaveBeenCalledTimes(1);
            await h.get().addProp('bench');
            expect(readPropData(canvas.getObjects()[2])!.light).toBe('night');
        });

        it('a scene preset fills three named layers, the backdrop covering the page', async () => {
            const canvas = createFakeCanvas();
            const layers: { id: string; name?: string }[] = [];
            const active: string[] = [];
            const h = make({
                canvas,
                pageWidth: 1200,
                pageHeight: 800,
                saveState: vi.fn(),
                pauseHistory: vi.fn(),
                resumeHistory: vi.fn(),
                addPageLayer: () => {
                    const id = `L${layers.length}`;
                    layers.push({ id });
                    return id;
                },
                updatePageLayer: (id: string, patch: { name?: string }) => {
                    layers.find((l) => l.id === id)!.name = patch.name;
                },
                setActiveLayer: (id: string) => active.push(id),
            });
            const placed = await h.get().applyPropScene('forest');
            expect(placed).toBeGreaterThan(5);
            expect(layers.map((l) => l.name)).toEqual(['Background', 'Midground', 'Foreground']);
            expect(active).toEqual(['L0', 'L1', 'L2']);
            const sky = canvas.getObjects()[0];
            expect(readPropData(sky)!.propId).toBe('sky-day');
            const r = sky.getBoundingRect();
            expect(r.width).toBeGreaterThanOrEqual(1199);
            expect(r.height).toBeGreaterThanOrEqual(799);
            expect(await h.get().applyPropScene('no-such-scene')).toBe(0);
        });

        it('snaps a dragged prop onto the ground line when close', async () => {
            uiPrefsStorage.save('props', undefined);
            const canvas = createFakeCanvas();
            const h = make({ canvas, pageWidth: 1000, pageHeight: 1000 });
            h.get().bindProps(canvas as never);
            h.get().setPropGroundSnap(true);
            h.get().setPropGroundLine(0.8);
            await h.get().addProp('bench');
            const bench = canvas.getObjects()[0];
            const half = bench.getBoundingRect().height / 2;
            bench.set({ top: 800 - half - 6 });
            bench.setCoords();
            canvas.fire('object:moving', { target: bench });
            const r = bench.getBoundingRect();
            expect(r.top + r.height).toBeCloseTo(800, 0);
            // far away: left alone
            bench.set({ top: 300 });
            bench.setCoords();
            canvas.fire('object:moving', { target: bench });
            expect(bench.top).toBe(300);
            expect(make().get().propGroundLine).toBe(0.8); // saved
        });
    });
});
