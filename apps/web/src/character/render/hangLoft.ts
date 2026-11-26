import { apply, cross, dot, len, normalize, scale, sub, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { addContour, addLoft, loftChains } from './loft';
import { on, ring, toScreen, type Ctx, type Material } from './parts';
import type { P2 } from './shapes';
import { mangaLook } from './mangaVariants';
import { addSkirtDetail } from './mangaSkirt';
import { mangaThighTop } from './mangaTorso';

/**
 * Hanging cloth on the manga body (docs/CHARACTER_STUDIO.md, manga cloth): a long top (coat, kurta, tunic) or a skirt
 * as one loft of rings, not a convex shell. It starts with the waist ring of the manga torso (so no trousers show
 * between the top and its hang), passes the hips at their width, then follows the legs: each lower ring is centred
 * between the two legs at that height and widens toward the hem by the garment's flare. Drawn as an outline-free fill
 * with side contours and a hem line, like the torso, so it joins the top without a seam.
 */
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The skirt drawn on this render (its hip width and its half width `ti` down the legs), for a long top over it. */
const SKIRTS = new WeakMap<Ctx, { hip: number; at: (ti: number) => number }>();

/** A point `t` along a leg: 0 = hip, 1 = knee, 2 = ankle. */
function along(ctx: Ctx, s: 'L' | 'R', t: number): V3 {
    const p = ctx.posed.pos;
    const [a, b, k] =
        t <= 1
            ? [p[`upperLeg${s}`], p[`lowerLeg${s}`], t]
            : [p[`lowerLeg${s}`], p[`foot${s}`], Math.min(1, t - 1)];
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}

export function addMangaHanging(
    ctx: Ctx,
    skel: Skeleton,
    key: string,
    role: Material,
    t: number,
    flare: number,
    /** a long top: how loose the trouser legs under it are (looseOf), so it stays wider than them */
    underLoose = 1,
) {
    const z = skel.size;
    // the same widths as the manga torso (mangaTorso.ts), a little looser: cloth over the body
    const waistHalf = z.waistW * 0.4;
    const legOuter = z.hipW * 0.28 + mangaThighTop(skel) * 1.02;
    const hipHalf = Math.max(z.hipW * 0.5, legOuter) * 1.05;
    const R = ctx.posed.rot.pelvis;
    const ax = apply(R, [1, 0, 0]);
    const az = apply(R, [0, 0, 1]);
    const ay = apply(R, [0, 1, 0]);
    const down = scale(ay, -1);
    const look = key === 'skirt' ? mangaLook().skirt : null;
    const fl = flare * (look?.flare ?? 1);
    // a long top over a skirt keeps outside it at every height (the skirt showed at the sides of a coat's hips)
    const skirt = key === 'skirt' ? undefined : SKIRTS.get(ctx);
    const thigh = mangaThighTop(skel);
    // the trouser legs under a long top, as wide as their cloth makes them: the top stays outside them (multiplying the
    // top's own flare by their looseness made a blouse over wide trousers stand out like a tutu)
    // `ti` down the legs (0 hip, 1 knee): the trouser leg is fitted at the seat (at most 1.06, body.ts) and takes its
    // looseness toward the knee, as the bent limb does; at its full looseness from the hip, a blouse over wide
    // trousers flared out like a peplum
    const underAt = (ti: number) =>
        lerp(thigh * Math.min(1.06, underLoose), z.knee * 0.98 * underLoose, Math.min(1, ti)) *
        1.06;
    // Each ring down the legs lies across the way the cloth falls there (from the seat to the ring's centre), not flat in
    // the hips' plane: seated, the thighs point forward, a flat ring was seen edge-on and the skirt became a sheet with
    // its hem a long straight line past the body. Standing, the fall is straight down and nothing changes.
    // `dip`: the front and back of the ring hang further along the fall than its sides (a soft curved hem).
    const seatC = on(ctx, 'pelvis', [0, skel.offset.hipL[1], 0]);
    const ringAt = (c: V3, rx: number, rz: number, dip = 0): V3[] => {
        // half way between along the legs and straight down: the cloth lies on the thighs, gravity drops its edge (all
        // the way along the legs, a seated hem faced the viewer and its ends ran into spikes)
        const along = normalize(sub(c, seatC));
        const fall = normalize([
            along[0] * 0.55 + down[0] * 0.45,
            along[1] * 0.55 + down[1] * 0.45,
            along[2] * 0.55 + down[2] * 0.45,
        ]);
        let across = cross(ax, fall);
        if (len(across) < 0.2) across = az;
        across = normalize(across);
        if (dot(across, az) < 0) across = scale(across, -1);
        return Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x = Math.cos(a) * rx;
            const y = Math.sin(a) * rz;
            const d = dip * Math.abs(Math.sin(a));
            return [
                c[0] + ax[0] * x + across[0] * y + fall[0] * d,
                c[1] + ax[1] * x + across[1] * y + fall[1] * d,
                c[2] + ax[2] * x + across[2] * y + fall[2] * d,
            ];
        });
    };

    const t0 = skel.offset.spine2[1] / 0.26; // torso length
    // down the legs: enough rings for a smooth side, the last one at the hem
    const steps = Math.max(1, Math.ceil(t / 0.3));
    const legRings: { c: V3; half: number; depth: number; ti: number }[] = [];
    for (let i = 1; i <= steps; i++) {
        const ti = (t * i) / steps;
        const l = along(ctx, 'L', ti);
        const r = along(ctx, 'R', ti);
        const mid: V3 = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2, (l[2] + r[2]) / 2];
        // cloth hangs: a ring is never higher than a little under the one before it (a raised knee lifted the lower
        // rings back up, and the skirt's side folded over itself in a loop)
        const prevC = legRings[legRings.length - 1]?.c ?? seatC;
        const drop = dot(sub(mid, prevC), down);
        const minDrop = z.thigh * 0.35;
        const c: V3 =
            drop < minDrop
                ? [
                      mid[0] + down[0] * (minDrop - drop),
                      mid[1] + down[1] * (minDrop - drop),
                      mid[2] + down[2] * (minDrop - drop),
                  ]
                : mid;
        // how far apart the legs are across the body, plus a thigh and the flare (grows toward the hem)
        const spread =
            Math.abs((l[0] - r[0]) * ax[0] + (l[1] - r[1]) * ax[1] + (l[2] - r[2]) * ax[2]) / 2;
        const k = i / steps;
        // never narrower than the ring above: a narrower ring made a step (a notch) in both sides
        // (the thigh as full and as loose as the legs under it: trousers stuck out past a kurta)
        const prev = legRings[legRings.length - 1]?.half ?? hipHalf;
        // The cloth has only so much width: at most the hips plus the garment's own flare. The legs set the width
        // while they are close (standing, walking); spread far apart (sitting cross-legged) they come out from under
        // the hem instead of stretching the skirt into a sheet between the knees.
        const cloth = hipHalf + thigh * lerp(0.6, fl * 1.25, k);
        const half = Math.max(
            Math.min(
                Math.max(prev, spread + thigh * lerp(1.1, fl * 1.1, k), spread + underAt(ti)),
                cloth,
            ),
            hipHalf,
            skirt ? skirt.at(ti) * 1.04 : 0,
        );
        legRings.push({
            c,
            half,
            ti,
            depth: Math.max(z.hipDepth * 0.54, thigh * lerp(1.2, fl, k)),
        });
    }
    // the widest part of the hips meets the first ring down the legs, so the side is one smooth line
    const hipRingHalf = Math.max(hipHalf, legRings[0].half * 0.97, skirt ? skirt.hip * 1.04 : 0);
    if (key === 'skirt') {
        const at = (ti: number) => {
            const i = legRings.findIndex((g) => g.ti >= ti);
            if (i < 0) return legRings[legRings.length - 1].half;
            const a = i ? legRings[i - 1] : { ti: 0, half: hipRingHalf };
            const b = legRings[i];
            return a.half + ((b.half - a.half) * (ti - a.ti)) / (b.ti - a.ti || 1);
        };
        SKIRTS.set(ctx, { hip: hipRingHalf, at });
    }
    const dip = look ? look.hemCurve * z.thigh * 0.3 : 0;
    const rings: V3[][] = [
        // just above where the trousers begin (mangaTorso.ts starts the hips at +0.04), so none show across the top
        ring(ctx, 'spine1', t0 * 0.06, waistHalf * 1.04, z.chestDepth * 0.4, 12, z.belly * 0.5),
        // the hips round out from the waist and the side runs straight on to the hem (a ring at the hip joints only
        // 4 cm under a narrower one made a shelf on both sides, on a skirt and on a long top alike)
        ring(ctx, 'pelvis', 0, lerp(waistHalf, hipRingHalf, 0.78), z.hipDepth * 0.52, 12),
        ...legRings.map((g, i) =>
            ringAt(g.c, g.half, g.depth, i === legRings.length - 1 ? dip : 0),
        ),
    ];

    // in front of the legs, as the classic shell is (garments.ts addHanging)
    const legDepth = Math.max(
        // the whole leg: a shin nearer than its thigh showed through a long skirt
        ...ctx.parts.filter((x) => /^(upperLeg|lowerLeg)/.test(x.group)).map((x) => x.depth),
    );
    const depth = legDepth + (key === 'skirt' ? 1 : 1.2);
    addLoft(ctx, key, 'torso', role, rings, depth, false);
    // the sides run on from the torso (full width at the top) to the hem's corners
    // The sides and the hem as ink. The fill is smoothed (its curve passes through the midpoints of the outline's edges,
    // never through a corner), so the sides end, and the hem starts and ends, at the midpoint between each lower corner
    // and the hem's first point: inked through the corner itself they overshot the fill as a flag at a tilted hem.
    const screen = rings.map((rg) =>
        rg.map((p): P2 => {
            const s = toScreen(ctx, p);
            return [s[0], s[1]];
        }),
    );
    const c = loftChains(screen);
    if (c) {
        const mid = (p: P2, q: P2): P2 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const b0 = c.bottom[0] ?? c.right[c.right.length - 1];
        const b1 = c.bottom[c.bottom.length - 1] ?? c.left[c.left.length - 1];
        const endL = mid(c.left[c.left.length - 1], b0);
        const endR = mid(c.right[c.right.length - 1], b1);
        // the sides run on from the torso (full width at the top) to the hem's corners
        addContour(
            ctx,
            `${key}-contour-l`,
            'torso',
            role,
            [{ pts: [...c.left.slice(0, -1), endL], taper: [false, false] }],
            depth + 0.002,
        );
        addContour(
            ctx,
            `${key}-contour-r`,
            'torso',
            role,
            [{ pts: [...c.right.slice(0, -1), endR], taper: [false, false] }],
            depth + 0.002,
        );
        // the hem (from its own points: joined to the sides' last points it looped out to a raised knee in a squat)
        addContour(
            ctx,
            `${key}-hem`,
            'torso',
            role,
            [{ pts: [endL, ...c.bottom, endR], taper: [false, false] }],
            depth + 0.002,
        );
    }
    if (look) addSkirtDetail(ctx, skel, rings, role, depth, look);
}
