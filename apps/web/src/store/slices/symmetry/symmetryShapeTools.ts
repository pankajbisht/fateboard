/**
 * Symmetry slice: tools that act on what is drawn.
 * - Complete the other half: mirror (or the whole setup) of everything on the drawn side, optionally with
 *   natural imperfections (Face mode: a seeded wobble so it does not look robotic).
 * - Cut and mirror: keep one side; objects across the axis are clipped to it; the other side is replaced by
 *   the reflection.
 * - Magic wand: while armed, a click on an object mirrors it across its nearest edge.
 * - Curve axis: the selected path becomes the bendy mirror (mode "curve").
 * All of them are one undo step (one batch of adds / removes).
 */
import * as fabric from 'fabric';
import { sideOf } from '@/lib/canvas/symmetryAnalysis';
import { frameOfBox, type SymmetryEdge } from '@/lib/canvas/symmetryFrame';
import { direction, reflection, rotation, applyToPoint, type Pt } from '@/lib/canvas/symmetryMath';
import { copiesForPlan, symmetryClones, type CopyPlan } from '../../brushes/symmetryCopies';
import type { SymmetryPeers } from '../createSymmetrySlice';
import { symmetryFrameOf, objectBox } from './symmetrySetup';
import { curvePolyline, ensureObjectId, workObjects } from './symmetryObjects';
import { linkOf } from './symmetryLinks';
import { clientToScene } from './symmetryPointer';

export interface SymmetryShapeTools {
    symmetryWandArmed: boolean;
    symmetryCurveId: string | null;
    /** Mirrors the drawn half (selection, else the whole page). Returns how many copies. */
    completeSymmetryHalf: (o?: { natural?: boolean }) => Promise<number>;
    /** Keeps side +1 / -1 of the mirror axis and replaces the other with its reflection. */
    cutAndMirror: (keep: 1 | -1) => Promise<number>;
    armSymmetryWand: (on: boolean) => void;
    /** The selected path becomes the curve axis (mode "curve"). */
    useSelectionAsSymmetryCurve: () => boolean;
}

type Set = (partial: Record<string, unknown>, replace: false, action: string) => void;

/** The single mirror axis of the setup: the mode's axis turned by the source frame (left-right by default). */
export function mirrorAxis(s: SymmetryPeers): { c: Pt; deg: number } | null {
    const frame = symmetryFrameOf(s);
    if (!frame) return null;
    const mode = s.symmetry ?? 'none';
    const base =
        mode === 'y' ? 0 : mode === 'angle' || mode === 'glide' ? (s.symmetryAngle ?? 90) : 90;
    return { c: frame.center, deg: base + frame.rotation };
}

const boxCorners = (o: fabric.FabricObject): Pt[] => {
    const c = o.getCenterPoint();
    const m = rotation({ x: c.x, y: c.y }, o.angle ?? 0);
    const w = o.getScaledWidth() / 2;
    const h = o.getScaledHeight() / 2;
    return [
        [-w, -h],
        [w, -h],
        [w, h],
        [-w, h],
    ].map(([dx, dy]) => applyToPoint(m, { x: c.x + dx, y: c.y + dy }));
};

/** A half-plane clip (absolute) on side `keep` of the axis. */
function halfPlane(c: Pt, deg: number, keep: 1 | -1): fabric.Rect {
    const L = 200000;
    const n = direction(deg + 90);
    return new fabric.Rect({
        originX: 'center',
        originY: 'center',
        left: c.x + n.x * keep * (L / 2),
        top: c.y + n.y * keep * (L / 2),
        width: L,
        height: L,
        angle: deg,
        absolutePositioned: true,
    });
}

function addAll(
    canvas: fabric.Canvas,
    objs: fabric.FabricObject[],
    remove: fabric.FabricObject[] = [],
) {
    const before = canvas.renderOnAddRemove;
    canvas.renderOnAddRemove = false;
    try {
        if (remove.length) canvas.remove(...remove);
        if (objs.length) canvas.add(...objs);
    } finally {
        canvas.renderOnAddRemove = before;
    }
    canvas.requestRenderAll();
}

export function createSymmetryShapeTools(set: Set, peers: () => SymmetryPeers) {
    const toast = (message: string) => peers().showToast?.({ message });
    return {
        symmetryWandArmed: false,
        symmetryCurveId: null,

        completeSymmetryHalf: async ({ natural = false } = {}) => {
            const s = peers();
            const canvas = s.canvas;
            const axis = mirrorAxis(s);
            if (!canvas || !axis) return 0;
            const picked = canvas.getActiveObjects().length
                ? canvas.getActiveObjects()
                : workObjects(canvas);
            const free = picked.filter((o) => !linkOf(o));
            const sides = free.map((o) => sideOf(o.getCenterPoint(), axis.c, axis.deg));
            const drawn = sides.reduce<number>((a, b) => a + b, 0) >= 0 ? 1 : -1;
            const half = free.filter((_, i) => sides[i] === drawn || sides[i] === 0);
            if (!half.length) {
                toast('Draw one half first: nothing is on either side of the mirror.');
                return 0;
            }
            const mode = s.symmetry ?? 'none';
            const base = s.symmetryCopyPlan();
            const plan: CopyPlan =
                base && mode !== 'none'
                    ? base
                    : {
                          matrices: [reflection(axis.c, axis.deg)],
                          options: { textMode: s.symmetryOptions.textMode },
                      };
            if (natural)
                plan.options = {
                    ...plan.options,
                    variation: {
                        hue: 0,
                        fade: 0,
                        shrink: 0.02,
                        wobble: 3,
                        seed: Math.floor(Math.random() * 1e6) + 1,
                    },
                };
            try {
                canvas.discardActiveObject();
                const copies = (await Promise.all(half.map((o) => copiesForPlan(o, plan)))).flat();
                if (peers().canvas !== canvas || s.isPageSwitching) return 0;
                addAll(canvas, copies);
                toast(
                    `Completed the other half: ${copies.length} ${copies.length === 1 ? 'copy' : 'copies'}.`,
                );
                return copies.length;
            } catch (err) {
                console.error('[symmetry] complete half failed', err);
                return 0;
            }
        },

        cutAndMirror: async (keep) => {
            const s = peers();
            const canvas = s.canvas;
            const axis = mirrorAxis(s);
            if (!canvas || !axis) return 0;
            const objects = workObjects(canvas).filter((o) => !linkOf(o));
            const m = reflection(axis.c, axis.deg);
            const kept: fabric.FabricObject[] = [];
            const dropped: fabric.FabricObject[] = [];
            const across: fabric.FabricObject[] = [];
            for (const o of objects) {
                const sides = new Set(boxCorners(o).map((p) => sideOf(p, axis.c, axis.deg)));
                if (!sides.has(-keep as -1 | 1)) kept.push(o);
                else if (!sides.has(keep)) dropped.push(o);
                else across.push(o);
            }
            if (!kept.length && !across.length) {
                toast('Nothing on the side to keep.');
                return 0;
            }
            try {
                canvas.discardActiveObject();
                // objects across the axis are clipped to the kept side (unless they already have a clip)
                const clipped = new Set(across.filter((o) => !o.clipPath));
                for (const o of clipped)
                    o.set({ clipPath: halfPlane(axis.c, axis.deg, keep), dirty: true });
                const sources = [...kept, ...across];
                const copies = (
                    await Promise.all(
                        sources.map((o) =>
                            symmetryClones(o, [m], { textMode: s.symmetryOptions.textMode }),
                        ),
                    )
                ).flat();
                copies.forEach((c, i) => {
                    if (clipped.has(sources[i]))
                        c.set({
                            clipPath: halfPlane(axis.c, axis.deg, -keep as 1 | -1),
                            dirty: true,
                        });
                });
                if (peers().canvas !== canvas) return 0;
                addAll(canvas, copies, dropped);
                toast(
                    `Kept one side and mirrored it (${copies.length} ${copies.length === 1 ? 'copy' : 'copies'}).`,
                );
                return copies.length;
            } catch (err) {
                console.error('[symmetry] cut and mirror failed', err);
                return 0;
            }
        },

        armSymmetryWand: (on) => {
            set({ symmetryWandArmed: !!on }, false, 'symmetry/wand');
            if (on)
                toast(
                    'Magic wand: click an object to mirror it across its nearest edge. Esc to stop.',
                );
        },

        useSelectionAsSymmetryCurve: () => {
            const s = peers();
            const canvas = s.canvas;
            const obj = canvas?.getActiveObject();
            if (!canvas || !obj || canvas.getActiveObjects().length !== 1 || !curvePolyline(obj)) {
                toast('Select one path or line to use it as the curve.');
                return false;
            }
            set({ symmetryCurveId: ensureObjectId(obj) }, false, 'symmetry/curve');
            s.setSymmetry?.('curve');
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            return true;
        },
    } satisfies SymmetryShapeTools;
}

/** Edge of `obj` nearest to scene point `p`. */
export function nearestEdge(obj: fabric.FabricObject, p: Pt): SymmetryEdge {
    const c = obj.getCenterPoint();
    const local = applyToPoint(rotation({ x: c.x, y: c.y }, -(obj.angle ?? 0)), p);
    const dx = (local.x - c.x) / Math.max(1, obj.getScaledWidth());
    const dy = (local.y - c.y) / Math.max(1, obj.getScaledHeight());
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'top' : 'bottom';
}

/** Magic wand clicks (while armed); returns the disposer. */
export function attachSymmetryWand(
    canvas: fabric.Canvas,
    peers: () => SymmetryPeers,
    disarm: () => void,
) {
    const wrapper = canvas.upperCanvasEl?.parentElement as HTMLElement | null;
    if (!wrapper) return () => {};
    const onDown = async (e: PointerEvent) => {
        const s = peers();
        if (!s.symmetryWandArmed || e.button !== 0) return;
        const p = clientToScene(canvas, e.clientX, e.clientY);
        const target = [...workObjects(canvas)]
            .reverse()
            .find((o) => o.containsPoint(new fabric.Point(p.x, p.y)));
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        const edge = nearestEdge(target, p);
        const frame = frameOfBox(objectBox(target), edge);
        const deg = (edge === 'left' || edge === 'right' ? 90 : 0) + frame.rotation;
        try {
            const [copy] = await symmetryClones(target, [reflection(frame.center, deg)], {
                textMode: s.symmetryOptions.textMode,
            });
            if (copy && peers().canvas === canvas) addAll(canvas, [copy]);
        } catch (err) {
            console.error('[symmetry] magic wand failed', err);
        }
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && peers().symmetryWandArmed) disarm();
    };
    const block = (e: Event) => {
        if (peers().symmetryWandArmed) e.stopPropagation();
    };
    wrapper.addEventListener('pointerdown', onDown, true);
    wrapper.addEventListener('mousedown', block, true);
    window.addEventListener('keydown', onKey);
    return () => {
        wrapper.removeEventListener('pointerdown', onDown, true);
        wrapper.removeEventListener('mousedown', block, true);
        window.removeEventListener('keydown', onKey);
    };
}
