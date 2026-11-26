import type { V3 } from '../rig/math';
import type { PartGroup } from '../schema/types';
import { addContour, smoothOpen } from './loft';
import { addSurface, toScreen, type Ctx, type Material } from './parts';
import { hull, smoothClosed, smoothPoly, type P2 } from './shapes';
import { inkLine } from './clothDetail';
import { addBareKnee, addCapsuleLimb, limbFolds } from './limbFront';

/**
 * Bent limbs (manga body, docs/CHARACTER_STUDIO.md): an arm or a leg drawn as ONE shape that follows its bent centre
 * line, with a width profile per bone (the swell of the upper arm, the calf, the slim wrist and ankle). The fills
 * carry no outline; one contour runs down both sides and round the hand or foot, open at the shoulder or hip, where
 * the torso joins. A thin inner line on the shadow side shows muscle.
 */
const dot = (a: P2, b: P2) => a[0] * b[0] + a[1] * b[1];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Width multipliers along a bone (t = 0 at the first joint, 1 at the next): the muscle swell and the slim end. */
export type Profile = [t: number, k: number][];
export const PROFILES = {
    upperArm: [
        [0, 1.06],
        [0.2, 1.1],
        [0.5, 1.04],
        [0.85, 0.95],
        [1, 0.94],
    ],
    foreArm: [
        [0, 1],
        [0.25, 1.1],
        [0.65, 0.9],
        [1, 0.8],
    ],
    // a thigh only tapers (no belly in the middle); the knee is the radius at its end
    thigh: [
        [0, 1],
        [0.35, 0.98],
        [0.75, 0.94],
        [1, 1.02],
    ],
    // the calf swells just under the knee, then runs down to a slim ankle
    shin: [
        [0, 1],
        [0.22, 1.16],
        [0.5, 1.05],
        [0.8, 0.9],
        [1, 1],
    ],
} satisfies Record<string, Profile>;

const at = (p: Profile, t: number) => {
    for (let i = 1; i < p.length; i++)
        if (t <= p[i][0]) {
            const [t0, k0] = p[i - 1];
            const [t1, k1] = p[i];
            return k0 + ((k1 - k0) * (t - t0)) / (t1 - t0 || 1);
        }
    return p[p.length - 1][1];
};

const unit = (a: P2, b: P2, fallback: P2): P2 => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    return l < 1e-4 ? fallback : [dx / l, dy / l];
};

export interface BentLimb {
    /** the three joints: shoulder, elbow, wrist (or hip, knee, ankle) */
    joints: [V3, V3, V3];
    /** radius at each joint, before the profile */
    radii: [number, number, number];
    profiles: [Profile, Profile];
    /** the two fills: the whole limb under the first role, then the second bone over it in the second role */
    keys: [string, string];
    groups: [PartGroup, PartGroup];
    roles: [Material, Material];
    /** the contour part's key and the material its colour comes from */
    contour: string;
    bias?: number;
    /** 0..1: how much muscle the body has; a thin inner line on the shadow side shows it (0 = none) */
    muscle?: number;
    /** the first bone's cloth ends at the bend (shorts to the knee): its hem is drawn on the colour edge */
    hemAtBend?: boolean;
    /** a bare thigh under a partial cloth tube (swim trunks, hot pants): a knee seen from the front is in front of it */
    kneeOverCloth?: boolean;
}

/**
 * One limb that bends: the shape follows the bent centre line, so the elbow or knee is a smooth bend. The fills carry
 * no outline; one contour runs down both sides and round the end (open at the shoulder or hip, where the torso joins).
 */
export function addBentLimb(ctx: Ctx, o: BentLimb) {
    const k = ctx.pack.proportion.limb ?? 1;
    const S = o.joints.map((j) => toScreen(ctx, j));
    const [A, B, C] = S.map((s): P2 => [s[0], s[1]]);
    const u1 = unit(A, B, [0, 1]);
    const u2 = unit(B, C, u1);
    const n1: P2 = [-u1[1], u1[0]];
    const n2: P2 = [-u2[1], u2[0]];
    // the miter at the bend, kept from spiking when the limb folds sharply
    const sum: P2 = [n1[0] + n2[0], n1[1] + n2[1]];
    const sl = Math.hypot(sum[0], sum[1]) || 1;
    const nj: P2 = [sum[0] / sl, sum[1] / sl];
    const miter = 1 / Math.max(0.6, dot(nj, n1));
    const [rA, rB, rC] = o.radii.map((r) => r * k);
    const rJ = rB * at(o.profiles[0], 1);
    const r1 = (t: number) => lerp(rA, rB, t) * at(o.profiles[0], t);
    const r2 = (t: number) => lerp(rJ, rC, t) * (at(o.profiles[1], t) / at(o.profiles[1], 0));
    // A sharp fold (an elbow or knee bent past about 100 degrees on screen) or a bone pointing at the camera breaks the
    // single offset shape: the short bone shrinks to a sliver and the bend leaves notches (a boxing guard read as a
    // flat V). Then the limb is two round capsules, each its own fill, with one outline drawn behind both.
    const len1 = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const len2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
    if (dot(u1, u2) < -0.17 || len1 < rA * 1.2 || len2 < rC * 1.2)
        return addCapsuleLimb(ctx, o, S, [r1(0), rJ, r2(1)]);
    const steps = 9;
    const pt = (p: P2, q: P2, t: number): P2 => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
    const off = (p: P2, n: P2, r: number, s: 1 | -1): P2 => [
        p[0] + n[0] * r * s,
        p[1] + n[1] * r * s,
    ];
    const L1: P2[] = [];
    const R1: P2[] = [];
    const L2: P2[] = [];
    const R2: P2[] = [];
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        L1.push(off(pt(A, B, t), n1, r1(t), 1));
        R1.push(off(pt(A, B, t), n1, r1(t), -1));
    }
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        L2.push(off(pt(B, C, t), n2, r2(t), 1));
        R2.push(off(pt(B, C, t), n2, r2(t), -1));
    }
    const Lj: P2 = [B[0] + nj[0] * rJ * miter, B[1] + nj[1] * rJ * miter];
    const Rj: P2 = [B[0] - nj[0] * rJ * miter, B[1] - nj[1] * rJ * miter];
    const cap = (c: P2, n: P2, u: P2, r: number, sign: 1 | -1): P2[] =>
        [1, 2, 3].map((i) => {
            const phi = (Math.PI * i) / 4;
            return [
                c[0] + n[0] * r * Math.cos(phi) * sign + u[0] * r * Math.sin(phi),
                c[1] + n[1] * r * Math.cos(phi) * sign + u[1] * r * Math.sin(phi),
            ];
        });
    const startCap = cap(A, n1, [-u1[0], -u1[1]], r1(0), -1);
    const endCap = cap(C, n2, u2, r2(1), 1);

    const whole = [
        ...L1,
        Lj,
        ...L2,
        ...endCap,
        ...[...R2].reverse(),
        Rj,
        ...[...R1].reverse(),
        ...startCap,
    ];
    const lower = [Lj, ...L2, ...endCap, ...[...R2].reverse(), Rj];
    // shading is cut from convex pieces (one per bone), so a bend never makes it leave the shape
    const lowerPoly = hull(lower);
    const bone1 = hull([...L1, Lj, Rj, ...R1, ...startCap]);
    const bias = o.bias ?? 0;
    const size = (rA + rC) * 1.2;
    const z1 = (S[0][2] + S[1][2]) / 2 + bias;
    const z2 = (S[1][2] + S[2][2]) / 2 + bias;
    addSurface(
        ctx,
        o.keys[0],
        o.groups[0],
        o.roles[0],
        smoothPoly(whole),
        smoothClosed(whole),
        z1,
        size,
        false,
        [bone1, lowerPoly],
    );
    addSurface(
        ctx,
        o.keys[1],
        o.groups[1],
        o.roles[1],
        smoothPoly(lower),
        smoothClosed(lower),
        // painted over the whole-limb fill above (in the upper bone's colour), even when the upper bone is nearer:
        // otherwise shorts or a short sleeve coloured the whole limb
        Math.max(z1, z2) + 0.001,
        size,
        false,
        [lowerPoly],
    );
    // The contour, open at the top: in two pieces, each at its own bone's depth, so a limb half behind the torso does
    // not draw the hidden half's outline over the chest. The upper piece runs down both sides of the upper bone to the
    // bend; the lower one from the bend round the hand or foot and back.
    addContour(
        ctx,
        o.contour,
        o.groups[0],
        o.roles[0],
        [
            { pts: [...L1, Lj], taper: [true, false] },
            { pts: [Rj, ...[...R1].reverse()], taper: [false, true] },
        ],
        z1 + 0.002,
    );
    // in the lower bone's own ink: bare shins under shorts were outlined in the cloth's grey
    addContour(
        ctx,
        `${o.contour}-lo`,
        o.groups[1],
        o.roles[1],
        [{ pts: [Lj, ...L2, ...endCap, ...[...R2].reverse(), Rj], taper: [false, false] }],
        Math.max(z1, z2) + 0.002,
    );
    // cloth that ends at the bend (shorts to the knee, a sleeve to the elbow): its hem lies on the edge where the colour
    // changes, curving a little toward the hand or foot like the front of a ring (a hem a little above the joint left a
    // band of cloth below it, wider than the limb)
    if (o.hemAtBend && o.roles[0] !== o.roles[1] && o.roles[1] === 'skin') {
        const ul = Math.hypot(u1[0] + u2[0], u1[1] + u2[1]) || 1;
        const M: P2 = [
            B[0] + ((u1[0] + u2[0]) / ul) * rJ * 0.45,
            B[1] + ((u1[1] + u2[1]) / ul) * rJ * 0.45,
        ];
        const hem = Array.from({ length: 9 }, (_, i): P2 => {
            const s = i / 8;
            const a = (1 - s) * (1 - s);
            const b = 2 * s * (1 - s);
            const c = s * s;
            return [a * Lj[0] + b * M[0] + c * Rj[0], a * Lj[1] + b * M[1] + c * Rj[1]];
        });
        inkLine(
            ctx,
            `${o.contour}-hem`,
            o.groups[0],
            o.roles[0],
            [{ pts: hem, taper: [false, false] }],
            Math.max(z1, z2) + 0.003,
            0.8,
        );
    }
    limbFolds(ctx, o, B, u1, u2, rJ, Math.max(z1, z2) + 0.003);
    // a thigh coming toward the viewer under a partial cloth tube (hot pants in a kneel): the bare knee is nearer than
    // the tube's leg opening, which covered it
    // (only when it truly points at the viewer: on screen under 0.6 of its length; a knee a little forward in a
    // standing pose got a disc of skin in the middle of the leg)
    if (
        o.kneeOverCloth &&
        o.groups[0].startsWith('upperLeg') &&
        S[1][2] > S[0][2] &&
        len1 < 0.6 * Math.hypot(...o.joints[1].map((v, i) => v - o.joints[0][i]))
    )
        addBareKnee(ctx, o, B, u2, rJ, Math.max(z1, z2) + 0.05);
    if ((o.muscle ?? 0) > 0.2) {
        // inner lines: the swell of the upper arm or thigh and of the forearm or calf, on the side away from the light
        const side = (n: P2): 1 | -1 => (dot(n, ctx.light) > 0 ? -1 : 1);
        const line = (
            key: string,
            p: P2,
            q: P2,
            n: P2,
            rf: (t: number) => number,
            t0: number,
            t1: number,
            bone: 0 | 1,
            depth: number,
        ) => {
            // each line belongs to its own bone: just over that bone's fill, under any sleeve or trouser leg on it
            const ink = ctx.outline(ctx.fill[o.roles[bone]]);
            const s = side(n);
            const pts = Array.from({ length: 6 }, (_, i): P2 => {
                const t = t0 + ((t1 - t0) * i) / 5;
                return off(pt(p, q, t), n, rf(t) * 0.5, s);
            });
            if (ink)
                ctx.parts.push({
                    key,
                    group: o.groups[bone],
                    role: 'line',
                    d: smoothOpen(pts),
                    fill: 'none',
                    stroke: ink,
                    strokeWidth: ctx.line * 0.45,
                    depth,
                });
        };
        line(`${o.contour}-m1`, A, B, n1, r1, 0.2, 0.62, 0, z1 + 0.003);
        line(`${o.contour}-m2`, B, C, n2, r2, 0.12, 0.55, 1, Math.max(z1, z2) + 0.003);
    }
}
