import { SHOE_DEFS } from '../data/wardrobe';
import { heelOf } from '../rig/grounding';
import type { V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { ShoeKind } from '../schema/types';
import { cover } from './garments';
import { addShell, on, ring, toScreen, type Ctx } from './parts';
import { curve3, polyline, type P2 } from './shapes';

/**
 * Shoes (docs/CHARACTER_STUDIO.md phase 3) from `data/wardrobe.ts`: a closed shoe (sneakers, loafers, heels: the toe
 * rounded or pointed), one that climbs the shin (ankle boots, boots, rain boots), or an open one where the foot
 * shows (a sole and straps for sandals and flip-flops; bare feet).
 */
export function addShoe(ctx: Ctx, skel: Skeleton, s: 'L' | 'R', kind: ShoeKind) {
    const def = SHOE_DEFS[kind];
    const z = skel.size;
    const foot = `foot${s}` as const;
    const shin = `lowerLeg${s}` as const;
    const k = def.scale;
    const toe = def.pointed ? 1.2 : 1;
    const narrow = def.pointed ? 0.72 : 1;
    const at = (x: number, y: number, f: number): V3 => on(ctx, foot, [x, y, f]);
    const low = -skel.ankle * 0.95;

    if (def.open) {
        // the foot itself (skin), then a sole and straps
        addShell(ctx, foot, foot, 'skin', footPoints(ctx, skel, foot, k, 1, 1));
        if (def.open === 'bare') return;
        const f = skel.foot;
        const sole = (y: number) => [
            heelOf(skel, ctx.posed, s),
            at(-z.foot * k, y, -f * 0.18),
            at(z.foot * k, y, -f * 0.18),
            at(-z.foot * k, y, f * 0.58),
            at(z.foot * k, y, f * 0.58),
            at(0, y, f * 0.76),
        ];
        const thick = skel.ankle * 0.22;
        addShell(ctx, `${foot}-sole`, foot, 'shoes', [...sole(low), ...sole(low + thick)]);
        const xy = (v: V3): P2 => {
            const p = toScreen(ctx, v);
            return [p[0], p[1]];
        };
        const line = (key: string, d: string) =>
            ctx.parts.push({
                key,
                group: foot,
                role: 'line',
                d,
                fill: 'none',
                stroke: ctx.fill.shoes,
                strokeWidth: ctx.line * 2.2,
                depth: ctx.parts.find((x) => x.key === `${foot}-sole`)!.depth + 0.5,
            });
        if (def.open === 'sandal') {
            line(
                `${foot}-strap`,
                curve3(
                    xy(at(-z.foot * 0.95, low + thick, f * 0.28)),
                    xy(at(0, -skel.ankle * 0.35, f * 0.3)),
                    xy(at(z.foot * 0.95, low + thick, f * 0.28)),
                ),
            );
            line(
                `${foot}-ankle`,
                curve3(
                    xy(at(-z.ankle, low + thick, -f * 0.12)),
                    xy(at(0, -skel.ankle * 0.55, -f * 0.2)),
                    xy(at(z.ankle, low + thick, -f * 0.12)),
                ),
            );
        } else {
            const v = xy(at(0, low + thick, f * 0.5));
            line(
                `${foot}-strap`,
                polyline([
                    xy(at(-z.foot * 0.9, low + thick, f * 0.2)),
                    v,
                    xy(at(z.foot * 0.9, low + thick, f * 0.2)),
                ]),
            );
        }
        return;
    }
    addShell(ctx, foot, foot, 'shoes', footPoints(ctx, skel, foot, k, toe, narrow));
    if (def.cover > 0) {
        const p = ctx.posed.pos;
        cover(
            ctx,
            `${foot}-shaft`,
            shin,
            'shoes',
            p[foot],
            z.ankle * 1.18,
            p[shin],
            z.knee * 1.04,
            def.cover,
            1,
        );
    }
}

/** The points of a shoe (or a bare foot) around the foot joint. */
function footPoints(
    ctx: Ctx,
    skel: Skeleton,
    foot: 'footL' | 'footR',
    k: number,
    toe: number,
    narrow: number,
): V3[] {
    const z = skel.size;
    const s = foot === 'footL' ? 'L' : 'R';
    return [
        ...ring(ctx, foot, 0, z.ankle * 1.05 * k, z.ankle * 1.05 * k, 8),
        heelOf(skel, ctx.posed, s),
        on(ctx, foot, [z.foot * k, -skel.ankle * 0.9, -skel.foot * 0.18]),
        on(ctx, foot, [-z.foot * k, -skel.ankle * 0.9, -skel.foot * 0.18]),
        on(ctx, foot, [z.foot * 1.05 * k * narrow, -skel.ankle * 0.95, skel.foot * 0.58 * toe]),
        on(ctx, foot, [-z.foot * 1.05 * k * narrow, -skel.ankle * 0.95, skel.foot * 0.58 * toe]),
        on(ctx, foot, [0, -skel.ankle * 0.75, skel.foot * 0.74 * toe]),
        on(ctx, foot, [0, -skel.ankle * 0.25, skel.foot * 0.55 * toe]),
    ];
}
