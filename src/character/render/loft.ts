import type { V3 } from '../rig/math';
import { inkRibbon, type InkChain } from './ink';
import type { PartGroup } from '../schema/types';
import { addSurface, toScreen, type Ctx, type Material } from './parts';
import { hull, smoothClosed, smoothPoly, type P2 } from './shapes';

/**
 * Lofted shapes (manga body, docs/CHARACTER_STUDIO.md): a stack of cross-sections drawn as ONE smooth outline.
 * A convex hull of the whole torso can never narrow at the waist, so the torso is built from rings and its outline is
 * taken ring by ring: the two outermost points of each ring across the spine direction, joined top to bottom, with a
 * cap above and below. Limbs use the same idea along a bone with a width profile, and a bent limb (shoulder, elbow,
 * wrist) is offset along its bent centre line, so the elbow is a bend and not a ball joint.
 *
 * The fills are drawn without outlines and ONE contour is drawn around the whole shape (`outlined = false` +
 * `addContour`): where two fills meet (a shirt and trousers, an upper arm and a forearm) there is no line, so the
 * body reads as one form. Garments draw their own hem lines.
 */
const dot = (a: P2, b: P2) => a[0] * b[0] + a[1] * b[1];
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const centre = (r: P2[]): P2 => [
    r.reduce((a, p) => a + p[0], 0) / r.length,
    r.reduce((a, p) => a + p[1], 0) / r.length,
];

interface Chains {
    left: P2[];
    right: P2[];
    bottom: P2[];
    top: P2[];
    /** the unit direction from the right chain to the left chain */
    n: P2;
}

/** Catmull-Rom: k points between each pair, so the outline and its shading follow the same smooth curve. */
function densify(p: P2[], k: number): P2[] {
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

/** The side chains and the caps of rings given top to bottom (screen points); null when seen end-on. */
export function loftChains(rings: P2[][]): Chains | null {
    const all = rings.flat();
    if (rings.length < 2) return null;
    const cs = rings.map(centre);
    const down = sub(cs[cs.length - 1], cs[0]);
    const len = Math.hypot(down[0], down[1]);
    const size = Math.max(...all.map((p) => Math.hypot(p[0] - cs[0][0], p[1] - cs[0][1])), 1e-6);
    if (len < size * 0.35) return null;
    const d: P2 = [down[0] / len, down[1] / len];
    const n: P2 = [-d[1], d[0]];
    const left: P2[] = [];
    const right: P2[] = [];
    rings.forEach((ring, i) => {
        const c = cs[i];
        let lo = ring[0];
        let hi = ring[0];
        for (const p of ring) {
            if (dot(sub(p, c), n) > dot(sub(hi, c), n)) hi = p;
            if (dot(sub(p, c), n) < dot(sub(lo, c), n)) lo = p;
        }
        left.push(hi);
        right.push(lo);
    });
    const cap = (ring: P2[], c: P2, sign: 1 | -1) =>
        ring.filter((p) => sign * dot(sub(p, c), d) > 0).sort((a, b) => dot(b, n) - dot(a, n));
    return {
        left: densify(left, 4),
        right: densify(right, 4),
        bottom: cap(rings[rings.length - 1], cs[cs.length - 1], 1),
        top: cap(rings[0], cs[0], -1).reverse(),
        n,
    };
}

/**
 * The shadow of a waisted body: a band along the side away from the light, `w` wide (narrower near the ends), built
 * from the same chains as the outline so it can never leave the shape.
 */
export function loftShadeBand(c: Chains, light: P2, w: number): P2[] {
    const shadowLeft = dot(c.n, light) < 0;
    const m = Math.min(c.left.length, c.right.length);
    // stay away from the first and last points: the outline rounds its corners there, a band would poke out
    const trim = 3;
    const outer = (shadowLeft ? c.left : c.right).slice(trim, m - trim);
    const other = (shadowLeft ? c.right : c.left).slice(trim, m - trim);
    if (outer.length < 3) return [];
    // a twisted pose can fold the body over itself: then the chains cross and there is no band to draw
    const sign = shadowLeft ? -1 : 1;
    if (outer.some((p, i) => sign * dot(sub(other[i], p), c.n) <= 0)) return [];
    const inner = outer.map((p, i): P2 => {
        const o = other[i];
        const width = Math.hypot(o[0] - p[0], o[1] - p[1]) || 1;
        const taper = Math.sin((Math.PI * (i + 0.5)) / outer.length) ** 0.5;
        const f = Math.min(0.45, (w * taper) / width);
        return [p[0] + (o[0] - p[0]) * f, p[1] + (o[1] - p[1]) * f];
    });
    return [...outer, ...inner.reverse()];
}

/** The closed outline of rings; a hull when seen end-on. */
export function loftOutline(rings: P2[][]): P2[] {
    const c = loftChains(rings);
    if (!c) return hull(rings.flat());
    return [...c.left, ...c.bottom, ...[...c.right].reverse(), ...c.top];
}

const inPoly = (poly: P2[], p: P2) => {
    let odd = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if (
            a[1] > p[1] !== b[1] > p[1] &&
            p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
        )
            odd = !odd;
    }
    return odd;
};

/** A smooth open curve through the points (quadratic segments between midpoints). */
export function smoothOpen(p: P2[]): string {
    if (p.length < 2) return '';
    const f = (v: number) => Math.round(v * 100) / 100;
    let d = `M${f(p[0][0])} ${f(p[0][1])}`;
    for (let i = 1; i < p.length - 1; i++) {
        const m: P2 = [(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2];
        d += `Q${f(p[i][0])} ${f(p[i][1])} ${f(m[0])} ${f(m[1])}`;
    }
    const last = p[p.length - 1];
    return `${d}L${f(last[0])} ${f(last[1])}`;
}

/**
 * An outline-only part: the contour that goes round fills drawn without outlines, as an ink line (ink.ts): a filled
 * ribbon of the outline colour that narrows toward each free end.
 */
export function addContour(
    ctx: Ctx,
    key: string,
    group: PartGroup | 'hair',
    role: Material,
    chains: InkChain[],
    depth: number,
) {
    const ink = ctx.outline(ctx.fill[role]);
    if (!ink) return;
    const d = inkRibbon(chains, ctx.line * ctx.pack.line.silhouette);
    if (!d) return;
    ctx.parts.push({ key, group, role: 'line', d, fill: ink, stroke: null, strokeWidth: 0, depth });
}

const project3 = (ctx: Ctx, rings: V3[][]) => rings.map((r) => r.map((p) => toScreen(ctx, p)));
const flat2 = (rings: ReturnType<typeof project3>) =>
    rings.map((r) => r.map((p): P2 => [p[0], p[1]]));
const meanZ = (rings: ReturnType<typeof project3>) => {
    const zs = rings.flat().map((p) => p[2]);
    return zs.reduce((a, b) => a + b, 0) / zs.length;
};

/** A lofted fill (with its outline unless `outlined` is false). */
export function addLoft(
    ctx: Ctx,
    key: string,
    group: PartGroup | 'hair',
    role: Material,
    rings: V3[][],
    depth?: number,
    outlined = true,
) {
    const screen = project3(ctx, rings);
    const poly = loftOutline(flat2(screen));
    if (poly.length < 3) return;
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const size = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const chains = loftChains(flat2(screen));
    // a band is only used when every point of it is inside the outline (extreme poses can fold the rings over)
    const band = chains
        ? (f: number) => {
              const b = loftShadeBand(chains, ctx.light, size * Math.min(f, 0.11));
              return b.every((q) => inPoly(poly, q)) ? b : [];
          }
        : undefined;
    addSurface(
        ctx,
        key,
        group,
        role,
        smoothPoly(poly),
        smoothClosed(poly),
        depth ?? meanZ(screen),
        size,
        outlined,
        undefined,
        band,
    );
}

/**
 * The contour of a whole lofted body: the left side and the right side as two open curves (no line across the neck
 * or between the legs, where other parts join), drawn over the fills.
 */
export function addLoftContour(
    ctx: Ctx,
    key: string,
    group: PartGroup | 'hair',
    role: Material,
    rings: V3[][],
    depth: number,
    /** narrow the [top, bottom] ends (free ends); a side that runs on into another contour keeps full width */
    taper: [boolean, boolean] = [true, false],
) {
    const c = loftChains(flat2(project3(ctx, rings)));
    if (!c) return;
    addContour(ctx, `${key}-l`, group, role, [{ pts: c.left, taper }], depth);
    addContour(ctx, `${key}-r`, group, role, [{ pts: c.right, taper }], depth);
}
