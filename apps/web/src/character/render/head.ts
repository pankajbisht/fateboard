import type { Character } from '../schema/types';
import { apply, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { project } from './camera';
import { addFace } from './face';
import { addHeadAccessories } from './accessoriesHead';
import { addCrown, addHair } from './hair';
import { addAhoge } from './hairAhoge';
import { addShell, ellipsoid, on, toScreen, type Ctx } from './parts';
import { ellipse, hull, smoothPoly, type P2 } from './shapes';
import { drawnHeadScale } from './styles';

/**
 * The 2.5D head: an ellipsoid head, ears, back hair and a front cap (drawn in the right order from every
 * side). The face on its surface is face.ts.
 */

export function addHead(ctx: Ctx, skel: Skeleton, c: Character) {
    const { pack } = ctx;
    const scale = drawnHeadScale(pack, c.body);
    const [rx, ry, rz] = skel.size.head.map((v) => v * scale);
    const hc: V3 = [0, ry * 0.95, rz * 0.04];
    const R = ctx.posed.rot.head;
    const center = on(ctx, 'head', hc);
    const headDepth = project(ctx.view, center)[2];
    // where the face points, in camera space (1 = toward the viewer, -1 = away)
    const forward = project(ctx.view, apply(R, [0, 0, 1]));
    const facing = forward[2];

    const skull = ellipsoid(ctx, 'head', hc, [rx, ry, rz]);
    // anime / manga jaw: a narrower, pointed chin
    if (pack.face.chin === 'pointed')
        skull.push(
            on(ctx, 'head', [0, hc[1] - ry * 1.1, rz * 0.42]),
            on(ctx, 'head', [rx * 0.42, hc[1] - ry * 0.86, rz * 0.5]),
            on(ctx, 'head', [-rx * 0.42, hc[1] - ry * 0.86, rz * 0.5]),
        );
    addShell(ctx, 'head', 'head', 'skin', skull, headDepth);
    // the neck always sits behind the head (from the back it used to cover the skull)
    const neck = ctx.parts.find((p) => p.key === 'neck');
    if (neck) neck.depth = Math.min(neck.depth, headDepth - rz * 0.6);

    for (const sx of [-1, 1]) {
        const ear = on(ctx, 'head', [sx * rx * 0.96, hc[1] - ry * 0.08, -rz * 0.05]);
        const s = toScreen(ctx, ear);
        ctx.parts.push({
            key: `ear-${sx}`,
            group: 'head',
            role: 'skin',
            d: ellipse([s[0], s[1]], rx * 0.17, ry * 0.24),
            fill: ctx.fill.skin,
            stroke: ctx.outline(ctx.fill.skin),
            strokeWidth: ctx.line,
            depth: s[2] - rz * 0.2,
            ...(ctx.tone.skin ? { tone: ctx.tone.skin } : {}),
        });
    }

    const hair = { rx, ry, rz, hc, headDepth, facing, R };
    addHair(ctx, c, hair);
    addAhoge(ctx, c, hair);
    addCrown(ctx, c, hair);
    addHeadAccessories(ctx, c, hair);

    // the face: features on the head's surface, hidden when they turn away or leave the drawn outline
    addFace(ctx, skel, c, {
        rx,
        ry,
        rz,
        hc,
        R,
        depth: headDepth + rz * 1.2,
        outline: smoothPoly(
            hull(skull.map((p) => project(ctx.view, p)).map(([x, y]): P2 => [x, y])),
        ),
    });
}
