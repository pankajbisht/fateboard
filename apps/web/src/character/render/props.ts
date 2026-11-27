import { PROP_DEFS, heldIn } from '../data/props';
import { dist, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { Character, HandShape } from '../schema/types';
import { useColor } from './accPaint';
import { addLimb, on, type Ctx } from './parts';

/**
 * Held objects (docs/CHARACTER_STUDIO.md phase 3): drawn as capsules on the hand joint, so they follow the arm in
 * every pose and from every side. Colours go through `useColor` (style palette, manga tone, scene grade).
 */
const SIDES = ['L', 'R'] as const;

/** The hand shape while holding something: a grip (a fist for gloves). */
export function handShapeFor(c: Character, side: 'L' | 'R', shape: HandShape): HandShape {
    // a boxing glove is a closed fist whatever the pose says (open-finger MMA gloves keep the hand's shape)
    if (c.dress.accessories.some((a) => a.kind === 'boxing-gloves')) return 'fist';
    const kind = heldIn(c.dress.held, side);
    if (!kind) return shape;
    return kind === 'boxing-gloves' ? 'fist' : 'grip';
}

const along = (p: V3, q: V3, t: number): V3 => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t,
];

export function addProps(ctx: Ctx, skel: Skeleton, c: Character) {
    const H = skel.height;
    const L = skel.hand;
    const r = skel.size.hand;
    for (const h of c.dress.held) {
        if (h.kind === 'boxing-gloves') {
            for (const s of SIDES) {
                const hand = `hand${s}` as const;
                useColor(ctx, '#dc2626');
                addLimb(
                    ctx,
                    `prop-glove${s}`,
                    hand,
                    'acc',
                    on(ctx, hand, [0, -L * 0.08, 0]),
                    r * 1.45,
                    on(ctx, hand, [0, -L * 0.62, 0]),
                    r * 1.85,
                    0.4,
                );
                useColor(ctx, '#f8fafc');
                addLimb(
                    ctx,
                    `prop-glove-cuff${s}`,
                    hand,
                    'acc',
                    on(ctx, hand, [0, 0, 0]),
                    r * 1.2,
                    on(ctx, hand, [0, -L * 0.14, 0]),
                    r * 1.3,
                    0.45,
                );
            }
            continue;
        }
        if (h.kind === 'rifle') {
            const pr = on(ctx, 'handR', [0, -L * 0.3, 0]);
            const pl = on(ctx, 'handL', [0, -L * 0.3, 0]);
            const span = Math.max(dist(pr, pl), H * 0.08);
            const unit =
                dist(pr, pl) > 1e-6
                    ? along(
                          [0, 0, 0],
                          [pl[0] - pr[0], pl[1] - pr[1], pl[2] - pr[2]],
                          1 / dist(pr, pl),
                      )
                    : ([0, 0, 1] as V3);
            const at = (k: number): V3 => [
                pr[0] + unit[0] * k,
                pr[1] + unit[1] * k,
                pr[2] + unit[2] * k,
            ];
            useColor(ctx, '#78350f');
            addLimb(
                ctx,
                'prop-rifle-stock',
                'handR',
                'acc',
                at(-H * 0.16),
                H * 0.02,
                at(H * 0.03),
                H * 0.017,
                0.4,
            );
            useColor(ctx, '#3f3f46');
            addLimb(
                ctx,
                'prop-rifle-body',
                'handR',
                'acc',
                at(H * 0.03),
                H * 0.016,
                at(span + H * 0.24),
                H * 0.011,
                0.4,
            );
            addLimb(
                ctx,
                'prop-rifle-mag',
                'handR',
                'acc',
                at(H * 0.12),
                H * 0.012,
                [at(H * 0.14)[0], at(H * 0.14)[1] - H * 0.05, at(H * 0.14)[2]],
                H * 0.012,
                0.35,
            );
            continue;
        }
        const def = PROP_DEFS[h.kind];
        for (const s of h.hand === 'both' ? SIDES : [h.hand]) {
            const hand = `hand${s}` as const;
            def.parts.forEach((p, i) => {
                useColor(ctx, p.color);
                const pt = (q: V3): V3 => on(ctx, hand, [q[0] * H, -L * 0.3 + q[1] * H, q[2] * H]);
                addLimb(
                    ctx,
                    `prop-${h.kind}-${s}-${i}`,
                    hand,
                    'acc',
                    pt(p.a),
                    p.ra * H,
                    pt(p.b),
                    p.rb * H,
                    0.4,
                );
            });
        }
    }
}
