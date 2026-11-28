/**
 * Symmetry slice: how symmetric is the page? A score (0–100 %), a heatmap (a tinted box over every object:
 * green = it has its mirror partner, red = it has none), "Fix near-symmetry" (snaps almost-mirrored partners
 * and objects across the axis into place, one undo step), and smart snapping of a dragged object onto the axes
 * and the centre (with a highlighted snap line). The heatmap boxes are helper objects and follow edits.
 */
import * as fabric from 'fabric';
import { symmetryGuides } from '@/lib/canvas/symmetry';
import { analyzeSymmetry, fixMoves, heatColor } from '@/lib/canvas/symmetryAnalysis';
import { reflection, type Matrix, type Pt } from '@/lib/canvas/symmetryMath';
import { screenScale } from '@/lib/canvas/screenScale';
import type { SymmetryPeers } from '../createSymmetrySlice';
import { guideVisible } from './symmetryGuide';
import { analysisItem, workObjects } from './symmetryObjects';
import { mirrorAxis } from './symmetryShapeTools';
import { symmetryFrameOf, symmetryPlanOf } from './symmetrySetup';

export type SymmetryScore = { score: number; pairs: number; unmatched: number };

export interface SymmetryCheckActions {
    symmetryScore: SymmetryScore | null;
    symmetryHeatmap: boolean;
    analyzeSymmetryNow: () => SymmetryScore | null;
    setSymmetryHeatmap: (on: boolean) => void;
    /** Moves near-symmetric objects into perfect symmetry. Returns how many moved. */
    fixNearSymmetry: (tolerance?: number) => number;
}

type Set = (partial: Record<string, unknown>, replace: false, action: string) => void;

const HEAT = '__fbSymmetryHeat';
const SNAP = '__fbSymmetrySnap';

const helper = (o: fabric.FabricObject, flag: string) => {
    Object.assign(o, {
        [flag]: true,
        _isHelper: true,
        excludeFromLayers: true,
        excludeFromSnap: true,
    });
    return o;
};
const helperProps = {
    selectable: false,
    evented: false,
    excludeFromExport: true,
    objectCaching: false,
} as const;

/** The matrix the check compares with: the setup's first copy, else left-right about the source. */
function checkMatrix(s: SymmetryPeers): Matrix | null {
    const mode = s.symmetry ?? 'none';
    if (mode !== 'none' && mode !== 'curve') {
        const plan = symmetryPlanOf(s);
        if (plan?.matrices.length) return plan.matrices[0];
    }
    const axis = mirrorAxis(s);
    return axis ? reflection(axis.c, axis.deg) : null;
}

const removeFlagged = (canvas: fabric.Canvas, flag: string) => {
    const old = canvas.getObjects().filter((o) => (o as unknown as Record<string, unknown>)[flag]);
    if (old.length) canvas.remove(...old);
};

export function createSymmetryCheck(set: Set, peers: () => SymmetryPeers) {
    const run = () => {
        const s = peers();
        const canvas = s.canvas;
        const m = canvas ? checkMatrix(s) : null;
        if (!canvas || !m) return null;
        const objects = workObjects(canvas);
        const items = objects.map(analysisItem);
        return { canvas, objects, items, m, analysis: analyzeSymmetry(items, m) };
    };

    /** Redraws the heatmap boxes (or removes them). */
    const paintHeatmap = () => {
        const s = peers();
        const canvas = s.canvas;
        if (!canvas) return;
        const before = canvas.renderOnAddRemove;
        canvas.renderOnAddRemove = false;
        try {
            removeFlagged(canvas, HEAT);
            if (!s.symmetryHeatmap || s.isPageSwitching) return;
            const r = run();
            if (!r) return;
            const k = screenScale(canvas);
            const boxes = r.objects.map((o, i) => {
                const q = r.analysis.quality[r.items[i].id] ?? 0;
                const c = o.getCenterPoint();
                return helper(
                    new fabric.Rect({
                        ...helperProps,
                        originX: 'center',
                        originY: 'center',
                        left: c.x,
                        top: c.y,
                        width: o.getScaledWidth() + 6 / k,
                        height: o.getScaledHeight() + 6 / k,
                        angle: o.angle ?? 0,
                        fill: heatColor(q, 0.28),
                        stroke: heatColor(q, 0.9),
                        strokeWidth: 1.5 / k,
                    }),
                    HEAT,
                );
            });
            if (boxes.length) canvas.add(...boxes);
            set(
                {
                    symmetryScore: {
                        score: r.analysis.score,
                        pairs: r.analysis.pairs.length,
                        unmatched: r.analysis.unmatched.length,
                    },
                },
                false,
                'symmetry/score',
            );
        } finally {
            canvas.renderOnAddRemove = before;
            canvas.requestRenderAll();
        }
    };

    return {
        paintHeatmap,
        actions: {
            symmetryScore: null,
            symmetryHeatmap: false,

            analyzeSymmetryNow: () => {
                const r = run();
                if (!r) return null;
                const score = {
                    score: r.analysis.score,
                    pairs: r.analysis.pairs.length,
                    unmatched: r.analysis.unmatched.length,
                };
                set({ symmetryScore: score }, false, 'symmetry/score');
                return score;
            },

            setSymmetryHeatmap: (on) => {
                set({ symmetryHeatmap: !!on }, false, 'symmetry/heatmap');
                paintHeatmap();
            },

            fixNearSymmetry: (tolerance = 0.35) => {
                const r = run();
                if (!r) return 0;
                const byId = new Map(r.objects.map((o, i) => [r.items[i].id, o]));
                const moves = fixMoves(r.items, r.analysis, r.m, tolerance);
                for (const mv of moves) {
                    const o = byId.get(mv.id);
                    if (!o) continue;
                    const sw = o.getScaledWidth();
                    const sh = o.getScaledHeight();
                    if (sw > 0 && sh > 0)
                        o.set({ scaleX: (o.scaleX * mv.w) / sw, scaleY: (o.scaleY * mv.h) / sh });
                    o.setPositionByOrigin(new fabric.Point(mv.cx, mv.cy), 'center', 'center');
                    o.setCoords();
                }
                const s = peers();
                if (moves.length) {
                    s.canvas?.requestRenderAll();
                    s.saveState?.();
                    s.persist?.();
                }
                s.showToast?.({
                    message: moves.length
                        ? `Snapped ${moves.length} ${moves.length === 1 ? 'object' : 'objects'} into symmetry.`
                        : 'Nothing is close enough to snap. Raise the tolerance or move things nearer.',
                });
                if (s.symmetryHeatmap) paintHeatmap();
                else get().analyzeSymmetryNow();
                return moves.length;
            },
        } satisfies SymmetryCheckActions,
    };

    function get() {
        return peers() as unknown as SymmetryCheckActions;
    }
}

/** Snapping a dragged object onto the axes / centre; returns the disposer. */
export function attachSymmetrySnap(canvas: fabric.Canvas, peers: () => SymmetryPeers): () => void {
    const clear = () => removeFlagged(canvas, SNAP);
    const onMoving = (e: { target?: fabric.FabricObject }) => {
        const s = peers();
        const obj = e?.target;
        clear();
        if (!obj || !s.symmetryOptions.snap || !guideVisible(s) || s.activeTool !== 'select')
            return;
        const frame = symmetryFrameOf(s);
        if (!frame) return;
        const k = screenScale(canvas);
        const c = obj.getCenterPoint();
        const near = 8 / k;
        let best: { to: Pt; line: { a: Pt; b: Pt } | null; d: number } | null = null;
        const dc = Math.hypot(c.x - frame.center.x, c.y - frame.center.y);
        if (dc < near * 1.4) best = { to: frame.center, line: null, d: dc };
        const mode = s.symmetry ?? 'none';
        if (!best && ['x', 'y', 'both', 'angle', 'kaleido', 'radial', 'glide'].includes(mode)) {
            const r = Math.hypot(canvas.getWidth(), canvas.getHeight()) / k;
            const lines = symmetryGuides(mode, frame.center, s.symmetryAngle, s.symmetryCount, r, {
                rotation: frame.rotation,
            });
            for (const line of lines) {
                const dx = line.b.x - line.a.x;
                const dy = line.b.y - line.a.y;
                const len2 = dx * dx + dy * dy || 1;
                const t = Math.max(
                    0,
                    Math.min(1, ((c.x - line.a.x) * dx + (c.y - line.a.y) * dy) / len2),
                );
                const to = { x: line.a.x + dx * t, y: line.a.y + dy * t };
                const d = Math.hypot(c.x - to.x, c.y - to.y);
                if (d < near && (!best || d < best.d)) best = { to, line, d };
            }
        }
        if (!best) return;
        obj.setPositionByOrigin(new fabric.Point(best.to.x, best.to.y), 'center', 'center');
        obj.setCoords();
        const path = best.line
            ? `M ${best.line.a.x} ${best.line.a.y} L ${best.line.b.x} ${best.line.b.y}`
            : `M ${best.to.x - 12 / k} ${best.to.y} L ${best.to.x + 12 / k} ${best.to.y} M ${best.to.x} ${best.to.y - 12 / k} L ${best.to.x} ${best.to.y + 12 / k}`;
        canvas.add(
            helper(
                new fabric.Path(path, {
                    ...helperProps,
                    originX: 'left',
                    originY: 'top',
                    fill: null,
                    stroke: 'rgba(236, 72, 153, 0.95)',
                    strokeWidth: 1.5 / k,
                }),
                SNAP,
            ),
        );
    };
    const offs = [
        canvas.on('object:moving', onMoving as never),
        canvas.on('mouse:up', clear),
        canvas.on('selection:cleared', clear),
    ];
    return () => {
        offs.forEach((off) => off());
        clear();
    };
}
