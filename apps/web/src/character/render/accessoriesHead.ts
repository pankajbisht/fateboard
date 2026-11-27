import { ACCESSORY_DEFS } from '../data/wardrobe';
import { apply, normalize, type V3 } from '../rig/math';
import type { Character } from '../schema/types';
import { useColor } from './accPaint';
import { project } from './camera';
import type { HairGeo } from './hair';
import { addShell, ellipsoid, on, toScreen, type Ctx } from './parts';
import { ellipse, polyline, type P2 } from './shapes';

/**
 * Head accessories (docs/CHARACTER_STUDIO.md phase 3): cap, sun hat, beanie, headband, turban, headscarf, helmet and
 * earrings, drawn as shells over the hair (a hat is a dome and a brim) on the head's surface, like the hair itself.
 * Face accessories (glasses, bindi) are in face.ts, body ones in accessoriesBody.ts.
 */

/** What the head cover hides of the hair: the cap over the skull, and the hair behind and beside the head. */
export function hairHidden(c: Character): { front: boolean; back: boolean } {
    const cover = c.dress.accessories.find((a) => ACCESSORY_DEFS[a.kind].slot === 'head')?.kind;
    if (
        cover === 'turban' ||
        cover === 'headscarf' ||
        cover === 'helmet' ||
        cover === 'army-helmet' ||
        cover === 'head-guard'
    )
        return { front: true, back: true };
    if (cover === 'beanie' || cover === 'beret') return { front: true, back: false };
    return { front: false, back: false };
}

export function addHeadAccessories(ctx: Ctx, c: Character, g: HairGeo) {
    const { rx, ry, rz, hc, headDepth, facing } = g;
    // above the hair's cap, below the face's features
    const depth = headDepth + rz * (0.7 + 0.1 * facing) + 0.3;
    const grown = (k: number): V3 => [rx * 1.08 * k, ry * 1.06 * k, rz * 1.1 * k];
    const dome = (key: string, vol: number, top: number, lift = 0, d = depth) =>
        addShell(
            ctx,
            key,
            'head',
            'acc',
            ellipsoid(
                ctx,
                'head',
                [hc[0], hc[1] + ry * lift, hc[2]],
                grown(vol),
                (u) => u[1] > top,
            ),
            d,
        );
    const blob = (key: string, at: V3, r: V3, d: number) =>
        addShell(
            ctx,
            key,
            'head',
            'acc',
            ellipsoid(
                ctx,
                'head',
                [hc[0] + at[0] * rx, hc[1] + at[1] * ry, hc[2] + at[2] * rz],
                [r[0] * rx, r[1] * ry, r[2] * rz],
                () => true,
                5,
                10,
            ),
            d,
        );
    const surf = (lon: number, lat: number, out = 1.06) => {
        const u: V3 = [Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat)];
        const local: V3 = [
            hc[0] + u[0] * rx * out,
            hc[1] + u[1] * ry * out,
            hc[2] + u[2] * rz * out,
        ];
        const n = normalize(apply(g.R, normalize([u[0] / rx, u[1] / ry, u[2] / rz])));
        const s = toScreen(ctx, on(ctx, 'head', local));
        return { facing: project(ctx.view, n)[2], p: [s[0], s[1]] as P2 };
    };

    for (const a of c.dress.accessories) {
        useColor(ctx, a.color);
        switch (a.kind) {
            case 'cap':
                dome('acc-cap', 1.07, 0.26, 0.02);
                blob('acc-cap-brim', [0, 0.3, 1.1], [0.8, 0.07, 0.46], depth + 0.1);
                break;
            case 'hat':
                blob('acc-hat-brim', [0, 0.36, 0], [1.95, 0.06, 1.95], depth + 0.05);
                dome('acc-hat', 1.05, 0.3, 0.02, depth + 0.1);
                break;
            case 'beanie':
                dome('acc-beanie', 1.1, 0.12, 0.02);
                blob('acc-beanie-pom', [0, 1.16, 0], [0.22, 0.2, 0.22], depth + 0.1);
                break;
            case 'turban':
                dome('acc-turban', 1.16, 0.0, 0.04);
                blob('acc-turban-wrap', [0.12, 0.92, 0.05], [0.74, 0.36, 0.74], depth + 0.1);
                break;
            case 'headscarf': {
                // frames the face: a cap over the forehead, a band down each side, and the back of the head
                const behind = headDepth + rz * (0.6 - 1.6 * facing);
                addShell(
                    ctx,
                    'acc-headscarf-back',
                    'head',
                    'acc',
                    ellipsoid(ctx, 'head', hc, grown(1.12), (u) => u[2] < -0.1 && u[1] > -0.75),
                    behind,
                );
                dome('acc-headscarf', 1.1, 0.42, 0.02);
                for (const sx of [-1, 1])
                    addShell(
                        ctx,
                        `acc-headscarf-side${sx}`,
                        'head',
                        'acc',
                        ellipsoid(
                            ctx,
                            'head',
                            hc,
                            grown(1.1),
                            (u) => u[0] * sx > 0.78 && u[2] < 0.55 && u[1] > -0.6,
                        ),
                        depth,
                    );
                break;
            }
            case 'beret':
                dome('acc-beret', 1.1, 0.18, 0.03);
                blob('acc-beret-top', [0.32, 0.9, -0.05], [0.95, 0.22, 0.95], depth + 0.1);
                break;
            case 'army-helmet':
                dome('acc-army-helmet', 1.17, -0.12, 0.03);
                blob('acc-army-helmet-rim', [0, 0.28, 0], [1.28, 0.08, 1.3], depth + 0.05);
                break;
            case 'helmet':
                dome('acc-helmet', 1.14, -0.08, 0.02);
                break;
            case 'head-guard':
                // padded crown and brow, cheek pads either side; the face stays open
                dome('acc-head-guard', 1.16, 0.05, 0.02);
                for (const sx of [-1, 1])
                    blob(
                        `acc-head-guard-cheek${sx < 0 ? 'R' : 'L'}`,
                        [sx * 0.86, -0.3, 0.2],
                        [0.26, 0.42, 0.42],
                        depth + 0.04,
                    );
                blob('acc-head-guard-back', [0, -0.1, -0.85], [0.75, 0.5, 0.3], depth - 0.02);
                break;
            case 'mongkol': {
                // a thick ring high on the head, with its tail standing out at the back
                const pts: P2[] = [];
                for (let i = 0; i <= 14; i++) {
                    const sp = surf(-1.35 + (i / 14) * 2.7, 0.5);
                    if (sp.facing > 0.05) pts.push(sp.p);
                }
                if (pts.length > 1)
                    ctx.parts.push({
                        key: 'acc-mongkol',
                        group: 'head',
                        role: 'line',
                        d: polyline(pts),
                        fill: 'none',
                        stroke: ctx.fill.acc,
                        strokeWidth: ctx.line * 8,
                        depth: depth + 0.6,
                    });
                blob('acc-mongkol-tail', [0, 0.55, -1.15], [0.1, 0.1, 0.3], depth + 0.1);
                break;
            }
            case 'headband': {
                // the front arc only: the part of the band that faces the viewer
                const pts: P2[] = [];
                for (let i = 0; i <= 14; i++) {
                    const s = surf(
                        -1.35 + (i / 14) * 2.7,
                        0.4 + 0.07 * Math.cos(((i / 14) * 2 - 1) * 1.2),
                    );
                    if (s.facing > 0.05) pts.push(s.p);
                }
                if (pts.length > 1)
                    ctx.parts.push({
                        key: 'acc-headband',
                        group: 'head',
                        role: 'line',
                        d: polyline(pts),
                        fill: 'none',
                        stroke: ctx.fill.acc,
                        strokeWidth: ctx.line * 4.6,
                        depth: depth + 0.6,
                    });
                break;
            }
            case 'hair-clip': {
                // a short bar on the fringe above the left eye, only while that side faces the viewer
                const a = surf(0.42, 0.62, 1.1);
                const b = surf(0.78, 0.52, 1.1);
                if (a.facing > 0.1 && b.facing > 0.1)
                    ctx.parts.push({
                        key: 'acc-hair-clip',
                        group: 'head',
                        role: 'line',
                        d: polyline([a.p, b.p]),
                        fill: 'none',
                        stroke: ctx.fill.acc,
                        strokeWidth: ctx.line * 3.2,
                        depth: depth + 0.7,
                    });
                break;
            }
            case 'earrings':
                for (const sx of [-1, 1]) {
                    const e = surf(sx * 1.52, -0.28, 1.0);
                    if (e.facing > -0.15 && !hairHidden(c).back)
                        ctx.parts.push({
                            key: `acc-earring${sx}`,
                            group: 'head',
                            role: 'feature',
                            d: ellipse(e.p, rx * 0.075, ry * 0.11),
                            fill: ctx.fill.acc,
                            stroke: ctx.outline(ctx.fill.acc),
                            strokeWidth: ctx.line * 0.5,
                            depth: depth + 0.3,
                        });
                }
                break;
            default:
                break;
        }
    }
}
