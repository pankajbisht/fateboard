import { fmt, type P2 } from './shapes';

/**
 * Ink lines (docs/CHARACTER_STUDIO.md, reference pass phase 2): a contour drawn as a filled ribbon instead of a stroke
 * of one width, so it reads as drawn with a pen. The ribbon is full width along the line and narrows toward a free
 * end (a shoulder, the top of the neck); where two pieces of a contour meet (an elbow, a knee) it keeps full width,
 * so the joined line shows no pinch.
 */
export interface InkChain {
    pts: P2[];
    /** narrow the [start, end] of the line (a free end), or keep it full width (a join) */
    taper: [boolean, boolean];
}

/** Catmull-Rom: `k` points between each pair, so the ribbon follows the same smooth curve as a stroked contour. */
function smooth(p: P2[], k = 4): P2[] {
    if (p.length < 3) return p;
    const out: P2[] = [];
    for (let i = 0; i < p.length - 1; i++) {
        const a = p[Math.max(0, i - 1)];
        const b = p[i];
        const c = p[i + 1];
        const d = p[Math.min(p.length - 1, i + 2)];
        for (let j = 0; j < k; j++) {
            const t = j / k;
            const f = (x0: number, x1: number, x2: number, x3: number) =>
                0.5 *
                (2 * x1 +
                    (-x0 + x2) * t +
                    (2 * x0 - 5 * x1 + 4 * x2 - x3) * t * t +
                    (-x0 + 3 * x1 - 3 * x2 + x3) * t * t * t);
            out.push([f(a[0], b[0], c[0], d[0]), f(a[1], b[1], c[1], d[1])]);
        }
    }
    out.push(p[p.length - 1]);
    return out;
}

/** The share of the full width at `u` (0..1 along the line): a free end narrows over the last fifth to 0.25. */
const profile = (u: number, [start, end]: [boolean, boolean]) => {
    const ramp = (x: number) => 0.25 + 0.75 * Math.min(1, x / 0.2) ** 0.7;
    return Math.min(start ? ramp(u) : 1, end ? ramp(1 - u) : 1);
};

/** One closed ribbon path per chain, `width` wide where full (an SVG path, to be filled with the ink colour). */
export function inkRibbon(chains: InkChain[], width: number): string {
    let d = '';
    for (const chain of chains) {
        const raw = chain.pts.filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1]));
        // a chain that is already dense (a loft's sides) is smooth enough; a sparse one is smoothed first
        const dense = raw.length > 12 ? raw : smooth(raw, 3);
        // points closer together than the line is wide change nothing on screen; dropped, the ink of a smoothed
        // contour was a quarter of the path text (the 15° pose sweep in render.test.ts ran past its limit on CI)
        const gap = width;
        const p: P2[] = [];
        dense.forEach((q, i) => {
            const last = p[p.length - 1];
            if (
                !last ||
                i === dense.length - 1 ||
                Math.hypot(q[0] - last[0], q[1] - last[1]) >= gap
            )
                p.push(q);
        });
        if (p.length < 2) continue;
        const len: number[] = [0];
        for (let i = 1; i < p.length; i++)
            len.push(len[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
        const total = len[len.length - 1];
        if (total < 1e-6) continue;
        const left: P2[] = [];
        const right: P2[] = [];
        p.forEach((q, i) => {
            const a = p[Math.max(0, i - 1)];
            const b = p[Math.min(p.length - 1, i + 1)];
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const l = Math.hypot(dx, dy) || 1;
            const h = (width / 2) * profile(len[i] / total, chain.taper);
            left.push([q[0] - (dy / l) * h, q[1] + (dx / l) * h]);
            right.push([q[0] + (dy / l) * h, q[1] - (dx / l) * h]);
        });
        const ring = [...left, ...right.reverse()];
        d += `M${ring.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`;
    }
    return d;
}
