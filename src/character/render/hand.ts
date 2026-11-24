import type { V3 } from '../rig/math';
import { apply, normalize } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { HandShape, JointId } from '../schema/types';
import { project } from './camera';
import { addLimb, addShell, on, toScreen, type Ctx } from './parts';
import { curve3, type P2 } from './shapes';
import { darken } from './styles';

/**
 * The hand (docs/CHARACTER_STUDIO.md phase 3): a palm, four fingers and a thumb, bent by the hand shape. A closed
 * hand (fist, grip, thumbs up) is one rounded block with the fingers folded into it, a thumb across them and knuckle
 * or finger lines on the side that shows; an open hand is a flat palm with separate fingers that fan out and curl.
 * Hand frame: fingers point -y, the thumb side is +z, the palm faces inward (n = -x for the left hand, +x for the right).
 */
interface Spec {
    /** curl of index, middle, ring, pinky: 0 straight … 1 folded into the palm */
    curl: [number, number, number, number];
    /** fan between the fingers, degrees */
    splay: number;
    thumb: 'out' | 'across' | 'up' | 'tuck' | 'pinch';
}
const all = (c: number): Spec['curl'] => [c, c, c, c];
const SPECS: Record<HandShape, Spec> = {
    relaxed: { curl: [0.25, 0.32, 0.4, 0.48], splay: 5, thumb: 'tuck' },
    fist: { curl: all(1), splay: 0, thumb: 'across' },
    open: { curl: all(0), splay: 9, thumb: 'out' },
    point: { curl: [0, 1, 1, 1], splay: 0, thumb: 'across' },
    peace: { curl: [0, 0, 1, 1], splay: 18, thumb: 'across' },
    grip: { curl: all(0.9), splay: 0, thumb: 'across' },
    pinch: { curl: [0.55, 0.3, 0.3, 0.35], splay: 6, thumb: 'pinch' },
    ok: { curl: [0.6, 0.05, 0.05, 0.05], splay: 14, thumb: 'pinch' },
    thumbsUp: { curl: all(1), splay: 0, thumb: 'up' },
    wave: { curl: all(0.03), splay: 22, thumb: 'out' },
    claw: { curl: all(0.5), splay: 16, thumb: 'out' },
    holdBat: { curl: all(0.9), splay: 0, thumb: 'across' },
    holdSword: { curl: all(0.9), splay: 0, thumb: 'across' },
    holdPhone: { curl: [0.7, 0.7, 0.7, 0.7], splay: 2, thumb: 'out' },
    holdCup: { curl: all(0.55), splay: 4, thumb: 'out' },
};

const RAD = Math.PI / 180;

/** Hands that read best as one soft mitten with finger lines (the manga body): the relaxed and open ones. */
const MITTEN: HandShape[] = [];

export function addHand(ctx: Ctx, skel: Skeleton, s: 'L' | 'R', shape: HandShape, manga = false) {
    const hand = `hand${s}` as JointId;
    const group = hand as 'handL' | 'handR';
    const spec = SPECS[shape];
    const L = skel.hand;
    const r = skel.size.hand;
    const nx = s === 'L' ? -1 : 1;
    const n: V3 = [nx, 0, 0];
    const at = (p: V3) => on(ctx, hand, p);
    const closed = spec.curl.reduce((a, b) => a + b, 0) / 4 >= 0.7;

    // which side of the hand the camera sees: the palm (n faces it) or the back
    const palmFacing = project(ctx.view, apply(ctx.posed.rot[hand], normalize(n)))[2];

    if (closed) {
        // one block: the wrist, the knuckle row, and the fingertips folded against the palm
        const t = r * 0.62;
        const pts: V3[] = [];
        for (const z of [-0.85, 0.85])
            for (const side of [-1, 1]) pts.push(at([nx * side * t * 0.8, 0, z * r]));
        for (const z of [-1.05, -0.35, 0.35, 1.05])
            for (const side of [-1, 1]) pts.push(at([nx * side * t, -L * 0.5, z * r]));
        for (const z of [-1, -0.33, 0.33, 1]) pts.push(at([nx * t * 1.5, -L * 0.36, z * r * 0.95]));
        addShell(ctx, `${hand}-fist`, group, 'skin', pts);
        const ink = darken(ctx.fill.skin, 0.7);
        const line = (key: string, a: V3, b: V3, c?: V3) => {
            const pa = toScreen(ctx, a);
            const pb = toScreen(ctx, b);
            const pc = c ? toScreen(ctx, c) : null;
            const A: P2 = [pa[0], pa[1]];
            const B: P2 = [pb[0], pb[1]];
            ctx.parts.push({
                key: `${hand}-${key}`,
                group,
                role: 'line',
                d: pc ? curve3(A, [pc[0], pc[1]], B) : `M${A[0]} ${A[1]}L${B[0]} ${B[1]}`,
                fill: 'none',
                stroke: ink,
                strokeWidth: ctx.line * 0.55,
                depth: ctx.parts[ctx.parts.length - 1].depth + 0.05,
            });
        };
        if (palmFacing > 0.15) {
            // folded finger edges on the palm side
            for (const z of [-0.66, 0, 0.66])
                line(
                    `fold${z}`,
                    at([nx * t * 1.5, -L * 0.5, z * r]),
                    at([nx * t * 1.5, -L * 0.3, z * r]),
                );
        } else if (palmFacing < -0.15) {
            // knuckles on the back of the hand
            for (const z of [-0.7, -0.23, 0.23, 0.7])
                line(
                    `k${z}`,
                    at([-nx * t * 1.05, -L * 0.5, (z - 0.12) * r]),
                    at([-nx * t * 1.05, -L * 0.5, (z + 0.12) * r]),
                    at([-nx * t * 1.25, -L * 0.5, z * r]),
                );
        }
    } else {
        // an open hand: a flat palm, then the fingers
        const t = r * 0.38;
        const pts: V3[] = [];
        for (const z of [-0.85, 0.85])
            for (const side of [-1, 1]) pts.push(at([side * t * 0.9, 0, z * r]));
        for (const z of [-1, -0.33, 0.33, 1])
            for (const side of [-1, 1]) pts.push(at([side * t, -L * 0.5, z * r]));
        addShell(ctx, `${hand}-palm`, group, 'skin', pts);
    }

    // fingers: two bones each, turning toward the palm as they curl and fanning out with the splay
    const knuckleZ = [0.72, 0.24, -0.24, -0.72];
    const lens: [number, number][] = [
        [0.24, 0.2],
        [0.27, 0.22],
        [0.25, 0.2],
        [0.2, 0.16],
    ];
    const mid = 1.5;
    const tips: V3[] = [];
    const mitten = manga && !closed && MITTEN.includes(shape);
    const mittenPts: V3[] = [];
    const mittenLocal: V3[] = [];
    spec.curl.forEach((curl, i) => {
        const base: V3 = [0, -L * 0.5, knuckleZ[i] * r];
        const fan = (i - mid) * -spec.splay * 0.5 * RAD;
        const bone = (turn: number): V3 => {
            const dz = Math.sin(fan);
            const dy = -Math.cos(fan);
            const c = Math.cos(turn);
            const sn = Math.sin(turn);
            return [n[0] * sn, dy * c, dz * c];
        };
        const [l1, l2] = lens[i];
        const turn1 = curl * 88 * RAD;
        const turn2 = turn1 + curl * 92 * RAD;
        const d1 = bone(turn1);
        const d2 = bone(turn2);
        const p0 = at(base);
        const p1 = at([
            base[0] + d1[0] * L * l1,
            base[1] + d1[1] * L * l1,
            base[2] + d1[2] * L * l1,
        ]);
        const p2 = at([
            base[0] + d1[0] * L * l1 + d2[0] * L * l2,
            base[1] + d1[1] * L * l1 + d2[1] * L * l2,
            base[2] + d1[2] * L * l1 + d2[2] * L * l2,
        ]);
        tips.push([
            base[0] + d1[0] * L * l1 + d2[0] * L * l2,
            base[1] + d1[1] * L * l1 + d2[1] * L * l2,
            base[2] + d1[2] * L * l1 + d2[2] * L * l2,
        ]);
        // in a closed hand the folded fingers are inside the block; a finger that is out (pointing) is drawn
        if (closed && curl >= 0.6) return;
        // the manga hand has slimmer fingers
        const w = r * (i === 3 ? 0.2 : 0.23) * (manga ? 0.82 : 1);
        if (mitten) {
            // one mitten: each finger adds its widest points, drawn together below
            const tip = tips[tips.length - 1];
            const knuckle: V3 = [base[0], base[1] + L * 0.04, base[2]];
            for (const k of [-1, 1] as const) {
                mittenLocal.push(
                    [tip[0], tip[1], tip[2] + k * w * 0.85],
                    [knuckle[0], knuckle[1], knuckle[2] + k * w * 1.1],
                );
            }
            return;
        }
        addLimb(ctx, `${hand}-f${i}a`, group, 'skin', p0, w, p1, w * 0.92, 0.02);
        addLimb(ctx, `${hand}-f${i}b`, group, 'skin', p1, w * 0.92, p2, w * 0.8, 0.03);
    });

    if (mitten) {
        for (const q of mittenLocal) mittenPts.push(at(q));
        const palm = ctx.parts.find((x) => x.key === `${hand}-palm`);
        addShell(ctx, `${hand}-mitten`, group, 'skin', mittenPts, (palm?.depth ?? 0) + 0.02);
        // slight finger separation: a short line between each pair of fingers
        const ink = darken(ctx.fill.skin, 0.7);
        // only when the palm or the back faces the camera (edge-on, the lines would stick out)
        for (let i = 0; i < (Math.abs(palmFacing) > 0.5 ? 3 : 0); i++) {
            const z = ((knuckleZ[i] + knuckleZ[i + 1]) / 2) * r;
            const a = toScreen(ctx, at([0, -L * 0.62, z]));
            const b = toScreen(ctx, at([0, -L * 0.84, z]));
            ctx.parts.push({
                key: `${hand}-sep${i}`,
                group,
                role: 'line',
                d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`,
                fill: 'none',
                stroke: ink,
                strokeWidth: ctx.line * 0.5,
                depth: (palm?.depth ?? 0) + 0.1,
            });
        }
    }

    // thumb
    const tb: V3 = [0, -L * 0.14, r * 0.92];
    const thumb = (d1: V3, d2: V3, l1 = 0.26, l2 = 0.22, bias = 0.04) => {
        const a = at(tb);
        const m: V3 = [tb[0] + d1[0] * L * l1, tb[1] + d1[1] * L * l1, tb[2] + d1[2] * L * l1];
        const e: V3 = [m[0] + d2[0] * L * l2, m[1] + d2[1] * L * l2, m[2] + d2[2] * L * l2];
        addLimb(ctx, `${hand}-t0`, group, 'skin', a, r * 0.3, at(m), r * 0.27, bias);
        addLimb(ctx, `${hand}-t1`, group, 'skin', at(m), r * 0.27, at(e), r * 0.23, bias + 0.01);
    };
    const unit = (v: V3): V3 => normalize(v) as V3;
    switch (spec.thumb) {
        case 'out':
            thumb(unit([0, -0.5, 0.9]), unit([0, -0.7, 0.7]));
            break;
        case 'across':
            // over the folded fingers, toward the pinky side
            thumb(unit([nx * 0.8, -0.2, 0.1]), unit([nx * 0.3, -0.25, -1]), 0.18, 0.36, 0.12);
            break;
        case 'up':
            thumb(unit([0, -0.2, 0.95]), unit([0, -0.35, 0.95]), 0.26, 0.26, 0.08);
            break;
        case 'tuck':
            thumb(unit([nx * 0.35, -0.8, 0.35]), unit([nx * 0.45, -0.85, 0.1]));
            break;
        case 'pinch': {
            // toward the index fingertip
            const tip = tips[0];
            const v: V3 = [tip[0] - tb[0], tip[1] - tb[1], tip[2] - tb[2]];
            const d = unit(v);
            thumb(d, d, 0.24, 0.2);
            break;
        }
    }
}
