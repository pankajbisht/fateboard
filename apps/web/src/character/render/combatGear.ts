import type { V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { Character } from '../schema/types';
import { useColor } from './accPaint';
import { cover } from './garments';
import { addLimb, addShell, on, ring, type Ctx } from './parts';
import { darken, lighten } from './styles';

/**
 * Combat-sport gear worn on the body (docs/COMBAT_PACK.md, schema v9): boxing gloves, open-finger MMA gloves, hand
 * wraps, prajioud armbands, ankle wraps and the gi belt. Capsules and bands fixed to the joints, so they follow
 * every pose; colours go through `useColor` (style tints, manga tone, scene grade). Head gear (mongkol, head
 * guard) is in `accessoriesHead.ts`, the mouthguard in `accessoriesFace.ts`.
 */
const SIDES = ['L', 'R'] as const;
const lerp3 = (p: V3, q: V3, t: number): V3 => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t,
];

export function addCombatGear(ctx: Ctx, skel: Skeleton, c: Character) {
    const z = skel.size;
    const L = skel.hand;
    const r = z.hand;
    const p = ctx.posed.pos;
    const limbScale = ctx.pack.proportion.limb ?? 1;
    for (const a of c.dress.accessories) {
        switch (a.kind) {
            case 'boxing-gloves':
            case 'mma-gloves': {
                const big = a.kind === 'boxing-gloves';
                for (const s of SIDES) {
                    const hand = `hand${s}` as const;
                    useColor(ctx, a.color);
                    addLimb(
                        ctx,
                        `acc-glove${s}`,
                        hand,
                        'acc',
                        on(ctx, hand, [0, -L * (big ? 0.08 : 0.22), 0]),
                        r * (big ? 1.45 : 1.08),
                        on(ctx, hand, [0, -L * (big ? 0.62 : 0.5), 0]),
                        r * (big ? 1.85 : 1.15),
                        0.4,
                    );
                    // the cuff (laces or velcro): lighter for boxing gloves, black for MMA gloves
                    useColor(ctx, big ? lighten(a.color, 0.75) : darken(a.color, 0.4));
                    addLimb(
                        ctx,
                        `acc-glove-cuff${s}`,
                        hand,
                        'acc',
                        on(ctx, hand, [0, L * 0.05, 0]),
                        r * (big ? 1.2 : 1.05),
                        on(ctx, hand, [0, -L * 0.14, 0]),
                        r * (big ? 1.3 : 1.08),
                        0.45,
                    );
                }
                break;
            }
            case 'hand-wraps':
                useColor(ctx, a.color);
                for (const s of SIDES) {
                    const lower = `lowerArm${s}` as const;
                    const hand = `hand${s}` as const;
                    addLimb(
                        ctx,
                        `acc-wrap${s}`,
                        lower,
                        'acc',
                        lerp3(p[lower], p[hand], 0.8),
                        z.wrist * 1.18,
                        on(ctx, hand, [0, -L * 0.4, 0]),
                        r * 1.06,
                        0.06,
                    );
                }
                break;
            case 'prajioud':
                // a band round each upper arm with a short tied tail
                for (const s of SIDES) {
                    const upper = `upperArm${s}` as const;
                    const lower = `lowerArm${s}` as const;
                    const at = (k: number) => lerp3(p[upper], p[lower], k);
                    useColor(ctx, a.color);
                    addLimb(
                        ctx,
                        `acc-prajioud${s}`,
                        upper,
                        'acc',
                        at(0.3),
                        z.upperArm * 1.18,
                        at(0.42),
                        z.upperArm * 1.16,
                        0.08,
                    );
                    addLimb(
                        ctx,
                        `acc-prajioud-tail${s}`,
                        upper,
                        'acc',
                        at(0.36),
                        z.upperArm * 0.3,
                        lerp3(at(0.5), on(ctx, upper, [0, 0, z.upperArm * 1.4]), 0.5),
                        z.upperArm * 0.22,
                        0.1,
                    );
                }
                break;
            case 'ankle-wraps':
                // over bare legs only (under trousers they are hidden): ankle and the arch of the foot
                useColor(ctx, a.color);
                for (const s of SIDES) {
                    const shin = ctx.parts.find((x) => x.key === `lowerLeg${s}`);
                    if (!shin || shin.role !== 'skin') continue;
                    cover(
                        ctx,
                        `acc-ankle${s}`,
                        `lowerLeg${s}`,
                        'acc',
                        p[`foot${s}`],
                        z.ankle,
                        p[`lowerLeg${s}`],
                        z.knee,
                        0.2,
                        1.08 * limbScale,
                    );
                }
                break;
            case 'gi-belt': {
                // tied twice round the waist, the knot in front with two hanging ends
                const t = skel.offset.spine2[1] / 0.26;
                const torso = ctx.parts.find((x) => x.key === 'torso');
                const base = (torso ? torso.depth : 0) + 0.55;
                useColor(ctx, a.color);
                addShell(
                    ctx,
                    'acc-gi-belt',
                    'torso',
                    'acc',
                    [
                        ...ring(
                            ctx,
                            'spine1',
                            -t * 0.05,
                            z.waistW * 0.6,
                            z.chestDepth * 0.5,
                            12,
                            z.belly * 0.45,
                        ),
                        ...ring(
                            ctx,
                            'spine1',
                            -t * 0.13,
                            z.waistW * 0.6,
                            z.chestDepth * 0.5,
                            12,
                            z.belly * 0.45,
                        ),
                    ],
                    base,
                );
                const front = z.chestDepth * 0.52 + z.belly * 0.45;
                for (const sx of [-1, 1])
                    addLimb(
                        ctx,
                        `acc-gi-belt-end${sx < 0 ? 'R' : 'L'}`,
                        'torso',
                        'acc',
                        on(ctx, 'spine1', [sx * z.waistW * 0.05, -t * 0.1, front]),
                        z.waistW * 0.07,
                        on(ctx, 'spine1', [sx * z.waistW * 0.16, -t * 0.42, front * 1.02]),
                        z.waistW * 0.06,
                        0.9,
                    );
                break;
            }
            default:
                break;
        }
    }
}
