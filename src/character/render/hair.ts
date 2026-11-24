import { FRINGES, HAIR_DEFS, type HairBlob } from '../data/hairStyles';
import type { V3 } from '../rig/math';
import type { Character } from '../schema/types';
import { apply, type M3 } from '../rig/math';
import { project } from './camera';
import { addShell, ellipsoid, on, toScreen, type Ctx } from './parts';
import { polyline, type P2 } from './shapes';
import { MANGA_INK, darken } from './styles';
import { hairHidden } from './accessoriesHead';
import { addMangaHair } from './hairManga';

/**
 * Hair (docs/CHARACTER_STUDIO.md phase 3): any of the styles of `data/hairStyles.ts`, drawn as layered shells on the
 * head, in the right order from every side: the back (and beside) the head, tied or standing shapes, then the cap
 * over the skull. Two-tone hair draws the tip colour over the lower part of the back, the tails and the locks.
 */
export interface HairGeo {
    rx: number;
    ry: number;
    rz: number;
    /** head ellipsoid centre in the head joint's frame */
    hc: V3;
    headDepth: number;
    /** 1 = the face points at the viewer, -1 = away */
    facing: number;
    /** head rotation in the world */
    R: M3;
}

export function addHair(ctx: Ctx, c: Character, g: HairGeo) {
    // the manga body: pointed locks inside one outline (hairManga.ts)
    if (c.body.bodyStyle === 'manga') return addMangaHair(ctx, c, g);
    const def = HAIR_DEFS[c.hair.style] ?? HAIR_DEFS.short;
    const { rx, ry, rz, hc, headDepth, facing } = g;
    const tip = c.hair.tip !== null;
    // behind the head, neck and shoulders when seen from the front; in front of them seen from behind
    const behind = headDepth + rz * (0.6 - 1.6 * facing);
    const grow: V3 = [rx * 1.08, ry * 1.06, rz * 1.1];
    const scaled = (k: number): V3 => [grow[0] * k, grow[1] * k, grow[2] * k];
    const at = (x: number, y: number, z: number): V3 =>
        on(ctx, 'head', [hc[0] + x * rx, hc[1] + y * ry, hc[2] + z * rz]);

    // a head cover hides the hair it covers
    const hidden = hairHidden(c);

    // back and beside the head, hanging as far as the style says
    if (def.back && !hidden.back) {
        const b = def.back;
        const r = scaled(b.vol ?? 1);
        const keep = (u: V3) => u[2] < 0.2 && u[1] > b.floor && u[1] < (b.ceil ?? 2);
        const pts = ellipsoid(ctx, 'head', hc, r, keep);
        const hang: V3[] = [];
        if (b.hang)
            for (const sx of [-1, -0.5, 0, 0.5, 1])
                hang.push(
                    on(ctx, 'head', [
                        hc[0] + sx * rx * 1.15 * (b.flare ?? 1),
                        hc[1] - ry * b.hang,
                        -rz * (0.55 - Math.abs(sx) * 0.15),
                    ]),
                );
        addShell(ctx, 'hair-back', 'hair', 'hair', [...pts, ...hang], behind);
        if (tip && b.hang && b.hang > 0.9) {
            // the ends: a band over the last stretch of hanging hair
            const band: V3[] = [...hang];
            for (const sx of [-1, -0.5, 0, 0.5, 1])
                band.push(
                    on(ctx, 'head', [
                        hc[0] + sx * rx * 1.15 * (b.flare ?? 1) * 0.98,
                        hc[1] - ry * (b.hang - 0.85),
                        -rz * (0.55 - Math.abs(sx) * 0.15) * 1.02,
                    ]),
                );
            addShell(ctx, 'hair-back-tip', 'hair', 'hair2', band, behind + 0.01);
        }
    }

    // tied or standing shapes, each its own shell
    (hidden.back ? [] : (def.blobs ?? [])).forEach((blob: HairBlob, i) => {
        const centre = [
            hc[0] + blob.at[0] * rx,
            hc[1] + blob.at[1] * ry,
            hc[2] + blob.at[2] * rz,
        ] as V3;
        const radii: V3 = [blob.r[0] * rx, blob.r[1] * ry, blob.r[2] * rz];
        const pts = ellipsoid(ctx, 'head', centre, radii, () => true, 6, 10);
        // a spike: the shell is the hull of its points, so one far point makes it pointed
        if (blob.apex) pts.push(at(...blob.apex));
        addShell(ctx, `hair-x${i}`, 'hair', 'hair', pts, behind);
        if (tip && blob.tip)
            addShell(
                ctx,
                `hair-x${i}-tip`,
                'hair',
                'hair2',
                ellipsoid(ctx, 'head', centre, radii, (u) => u[1] < -0.2, 6, 10),
                behind + 0.01,
            );
    });

    // the cap over the skull, with its fringe
    if (def.cap && !hidden.front) {
        const cap = def.cap;
        const r = scaled(cap.vol ?? 1);
        const centre: V3 = [hc[0], hc[1] + ry * (cap.lift ?? 0), hc[2]];
        const pts = ellipsoid(ctx, 'head', centre, r, (u) => u[1] > cap.top);
        for (const [x, y] of FRINGES[cap.fringe])
            pts.push(at(x, y, 1.04 - 0.35 * x * x - 0.12 * y));
        addShell(ctx, 'hair-front', 'hair', 'hair', pts, headDepth + rz * (0.7 + 0.1 * facing));
    }
}

/**
 * Seen from straight above, hair shows its crown: a swirl round the point where it grows from, drawn on the top of
 * the head (turning, squashing and hiding with the head like any feature on its surface).
 */
export function addCrown(ctx: Ctx, c: Character, g: HairGeo) {
    if (c.hair.style === 'bald' || c.hair.style === 'balding') return;
    const { rx, ry, rz, hc, R } = g;
    // how much the top of the head faces the viewer
    const up = project(ctx.view, apply(R, [0, 1, 0]))[2];
    if (up < 0.55) return;
    const centre = toScreen(ctx, on(ctx, 'head', [hc[0], hc[1] + ry * 1.07, hc[2] - rz * 0.12]));
    const side = project(ctx.view, apply(R, [1, 0, 0]));
    const fwd = project(ctx.view, apply(R, [0, 0, 1]));
    // a spiral of 1.6 turns: x along the head's sideways axis, y along its front-to-back axis
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const a = t * Math.PI * 3.2;
        const r = t * rx * 0.42;
        const sx = Math.cos(a) * r;
        const sz = Math.sin(a) * r * (rz / rx);
        pts.push([centre[0] + side[0] * sx + fwd[0] * sz, centre[1] + side[1] * sx + fwd[1] * sz]);
    }
    const manga = ctx.pack.palette === 'manga';
    ctx.parts.push({
        key: 'hair-crown',
        group: 'hair',
        role: 'line',
        d: polyline(pts),
        fill: 'none',
        stroke: manga ? MANGA_INK : darken(ctx.fill.hair, 0.4),
        strokeWidth: ctx.line * 0.8,
        depth: centre[2] + rz * 0.5,
    });
}
