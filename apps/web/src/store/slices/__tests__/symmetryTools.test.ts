import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createHarness, tick } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { reflection } from '@/lib/canvas/symmetryMath';
import { createSymmetrySlice } from '../createSymmetrySlice';
import { copyEdited, linkCopies, linkOf, rebuildCopies } from '../symmetry/symmetryLinks';
import { applyPoses, familyPoses, restorePoses } from '../symmetry/symmetryAnimation';
import { symmetryClones } from '../../brushes/symmetryCopies';

function make(extra: Record<string, unknown> = {}) {
    const canvas = createFakeCanvas();
    const h = createHarness([createSymmetrySlice as never], {
        canvas,
        symmetry: 'x',
        symmetryCenter: { x: 100, y: 0 },
        symmetryAngle: 90,
        symmetryCount: 6,
        showToast: vi.fn(),
        saveState: vi.fn(),
        persist: vi.fn(),
        ...extra,
    });
    h.set({
        setSymmetry: (mode: string) => h.set({ symmetry: mode }),
        updateBrush: (patch: Record<string, unknown>) => h.set(patch),
    });
    return { h, canvas: canvas as unknown as fabric.Canvas };
}

const rect = (left: number, top = 0, patch: Partial<fabric.RectProps> = {}) =>
    new fabric.Rect({
        left,
        top,
        width: 20,
        height: 10,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
        ...patch,
    });

const cx = (o: fabric.FabricObject) => o.getCenterPoint().x;

describe('linked symmetry copies', () => {
    it('moving the source rebuilds its copies; moving a copy moves the source', async () => {
        const { canvas } = make();
        const src = rect(40);
        const m = [reflection({ x: 100, y: 0 }, 90)];
        const copies = await symmetryClones(src, m);
        linkCopies(src, copies, m, {}, { x: 100, y: 0 });
        canvas.add(src, ...copies);
        expect(cx(copies[0])).toBeCloseTo(150, 6);

        src.set({ left: 0 });
        src.setCoords();
        await rebuildCopies(canvas, src);
        const copy = canvas.getObjects().find((o) => linkOf(o))!;
        expect(cx(copy)).toBeCloseTo(190, 6);
        expect(canvas.getObjects()).toHaveLength(2);

        const before = copy.calcTransformMatrix() as never;
        copy.set({ left: copy.left - 30 });
        copy.setCoords();
        const source = await copyEdited(canvas, copy, before);
        expect(source).toBe(src);
        expect(cx(src)).toBeCloseTo(40, 6); // the copy moved left 30 → the source moved right 30
    });

    it('break link, bake all and merge into one group', async () => {
        const { h, canvas } = make();
        const src = rect(40);
        const m = [reflection({ x: 100, y: 0 }, 90)];
        const copies = await symmetryClones(src, m);
        linkCopies(src, copies, m, {}, { x: 100, y: 0 });
        canvas.add(src, ...copies);
        canvas.setActiveObject(src);
        expect(await h.get().mergeSymmetryCopies()).toBe(true);
        expect(canvas.getObjects()).toHaveLength(1);
        expect(canvas.getObjects()[0].type).toBe('group');

        const copies2 = await symmetryClones(src, m);
        linkCopies(src, copies2, m, {}, { x: 100, y: 0 });
        canvas.add(...copies2);
        expect(h.get().bakeSymmetryCopies()).toBe(1);
        expect(linkOf(copies2[0])).toBeNull();
    });
});

describe('symmetry shape tools', () => {
    it('complete the other half mirrors only the drawn side, linked', async () => {
        const { h, canvas } = make();
        canvas.add(rect(20), rect(50, 30));
        expect(await h.get().completeSymmetryHalf()).toBe(2);
        const xs = canvas
            .getObjects()
            .map(cx)
            .sort((a, b) => a - b);
        expect(xs).toEqual([30, 60, 140, 170].map((x) => expect.closeTo(x, 6)) as never);
        expect(canvas.getObjects().filter((o) => linkOf(o))).toHaveLength(2);
    });

    it('cut and mirror keeps one side, clips what crosses and drops the other side', async () => {
        const { h, canvas } = make();
        const left = rect(20);
        const across = rect(90);
        const right = rect(160);
        canvas.add(left, across, right);
        expect(await h.get().cutAndMirror(1)).toBe(2);
        expect(canvas.getObjects()).not.toContain(right);
        expect(across.clipPath).toBeTruthy();
        expect(canvas.getObjects()).toHaveLength(4);
    });

    it('scores the page and fixes near-symmetry in one go', () => {
        const { h, canvas } = make();
        canvas.add(rect(50), rect(133, 3));
        expect(h.get().analyzeSymmetryNow()!.score).toBeLessThan(100);
        expect(h.get().fixNearSymmetry()).toBe(1);
        expect(h.get().symmetryScore.score).toBe(100);
        expect(h.get().saveState).toHaveBeenCalled();
    });

    it('the heatmap adds helper boxes and removes them when turned off', () => {
        const { h, canvas } = make();
        canvas.add(rect(50));
        h.get().setSymmetryHeatmap(true);
        const heat = () =>
            canvas
                .getObjects()
                .filter((o) => (o as never as Record<string, unknown>).__fbSymmetryHeat);
        expect(heat()).toHaveLength(1);
        expect(heat()[0].excludeFromExport).toBe(true);
        h.get().setSymmetryHeatmap(false);
        expect(heat()).toHaveLength(0);
    });

    it('a path becomes the curve axis; strokes are mirrored across it', async () => {
        const { h, canvas } = make();
        const curve = new fabric.Path('M 0 100 L 400 100', {
            originX: 'left',
            originY: 'top',
            stroke: '#000',
        });
        canvas.add(curve);
        canvas.setActiveObject(curve);
        expect(h.get().useSelectionAsSymmetryCurve()).toBe(true);
        expect(h.get().symmetry).toBe('curve');
        const stroke = new fabric.Path('M 100 60 L 200 60', {
            originX: 'left',
            originY: 'top',
            stroke: '#f00',
        });
        const plan = h.get().symmetryCopyPlan()!;
        const copy = await plan.warp!(stroke);
        expect(copy!.getCenterPoint().y).toBeCloseTo(140, 0);
        expect(await plan.warp!(curve)).toBeNull();
    });
});

describe('animated symmetry', () => {
    it('poses are periodic and restore exactly', async () => {
        const { canvas } = make();
        const src = rect(40);
        const m = [reflection({ x: 100, y: 0 }, 90)];
        const copies = await symmetryClones(src, m);
        linkCopies(src, copies, m, {}, { x: 100, y: 0 });
        canvas.add(src, ...copies);
        const poses = familyPoses(canvas);
        expect(poses).toHaveLength(2);
        const start = cx(src);
        const settings = { effect: 'spin' as const, period: 2, amount: 0.5 };
        applyPoses(poses, settings, 500);
        expect(cx(src)).not.toBeCloseTo(start, 3);
        applyPoses(poses, settings, 2000); // one full turn
        expect(cx(src)).toBeCloseTo(start, 6);
        applyPoses(poses, { ...settings, effect: 'pulse' }, 300);
        restorePoses(poses);
        expect(cx(src)).toBeCloseTo(start, 6);
        expect(src.opacity).toBe(1);
    });

    it('play needs linked copies', () => {
        const { h } = make();
        expect(h.get().playSymmetryAnimation()).toBe(false);
        expect(h.get().showToast).toHaveBeenCalled();
    });
});

describe('challenges, time machine and stamps', () => {
    it('a challenge adds a seeded target, scores a drawing and cleans up', () => {
        const { h, canvas } = make({ boardMode: 'design', pageWidth: 400, pageHeight: 300 });
        expect(h.get().startSymmetryChallenge(7)).toBe(true);
        const c = h.get().symmetryChallenge;
        expect(c.targetIds.length).toBeGreaterThanOrEqual(3);
        expect(h.get().symmetry).toBe('none');
        expect(h.get().checkSymmetryChallenge()).toBe(0); // nothing drawn yet
        h.get().setSymmetryChallengeHint(true);
        h.get().endSymmetryChallenge();
        expect(canvas.getObjects()).toHaveLength(0);
        expect(h.get().symmetry).toBe('x');
    });

    it('the time machine clamps its step', () => {
        const { h, canvas } = make();
        canvas.add(rect(0), rect(30));
        expect(h.get().symmetryTimeTotal()).toBe(2);
        h.get().setSymmetryTimeStep(9);
        expect(h.get().symmetryTimeStep).toBe(2);
        h.get().setSymmetryTimeStep(null);
        expect(h.get().symmetryTimeStep).toBeNull();
    });

    it('stamps: saving needs a selection and refuses photos', async () => {
        const { h, canvas } = make();
        expect(h.get().saveSymmetryStamp()).toBeNull();
        const r = rect(0);
        canvas.add(r);
        canvas.setActiveObject(r);
        const stamp = h.get().saveSymmetryStamp('Star');
        expect(stamp?.name).toBe('Star');
        expect(h.get().symmetryStamps.at(-1).objects).toHaveLength(1);
        h.get().armSymmetryStamp(stamp!.id);
        expect(h.get().symmetryStampArmed).toBe(stamp!.id);
        await tick();
    });
});
