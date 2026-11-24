import { darken } from './styles';
import type { Skeleton } from '../rig/skeleton';
import type { Character } from '../schema/types';
import type { BottomDef } from '../data/garments';
import { addShell, ellipsoid, on, toScreen, type Ctx } from './parts';
import { curve3, type P2 } from './shapes';

/**
 * Hands in pockets (docs/CHARACTER_STUDIO.md manga phase A): a pose tagged `hands-in-pockets` hides the hands.
 * Each wrist gets a patch of trouser cloth where the hand is, with a slanted pocket opening, so the forearm goes into
 * the pocket instead of ending in the air. Both bodies do this (the classic wrists also end at the hip:
 * classicBody.test.ts); before, the classic body drew its hands through the trousers.
 */
export const pocketHands = (c: Character) => c.rig.pose.tags.includes('hands-in-pockets');

export function addPocketCovers(ctx: Ctx, skel: Skeleton, c: Character, bot: BottomDef) {
    if (!pocketHands(c)) return;
    const z = skel.size;
    const hy = skel.offset.hipL[1];
    // a skirt has no pocket at the side: the cloth is the top's hem instead
    const role = bot.skirt > 0 ? 'top' : 'bottom';
    for (const s of ['L', 'R'] as const) {
        const hand = `hand${s}` as const;
        const lower = `lowerArm${s}` as const;
        const ref = ctx.parts.find((x) => x.key === lower)?.depth ?? 0;
        const r = z.hand;
        addShell(
            ctx,
            `${hand}-pocket`,
            hand,
            role,
            ellipsoid(
                ctx,
                hand,
                [0, -skel.hand * 0.1, 0],
                [r * 1.9, skel.hand * 0.75, r * 2],
                () => true,
                6,
                10,
            ),
            ref + 0.06,
        );
        // the pocket opening: a slanted line at the hip
        const sx = s === 'L' ? 1 : -1;
        const p = (x: number, y: number, zz: number): P2 => {
            const v = toScreen(ctx, on(ctx, 'pelvis', [sx * x, y, zz]));
            return [v[0], v[1]];
        };
        ctx.parts.push({
            key: `${hand}-pocket-slit`,
            group: hand,
            role: 'line',
            d: curve3(
                p(z.hipW * 0.3, hy * 0.05, z.hipDepth * 0.46),
                p(z.hipW * 0.46, hy * 0.3, z.hipDepth * 0.5),
                p(z.hipW * 0.58, hy * 0.55, z.hipDepth * 0.3),
            ),
            fill: 'none',
            stroke: darken(ctx.fill[role], 0.6),
            strokeWidth: ctx.line * 0.8,
            depth: ref + 0.2,
        });
    }
}
