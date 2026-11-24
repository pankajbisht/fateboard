import type { Trim } from '../data/garments';
import { apply, normalize } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { JointId } from '../schema/types';
import { project } from './camera';
import { on, toScreen, type Ctx } from './parts';
import { curve3, ellipse, polyline, type P2 } from './shapes';
import { darken, lighten } from './styles';

type Side = 'L' | 'R';

/** Small details on the cloth: buttons, a stripe, a pocket, a border down the front, a badge. */
export function addTrim(ctx: Ctx, skel: Skeleton, trim: Trim | undefined) {
    if (!trim) return;
    const torso = ctx.parts.find((x) => x.key === 'torso');
    if (!torso) return;
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26;
    const facing = project(ctx.view, apply(ctx.posed.rot.chest, normalize([0, 0, 1])))[2];
    if (facing < 0.2) return;
    const front = z.chestDepth * 0.5 + 0.4;
    const at = (x: number, y: number): P2 => {
        const s = toScreen(ctx, on(ctx, 'chest', [x, y, front]));
        return [s[0], s[1]];
    };
    const ink = ctx.outline(ctx.fill.top) ?? darken(ctx.fill.top, 0.45);
    const depth = torso.depth + 0.6;
    const line = (key: string, d: string, stroke: string, w: number) =>
        ctx.parts.push({
            key,
            group: 'torso',
            role: 'line',
            d,
            fill: 'none',
            stroke,
            strokeWidth: w,
            depth,
        });
    if (trim === 'buttons')
        for (let i = 0; i < 4; i++) {
            const [x, y] = at(0, t * (0.1 - i * 0.14));
            ctx.parts.push({
                key: `button${i}`,
                group: 'torso',
                role: 'feature',
                d: ellipse([x, y], ctx.line * 1.1, ctx.line * 1.1),
                fill: ink,
                stroke: null,
                strokeWidth: 0,
                depth,
            });
        }
    else if (trim === 'stripe')
        line(
            'trim-stripe',
            curve3(
                at(-z.shoulderW * 0.36, t * 0.0),
                at(0, t * -0.03),
                at(z.shoulderW * 0.36, t * 0.0),
            ),
            lighten(ctx.fill.top, 0.6),
            ctx.line * 3.4,
        );
    else if (trim === 'pocket') {
        const [a, b, c, d] = [
            at(z.shoulderW * 0.1, t * 0.02),
            at(z.shoulderW * 0.27, t * 0.02),
            at(z.shoulderW * 0.27, t * -0.11),
            at(z.shoulderW * 0.1, t * -0.11),
        ];
        line('trim-pocket', polyline([a, b, c, d, a]), ink, ctx.line * 0.7);
    } else if (trim === 'border') {
        line(
            'trim-border',
            polyline([at(0, t * 0.22), at(0, t * -0.45)]),
            lighten(ctx.fill.top, 0.55),
            ctx.line * 2.4,
        );
        line(
            'trim-yoke',
            curve3(
                at(-z.shoulderW * 0.3, t * 0.12),
                at(0, t * 0.04),
                at(z.shoulderW * 0.3, t * 0.12),
            ),
            lighten(ctx.fill.top, 0.55),
            ctx.line * 1.6,
        );
    } else if (trim === 'badge') {
        const [x, y] = at(z.shoulderW * 0.18, t * 0.0);
        ctx.parts.push({
            key: 'badge',
            group: 'torso',
            role: 'feature',
            d: ellipse([x, y], ctx.line * 2.2, ctx.line * 2.2),
            fill: lighten(ctx.fill.top, 0.5),
            stroke: ink,
            strokeWidth: ctx.line * 0.6,
            depth,
        });
    }
}

/** A pocket on the front of the thigh (cargo pants). */
export function addLegPocket(ctx: Ctx, skel: Skeleton, s: Side) {
    const z = skel.size;
    const thigh = `upperLeg${s}` as JointId;
    const facing = project(ctx.view, apply(ctx.posed.rot[thigh], normalize([0, 0, 1])))[2];
    if (facing < 0.25) return;
    const at = (x: number, y: number): P2 => {
        const p = toScreen(ctx, on(ctx, thigh, [x, y, z.thigh * 0.9]));
        return [p[0], p[1]];
    };
    const w = z.thigh * 0.45;
    const [a, b, c, d] = [
        at(-w, -skel.thigh * 0.22),
        at(w, -skel.thigh * 0.22),
        at(w, -skel.thigh * 0.5),
        at(-w, -skel.thigh * 0.5),
    ];
    const stroke = ctx.outline(ctx.fill.bottom);
    if (!stroke) return;
    ctx.parts.push({
        key: `pocket${s}`,
        group: `upperLeg${s}` as 'upperLegL',
        role: 'line',
        d: polyline([a, b, c, d, a]),
        fill: 'none',
        stroke,
        strokeWidth: ctx.line * 0.7,
        depth: ctx.parts.find((p) => p.key === `upperLeg${s}`)!.depth + 0.5,
    });
}
