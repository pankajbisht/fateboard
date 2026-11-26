import { add, cross, lerp3, normalize, scale, sub, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { PartGroup } from '../schema/types';
import { project } from './camera';
import { inkRibbon } from './ink';
import { addSurface, on, toScreen, type Ctx, type Material } from './parts';
import { hull, smoothClosed, type P2 } from './shapes';

/**
 * Clothes as cloth on the manga body (docs/CHARACTER_STUDIO.md, reference pass phase 4): the lines that make a garment
 * read as cloth in the owner's reference sheets. A short sleeve is a tube on the arm open at a hem (not an outlined
 * capsule); hems show where a sleeve or a trouser leg ends; a bent knee or elbow folds the cloth on its inside; a
 * hoodie has its front pocket and strings. Everything is an ink line (ink.ts) or a fill without an outline.
 */

/** How much a garment widens a manga limb it covers: loose cloth stands off the body, tight cloth hugs it. */
export const looseOf = (covered: boolean, fit: number) =>
    !covered ? 1 : fit > 1 ? Math.min(2, 1 + (fit - 1) * 1.6) : fit;

/** The ring of `radius` round the bone a→b at `t`, in the world, with each point's outward direction. */
export function ringAround(a: V3, b: V3, t: number, radius: number, n = 20) {
    const axis = normalize(sub(b, a)) as V3;
    const ref: V3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = normalize(cross(axis, ref)) as V3;
    const v = cross(axis, u);
    const c = lerp3(a, b, t);
    return Array.from({ length: n }, (_, i) => {
        const k = (i / n) * Math.PI * 2;
        const dir = add(scale(u, Math.cos(k)), scale(v, Math.sin(k)));
        return { p: add(c, scale(dir, radius)), dir };
    });
}

/** The half of a ring that faces the camera, in order round it (screen points), or [] when it is seen edge-on. */
function frontArc(ctx: Ctx, ring: { p: V3; dir: V3 }[]): P2[] {
    const facing = ring.map((q) => project(ctx.view, q.dir)[2] > 0);
    const start = facing.findIndex((f, i) => f && !facing[(i - 1 + ring.length) % ring.length]);
    if (start < 0) return [];
    const out: P2[] = [];
    for (let i = 0; i < ring.length; i++) {
        const j = (start + i) % ring.length;
        if (!facing[j]) break;
        const s = toScreen(ctx, ring[j].p);
        out.push([s[0], s[1]]);
    }
    return out.length >= 3 ? out : [];
}

/** An ink line part (a filled ribbon of the outline colour of `role`). */
export function inkLine(
    ctx: Ctx,
    key: string,
    group: PartGroup,
    role: Material,
    chains: { pts: P2[]; taper: [boolean, boolean] }[],
    depth: number,
    weight = 0.8,
) {
    const ink = ctx.outline(ctx.fill[role]);
    if (!ink) return;
    const d = inkRibbon(chains, ctx.line * weight);
    if (d)
        ctx.parts.push({
            key,
            group,
            role: 'line',
            d,
            fill: ink,
            stroke: null,
            strokeWidth: 0,
            depth,
        });
}

export const depthOf = (ctx: Ctx, key: string) => ctx.parts.find((x) => x.key === key)?.depth ?? 0;

/** A hem: the front half of the ring round the bone a→b at `t`. */
export function addHem(
    ctx: Ctx,
    key: string,
    group: PartGroup,
    role: Material,
    a: V3,
    b: V3,
    t: number,
    radius: number,
    depth: number,
) {
    const arc = frontArc(ctx, ringAround(a, b, t, radius));
    if (arc.length) inkLine(ctx, key, group, role, [{ pts: arc, taper: [true, true] }], depth, 0.7);
}

/** A hem along a ring given as points round a body part (a top's lower edge): its front half. */
export function addRingHem(
    ctx: Ctx,
    key: string,
    group: PartGroup,
    role: Material,
    ring: V3[],
    depth: number,
) {
    const c = ring.reduce<V3>((m, p) => add(m, scale(p, 1 / ring.length)), [0, 0, 0]);
    const arc = frontArc(
        ctx,
        ring.map((p) => ({ p, dir: normalize(sub(p, c)) as V3 })),
    );
    if (arc.length)
        inkLine(ctx, key, group, role, [{ pts: arc, taper: [true, true] }], depth, 0.75);
}

/**
 * A sleeve or trouser leg that ends part way down a bone, as a tube: from the joint a to `frac` of the way to b, a
 * little wider than the limb, a fill without an outline with its two sides as ink lines (narrowing at the top, where it
 * runs into the shoulder or hip) and a hem across its end.
 */
export function addTube(
    ctx: Ctx,
    key: string,
    group: PartGroup,
    role: Material,
    a: V3,
    b: V3,
    ra: number,
    rb: number,
    frac: number,
    /**
     * a round head over the joint (a thigh under short shorts): the tube's flat top at the joint left the limb's own
     * round top showing above it as skin whenever the leg came nearer than the hips (a stride)
     */
    head = false,
) {
    const f = Math.min(1, Math.max(0.05, frac));
    const re = ra + (rb - ra) * f;
    const ring = ringAround(a, b, f, re);
    const A = toScreen(ctx, a);
    const E = toScreen(ctx, lerp3(a, b, f));
    const dx = E[0] - A[0];
    const dy = E[1] - A[1];
    const l = Math.hypot(dx, dy) || 1;
    const n: P2 = [-dy / l, dx / l];
    const top: P2[] = [
        [A[0] + n[0] * ra, A[1] + n[1] * ra],
        [A[0] - n[0] * ra, A[1] - n[1] * ra],
    ];
    const end = ring.map((q) => {
        const s = toScreen(ctx, q.p);
        return [s[0], s[1]] as P2;
    });
    const u: P2 = [dx / l, dy / l];
    // the half circle on the far side of the joint, from one top corner round to the other
    const arc: P2[] = head
        ? Array.from({ length: 9 }, (_, i) => {
              const phi = (Math.PI * i) / 8;
              return [
                  A[0] + n[0] * ra * Math.cos(phi) - u[0] * ra * Math.sin(phi),
                  A[1] + n[1] * ra * Math.cos(phi) - u[1] * ra * Math.sin(phi),
              ];
          })
        : [];
    const poly = hull([...top, ...arc, ...end]);
    const depth = depthOf(ctx, group) + 0.02;
    addSurface(ctx, key, group, role, poly, smoothClosed(poly), depth, ra * 2, false, [poly]);
    // the sides: from the top corners to the widest points of the end across the tube
    const across = (p: P2) => (p[0] - E[0]) * n[0] + (p[1] - E[1]) * n[1];
    const hi = end.reduce((m, p) => (across(p) > across(m) ? p : m));
    const lo = end.reduce((m, p) => (across(p) < across(m) ? p : m));
    inkLine(
        ctx,
        `${key}-side`,
        group,
        role,
        // (the head is a fill only: inked, it drew two humps over the shorts' seat)
        [
            { pts: [top[0], hi], taper: [true, false] },
            { pts: [top[1], lo], taper: [true, false] },
        ],
        depth + 0.002,
        1,
    );
    addHem(ctx, `${key}-hem`, group, role, a, b, f, re, depth + 0.003);
}

/**
 * Folds on the inside of a bend (elbow, knee) in cloth: two short lines from the inner edge toward the middle. `B` is
 * the bend on screen, `u1` and `u2` the two bones' directions, `r` the limb's radius there.
 */
export function addFolds(
    ctx: Ctx,
    key: string,
    group: PartGroup,
    role: Material,
    B: P2,
    u1: P2,
    u2: P2,
    r: number,
    depth: number,
) {
    const bend = u1[0] * u2[0] + u1[1] * u2[1];
    if (bend > 0.85) return;
    const n1: P2 = [-u1[1], u1[0]];
    const side = u2[0] * n1[0] + u2[1] * n1[1] > 0 ? 1 : -1;
    const inner: P2 = [n1[0] * side, n1[1] * side];
    const bl = Math.hypot(u1[0] + u2[0], u1[1] + u2[1]) || 1;
    const along: P2 = [(u1[0] + u2[0]) / bl, (u1[1] + u2[1]) / bl];
    const chains = [-0.55, 0.45].map((k) => {
        const at = (i: number, a: number): P2 => [
            B[0] + inner[0] * r * i + along[0] * r * a,
            B[1] + inner[1] * r * i + along[1] * r * a,
        ];
        return {
            pts: [at(0.95, k * 1.3), at(0.62, k * 0.9), at(0.35, k * 0.7)],
            taper: [false, true] as [boolean, boolean],
        };
    });
    chains.forEach((c, i) => inkLine(ctx, `${key}-fold${i}`, group, role, [c], depth, 0.5));
}

/** A hoodie's front pocket and the two strings of its hood, on the side that faces the viewer. */
export function addHoodieDetail(ctx: Ctx, skel: Skeleton, facing: number) {
    if (facing < 0.4) return;
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26;
    const torso = depthOf(ctx, 'torso');
    const w = z.waistW * 0.4;
    const front = z.chestDepth * 0.45 + z.belly * 0.4;
    const xy = (j: 'spine1' | 'chest', p: V3): P2 => {
        const s = toScreen(ctx, on(ctx, j, p));
        return [s[0], s[1]];
    };
    inkLine(
        ctx,
        'hoodie-pocket',
        'torso',
        'top',
        [
            {
                pts: [
                    xy('spine1', [-w * 0.8, -t * 0.02, front]),
                    xy('spine1', [-w * 0.55, t * 0.16, front * 1.02]),
                    xy('spine1', [w * 0.55, t * 0.16, front * 1.02]),
                    xy('spine1', [w * 0.8, -t * 0.02, front]),
                ],
                taper: [false, false],
            },
        ],
        torso + 0.004,
        0.6,
    );
    const neckFront = z.chestDepth * 0.5;
    for (const sx of [-1, 1])
        inkLine(
            ctx,
            `hoodie-string-${sx}`,
            'torso',
            'top',
            [
                {
                    pts: [
                        xy('chest', [sx * z.neck * 0.6, t * 0.27, neckFront]),
                        xy('chest', [sx * z.neck * 0.68, t * 0.08, neckFront * 1.05]),
                    ],
                    taper: [false, true],
                },
            ],
            torso + 0.005,
            0.5,
        );
}
