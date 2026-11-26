import { apply, normalize, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { HandShape, JointId } from '../schema/types';
import { project } from './camera';
import { addSurface, on, toScreen, type Ctx } from './parts';
import { mangaLook } from './mangaVariants';
import { capsulePoly, curve3, hull, smoothClosed, type P2 } from './shapes';

/**
 * The manga hand (docs/CHARACTER_STUDIO.md, reference pass phase 3). A tapered palm, four fingers of three bones (the
 * middle finger longest, the pinky shortest) and a thumb of two. Curl spreads over the three finger joints, so a fist
 * folds its fingers instead of being a box. Every piece is a skin fill without an outline, and ONE outline goes round
 * the whole hand (each piece stroked twice as wide just behind the fills: only the outer half shows), so the hand
 * reads as one form: fingers separate where there is a gap between them, and a closed hand gets a few knuckle or fold
 * lines. Hand frame: fingers point -y, the thumb side is +z, the palm faces -x (left hand) or +x (right hand).
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
    relaxed: { curl: [0.22, 0.3, 0.38, 0.46], splay: 5, thumb: 'tuck' },
    fist: { curl: all(1), splay: 0, thumb: 'across' },
    open: { curl: all(0), splay: 10, thumb: 'out' },
    point: { curl: [0, 1, 1, 1], splay: 0, thumb: 'across' },
    peace: { curl: [0, 0, 1, 1], splay: 20, thumb: 'across' },
    grip: { curl: all(0.85), splay: 0, thumb: 'across' },
    pinch: { curl: [0.55, 0.3, 0.3, 0.35], splay: 6, thumb: 'pinch' },
    ok: { curl: [0.62, 0.05, 0.08, 0.1], splay: 16, thumb: 'pinch' },
    thumbsUp: { curl: all(1), splay: 0, thumb: 'up' },
    wave: { curl: all(0.03), splay: 24, thumb: 'out' },
    claw: { curl: all(0.5), splay: 16, thumb: 'out' },
    holdBat: { curl: all(0.85), splay: 0, thumb: 'across' },
    holdSword: { curl: all(0.85), splay: 0, thumb: 'across' },
    holdPhone: { curl: [0.65, 0.65, 0.7, 0.7], splay: 2, thumb: 'out' },
    holdCup: { curl: all(0.55), splay: 4, thumb: 'out' },
};

const RAD = Math.PI / 180;
/** finger length (share of the hand length), knuckle position across the palm (share of its half width) */
const FINGERS = [
    { len: 0.44, z: 0.7, w: 0.21 },
    { len: 0.48, z: 0.23, w: 0.22 },
    { len: 0.45, z: -0.23, w: 0.21 },
    { len: 0.36, z: -0.68, w: 0.18 },
];
/** the three bones of a finger (shares of its length) and how far each joint bends at full curl (degrees) */
const BONES = [0.45, 0.32, 0.23];
const BEND = [80, 100, 70];
const TAPER = [1, 0.9, 0.8, 0.68];

interface Piece {
    key: string;
    poly: P2[];
    depth: number;
    /** the smoothed outline, built once for the fill and the hand's outline */
    d?: string;
}

export function addMangaHand(ctx: Ctx, skel: Skeleton, s: 'L' | 'R', shape: HandShape) {
    const hand = `hand${s}` as JointId;
    const group = hand as 'handL' | 'handR';
    const look = mangaLook().hand;
    const base = SPECS[shape];
    // a relaxed hand curls less, so its fingers read; the drawn hand is scaled round the wrist pivot
    const spec: Spec =
        shape === 'relaxed'
            ? { ...base, curl: base.curl.map((c) => c * look.relax) as Spec['curl'] }
            : base;
    const L = skel.hand * look.scale;
    // sized from the hand's length: the palm about 0.85 as wide as it is long (an old limb radius made it wider than
    // long, a mitten with stubby fingers)
    const r = L * 0.215;
    const nx = s === 'L' ? -1 : 1;
    const at = (p: V3) => on(ctx, hand, p);
    const screen = (p: V3): [P2, number] => {
        const q = toScreen(ctx, at(p));
        return [[q[0], q[1]], q[2]];
    };
    const pieces: Piece[] = [];
    const closed = spec.curl.reduce((a, b) => a + b, 0) / 4 >= 0.7;
    const palmFacing = project(ctx.view, apply(ctx.posed.rot[hand], normalize([nx, 0, 0])))[2];

    // the palm: narrower at the wrist, thinner than wide, the knuckle row at half the hand's length
    const t = r * 0.34;
    const palm: V3[] = [];
    for (const [y, wz] of [
        [0, 0.78],
        [-L * 0.25, 0.92],
        [-L * 0.5, 1],
    ] as const)
        for (const z of [-1, 1])
            for (const x of [-1, 1]) palm.push([x * t * (y === 0 ? 0.85 : 1), y, z * wz * r]);
    const palmScreen = palm.map(screen);
    const palmPoly = hull(palmScreen.map(([p]) => p));
    const palmDepth = palmScreen.reduce((a, [, z]) => a + z, 0) / palmScreen.length;
    pieces.push({ key: `${hand}-palm`, poly: palmPoly, depth: palmDepth });

    // a bone of `len` from `from`, along a direction that turns toward the palm by `turn` and fans by `fan`
    const dir = (turn: number, fan: number): V3 => {
        const c = Math.cos(turn);
        return [nx * Math.sin(turn), -Math.cos(fan) * c, Math.sin(fan) * c];
    };
    const add = (key: string, a: V3, b: V3, ra: number, rb: number) => {
        const [A, za] = screen(a);
        const [B, zb] = screen(b);
        pieces.push({ key, poly: capsulePoly(A, ra, B, rb, 8), depth: (za + zb) / 2 });
    };
    const tips: V3[] = [];
    FINGERS.forEach((f, i) => {
        const fan = (1.5 - i) * spec.splay * 0.5 * RAD;
        let p: V3 = [0, -L * 0.48, f.z * r];
        let turn = 0;
        BONES.forEach((share, k) => {
            turn += spec.curl[i] * BEND[k] * RAD;
            const d = dir(turn, fan);
            const len = L * f.len * share;
            const q: V3 = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
            const w = r * f.w * look.finger;
            add(`${hand}-f${i}${'abc'[k]}`, p, q, w * TAPER[k], w * TAPER[k + 1]);
            p = q;
        });
        tips.push(p);
    });

    // the thumb: from the heel of the palm on the thumb side
    const tb: V3 = [nx * t * 0.3, -L * 0.1, r * 0.82];
    const thumb = (d1: V3, d2: V3, l1 = 0.24, l2 = 0.2) => {
        const m: V3 = [tb[0] + d1[0] * L * l1, tb[1] + d1[1] * L * l1, tb[2] + d1[2] * L * l1];
        const e: V3 = [m[0] + d2[0] * L * l2, m[1] + d2[1] * L * l2, m[2] + d2[2] * L * l2];
        add(`${hand}-t0`, tb, m, r * 0.3, r * 0.26);
        add(`${hand}-t1`, m, e, r * 0.26, r * 0.2);
    };
    const unit = (v: V3): V3 => normalize(v) as V3;
    switch (spec.thumb) {
        case 'out':
            thumb(unit([0, -0.55, 0.85]), unit([0, -0.75, 0.65]));
            break;
        case 'across':
            // over the folded fingers, toward the pinky side
            thumb(unit([nx * 0.85, -0.25, 0.1]), unit([nx * 0.3, -0.3, -1]), 0.18, 0.32);
            break;
        case 'up':
            thumb(unit([0, 0.05, 1]), unit([0, 0.5, 0.85]), 0.24, 0.24);
            break;
        case 'tuck':
            thumb(unit([nx * 0.35, -0.8, 0.35]), unit([nx * 0.45, -0.85, 0.1]));
            break;
        case 'pinch': {
            const v = unit([tips[0][0] - tb[0], tips[0][1] - tb[1], tips[0][2] - tb[2]]);
            thumb(v, v, 0.24, 0.22);
            break;
        }
    }

    // the fills: skin, no outline, each at its own depth
    const size = r * 2;
    // shading only on the palm: on a finger it is too small to see, and it is most of a hand's cost
    for (const p of pieces) p.d = smoothClosed(p.poly);
    for (const p of pieces)
        addSurface(
            ctx,
            p.key,
            group,
            'skin',
            p.poly,
            p.d!,
            p.depth,
            size,
            false,
            p.key.endsWith('-palm') ? [p.poly] : [],
        );
    const back = Math.min(...pieces.map((p) => p.depth)) - 0.001;
    const ink = ctx.outline(ctx.fill.skin);
    if (!ink) return;
    // ONE outline: every piece stroked twice as wide, just behind all the fills
    ctx.parts.push({
        key: `${hand}-outline`,
        group,
        role: 'line',
        d: pieces.map((p) => p.d).join(''),
        fill: 'none',
        stroke: ink,
        strokeWidth: 2 * ctx.line * 0.85,
        depth: back,
    });

    // a closed hand: knuckles on the back, the folded finger edges on the palm side
    if (!closed) return;
    const front = Math.max(...pieces.map((p) => p.depth)) + 0.01;
    const line = (key: string, a: V3, b: V3, c: V3) =>
        ctx.parts.push({
            key: `${hand}-${key}`,
            group,
            role: 'line',
            d: curve3(screen(a)[0], screen(c)[0], screen(b)[0]),
            fill: 'none',
            stroke: ink,
            strokeWidth: ctx.line * 0.5,
            depth: front,
        });
    if (palmFacing < -0.15)
        for (const z of [0.46, 0, -0.46])
            line(
                `k${z}`,
                [-nx * t * 1.05, -L * 0.52, (z + 0.14) * r],
                [-nx * t * 1.05, -L * 0.52, (z - 0.14) * r],
                [-nx * t * 1.3, -L * 0.55, z * r],
            );
    else if (palmFacing > 0.15)
        for (const z of [0.46, 0, -0.46])
            line(
                `fold${z}`,
                [nx * t * 1.6, -L * 0.42, z * r],
                [nx * t * 1.6, -L * 0.6, z * r],
                [nx * t * 1.75, -L * 0.51, z * r],
            );
}
