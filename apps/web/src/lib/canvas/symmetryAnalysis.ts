/**
 * How symmetric is a design? Pairs every object with its mirror image under a symmetry matrix (greedy, best
 * matches first), scores each object 0–1 (1 = its image lands exactly on a partner of the same kind and size),
 * and plans the "fix near-symmetry" moves. Also: which side of an axis a point is on (cut and mirror), and a
 * point-cloud likeness score (Symmetry Challenges). Pure.
 */
import { applyToPoint, isMirror, type Matrix, type Pt } from './symmetryMath';

export type AnalysisItem = {
    id: string;
    cx: number;
    cy: number;
    w: number;
    h: number;
    kind: string;
};

export type SymmetryAnalysis = {
    /** 0–100. */
    score: number;
    /** Per item: 0 (no partner) … 1 (perfect). */
    quality: Record<string, number>;
    pairs: { a: string; b: string; err: number }[];
    /** Items that are their own mirror image (they sit across the axis). */
    selfs: { id: string; err: number }[];
    unmatched: string[];
};

/** An error of this many object sizes (or more) scores 0. */
const ZERO_AT = 0.5;
/** At most this many objects are analysed (nearest-first by stacking: the newest). */
export const ANALYSIS_LIMIT = 600;

const sizeOf = (i: AnalysisItem) => Math.max(1, i.w, i.h);

/** Normalised error between `b` and the image of `a` (0 = perfect). */
function pairError(a: AnalysisItem, b: AnalysisItem, m: Matrix): number {
    const t = applyToPoint(m, { x: a.cx, y: a.cy });
    const dist = Math.hypot(t.x - b.cx, t.y - b.cy);
    // a turn swaps width and height when it is a quarter turn: compare the sorted sizes
    const [a1, a2] = [a.w, a.h].sort((x, y) => x - y);
    const [b1, b2] = [b.w, b.h].sort((x, y) => x - y);
    const size = Math.abs(a1 - b1) + Math.abs(a2 - b2);
    return (dist + size * 0.5) / Math.max(sizeOf(a), sizeOf(b));
}

export function analyzeSymmetry(input: AnalysisItem[], m: Matrix): SymmetryAnalysis {
    const items = input.slice(-ANALYSIS_LIMIT);
    const quality: Record<string, number> = {};
    const q = (err: number) => Math.max(0, 1 - err / ZERO_AT);
    const candidates: { a: number; b: number; err: number }[] = [];
    for (let i = 0; i < items.length; i++)
        for (let j = 0; j < items.length; j++) {
            if (items[i].kind !== items[j].kind) continue;
            const err = pairError(items[i], items[j], m);
            if (err < ZERO_AT) candidates.push({ a: i, b: j, err });
        }
    candidates.sort((x, y) => x.err - y.err);
    const used = new Set<number>();
    const pairs: SymmetryAnalysis['pairs'] = [];
    const selfs: SymmetryAnalysis['selfs'] = [];
    const mirror = isMirror(m);
    for (const c of candidates) {
        if (used.has(c.a) || used.has(c.b)) continue;
        if (c.a === c.b) {
            // only a mirror can leave one object as its own image (a turn moves it unless centred)
            if (!mirror && c.err > 0.02) continue;
            used.add(c.a);
            selfs.push({ id: items[c.a].id, err: c.err });
            quality[items[c.a].id] = q(c.err);
            continue;
        }
        used.add(c.a);
        used.add(c.b);
        pairs.push({ a: items[c.a].id, b: items[c.b].id, err: c.err });
        quality[items[c.a].id] = q(c.err);
        quality[items[c.b].id] = q(c.err);
    }
    const unmatched = items.filter((_, i) => !used.has(i)).map((i) => i.id);
    for (const id of unmatched) quality[id] = 0;
    const values = Object.values(quality);
    const score = values.length
        ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100)
        : 100;
    return { score, quality, pairs, selfs, unmatched };
}

/** Where each near-symmetric object should go: a partner's centre onto the image of its pair's centre, an
 *  object across a mirror onto the axis. Only errors up to `tolerance` (object sizes) are fixed. */
export function fixMoves(
    items: AnalysisItem[],
    analysis: SymmetryAnalysis,
    m: Matrix,
    tolerance = 0.35,
): { id: string; cx: number; cy: number; w: number; h: number }[] {
    const byId = new Map(items.map((i) => [i.id, i]));
    const out: { id: string; cx: number; cy: number; w: number; h: number }[] = [];
    for (const p of analysis.pairs) {
        if (p.err <= 1e-6 || p.err > tolerance) continue;
        const a = byId.get(p.a);
        const b = byId.get(p.b);
        if (!a || !b) continue;
        const t = applyToPoint(m, { x: a.cx, y: a.cy });
        // keep b's orientation of the sizes (a quarter turn swaps them)
        const swap =
            Math.abs(b.w - a.h) + Math.abs(b.h - a.w) < Math.abs(b.w - a.w) + Math.abs(b.h - a.h);
        out.push({ id: b.id, cx: t.x, cy: t.y, w: swap ? a.h : a.w, h: swap ? a.w : a.h });
    }
    if (isMirror(m))
        for (const s of analysis.selfs) {
            if (s.err <= 1e-6 || s.err > tolerance) continue;
            const a = byId.get(s.id);
            if (!a) continue;
            const t = applyToPoint(m, { x: a.cx, y: a.cy });
            out.push({ id: a.id, cx: (a.cx + t.x) / 2, cy: (a.cy + t.y) / 2, w: a.w, h: a.h });
        }
    return out;
}

/** Heat colour of a quality (1 = green, 0.5 = amber, 0 = red), with alpha. */
export function heatColor(quality: number, alpha = 0.35): string {
    const t = Math.max(0, Math.min(1, quality));
    const r = Math.round(t < 0.5 ? 220 : 220 - (t - 0.5) * 2 * 180);
    const g = Math.round(t < 0.5 ? 40 + t * 2 * 140 : 180);
    return `rgba(${r}, ${g}, 60, ${alpha})`;
}

/** +1 / -1 / 0: which side of the axis through `c` at `deg` degrees `p` is on (0 = on it). */
export function sideOf(p: Pt, c: Pt, deg: number, eps = 1e-6): -1 | 0 | 1 {
    const a = (deg * Math.PI) / 180;
    const cross = Math.cos(a) * (p.y - c.y) - Math.sin(a) * (p.x - c.x);
    return cross > eps ? 1 : cross < -eps ? -1 : 0;
}

/** Likeness of two point clouds: 100 when every point of each lies within `tolerance` of the other. */
export function likeness(a: Pt[], b: Pt[], tolerance: number): number {
    if (!a.length || !b.length) return 0;
    const mean = (from: Pt[], to: Pt[]) =>
        from.reduce((s, p) => {
            let best = Infinity;
            for (const q of to) best = Math.min(best, Math.hypot(p.x - q.x, p.y - q.y));
            return s + Math.min(best, tolerance * 2);
        }, 0) / from.length;
    const d = (mean(a, b) + mean(b, a)) / 2;
    return Math.round(Math.max(0, 1 - d / (tolerance * 2)) * 100);
}
