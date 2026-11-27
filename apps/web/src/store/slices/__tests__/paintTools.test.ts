import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createPaintToolsSlice } from '../createPaintToolsSlice';
import { DEFAULT_SPRAY_STYLE, sprayState, sprayToolFor, type SprayMode } from '@/store/sprayStyle';
import { SPRAY_TOOL_BRUSH } from '@/store/brushLibrary';

const rect = (left: number, top: number, extra: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left,
        top,
        width: 40,
        height: 40,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
        fill: 'rgba(0,0,0,0)',
        ...extra,
    });

function setup(objects: fabric.FabricObject[] = []) {
    const canvas = createFakeCanvas(objects) as unknown as fabric.Canvas & Record<string, unknown>;
    // the Fabric calls the tools make that the fake canvas does not have
    Object.assign(canvas, {
        setActiveObject: vi.fn(function (this: unknown, o: fabric.FabricObject) {
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
        renderOnAddRemove: true,
    });
    const setActiveTool = vi.fn();
    const saveState = vi.fn();
    const showToast = vi.fn();
    const h = createHarness([createPaintToolsSlice as never], {
        canvas,
        color: '#ff0000',
        unit: 'mm',
        setActiveTool,
        saveState,
        showToast,
        boardMode: 'design',
    });
    return { h, canvas, setActiveTool, saveState, showToast };
}

describe('Paint tools slice: settings', () => {
    it('sanitises every tool style', () => {
        const { h } = setup();
        h.get().setBucketStyle({ tolerance: 999, gap: -4, mode: 'nope' as never });
        expect(h.get().bucketStyle).toMatchObject({ tolerance: 255, gap: 0, mode: 'auto' });
        h.get().setDrafterStyle({ step: 7 as never, base: 370, penMm: 0.5 });
        expect(h.get().drafterStyle).toMatchObject({ step: 15, base: 10, penMm: 0.5 });
        h.get().setLassoStyle({ match: 'contain' });
        expect(h.get().lassoStyle.match).toBe('contain');
        h.get().setSprayStyle({ size: 9999, flow: 0 });
        expect(h.get().sprayStyle).toMatchObject({ size: 400, flow: 0.05 });
        expect(DEFAULT_SPRAY_STYLE.size).toBe(60);
    });

    it('Spray modes: unknown modes are dropped; Copy swaps the tool, paint modes rebuild the brush', () => {
        const { h, setActiveTool } = setup();
        const updateBrush = vi.fn();
        h.set({ activeTool: 'spray', updateBrush });
        h.get().setSprayStyle({ mode: 'nope' as never });
        expect(h.get().sprayStyle.mode).toBe('paint');

        h.get().setSprayStyle({ mode: 'mist' }); // paint → paint: same tool, new brush
        expect(setActiveTool).not.toHaveBeenCalled();
        expect(updateBrush).toHaveBeenCalled();

        h.get().setSprayStyle({ mode: 'copy' }); // the copy-spray tool takes over
        expect(setActiveTool).toHaveBeenLastCalledWith('spray');
        h.set({ activeTool: 'copySpray' });
        h.get().setSprayStyle({ mode: 'splatter' }); // and hands back
        expect(setActiveTool).toHaveBeenCalledTimes(2);

        setActiveTool.mockClear();
        h.set({ activeTool: 'select' });
        h.get().setSprayStyle({ mode: 'copy' }); // not open: only remembered for next time
        expect(setActiveTool).not.toHaveBeenCalled();
    });

    it('Spray modes tune the spray brush: Mist is denser, Splatter jitters drop size', () => {
        const brushOf = (mode: SprayMode) =>
            sprayState({
                sprayStyle: { ...DEFAULT_SPRAY_STYLE, mode },
                boardMode: 'whiteboard',
                stampOverrides: {},
            }).stampOverrides[SPRAY_TOOL_BRUSH] as { sprayRate: number; sizeJitter: number };
        expect(brushOf('mist').sprayRate).toBeGreaterThan(brushOf('paint').sprayRate);
        expect(brushOf('splatter').sprayRate).toBeLessThan(brushOf('paint').sprayRate);
        expect(brushOf('splatter').sizeJitter).toBeGreaterThan(0);
        expect(brushOf('paint').sizeJitter).toBe(0);
        expect(sprayToolFor('copy')).toBe('copySpray');
        expect(sprayToolFor('mist')).toBe('spray');
    });

    it('stores per-brush overrides (valid values only) and rebuilds the open brush', () => {
        const { h } = setup();
        const updateBrush = vi.fn();
        h.set({ brush: 'fire-flame', updateBrush });
        h.get().setStampOverride('fire-flame', { flow: 5, glow: 0.2 });
        expect(h.get().stampOverrides['fire-flame']).toEqual({ flow: 1, glow: 0.2 });
        expect(updateBrush).toHaveBeenCalled();
        h.get().resetStampOverride('fire-flame');
        expect(h.get().stampOverrides['fire-flame']).toBeUndefined();
    });
});

describe('Paint bucket', () => {
    it('recolours the closed shape under the click (one undo step)', () => {
        const box = rect(0, 0);
        const { h, saveState } = setup([box]);
        expect(h.get().bucketFillAt({ x: 20, y: 20 })).toBe('shape');
        expect(box.fill).toBe('#ff0000');
        expect(saveState).toHaveBeenCalledTimes(1);
    });

    it('a click outside the circle (inside its box) does not recolour it', () => {
        const circle = new fabric.Circle({
            left: 0,
            top: 0,
            radius: 20,
            originX: 'left',
            originY: 'top',
            strokeWidth: 0,
            fill: '',
        });
        const { h } = setup([circle]);
        h.get().setBucketStyle({ mode: 'shape' });
        expect(h.get().bucketFillAt({ x: 2, y: 2 })).toBe('none');
        expect(h.get().bucketFillAt({ x: 20, y: 20 })).toBe('shape');
    });
});

describe('Lasso', () => {
    const loop = [
        { x: -10, y: -10 },
        { x: 70, y: -10 },
        { x: 70, y: 70 },
        { x: -10, y: 70 },
    ];

    it('selects what the loop touches and switches to Select', () => {
        const a = rect(0, 0);
        const b = rect(50, 50); // half inside
        const c = rect(300, 300);
        const { h, canvas, setActiveTool } = setup([a, b, c]);
        expect(h.get().lassoSelect(loop)).toBe(2);
        expect(setActiveTool).toHaveBeenCalledWith('select');
        expect(canvas.getActiveObjects()).toEqual([a, b]);
    });

    it('contain picks only objects fully inside; locked and helper objects are never picked', () => {
        const a = rect(0, 0);
        const b = rect(50, 50);
        const locked = rect(5, 5, { _locked: true });
        const helper = rect(5, 5, { excludeFromExport: true });
        const { h } = setup([a, b, locked, helper]);
        h.get().setLassoStyle({ match: 'contain' });
        expect(h.get().lassoSelect(loop)).toBe(1);
    });

    it('Shift adds to and Alt removes from the selection', () => {
        const a = rect(0, 0);
        const far = rect(300, 300);
        const { h, canvas } = setup([a, far]);
        canvas.setActiveObject(far);
        expect(h.get().lassoSelect(loop, 'add')).toBe(2);
        expect(h.get().lassoSelect(loop, 'subtract')).toBe(1);
        expect(canvas.getActiveObjects()).toEqual([far]);
    });

    it('lasso fill adds a filled shape in the drawing colour', () => {
        const { h, canvas } = setup();
        expect(h.get().lassoFill(loop)).toBe(true);
        const shape = canvas.getObjects()[0] as fabric.Path;
        expect(shape.fill).toBe('#ff0000');
        expect((shape as unknown as { name: string }).name).toBe('Lasso fill');
    });
});

describe('Drafter', () => {
    it('draws a technical-pen line, a dashed construction line and a measured dimension', () => {
        const { h, canvas } = setup();
        expect(h.get().drafterLine({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(true);
        const line = canvas.getObjects()[0] as fabric.Path;
        expect(line.strokeWidth).toBeCloseTo((0.35 * 96) / 25.4);
        h.get().setDrafterStyle({ mode: 'construction' });
        h.get().drafterLine({ x: 0, y: 0 }, { x: 0, y: 50 });
        expect((canvas.getObjects()[1] as fabric.Path).strokeDashArray?.length).toBe(2);
        h.get().setDrafterStyle({ mode: 'dimension' });
        h.get().drafterLine({ x: 0, y: 0 }, { x: (25.4 * 96) / 25.4, y: 0 }); // 25.4 mm
        const dim = canvas.getObjects()[2] as fabric.Group;
        expect((dim as unknown as { name: string }).name).toBe('Dimension');
        const label = dim
            .getObjects()
            .find((o) => o instanceof fabric.FabricText) as fabric.FabricText;
        expect(label.text).toBe('25.4 mm');
        expect(h.get().drafterLine({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(false);
    });
});

describe('Reflect selection', () => {
    it('adds the symmetry copies of the selection and selects everything', async () => {
        const a = rect(110, 0);
        const { h, canvas } = setup([a]);
        canvas.setActiveObject(a);
        expect(await h.get().reflectSelection({ mode: 'radial', count: 4, around: 'page' })).toBe(
            3,
        );
        expect(canvas.getObjects()).toHaveLength(4);
        expect(canvas.getActiveObjects()).toHaveLength(4);
    });

    it('does nothing without a selection', async () => {
        const { h } = setup([rect(0, 0)]);
        expect(await h.get().reflectSelection({ mode: 'x' })).toBe(0);
    });
});
