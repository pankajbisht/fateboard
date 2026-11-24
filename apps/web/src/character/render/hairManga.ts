import { FRINGES, HAIR_DEFS, type Fringe, type HairBlob } from '../data/hairStyles';
import type { V3 } from '../rig/math';
import type { Character } from '../schema/types';
import { hairHidden } from './accessoriesHead';
import type { HairGeo } from './hair';
import { addSurface, ellipsoid, on, toScreen, type Ctx, type Material } from './parts';
import { fmt, hull, smoothClosed, smoothPoly, type P2 } from './shapes';

/**
 * Manga hair (docs/CHARACTER_STUDIO.md, reference pass phase 5): the same styles as hair.ts, drawn as clumps of
 * pointed locks like the owner's reference sheets. The fringe is a row of pointed locks hanging from the hairline,
 * side locks fall before the ears, spikes come to a point. Every piece is a fill without an outline; one outline goes
 * round the front hair (cap and locks, over the face) and one round the back hair, each stroked twice as wide just
 * behind its fills, so the hair reads as one jagged shape with no line across the forehead.
 */
interface Piece {
    key: string;
    role: Material;
    poly: P2[];
    depth: number;
    d: string;
}

/** Lock rows per fringe: how many, the tip height (unit head, y up), the sideways sweep of each tip. */
const LOCKS: Record<
    Exclude<Fringe, 'none'>,
    { n: number; tip: number; sweep: number; parted?: boolean }
> = {
    // tips at about the brows (lat 0.2): a manga fringe falls over the forehead to them
    straight: { n: 6, tip: 0.02, sweep: 0 },
    low: { n: 7, tip: -0.08, sweep: 0 },
    side: { n: 5, tip: 0.0, sweep: 0.3 },
    swept: { n: 5, tip: 0.16, sweep: 0.38 },
    center: { n: 6, tip: -0.02, sweep: 0.24, parted: true },
    wispy: { n: 7, tip: 0.04, sweep: 0.12 },
};

export function addMangaHair(ctx: Ctx, c: Character, g: HairGeo) {
    const def = HAIR_DEFS[c.hair.style] ?? HAIR_DEFS.short;
    const { rx, ry, rz, hc, headDepth, facing } = g;
    const tip = c.hair.tip !== null;
    const behind = headDepth + rz * (0.6 - 1.6 * facing);
    const frontDepth = headDepth + rz * (0.7 + 0.1 * facing);
    const grow: V3 = [rx * 1.08, ry * 1.06, rz * 1.1];
    const scaled = (k: number): V3 => [grow[0] * k, grow[1] * k, grow[2] * k];
    const at = (x: number, y: number, z: number): V3 =>
        on(ctx, 'head', [hc[0] + x * rx, hc[1] + y * ry, hc[2] + z * rz]);
    /** a point on the hair's surface over the face (as hair.ts places the fringe) */
    const onFace = (x: number, y: number, out = 0): V3 =>
        at(x, y, 1.04 - 0.35 * x * x - 0.12 * y + out);
    const hidden = hairHidden(c);
    const back: Piece[] = [];
    const front: Piece[] = [];
    /** a hair piece; a pointed one (a lock, a spike) keeps its corners, so its tip stays sharp (smoothing rounded it) */
    const piece = (
        list: Piece[],
        key: string,
        role: Material,
        pts: V3[],
        depth: number,
        pointed = false,
    ) => {
        const s = pts.map((p) => toScreen(ctx, p));
        const h = hull(s.map((p): P2 => [p[0], p[1]]));
        // shading is cut from the smoothed outline as drawn (as addShell does), so it never leaves it
        if (h.length < 3) return;
        const d = pointed
            ? `M${h.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`
            : smoothClosed(h);
        list.push({ key, role, poly: pointed ? h : smoothPoly(h), depth, d });
    };

    // back and beside the head, hanging as far as the style says (as hair.ts)
    if (def.back && !hidden.back) {
        const b = def.back;
        const keep = (u: V3) => u[2] < 0.2 && u[1] > b.floor && u[1] < (b.ceil ?? 2);
        const pts = ellipsoid(ctx, 'head', hc, scaled(b.vol ?? 1), keep);
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
        piece(back, 'hair-back', 'hair', [...pts, ...hang], behind);
        if (tip && b.hang && b.hang > 0.9) {
            const band: V3[] = [...hang];
            for (const sx of [-1, -0.5, 0, 0.5, 1])
                band.push(
                    on(ctx, 'head', [
                        hc[0] + sx * rx * 1.15 * (b.flare ?? 1) * 0.98,
                        hc[1] - ry * (b.hang - 0.85),
                        -rz * (0.55 - Math.abs(sx) * 0.15) * 1.02,
                    ]),
                );
            piece(back, 'hair-back-tip', 'hair2', band, behind + 0.01);
        }
    }

    // tied or standing shapes; a tall thin one standing up (a spike) comes to a point
    (hidden.back ? [] : (def.blobs ?? [])).forEach((blob: HairBlob, i) => {
        const centre: V3 = [
            hc[0] + blob.at[0] * rx,
            hc[1] + blob.at[1] * ry,
            hc[2] + blob.at[2] * rz,
        ];
        const radii: V3 = [blob.r[0] * rx, blob.r[1] * ry, blob.r[2] * rz];
        const pts = ellipsoid(ctx, 'head', centre, radii, () => true, 6, 10);
        // a tall thin one standing up (a spike) comes to a point upward; a small round one on the crown (a messy
        // tuft) comes to a point outward, so the outline is jagged like drawn hair
        const apex =
            blob.apex ??
            (blob.r[1] > blob.r[0] * 2.5 && blob.at[1] > 0.6
                ? ([blob.at[0] * 1.25, blob.at[1] + blob.r[1] * 1.2, blob.at[2]] as V3)
                : blob.at[1] > 0.3 && Math.max(...blob.r) < 0.45
                  ? ([blob.at[0] * 1.18, blob.at[1] * 1.18, blob.at[2] * 1.18] as V3)
                  : null);
        if (apex) pts.push(at(...apex));
        piece(back, `hair-x${i}`, 'hair', pts, behind, !!apex);
        if (tip && blob.tip)
            piece(
                back,
                `hair-x${i}-tip`,
                'hair2',
                ellipsoid(ctx, 'head', centre, radii, (u) => u[1] < -0.2, 6, 10),
                behind + 0.01,
            );
    });

    // the cap over the skull, without its smooth fringe: the locks below draw the fringe
    if (def.cap && !hidden.front) {
        const cap = def.cap;
        const centre: V3 = [hc[0], hc[1] + ry * (cap.lift ?? 0), hc[2]];
        const pts = ellipsoid(ctx, 'head', centre, scaled(cap.vol ?? 1), (u) => u[1] > cap.top);
        // the hairline across the forehead, a little below the cap's edge, so the locks hang from it
        if (cap.fringe !== 'none')
            for (const x of [-0.6, -0.3, 0, 0.3, 0.6])
                pts.push(onFace(x, Math.max(cap.top, 0.22) + 0.02));
        else for (const [x, y] of FRINGES.none) pts.push(onFace(x, y));
        piece(front, 'hair-front', 'hair', pts, frontDepth);

        // the fringe: pointed locks from the hairline (only while the face is toward the viewer)
        if (cap.fringe !== 'none' && facing > -0.15) {
            const spec = LOCKS[cap.fringe];
            // the locks start well up on the cap and fall over the forehead (from its edge they were only stubs)
            const base = Math.max(cap.top, 0.22) + 0.34;
            const width = 1.3 / spec.n;
            const strands: P2[][] = [];
            for (let i = 0; i < spec.n; i++) {
                const x = -0.65 + (1.3 * (i + 0.5)) / spec.n;
                // alternate lengths so the row is not a saw; wispy and low hang longer in the middle
                const long = i % 2 === 0 ? 0 : 0.07;
                const sweep = spec.parted ? Math.sign(x || 1) * spec.sweep : spec.sweep;
                // the middle locks hang longest, the outer ones curve up toward the temples
                const tipY = spec.tip + long + x * x * 0.3;
                if (tipY >= base - 0.05) continue;
                piece(
                    front,
                    `hair-lock${i}`,
                    'hair',
                    [
                        onFace(x - width * 0.7, base, 0.02),
                        onFace(x + width * 0.7, base, 0.02),
                        onFace(x + sweep * 0.08 - width * 0.25, (base + tipY) / 2, 0.035),
                        onFace(x + sweep * 0.08 + width * 0.25, (base + tipY) / 2, 0.035),
                        onFace(x + sweep * 0.16, tipY, 0.02),
                    ],
                    // over the brows, as the reference sheets draw a fringe
                    headDepth + rz * 1.3 + 0.001 * (i + 1),
                    true,
                );
                // a strand line down every other lock (the inner lines of drawn hair)
                if (i % 2 === 0) {
                    const a = toScreen(ctx, onFace(x + width * 0.2, base - 0.08, 0.04));
                    const b = toScreen(
                        ctx,
                        onFace(x + sweep * 0.12 + width * 0.1, tipY + 0.1, 0.04),
                    );
                    strands.push([
                        [a[0], a[1]],
                        [b[0], b[1]],
                    ]);
                }
            }
            const ink = ctx.outline(ctx.fill.hair);
            if (ink && strands.length)
                ctx.parts.push({
                    key: 'hair-strands',
                    group: 'hair',
                    role: 'line',
                    d: strands.map(([a, b]) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`).join(''),
                    fill: 'none',
                    stroke: ink,
                    strokeWidth: ctx.line * 0.45,
                    depth: headDepth + rz * 1.3 + 0.02,
                });
        }

        // side locks before the ears, for hair with some length
        if ((def.back?.floor ?? 0) < -0.25 && cap.top <= 0.35 && facing > -0.6)
            for (const sx of [-1, 1])
                piece(
                    front,
                    `hair-side${sx}`,
                    'hair',
                    [
                        at(sx * 0.98, 0.32, 0.18),
                        at(sx * 0.9, 0.3, 0.5),
                        at(sx * 1.0, -0.05, 0.38),
                        at(sx * 1.02, -0.38, 0.3),
                    ],
                    frontDepth - 0.002,
                    true,
                );
    }

    // the fills (no outline), then one outline round each group just behind its fills
    for (const p of [...back, ...front]) {
        addSurface(
            ctx,
            p.key,
            'hair',
            p.role,
            p.poly,
            p.d,
            p.depth,
            rx * 2,
            false,
            p.key === 'hair-front' || p.key === 'hair-back' ? [p.poly] : [],
        );
    }
    // the cap and the back keep the style's hair gradient; every lock and spike takes the colour at the cap's lower
    // end (a gradient per lock made the fringe a band of its own over the cap)
    const cap = ctx.parts.find((x) => x.key === 'hair-front')?.fill;
    const lockFill =
        cap && typeof cap === 'object' ? cap.stops[cap.stops.length - 1][1] : ctx.fill.hair;
    for (const p of [...back, ...front]) {
        if (p.key === 'hair-front' || p.key === 'hair-back' || p.role !== 'hair') continue;
        const part = ctx.parts.find((x) => x.key === p.key);
        if (part) part.fill = lockFill;
    }
    const ink = ctx.outline(ctx.fill.hair);
    if (!ink) return;
    for (const [key, list] of [
        ['hair-outline-back', back],
        ['hair-outline-front', front],
    ] as const)
        if (list.length)
            ctx.parts.push({
                key,
                group: 'hair',
                role: 'line',
                d: list.map((p) => p.d).join(''),
                fill: 'none',
                stroke: ink,
                strokeWidth: 2 * ctx.line,
                depth: Math.min(...list.map((p) => p.depth)) - 0.0005,
            });
}
