import { apply, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { addLoft, addLoftContour, loftChains } from './loft';
import { project } from './camera';
import { addRingHem, inkLine } from './clothDetail';
import type { P2 } from './shapes';
import { mangaLook } from './mangaVariants';
import { on, ring, toScreen, type Ctx } from './parts';

/**
 * The manga torso (docs/CHARACTER_STUDIO.md, manga body): one body profile, measured from a reference figure. Neck,
 * the slope of the trapezius, the shoulder and its deltoid (as wide as the top of the arm, so the outline runs on
 * into the arm), the chest or bust, the ribs, the waist, the pelvis, the widest part of the hips, and the top of the
 * thighs with an arch for the crotch. The top and the hips are two lofts that overlap at the waist; the cloth roles
 * stay separate, but there is one contour round everything, so no seam shows where a top meets trousers.
 */
export function addMangaTorso(
    ctx: Ctx,
    skel: Skeleton,
    fit: number,
    bust: boolean,
    untucked = false,
    /** a strapless top (tube top): neck, shoulders and the chest above the bust are bare skin */
    strapless = false,
) {
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26; // torso length
    const hy = skel.offset.hipL[1]; // hip joint below the pelvis (negative)
    const chestZ = z.chestDepth * 0.5;
    // where the top of the arm ends: the joint, plus the radius of the upper arm and its deltoid swell
    const outer = skel.size.shoulderW * 0.46 + z.upperArm * 1.12;
    // the inner edge of the upper arm, where it meets the side of the chest
    const armIn = skel.size.shoulderW * 0.46 - z.upperArm * 0.9;
    const chestHalf = ((z.chestW ?? z.shoulderW * 0.82) / 2) * fit;
    const waistHalf = z.waistW * 0.4;
    // the outer edge of the thigh where it leaves the hip: the hips run straight on into it
    const legOuter = z.hipW * 0.28 + mangaThighTop(skel) * 1.02;
    // the widest part of the hips is as wide as the tops of the thighs, so the outline runs on into them
    const hipHalf = Math.max(z.hipW * 0.5, legOuter);
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    const neckBase = z.neck * 1.45;
    const slope = mangaLook().sleeve;
    // A ring of the chest. With a bust its front is not pushed forward evenly (that made no shape at all) but by
    // `bustProfile`: a swell round each breast, so three-quarter views show the bust in the outline.
    const bustRing = (
        j: 'chest' | 'spine2',
        y: number,
        rx: number,
        rz: number,
        n: number,
        dz: number,
    ): V3[] => {
        if (!bust || dz <= 0) return ring(ctx, j, y, rx, rz, n, dz);
        return Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2;
            return on(ctx, j, [Math.cos(a) * rx, y, Math.sin(a) * rz + dz * bustProfile(a)]);
        });
    };

    const waist = ring(ctx, 'spine1', 0, waistHalf, z.chestDepth * 0.38, 12, z.belly * 0.5);
    const rings: V3[][] = [
        ring(ctx, 'chest', t * 0.3, neckBase, z.neck * 1.3, 10),
        // the slope of the shoulders: it runs out to the top of the arm, no higher than the neck base
        // (the drop and reach come from the sleeve variant: a lower, longer trapezius reads as a sloped shoulder)
        ring(
            ctx,
            'chest',
            t * (0.29 - slope.slopeDrop),
            lerp(neckBase, outer, slope.slopeReach),
            chestZ * 0.6 * fit,
            10,
        ),
        // the shoulder point, rounded over the top of the arm
        mangaShoulderRing(ctx, skel, fit),
        // below it the body stays inside the arm's outer edge, so the arm (or sleeve) carries the outline down: at the
        // width of the deltoid it bulged out beside the sleeve, an S-curve like a bust on a man
        bustRing(
            'chest',
            t * 0.09,
            lerp(armIn, outer, 0.45),
            chestZ * 0.76 * fit,
            12,
            bust ? z.bust * 0.45 : 0,
        ),
        // the bust spreads over four rings (upper slope, fullest, fullest, underside) so its profile is a soft curve
        bustRing(
            'chest',
            t * 0.0,
            // at the armpit the body is the chest, not the deltoid: the hanging arm carries that (a male torso
            // bulged out here like a bust once the arms were slim)
            lerp(lerp(armIn, outer, 0.3), chestHalf + z.bust * 0.3, 0.6),
            chestZ * 0.8 * fit,
            12,
            bust ? z.bust * 0.85 : 0,
        ),
        // under the arm, the body closes in to the chest, then the ribs
        bustRing(
            'chest',
            -t * 0.1,
            chestHalf + z.bust * 0.3,
            chestZ * 0.98 * fit,
            12,
            bust ? z.bust * 0.6 : 0,
        ),
        bustRing(
            'spine2',
            0,
            lerp(chestHalf, waistHalf, 0.5),
            chestZ * 0.9 * fit,
            12,
            bust ? z.bust * 0.12 : 0,
        ),
        waist,
        // the top's hem: its front and back hang a little lower than its sides, so the hem curves round the body
        // (a flat ring drew a ruler-straight hem across the hips)
        Array.from({ length: 12 }, (_, i): V3 => {
            const a = (i / 12) * Math.PI * 2;
            return on(ctx, 'spine1', [
                Math.cos(a) * lerp(waistHalf, hipHalf, 0.18),
                -t * 0.06 - t * 0.035 * Math.abs(Math.sin(a)) ** 1.5,
                Math.sin(a) * z.chestDepth * 0.4 + z.belly * 0.4,
            ]);
        }),
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
    const r = mangaThighTop(skel);
    const base = hy - r * 0.15;
    // The bottom of the seat: the arch of the crotch in the middle, and round each thigh a circle of its own size (on
    // the thigh, so it turns with it). The loft's outline then runs into the legs from every side; a flat ring with
    // corners at the thighs' edges stuck out of the legs as a fin in a three-quarter view.
    // The ring is as wide as the leg itself there (bentLimb.ts: the thigh tapers from its top to the knee, and the
    // style's limb scale): the thigh's top radius was wider than the leg 1.75 radii down, and left the hips' outline
    // hanging past the far leg in a three-quarter view.
    const ta = (r * 1.75) / skel.thigh;
    const rr = (r + (z.knee * 0.98 - r) * ta) * (1 - 0.057 * ta) * (ctx.pack.proportion.limb ?? 1);
    const thighRing = (s: 'L' | 'R'): V3[] => {
        const o = skel.offset[`hip${s}`];
        return Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return seat(o[0] + Math.cos(a) * rr, base - r * 1.6, o[2] + Math.sin(a) * rr, 1);
        });
    };
    // At the hip joints the hips' outline is the two thighs' own circles at the legs' radius there (and the style's limb
    // scale). An ellipse narrows faster on screen than a circle as the body turns, so in a three-quarter view the near
    // thigh's edge came out beside the hips as a second line; this ring keeps the outline on the legs from any angle.
    const limbK = ctx.pack.proportion.limb ?? 1;
    const jointRing: V3[] = (['L', 'R'] as const).flatMap((sd) => {
        const o = skel.offset[`hip${sd}`];
        return Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return seat(o[0] + Math.cos(a) * r * limbK, hy, o[2] + Math.sin(a) * r * limbK, 1);
        });
    });
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
        // the hips round out soon under the waist (at 0.55 the side ran straight, then turned a corner at the seat)
        ring(ctx, 'pelvis', 0, lerp(waistHalf, hipHalf, 0.75), z.hipDepth * 0.46, 12),
        // the widest part of the hips turns half way with the thighs
        // widest at the hip joints (where the thighs begin), not above them; it turns half way with the thighs
        seatRing(hy * 0.85, hipHalf, z.hipDepth * 0.5, 0.5),
        jointRing,
        crotch,
    ];
    addLoft(ctx, 'hips', 'torso', 'bottom', hips, undefined, false, true);
    addCrotchLine(ctx, skel, hips);
    // an untucked top hangs over the trousers: drawn over them, with its hem across the hips
    const top = ctx.parts.find((x) => x.key === 'torso');
    const bottom = ctx.parts.find((x) => x.key === 'hips');
    if (untucked && top && bottom) {
        top.depth = Math.max(top.depth, bottom.depth + 0.001);
        addRingHem(ctx, 'top-hem', 'torso', 'top', rings[rings.length - 1], top.depth + 0.003);
    }
    // the contour round shoulders, chest and waist in the top's ink, and on down the hips in the bottom's: one line in
    // the top's colour ran down over shorts as a brown line beside the white cloth. The two overlap at the waist (the
    // top's on top), so no gap shows where they meet.
    const depth = Math.max(
        ...['torso', 'hips'].map((k) => ctx.parts.find((x) => x.key === k)?.depth ?? 0),
    );
    if (bust) addUnderBust(ctx, skel, fit, chestHalf, chestZ, depth + 0.003);
    if (strapless) {
        // Bare from the neck down to the top's edge across the upper bust (the ring a little above the armpits): a skin
        // loft over the cloth, the edge inked in the cloth's colour, and the outline there in the skin's.
        const edge = 3;
        addLoft(ctx, 'bare-chest', 'torso', 'skin', rings.slice(0, edge + 1), depth + 0.001, false);
        addRingHem(ctx, 'strapless-edge', 'torso', 'top', rings[edge], depth + 0.003);
        addLoftContour(
            ctx,
            'body-contour-bare',
            'torso',
            'skin',
            rings.slice(0, edge + 1),
            depth + 0.002,
            [true, false],
        );
        addLoftContour(ctx, 'body-contour', 'torso', 'top', rings.slice(edge), depth + 0.002, [
            false,
            false,
        ]);
    } else addLoftContour(ctx, 'body-contour', 'torso', 'top', rings, depth + 0.002, [true, false]);
    addLoftContour(
        ctx,
        'body-contour-hips',
        'torso',
        'bottom',
        // down through the crotch ring (its sides are the thighs' circles, so no double line beside the thigh): stopped
        // at the hip joints, the hips fill covered the far leg's contour below and at 335° that thigh edge had no ink
        hips.slice(untucked ? 2 : 1),
        depth + 0.0015,
        [false, true],
    );
}

/**
 * The ring at the point of the shoulder, where the slope of the trapezius turns down into the arm. The manga sleeve
 * (mangaSleeveCap.ts) takes its outer half into its head: the arm joint is lower than this ring, so a sleeve round the
 * joint alone left the torso's shoulder sticking out above it like a pad.
 */
export function mangaShoulderRing(ctx: Ctx, skel: Skeleton, fit: number): V3[] {
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26; // torso length
    const outer = z.shoulderW * 0.46 + z.upperArm * 1.12;
    return ring(ctx, 'chest', t * 0.18, outer * 0.88, z.chestDepth * 0.5 * 0.68 * fit, 12);
}

/**
 * The edge of the seat between the legs: the hips loft's bottom (its lower envelope, loft.ts) only where it runs
 * between the two thighs. Without it the cloth between the legs had no edge and read as a tongue under the crotch;
 * over each thigh the leg itself carries on, so no line is drawn there.
 */
function addCrotchLine(ctx: Ctx, skel: Skeleton, hips: V3[][]) {
    const part = ctx.parts.find((x) => x.key === 'hips');
    const c = loftChains(
        hips.map((r) =>
            r.map((p): P2 => {
                const s = toScreen(ctx, p);
                return [s[0], s[1]];
            }),
        ),
        true,
    );
    if (!part || !c) return;
    // Standing, the part of the seat's lower edge between the thighs (a share of the gap between the hip joints). Once
    // the legs spread wide (a star jump) that share holds no points and the seat ended in a flat edge with no line:
    // then the points of the lower edge that no thigh covers (each thigh a capsule on screen from the hip to the knee,
    // a little under its radius: at the joints themselves the thighs overlap).
    const along = (q: ArrayLike<number>) => q[0] * c.n[0] + q[1] * c.n[1];
    const legs = (['L', 'R'] as const).map((sd) =>
        along(toScreen(ctx, ctx.posed.pos[`upperLeg${sd}`])),
    );
    const margin = Math.abs(legs[0] - legs[1]) * 0.3;
    const [lo, hi] = [Math.min(...legs) + margin, Math.max(...legs) - margin];
    let mid = c.bottom.filter((q) => along(q) > lo && along(q) < hi);
    if (mid.length < 2) {
        const rad = mangaThighTop(skel) * (ctx.pack.proportion.limb ?? 1) * 0.9;
        const onLeg = (q: P2) =>
            (['L', 'R'] as const).some((sd) => {
                const A = toScreen(ctx, ctx.posed.pos[`upperLeg${sd}`]);
                const B = toScreen(ctx, ctx.posed.pos[`lowerLeg${sd}`]);
                const ab: P2 = [B[0] - A[0], B[1] - A[1]];
                const k = Math.max(
                    0,
                    Math.min(
                        1,
                        ((q[0] - A[0]) * ab[0] + (q[1] - A[1]) * ab[1]) /
                            (ab[0] ** 2 + ab[1] ** 2 || 1),
                    ),
                );
                return Math.hypot(q[0] - A[0] - ab[0] * k, q[1] - A[1] - ab[1] * k) < rad;
            });
        mid = c.bottom.filter((q) => !onLeg(q));
    }
    // and one point on each side, where the line meets the thighs (spread wide, only the crotch's own point is free)
    if (mid.length) {
        const i0 = c.bottom.indexOf(mid[0]);
        const i1 = c.bottom.indexOf(mid[mid.length - 1]);
        mid = c.bottom.slice(Math.max(0, i0 - 1), Math.min(c.bottom.length, i1 + 2));
    }
    if (mid.length >= 2)
        inkLine(
            ctx,
            'crotch',
            'torso',
            'bottom',
            [{ pts: mid, taper: [true, true] }],
            part.depth + 0.002,
            0.7,
        );
}

/**
 * How far the bust stands out at angle `a` round the chest (π/2 = the front), × its depth: each breast swells round its
 * own centre, BREAST_OFFSET radians either side of the front, the sides hardly at all. (Centred a third of the way to
 * the sides, the bust stood out too little in profile.)
 */
export const BREAST_OFFSET = 0.4;
export const bustProfile = (a: number) =>
    0.3 +
    Math.exp(-(((a - Math.PI / 2 + BREAST_OFFSET) / 0.42) ** 2)) +
    Math.exp(-(((a - Math.PI / 2 - BREAST_OFFSET) / 0.42) ** 2));

/**
 * The line under each breast, on the chest's own surface (the swell of `bustProfile`): a shallow U round each breast's
 * lower half, the two nearly meeting in the middle as in the reference sheets. Only the part facing the viewer is
 * drawn, so in a three-quarter view the far one ends at the outline instead of floating past it. (Two fixed arcs drawn
 * on the chest read as eyebrows and reached the sleeve.)
 */
function addUnderBust(
    ctx: Ctx,
    skel: Skeleton,
    fit: number,
    chestHalf: number,
    chestZ: number,
    depth: number,
) {
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26; // torso length
    const rx = (chestHalf + z.bust * 0.3) * 0.94;
    const rz = chestZ * 0.8 * fit;
    // the fullest of the bust is at the armpit's height (lower, the lines sat under the sleeves' hems)
    const dz = z.bust * 0.85;
    const y0 = -t * 0.03;
    const drop = z.bust * 0.65;
    const R = ctx.posed.rot.chest;
    // only while the chest faces the viewer (as the old chest lines, joints.ts): near the side the lines leave the outline
    if (project(ctx.view, apply(R, [0, 0, 1]))[2] < 0.45) return;
    for (const [k, ap] of [Math.PI / 2 - BREAST_OFFSET, Math.PI / 2 + BREAST_OFFSET].entries()) {
        const pts: P2[] = [];
        for (let i = 0; i <= 10; i++) {
            const s = i / 5 - 1;
            const a = ap + s * 0.4;
            const facing = project(ctx.view, apply(R, [Math.cos(a), 0, Math.sin(a)]))[2];
            if (facing < 0.2) continue;
            const p = toScreen(
                ctx,
                on(ctx, 'chest', [
                    Math.cos(a) * rx,
                    y0 - drop * (1 - s * s),
                    Math.sin(a) * rz * 0.97 + dz * bustProfile(a),
                ]),
            );
            pts.push([p[0], p[1]]);
        }
        if (pts.length >= 3)
            inkLine(
                ctx,
                `under-bust${k}`,
                'torso',
                'top',
                [{ pts, taper: [true, true] }],
                depth,
                0.55,
            );
    }
}

/**
 * The radius of the top of the thigh. Wide hips (a woman's) are wider than the thighs' outer edge at the hip joint; the
 * hips then came back in to the thighs over a few centimetres, a balloon with a corner on each side under trousers
 * (and a contour left hanging beside the far leg). Here the thigh's top is as full as the hips, so the hips run on into
 * the legs and the thigh tapers to the knee (the inner thighs then meet under the crotch). Narrow hips keep the thigh.
 */
export const mangaThighTop = (skel: Skeleton) =>
    Math.max(skel.size.thigh, (skel.size.hipW * 0.22) / 1.02);
