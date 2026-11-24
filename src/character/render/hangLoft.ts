import { apply, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { addContour, addLoft, addLoftContour, loftChains, smoothOpen } from './loft';
import { ring, toScreen, type Ctx, type Material } from './parts';
import type { P2 } from './shapes';

/**
 * Hanging cloth on the manga body (docs/CHARACTER_STUDIO.md, manga cloth): a long top (coat, kurta, tunic) or a skirt
 * as one loft of rings, not a convex shell. It starts with the waist ring of the manga torso (so no trousers show
 * between the top and its hang), passes the hips at their width, then follows the legs: each lower ring is centred
 * between the two legs at that height and widens toward the hem by the garment's flare. Drawn as an outline-free fill
 * with side contours and a hem line, like the torso, so it joins the top without a seam.
 */
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

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
) {
    const z = skel.size;
    const hy = skel.offset.hipL[1];
    // the same widths as the manga torso (mangaTorso.ts), a little looser: cloth over the body
    const waistHalf = z.waistW * 0.4;
    const legOuter = z.hipW * 0.28 + z.thigh * 1.02;
    const hipHalf = Math.max(z.hipW * 0.5, legOuter) * 1.05;
    const R = ctx.posed.rot.pelvis;
    const ax = apply(R, [1, 0, 0]);
    const az = apply(R, [0, 0, 1]);
    const ringAt = (c: V3, rx: number, rz: number): V3[] =>
        Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x = Math.cos(a) * rx;
            const y = Math.sin(a) * rz;
            return [
                c[0] + ax[0] * x + az[0] * y,
                c[1] + ax[1] * x + az[1] * y,
                c[2] + ax[2] * x + az[2] * y,
            ];
        });

    const t0 = skel.offset.spine2[1] / 0.26; // torso length
    const rings: V3[][] = [
        // just above where the trousers begin (mangaTorso.ts starts the hips at +0.04), so none show across the top
        ring(ctx, 'spine1', t0 * 0.06, waistHalf * 1.04, z.chestDepth * 0.4, 12, z.belly * 0.5),
        ring(ctx, 'pelvis', 0, lerp(waistHalf, hipHalf, 0.55), z.hipDepth * 0.5, 12),
        ring(ctx, 'pelvis', hy * 0.55, hipHalf, z.hipDepth * 0.54, 12),
    ];
    // down the legs: enough rings for a smooth side, the last one at the hem
    const steps = Math.max(1, Math.ceil(t / 0.3));
    for (let i = 1; i <= steps; i++) {
        const ti = (t * i) / steps;
        const l = along(ctx, 'L', ti);
        const r = along(ctx, 'R', ti);
        const c: V3 = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2, (l[2] + r[2]) / 2];
        // how far apart the legs are across the body, plus a thigh and the flare (grows toward the hem)
        const spread =
            Math.abs((l[0] - r[0]) * ax[0] + (l[1] - r[1]) * ax[1] + (l[2] - r[2]) * ax[2]) / 2;
        const k = i / steps;
        const half = Math.max(hipHalf, spread + z.thigh * lerp(1.1, flare * 1.1, k));
        rings.push(ringAt(c, half, Math.max(z.hipDepth * 0.54, z.thigh * lerp(1.2, flare, k))));
    }

    // in front of the legs, as the classic shell is (garments.ts addHanging)
    const legDepth = Math.max(
        ...ctx.parts.filter((x) => x.group.startsWith('upperLeg')).map((x) => x.depth),
    );
    const depth = legDepth + (key === 'skirt' ? 1 : 1.2);
    addLoft(ctx, key, 'torso', role, rings, depth, false);
    addLoftContour(ctx, `${key}-contour`, 'torso', role, rings, depth + 0.002);
    // the hem: the front half of the last ring
    const screen = rings.map((rg) =>
        rg.map((p): P2 => {
            const s = toScreen(ctx, p);
            return [s[0], s[1]];
        }),
    );
    const c = loftChains(screen);
    const hem = c ? [c.left[c.left.length - 1], ...c.bottom, c.right[c.right.length - 1]] : [];
    if (hem.length >= 2)
        addContour(ctx, `${key}-hem`, 'torso', role, smoothOpen(hem), depth + 0.002);
}
