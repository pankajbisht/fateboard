/**
 * Symmetry slice, playful tools:
 * - Time machine: a slider replays the page building up (objects in stacking order: each stroke, then its copies
 *   one by one), drawn on the top layer only; the page itself is never touched.
 * - Symmetry challenges: a seeded half-drawn target left of a vertical axis; the user draws the other half and
 *   gets a likeness score (0–100 %, stars). Hint = a faint ghost of the answer.
 * - Mirror lens flag (the lens itself is a component that reads the board's pixels).
 */
import * as fabric from 'fabric';
import { likeness } from '@/lib/canvas/symmetryAnalysis';
import { seededRandom } from '@/lib/canvas/symmetryVariation';
import { applyToPoint, reflection, type Pt } from '@/lib/canvas/symmetryMath';
import { polylineData } from '@/lib/canvas/symmetryCurve';
import type { SymmetryMode } from '@/lib/canvas/symmetry';
import type { SymmetryPeers } from '../createSymmetrySlice';
import { sceneOutline, workObjects } from './symmetryObjects';
import { pageBox } from './symmetrySetup';

export type SymmetryChallenge = {
    seed: number;
    hint: boolean;
    score: number | null;
    targetIds: string[];
    beforeIds: string[];
    axisX: number;
    prevMode: SymmetryMode;
};

export interface SymmetryPlayActions {
    symmetryTimeStep: number | null;
    symmetryLens: boolean;
    symmetryChallenge: SymmetryChallenge | null;
    /** Objects the time machine replays. */
    symmetryTimeTotal: () => number;
    setSymmetryTimeStep: (step: number | null) => void;
    setSymmetryLens: (on: boolean) => void;
    startSymmetryChallenge: (seed?: number) => boolean;
    setSymmetryChallengeHint: (on: boolean) => void;
    checkSymmetryChallenge: () => number | null;
    endSymmetryChallenge: () => void;
}

type Set = (partial: Record<string, unknown>, replace: false, action: string) => void;

const CHALLENGE = '__fbSymmetryChallenge';
const flagHelper = (o: fabric.FabricObject) => {
    Object.assign(o, {
        [CHALLENGE]: true,
        _isHelper: true,
        excludeFromLayers: true,
        excludeFromSnap: true,
    });
    return o;
};

/** Draws the first `step` objects over a blank page on the top layer (or clears it). */
export function paintTimeMachine(canvas: fabric.Canvas, step: number | null): void {
    const ctx = canvas.contextTop;
    if (!ctx) return;
    canvas.clearContext(ctx);
    if (step === null) return;
    const r = canvas.getRetinaScaling();
    const v = canvas.viewportTransform;
    ctx.save();
    ctx.setTransform(r, 0, 0, r, 0, 0);
    ctx.fillStyle =
        typeof canvas.backgroundColor === 'string' && canvas.backgroundColor
            ? canvas.backgroundColor
            : '#ffffff';
    ctx.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    for (const o of workObjects(canvas).slice(0, step)) o.render(ctx);
    ctx.restore();
}

/** 3–5 seeded wavy strokes in the left half of `box`. */
function challengeStrokes(
    seed: number,
    box: { cx: number; cy: number; width: number; height: number },
): Pt[][] {
    const rnd = seededRandom(seed);
    const left = box.cx - box.width * 0.4;
    const right = box.cx - box.width * 0.04;
    const top = box.cy - box.height * 0.38;
    const bottom = box.cy + box.height * 0.38;
    const lines = 3 + Math.floor(rnd() * 3);
    return Array.from({ length: lines }, () => {
        const n = 4 + Math.floor(rnd() * 4);
        return Array.from({ length: n }, () => ({
            x: left + rnd() * (right - left),
            y: top + rnd() * (bottom - top),
        })).sort((a, b) => a.y - b.y);
    });
}

export function createSymmetryPlay(set: Set, peers: () => SymmetryPeers) {
    const toast = (message: string) => peers().showToast?.({ message });
    const removeHelpers = (canvas: fabric.Canvas, hintOnly = false) => {
        const old = canvas.getObjects().filter((o) => {
            const r = o as unknown as Record<string, unknown>;
            return r[CHALLENGE] && (!hintOnly || r.__hint);
        });
        if (old.length) canvas.remove(...old);
    };
    const paintHint = (canvas: fabric.Canvas, c: SymmetryChallenge) => {
        removeHelpers(canvas, true);
        if (!c.hint) return;
        const m = reflection({ x: c.axisX, y: 0 }, 90);
        const ghosts = canvas
            .getObjects()
            .filter((o) =>
                c.targetIds.includes(String((o as unknown as Record<string, unknown>).id)),
            )
            .map((o) => {
                const pts = sceneOutline(o, 4).map((p) => applyToPoint(m, p));
                const g = flagHelper(
                    new fabric.Path(polylineData(pts), {
                        originX: 'left',
                        originY: 'top',
                        fill: null,
                        stroke: 'rgba(37, 99, 235, 0.25)',
                        strokeWidth: 6,
                        strokeDashArray: [10, 8],
                        selectable: false,
                        evented: false,
                        excludeFromExport: true,
                    }),
                );
                (g as unknown as Record<string, unknown>).__hint = true;
                return g;
            });
        if (ghosts.length) canvas.add(...ghosts);
    };

    return {
        symmetryTimeStep: null,
        symmetryLens: false,
        symmetryChallenge: null,

        symmetryTimeTotal: () => {
            const canvas = peers().canvas;
            return canvas ? workObjects(canvas).length : 0;
        },

        setSymmetryTimeStep: (step) => {
            const canvas = peers().canvas;
            const total = canvas ? workObjects(canvas).length : 0;
            const next = step === null ? null : Math.max(0, Math.min(total, Math.round(step)));
            set({ symmetryTimeStep: next }, false, 'symmetry/time');
            if (canvas) paintTimeMachine(canvas, next);
        },

        setSymmetryLens: (on) => set({ symmetryLens: !!on }, false, 'symmetry/lens'),

        startSymmetryChallenge: (seed) => {
            const s = peers();
            const canvas = s.canvas;
            if (!canvas || s.symmetryChallenge) return false;
            const box = pageBox(s, canvas);
            const sd = seed ?? Math.floor(Math.random() * 9999) + 1;
            const beforeIds = canvas
                .getObjects()
                .map((o) => String((o as unknown as Record<string, unknown>).id ?? ''));
            const targets = challengeStrokes(sd, box).map((pts, i) => {
                const p = new fabric.Path(polylineData(pts), {
                    originX: 'left',
                    originY: 'top',
                    fill: null,
                    stroke: '#334155',
                    strokeWidth: 5,
                    strokeLineCap: 'round',
                    strokeLineJoin: 'round',
                    selectable: false,
                    evented: false,
                });
                Object.assign(p, { id: `challenge-${sd}-${i}`, name: 'Challenge target' });
                return p;
            });
            const axis = flagHelper(
                new fabric.Path(
                    `M ${box.cx} ${box.cy - box.height / 2} L ${box.cx} ${box.cy + box.height / 2}`,
                    {
                        originX: 'left',
                        originY: 'top',
                        fill: null,
                        stroke: 'rgba(236, 72, 153, 0.7)',
                        strokeWidth: 2,
                        strokeDashArray: [8, 6],
                        selectable: false,
                        evented: false,
                        excludeFromExport: true,
                    },
                ),
            );
            canvas.discardActiveObject();
            canvas.add(...targets, axis);
            const challenge: SymmetryChallenge = {
                seed: sd,
                hint: false,
                score: null,
                targetIds: targets.map((t) => String((t as unknown as Record<string, unknown>).id)),
                beforeIds,
                axisX: box.cx,
                prevMode: s.symmetry ?? 'none',
            };
            set({ symmetryChallenge: challenge }, false, 'symmetry/challenge');
            s.setSymmetry?.('none');
            toast(`Challenge #${sd}: draw the right half to match the left. Then press Check.`);
            canvas.requestRenderAll();
            return true;
        },

        setSymmetryChallengeHint: (on) => {
            const s = peers();
            const c = s.symmetryChallenge;
            if (!c || !s.canvas) return;
            const next = { ...c, hint: !!on };
            set({ symmetryChallenge: next }, false, 'symmetry/challenge');
            paintHint(s.canvas, next);
            s.canvas.requestRenderAll();
        },

        checkSymmetryChallenge: () => {
            const s = peers();
            const c = s.symmetryChallenge;
            const canvas = s.canvas;
            if (!c || !canvas) return null;
            const m = reflection({ x: c.axisX, y: 0 }, 90);
            const objs = workObjects(canvas);
            const target = objs
                .filter((o) =>
                    c.targetIds.includes(String((o as unknown as Record<string, unknown>).id)),
                )
                .flatMap((o) => sceneOutline(o, 6).map((p) => applyToPoint(m, p)));
            const drawn = objs
                .filter((o) => {
                    const id = String((o as unknown as Record<string, unknown>).id ?? '');
                    return !c.targetIds.includes(id) && (!id || !c.beforeIds.includes(id));
                })
                .flatMap((o) => sceneOutline(o, 6));
            const box = pageBox(s, canvas);
            const score = drawn.length ? likeness(drawn, target, Math.max(8, box.width * 0.03)) : 0;
            set({ symmetryChallenge: { ...c, score } }, false, 'symmetry/challenge');
            const stars = score >= 90 ? '★★★' : score >= 75 ? '★★☆' : score >= 50 ? '★☆☆' : '☆☆☆';
            toast(drawn.length ? `${score}% match ${stars}` : 'Draw the right half first.');
            return score;
        },

        endSymmetryChallenge: () => {
            const s = peers();
            const c = s.symmetryChallenge;
            const canvas = s.canvas;
            if (!c) return;
            if (canvas) {
                removeHelpers(canvas);
                const targets = canvas
                    .getObjects()
                    .filter((o) =>
                        c.targetIds.includes(String((o as unknown as Record<string, unknown>).id)),
                    );
                if (targets.length) canvas.remove(...targets);
                canvas.requestRenderAll();
            }
            set({ symmetryChallenge: null }, false, 'symmetry/challenge');
            if (c.prevMode !== 'none') s.setSymmetry?.(c.prevMode);
        },
    } satisfies SymmetryPlayActions;
}
