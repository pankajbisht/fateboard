import type { V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { addLoft, addLoftContour } from './loft';
import { on, ring, type Ctx } from './parts';

/**
 * The manga torso (docs/CHARACTER_STUDIO.md, manga body): one body profile, measured from a reference figure. Neck,
 * the slope of the trapezius, the shoulder and its deltoid (as wide as the top of the arm, so the outline runs on
 * into the arm), the chest or bust, the ribs, the waist, the pelvis, the widest part of the hips, and the top of the
 * thighs with an arch for the crotch. The top and the hips are two lofts that overlap at the waist; the cloth roles
 * stay separate, but there is one contour round everything, so no seam shows where a top meets trousers.
 */
export function addMangaTorso(ctx: Ctx, skel: Skeleton, fit: number, bust: boolean) {
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26; // torso length
    const hy = skel.offset.hipL[1]; // hip joint below the pelvis (negative)
    const chestZ = z.chestDepth * 0.5;
    // where the top of the arm ends: the joint, plus the radius of the upper arm and its deltoid swell
    const outer = skel.size.shoulderW * 0.46 + z.upperArm * 1.12;
    const chestHalf = ((z.chestW ?? z.shoulderW * 0.82) / 2) * fit;
    const waistHalf = z.waistW * 0.4;
    // the outer edge of the thigh where it leaves the hip: the hips run straight on into it
    const legOuter = z.hipW * 0.28 + z.thigh * 1.02;
    // the widest part of the hips is as wide as the tops of the thighs, so the outline runs on into them
    const hipHalf = Math.max(z.hipW * 0.5, legOuter);
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    const neckBase = z.neck * 1.45;

    const waist = ring(ctx, 'spine1', 0, waistHalf, z.chestDepth * 0.38, 12, z.belly * 0.5);
    const rings: V3[][] = [
        ring(ctx, 'chest', t * 0.3, neckBase, z.neck * 1.3, 10),
        // the slope of the shoulders: it runs out to the top of the arm, no higher than the neck base
        ring(ctx, 'chest', t * 0.26, lerp(neckBase, outer, 0.3), chestZ * 0.6 * fit, 10),
        ring(ctx, 'chest', t * 0.18, outer * 0.68, chestZ * 0.68 * fit, 12),
        ring(ctx, 'chest', t * 0.09, outer * 0.9, chestZ * 0.76 * fit, 12),
        ring(ctx, 'chest', t * 0.0, outer * 0.97, chestZ * 0.8 * fit, 12),
        // under the arm, the body closes in to the chest, then the ribs
        ring(
            ctx,
            'chest',
            -t * 0.1,
            chestHalf + z.bust * 0.3,
            chestZ * 0.98 * fit,
            12,
            bust ? z.bust * 0.4 : 0,
        ),
        ring(ctx, 'spine2', 0, lerp(chestHalf, waistHalf, 0.5), chestZ * 0.9 * fit, 12),
        waist,
        ring(
            ctx,
            'spine1',
            -t * 0.06,
            lerp(waistHalf, hipHalf, 0.18),
            z.chestDepth * 0.4,
            12,
            z.belly * 0.4,
        ),
    ];
    addLoft(ctx, 'torso', 'torso', 'top', rings, undefined, false);

    // The seat follows the thighs: a point given in the pelvis frame is also placed on the thigh of its side as if
    // it were fixed to it at rest (the centre on both thighs, averaged), and the two are mixed by `w`. With w = 1 the
    // crotch turns with the legs when sitting or crouching, instead of hanging under the pelvis as a block.
    const seat = (x: number, y: number, zz: number, w: number): V3 => {
        const p = on(ctx, 'pelvis', [x, y, zz]);
        const leg = (s: 'L' | 'R'): V3 => {
            const o = skel.offset[`hip${s}`];
            return on(ctx, `upperLeg${s}`, [x - o[0], y - o[1], zz - o[2]]);
        };
        const l = leg('L');
        const r = leg('R');
        const t: V3 =
            Math.abs(x) < 1e-6
                ? [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2, (l[2] + r[2]) / 2]
                : x > 0
                  ? l
                  : r;
        return [lerp(p[0], t[0], w), lerp(p[1], t[1], w), lerp(p[2], t[2], w)];
    };
    const seatRing = (y: number, rx: number, rz: number, w: number): V3[] =>
        Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return seat(Math.cos(a) * rx, y, Math.sin(a) * rz, w);
        });

    // the arch of the crotch: the middle is higher than the two sides, which end where the thighs begin
    const r = z.thigh;
    const base = hy - r * 0.15;
    // The bottom of the seat: the arch of the crotch in the middle, and round each thigh a circle of its own size (on
    // the thigh, so it turns with it). The loft's outline then runs into the legs from every side; a flat ring with
    // corners at the thighs' edges stuck out of the legs as a fin in a three-quarter view.
    const thighRing = (s: 'L' | 'R'): V3[] => {
        const o = skel.offset[`hip${s}`];
        return Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return seat(
                o[0] + Math.cos(a) * r * 0.97,
                base - r * 1.6,
                o[2] + Math.sin(a) * r * 0.97,
                1,
            );
        });
    };
    const crotch: V3[] = [
        seat(-z.hipW * 0.14, base - r * 1.1, 0, 1),
        seat(0, base - r * 0.5, 0, 1),
        seat(z.hipW * 0.14, base - r * 1.1, 0, 1),
        ...thighRing('L'),
        ...thighRing('R'),
    ];
    const hips: V3[][] = [
        ring(ctx, 'spine1', t * 0.04, waistHalf * 1.02, z.chestDepth * 0.38, 12, z.belly * 0.5),
        waist,
        rings[rings.length - 1],
        ring(ctx, 'pelvis', 0, lerp(waistHalf, hipHalf, 0.55), z.hipDepth * 0.46, 12),
        // the widest part of the hips turns half way with the thighs
        // widest at the hip joints (where the thighs begin), not above them; it turns half way with the thighs
        seatRing(hy * 0.85, hipHalf, z.hipDepth * 0.5, 0.5),
        crotch,
    ];
    addLoft(ctx, 'hips', 'torso', 'bottom', hips, undefined, false);
    // one contour round shoulders, chest, waist and hips: no seam where the top meets the trousers
    const depth = Math.max(
        ...['torso', 'hips'].map((k) => ctx.parts.find((x) => x.key === k)?.depth ?? 0),
    );
    addLoftContour(
        ctx,
        'body-contour',
        'torso',
        'top',
        [...rings, ...hips.slice(1)],
        depth + 0.002,
    );
}
