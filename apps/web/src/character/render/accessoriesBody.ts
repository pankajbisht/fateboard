import { apply, normalize, type V3 } from '../rig/math';
import { project } from './camera';
import type { Skeleton } from '../rig/skeleton';
import type { Character } from '../schema/types';
import { useColor } from './accPaint';
import { cover } from './garments';
import { addLimb, addShell, on, ring, toScreen, type Ctx } from './parts';
import { polyline, type P2 } from './shapes';

/**
 * Body accessories (docs/CHARACTER_STUDIO.md phase 3): scarf, tie, necklace, watch, bracelet, belt, backpack, shoulder
 * bag and apron, as shells and bands fixed to the spine and arm joints (they bend and twist with the body). Their
 * colour goes through `useColor`, so style tints, manga tone and the scene grade apply.
 */
export function addBodyAccessories(ctx: Ctx, skel: Skeleton, c: Character) {
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26;
    const torso = ctx.parts.find((x) => x.key === 'torso');
    const base = torso ? torso.depth : 0;
    const neckDepth = Math.max(base, ctx.parts.find((x) => x.key === 'neck')?.depth ?? base);
    const p = ctx.posed.pos;
    const front = z.chestDepth * 0.5;
    // the chest turns away from the camera: front-only things (tie, apron, necklace) are hidden, the pack is in front
    const facing = project(ctx.view, apply(ctx.posed.rot.chest, normalize([0, 0, 1])))[2];
    const seen = facing > 0.05;
    const shell = (key: string, pts: V3[], bias: number) =>
        addShell(ctx, key, 'torso', 'acc', pts, base + bias);

    for (const a of c.dress.accessories) {
        useColor(ctx, a.color);
        switch (a.kind) {
            case 'scarf':
                addShell(
                    ctx,
                    'acc-scarf',
                    'torso',
                    'acc',
                    [
                        ...ring(ctx, 'chest', t * 0.33, z.neck * 1.35, z.neck * 1.25, 10),
                        ...ring(ctx, 'chest', t * 0.2, z.neck * 1.7, z.neck * 1.5, 10),
                    ],
                    neckDepth + 0.2,
                );
                shell(
                    'acc-scarf-tail',
                    [
                        on(ctx, 'chest', [z.neck * 0.4, t * 0.28, front * 0.9]),
                        on(ctx, 'chest', [z.neck * 1.3, t * 0.28, front * 0.9]),
                        on(ctx, 'chest', [z.neck * 0.5, -t * 0.2, front]),
                        on(ctx, 'chest', [z.neck * 1.3, -t * 0.2, front]),
                    ],
                    0.7,
                );
                break;
            case 'bow': {
                // a ribbon bow under the collar: two flat wings and a knot, sharp polygons with a thin edge (smoothed
                // shells of three points read as sausages, see the lapels)
                if (!seen) break;
                const at = (x: number, y: number): P2 => {
                    const q = toScreen(ctx, on(ctx, 'chest', [x * z.neck, t * y, front * 1.04]));
                    return [q[0], q[1]];
                };
                const ink = ctx.outline(ctx.fill.acc);
                const piece = (key: string, pts: P2[], k: number) =>
                    ctx.parts.push({
                        key,
                        group: 'torso',
                        role: 'acc',
                        d: `${polyline(pts)}Z`,
                        fill: ctx.fill.acc,
                        stroke: ink,
                        strokeWidth: ctx.line * 0.6,
                        depth: neckDepth + 1 + k,
                    });
                for (const sx of [-1, 1])
                    piece(
                        `acc-bow${sx}`,
                        [at(0, 0.235), at(sx * 0.95, 0.27), at(sx * 0.95, 0.17)],
                        0,
                    );
                piece(
                    'acc-bow-knot',
                    [at(-0.22, 0.255), at(0.22, 0.255), at(0.22, 0.2), at(-0.22, 0.2)],
                    0.01,
                );
                break;
            }
            case 'socks':
                // ankle to a third up the shin, over bare legs only (under trousers they are hidden)
                for (const s of ['L', 'R'] as const) {
                    const shin = ctx.parts.find((x) => x.key === `lowerLeg${s}`);
                    if (!shin || shin.role !== 'skin') continue;
                    cover(
                        ctx,
                        `acc-sock${s}`,
                        `lowerLeg${s}`,
                        'acc',
                        p[`foot${s}`],
                        z.ankle,
                        p[`lowerLeg${s}`],
                        z.knee,
                        0.34,
                        1.06 * (ctx.pack.proportion.limb ?? 1),
                    );
                }
                break;
            case 'tie':
                if (!seen) break;
                shell(
                    'acc-tie',
                    [
                        on(ctx, 'chest', [-z.neck * 0.5, t * 0.27, front * 0.95]),
                        on(ctx, 'chest', [z.neck * 0.5, t * 0.27, front * 0.95]),
                        on(ctx, 'chest', [-z.neck * 0.85, -t * 0.12, front * 1.02]),
                        on(ctx, 'chest', [z.neck * 0.85, -t * 0.12, front * 1.02]),
                        on(ctx, 'chest', [0, -t * 0.34, front * 1.02]),
                    ],
                    0.8,
                );
                break;
            case 'necklace': {
                if (!seen) break;
                const pts: V3[] = [];
                for (let i = 0; i <= 8; i++) {
                    const u = (i / 8) * 2 - 1;
                    pts.push(
                        on(ctx, 'chest', [
                            u * z.neck * 1.2,
                            t * 0.26 - (1 - u * u) * t * 0.1,
                            front * 0.95,
                        ]),
                    );
                }
                // a chain of short links, so it stays a thin curve (a hull of the points would be a sliver)
                pts.slice(1).forEach((q, i) =>
                    addLimb(
                        ctx,
                        `acc-necklace${i}`,
                        'torso',
                        'acc',
                        pts[i],
                        z.neck * 0.1,
                        q,
                        z.neck * 0.1,
                        0.8,
                    ),
                );
                break;
            }
            case 'watch':
            case 'bracelet':
                for (const s of ['L', 'R'] as const) {
                    if (a.kind === 'watch' && s === 'R') continue;
                    const lower = `lowerArm${s}` as const;
                    const hand = `hand${s}` as const;
                    const at = (k: number): V3 => [
                        p[lower][0] + (p[hand][0] - p[lower][0]) * k,
                        p[lower][1] + (p[hand][1] - p[lower][1]) * k,
                        p[lower][2] + (p[hand][2] - p[lower][2]) * k,
                    ];
                    addLimb(
                        ctx,
                        `acc-${a.kind}${s}`,
                        lower,
                        'acc',
                        at(0.78),
                        z.wrist * 1.25,
                        at(0.9),
                        z.wrist * 1.25,
                        0.05,
                    );
                }
                break;
            case 'belt':
                shell(
                    'acc-belt',
                    [
                        ...ring(
                            ctx,
                            'spine1',
                            -t * 0.02,
                            z.waistW * 0.55,
                            z.chestDepth * 0.46,
                            12,
                            z.belly * 0.4,
                        ),
                        ...ring(
                            ctx,
                            'spine1',
                            -t * 0.09,
                            z.waistW * 0.55,
                            z.chestDepth * 0.46,
                            12,
                            z.belly * 0.4,
                        ),
                    ],
                    0.5,
                );
                break;
            case 'backpack':
                shell(
                    'acc-backpack',
                    [
                        on(ctx, 'chest', [-z.shoulderW * 0.3, t * 0.2, -z.chestDepth * 0.55]),
                        on(ctx, 'chest', [z.shoulderW * 0.3, t * 0.2, -z.chestDepth * 0.55]),
                        on(ctx, 'chest', [-z.shoulderW * 0.3, t * 0.2, -z.chestDepth * 1.3]),
                        on(ctx, 'chest', [z.shoulderW * 0.3, t * 0.2, -z.chestDepth * 1.3]),
                        on(ctx, 'spine1', [-z.waistW * 0.3, -t * 0.1, -z.chestDepth * 0.5]),
                        on(ctx, 'spine1', [z.waistW * 0.3, -t * 0.1, -z.chestDepth * 0.5]),
                        on(ctx, 'spine1', [-z.waistW * 0.3, -t * 0.1, -z.chestDepth * 1.2]),
                        on(ctx, 'spine1', [z.waistW * 0.3, -t * 0.1, -z.chestDepth * 1.2]),
                    ],
                    seen ? -0.8 : 0.8,
                );
                break;
            case 'bag':
                addLimb(
                    ctx,
                    'acc-bag-strap',
                    'torso',
                    'acc',
                    on(ctx, 'chest', [z.shoulderW * 0.3, t * 0.25, 0]),
                    z.neck * 0.12,
                    on(ctx, 'spine1', [-z.waistW * 0.5, -t * 0.1, 0]),
                    z.neck * 0.12,
                    1,
                );
                shell(
                    'acc-bag',
                    [
                        on(ctx, 'spine1', [-z.waistW * 0.5, -t * 0.25, z.chestDepth * 0.1]),
                        on(ctx, 'spine1', [
                            -z.waistW * 0.5 - z.shoulderW * 0.22,
                            -t * 0.25,
                            z.chestDepth * 0.1,
                        ]),
                        on(ctx, 'spine1', [-z.waistW * 0.5, -t * 0.55, z.chestDepth * 0.1]),
                        on(ctx, 'spine1', [
                            -z.waistW * 0.5 - z.shoulderW * 0.22,
                            -t * 0.55,
                            z.chestDepth * 0.1,
                        ]),
                    ],
                    1.1,
                );
                break;
            case 'apron':
                if (!seen) break;
                shell(
                    'acc-apron',
                    [
                        on(ctx, 'chest', [-z.shoulderW * 0.2, t * 0.22, front * 0.95]),
                        on(ctx, 'chest', [z.shoulderW * 0.2, t * 0.22, front * 0.95]),
                        on(ctx, 'spine1', [
                            -z.waistW * 0.5,
                            -t * 0.1,
                            z.chestDepth * 0.5 + z.belly,
                        ]),
                        on(ctx, 'spine1', [z.waistW * 0.5, -t * 0.1, z.chestDepth * 0.5 + z.belly]),
                        on(ctx, 'pelvis', [-z.hipW * 0.42, -z.hipDepth * 1.4, z.hipDepth * 0.55]),
                        on(ctx, 'pelvis', [z.hipW * 0.42, -z.hipDepth * 1.4, z.hipDepth * 0.55]),
                    ],
                    0.9,
                );
                break;
            default:
                break;
        }
    }
}
