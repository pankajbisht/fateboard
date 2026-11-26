import type { V3 } from '../rig/math';
import type { BentLimb } from './bentLimb';
import { addFolds, inkLine } from './clothDetail';
import { addSurface, toScreen, type Ctx } from './parts';
import { capsulePoly, smoothClosed, type P2 } from './shapes';
import { darken } from './styles';

/**
 * A limb whose bone points at the viewer or that folds sharply (bentLimb.ts): two capsules, and the joint seen from the
 * front (a knee or an elbow drawn over the bone beyond it, a bare knee's anatomy as soft shade, folds on cloth).
 */
/** A sharply bent limb as two capsules (see `addBentLimb`): fills without outlines, one outline behind both. */
export function addCapsuleLimb(
    ctx: Ctx,
    o: BentLimb,
    S: V3[],
    [rA, rJ, rC]: [number, number, number],
) {
    const [A, B, C] = S.map((s): P2 => [s[0], s[1]]);
    const bias = o.bias ?? 0;
    const z2 = (S[1][2] + S[2][2]) / 2 + bias;
    // A thigh pointing at the viewer (seated, kneeling, a raised knee) shows the knee from the front: the knee is the
    // nearest thing, so the thigh's end is drawn over the shin, which comes down from under it. By the bones' average
    // depths the shin's round top covered the knee, and the "knee" was a ball. (Not under shorts ending at the knee:
    // there the bare knee is in front of the cloth, with its hem.)
    const shortsKnee = !!o.hemAtBend && o.roles[0] !== o.roles[1] && o.roles[1] === 'skin';
    // (an elbow pointing at the viewer, a punch or a reach, the same: the upper arm's end over the forearm)
    const leg = o.groups[0].startsWith('upperLeg');
    const kneeFront =
        (leg || o.groups[0].startsWith('upperArm')) &&
        !shortsKnee &&
        Math.hypot(B[0] - A[0], B[1] - A[1]) < rA * 1.6 &&
        S[1][2] > S[0][2];
    const z1 = kneeFront
        ? Math.max((S[0][2] + S[1][2]) / 2 + bias, z2) + 0.002
        : (S[0][2] + S[1][2]) / 2 + bias;
    const upper = capsulePoly(A, rA, B, rJ);
    const lower = capsulePoly(B, rJ, C, rC);
    const size = (rA + rC) * 1.2;
    // each bone at its own depth: a forearm in front of a foreshortened upper arm covers it, and the other way round
    addSurface(
        ctx,
        o.keys[0],
        o.groups[0],
        o.roles[0],
        upper,
        smoothClosed(upper),
        z1,
        size,
        false,
        [upper],
    );
    addSurface(
        ctx,
        o.keys[1],
        o.groups[1],
        o.roles[1],
        lower,
        smoothClosed(lower),
        z2,
        size,
        false,
        [lower],
    );
    // the outline: both capsules stroked twice as wide, just behind the fills, so only the outer half shows and the
    // two read as one form with no line where they overlap
    const u = (p: P2, q: P2): P2 => {
        const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        return [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
    };
    // (not on a knee seen from the front: its own folds are drawn below, and the bend's inner side points off the leg)
    if (!kneeFront) limbFolds(ctx, o, B, u(A, B), u(B, C), rJ, Math.max(z1, z2) + 0.003);
    // The knee (or elbow) seen end on. An arc round the joint at `rad`, from -span to +span about `dir`.
    const u1 = u(A, B);
    const u2 = u(B, C);
    const arc = (dir: P2, rad: number, span: number): P2[] => {
        const nrm: P2 = [-dir[1], dir[0]];
        return Array.from({ length: 9 }, (_, i) => {
            const t = (-1 + i / 4) * span;
            return [
                B[0] + (dir[0] * Math.cos(t) + nrm[0] * Math.sin(t)) * rad,
                B[1] + (dir[1] * Math.cos(t) + nrm[1] * Math.sin(t)) * rad,
            ];
        });
    };
    // Cloth that ends at the bend (shorts): its hem on the colour edge, the round end of whichever bone is in front (the
    // shin's top when it is nearer, else the thigh's end); without it a skin ball met the cloth with no line.
    if (o.hemAtBend && o.roles[0] !== o.roles[1] && o.roles[1] === 'skin') {
        const dir: P2 = z2 >= z1 ? [-u2[0], -u2[1]] : u1;
        inkLine(
            ctx,
            `${o.contour}-hem`,
            o.groups[0],
            o.roles[0],
            [{ pts: arc(dir, rJ, Math.PI / 2), taper: [true, true] }],
            Math.max(z1, z2) + 0.003,
            0.8,
        );
    }
    if (kneeFront) {
        const n1: P2 = [-u1[1], u1[0]];
        let depthK = Math.max(z1, z2) + 0.003;
        if (o.kneeOverCloth) depthK = addBareKnee(ctx, o, B, u2, rJ, Math.max(z1, z2) + 0.05);
        // the knee's lower edge, where it lies over the shin: now a visible edge, inked as one
        inkLine(
            ctx,
            `${o.contour}-knee`,
            o.groups[0],
            o.roles[0],
            [{ pts: arc(u2, rJ, (Math.PI * 4) / 9), taper: [true, true] }],
            depthK,
            0.75,
        );
        if (o.roles[0] === 'skin' && !o.kneeOverCloth) {
            if (leg) addKneeAnatomy(ctx, o, B, u2, rJ, o.keys[0]);
        } else if (o.roles[0] !== 'skin')
            // cloth over a bent knee: two short tension folds from the knee's upper sides back toward the hip
            for (const sd of [-1, 1]) {
                const p0: P2 = [B[0] + n1[0] * rJ * 0.55 * sd, B[1] + n1[1] * rJ * 0.55 * sd];
                const p1: P2 = [
                    p0[0] - u1[0] * rJ * 0.7 - n1[0] * rJ * 0.12 * sd,
                    p0[1] - u1[1] * rJ * 0.7 - n1[1] * rJ * 0.12 * sd,
                ];
                inkLine(
                    ctx,
                    `${o.contour}-kneefold${sd}`,
                    o.groups[0],
                    o.roles[0],
                    [{ pts: [p0, p1], taper: [true, true] }],
                    depthK,
                    0.45,
                );
            }
    }
    const stroke = ctx.outline(ctx.fill[o.roles[0]]);
    if (stroke)
        ctx.parts.push({
            key: `${o.contour}-back`,
            group: o.groups[0],
            role: 'line',
            d: smoothClosed(upper) + smoothClosed(lower),
            fill: 'none',
            stroke,
            strokeWidth: 2 * ctx.line * ctx.pack.line.silhouette,
            depth: Math.min(z1, z2) - 0.001,
        });
}

/** Folds on the inside of the bend when the whole limb is in cloth (clothDetail.ts): `legL-fold0`, `armR-fold1` … */
export function limbFolds(ctx: Ctx, o: BentLimb, B: P2, u1: P2, u2: P2, r: number, depth: number) {
    if (o.roles[0] === 'skin' || o.roles[1] === 'skin') return;
    addFolds(ctx, o.contour.replace('-contour', ''), o.groups[1], o.roles[1], B, u1, u2, r, depth);
}

/**
 * A bare knee seen from the front, in front of the cloth tube on the thigh behind it (swim trunks, hot pants): a disc of
 * skin with a thin edge all round (where the knee meets that cloth) and the curve under the kneecap. Returns the depth
 * for anything drawn on the knee.
 */
export function addBareKnee(ctx: Ctx, o: BentLimb, B: P2, u2: P2, rJ: number, dz: number): number {
    const disc: P2[] = Array.from({ length: 20 }, (_, i) => {
        const t = (i / 20) * Math.PI * 2;
        return [B[0] + Math.cos(t) * rJ, B[1] + Math.sin(t) * rJ];
    });
    addSurface(
        ctx,
        `${o.keys[0]}-knee`,
        o.groups[0],
        o.roles[0],
        disc,
        smoothClosed(disc),
        dz,
        rJ * 2,
        false,
        [disc],
    );
    inkLine(
        ctx,
        `${o.contour}-knee-rim`,
        o.groups[0],
        o.roles[0],
        [{ pts: [...disc, disc[0]], taper: [false, false] }],
        dz + 0.001,
        0.6,
    );
    addKneeAnatomy(ctx, o, B, u2, rJ, `${o.keys[0]}-knee`);
    return dz + 0.002;
}

/**
 * A bare knee from the front, simplified as manga draws it, in soft shade rather than lines: the shadow under the
 * kneecap (a crescent a little above the joint's centre) and the soft shadow beside the teardrop of the inner thigh
 * muscle just above the knee, on the side toward the body. Lines inside a round knee read as a face (eyes and a smile).
 */
function addKneeAnatomy(ctx: Ctx, o: BentLimb, B: P2, u2: P2, rJ: number, on: string) {
    if (ctx.pack.palette === 'manga') return;
    const nrm: P2 = [-u2[1], u2[0]];
    // the inner side: toward the pelvis on screen
    const pel = toScreen(ctx, ctx.posed.pos.pelvis);
    const inner = (pel[0] - B[0]) * nrm[0] + (pel[1] - B[1]) * nrm[1] > 0 ? 1 : -1;
    const at = (a: number, c: number): P2 => [
        B[0] + u2[0] * rJ * a + nrm[0] * rJ * c,
        B[1] + u2[1] * rJ * a + nrm[1] * rJ * c,
    ];
    // a crescent between two arcs about `dir` from the centre (a, c): outer radius r0, inner r1 pushed toward dir
    const crescent = (
        a: number,
        c: number,
        r0: number,
        r1: number,
        span: number,
        dirA: number,
        dirC: number,
    ) => {
        const l = Math.hypot(dirA, dirC) || 1;
        const [da, dc] = [dirA / l, dirC / l];
        const arc = (r: number, shift: number) =>
            Array.from({ length: 9 }, (_, i) => {
                const t = (-1 + i / 4) * span;
                const ca = Math.cos(t) * da - Math.sin(t) * dc;
                const cc = Math.sin(t) * da + Math.cos(t) * dc;
                return at(a + da * shift + ca * r, c + dc * shift + cc * r);
            });
        return [...arc(r0, 0), ...arc(r1, (r0 - r1) * 0.35).reverse()];
    };
    // shading layers of the knee's own part (not parts of their own: every style keeps the same parts)
    const target = ctx.parts.find((x) => x.key === on);
    const shade = (key: string, poly: P2[], k: number) => {
        if (!target) return;
        target.layers = [
            ...(target.layers ?? []),
            {
                key: `${o.contour}-${key}`,
                kind: 'shade',
                d: smoothClosed(poly),
                fill: darken(ctx.fill.skin, k),
            },
        ];
    };
    // under the kneecap
    shade('kneecap', crescent(-0.12, 0, 0.44, 0.34, 1.05, 1, 0), 0.14);
    // beside the inner muscle's teardrop, above the knee
    shade('knee-teardrop', crescent(-0.55, 0.42 * inner, 0.3, 0.22, 0.9, 0.3, 1 * inner), 0.09);
}
