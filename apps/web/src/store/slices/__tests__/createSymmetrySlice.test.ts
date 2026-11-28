import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { applyToPoint } from '@/lib/canvas/symmetryMath';
import { createSymmetrySlice } from '../createSymmetrySlice';
import { BUILTIN_SYMMETRY_PRESETS } from '../symmetry/symmetryPresets';

/** Symmetry slice + the Brush slice keys it reads (stubbed like the real setters). */
function make(extra: Record<string, unknown> = {}) {
    const h = createHarness([createSymmetrySlice as never], {
        canvas: null,
        symmetry: 'none',
        symmetryCenter: null,
        symmetryAngle: 90,
        symmetryCount: 6,
        showToast: vi.fn(),
        ...extra,
    });
    h.set({
        setSymmetry: (mode: string) => h.set({ symmetry: mode }),
        updateBrush: (patch: Record<string, unknown>) => h.set(patch),
    });
    return h;
}

const rect = (patch: Partial<fabric.RectProps> = {}) =>
    new fabric.Rect({
        left: 100,
        top: 100,
        width: 80,
        height: 40,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
        ...patch,
    });

describe('symmetry slice', () => {
    it('starts free, off, with default options and no pins', () => {
        const s = make().get();
        expect(s.symmetrySource).toBe('free');
        expect(s.symmetryPins).toEqual([]);
        expect(s.symmetryOptions.textMode).toBe('readable');
        expect(s.symmetryCopyPlan()).toBeNull();
    });

    it('selection source needs a selection (toast, no change) and snapshots its box', () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        expect(h.get().setSymmetrySource('selection')).toBe(false);
        expect(h.get().showToast).toHaveBeenCalled();
        expect(h.get().symmetrySource).toBe('free');

        const r = rect();
        canvas.add(r);
        canvas.setActiveObject(r);
        expect(h.get().setSymmetrySource('selection')).toBe(true);
        expect(h.get().symmetry).toBe('x'); // turned on so the choice shows
        h.get().setSymmetryEdge('right');
        const plan = h.get().symmetryCopyPlan();
        // mirror across the right edge (x = 180)
        expect(applyToPoint(plan!.matrices[0], { x: 170, y: 0 }).x).toBeCloseTo(190, 6);
    });

    it('object source follows the object as it moves, and gives it an id', () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        const r = rect();
        canvas.add(r);
        canvas.setActiveObject(r);
        h.get().setSymmetrySource('object');
        expect((r as unknown as { id?: string }).id).toBeTruthy();
        r.set({ left: 300 });
        r.setCoords();
        const m = h.get().symmetryCopyPlan()!.matrices[0];
        expect(applyToPoint(m, { x: 340, y: 0 }).x).toBeCloseTo(340, 6); // the axis is the new centre
    });

    it('pins: add, move, turn, and remove falls back to the free centre', () => {
        const h = make({ canvas: createFakeCanvas() });
        h.get().setSymmetrySource('pin');
        const [pin] = h.get().symmetryPins;
        expect(h.get().symmetryPinId).toBe(pin.id);
        h.get().updateSymmetryPin(pin.id, { x: 10, y: 20, angle: 0, name: 'Spine' });
        expect(h.get().symmetryPins[0]).toMatchObject({ x: 10, y: 20, angle: 0, name: 'Spine' });
        // horizontal axis through the pin
        const m = h.get().symmetryCopyPlan()!.matrices[0];
        expect(applyToPoint(m, { x: 0, y: 0 }).y).toBeCloseTo(40, 6);
        h.get().updateSymmetryPin(pin.id, { x: Number.NaN });
        expect(h.get().symmetryPins[0].x).toBe(10);
        h.get().removeSymmetryPin(pin.id);
        expect(h.get().symmetrySource).toBe('free');
    });

    it('chain: add switches to chain mode; steps reorder like layers and sanitise', () => {
        const h = make({ canvas: createFakeCanvas() });
        h.get().addSymmetryStep('mirror');
        h.get().addSymmetryStep('rotate');
        expect(h.get().symmetry).toBe('chain');
        const [a, b] = h.get().symmetryChain;
        h.get().moveSymmetryStep(b.id, -1);
        expect(h.get().symmetryChain.map((s) => s.id)).toEqual([b.id, a.id]);
        h.get().updateSymmetryStep(b.id, { count: 999 });
        expect(h.get().symmetryChain[0].count).toBe(64);
        expect(h.get().symmetryCopyStats().count).toBe(127); // 64 turns × mirror − original
        h.get().removeSymmetryStep(a.id);
        expect(h.get().symmetryChain).toHaveLength(1);
    });

    it('M toggles back to the last mode; Shift + [ / ] step the count within 2–64', () => {
        const h = make();
        h.set({ symmetry: 'kaleido' });
        expect(h.get().toggleSymmetry()).toBe('none');
        expect(h.get().toggleSymmetry()).toBe('kaleido');
        h.set({ symmetryCount: 63 });
        expect(h.get().stepSymmetryCount(5)).toBe(64);
        h.set({ symmetryCount: 2 });
        expect(h.get().stepSymmetryCount(-1)).toBe(2);
    });

    it('presets apply the whole setup; the dice is repeatable by seed', () => {
        const h = make({ canvas: createFakeCanvas() });
        const lotus = BUILTIN_SYMMETRY_PRESETS.find((p) => p.id === 'lotus')!;
        h.get().applySymmetryPreset(lotus);
        expect(h.get().symmetry).toBe('chain');
        expect(h.get().symmetryChain).toHaveLength(2);
        expect(h.get().symmetryVariation.fade).toBe(0.4);
        const a = h.get().rollSymmetryDice(42);
        const b = h.get().rollSymmetryDice(42);
        expect({ ...a, chain: [] }).toEqual({ ...b, chain: [] });
    });

    it('saving needs symmetry on; options and variation are clamped', () => {
        const h = make();
        expect(h.get().saveSymmetryPreset('x')).toBeNull();
        h.get().setSymmetryOptions({ spiralScale: 9, tileReach: 0.2, wallpaper: 'nope' as never });
        expect(h.get().symmetryOptions).toMatchObject({
            spiralScale: 1.5,
            tileReach: 1,
            wallpaper: 'p4m',
        });
        h.get().setSymmetryVariation({ fade: 2, hue: -999 });
        expect(h.get().symmetryVariation).toMatchObject({ fade: 0.95, hue: -180 });
    });

    it('flags a heavy setup and reports how many copies were cut', () => {
        const h = make({ canvas: createFakeCanvas(), symmetry: 'wallpaper' });
        h.get().setSymmetryOptions({ wallpaper: 'p6m', tileReach: 4 });
        const stats = h.get().symmetryCopyStats();
        expect(stats.heavy).toBe(true);
        expect(stats.wanted).toBeGreaterThan(stats.count);
    });

    it('draws a guide with handles while the panel is open; removes it when closed', () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas, activeTool: 'select', symmetry: 'x' });
        h.get().setSymmetryPanelOpen(true);
        const guides = () => canvas.getObjects().filter((o) => o.__fbSymmetryGuide);
        expect(guides()).toHaveLength(2); // axes + handles
        expect(guides().every((o) => o.excludeFromExport && o.excludeFromLayers)).toBe(true);
        h.get().setSymmetryPanelOpen(false);
        expect(guides()).toHaveLength(0);
    });
});
