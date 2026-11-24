import { resolveFace } from '../data/emotions';
import { apply, normalize, type M3, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import type { Character } from '../schema/types';
import { addFaceAccessories } from './accessoriesFace';
import { project } from './camera';
import { on, type Ctx } from './parts';
import { curve3, ellipse, insideConvex, lens, polyline, type P2 } from './shapes';
import { MANGA_INK, MANGA_PAPER, darken, mixColor } from './styles';
import { EYE_SHAPES, eyeOutline, lashPath, starPath } from './faceEyes';
import { BROW_SHAPES } from './faceFeatures';

/**
 * The face on the 2.5D head (docs/CHARACTER_STUDIO.md phase 2): eyes with gaze, blink and pupil size, brows that
 * raise and tilt, a mouth that opens, rounds and shows teeth (emotions and lip-sync shapes), blush and tears.
 * Every feature sits on the head's surface: it slides round, foreshortens, and is hidden when it turns away
 * or would leave the head's drawn outline (BUG-253: an eye poking past the hair seen from behind).
 */
export interface HeadGeo {
    rx: number;
    ry: number;
    rz: number;
    /** head ellipsoid centre in the head joint's frame */
    hc: V3;
    /** head rotation in the world */
    R: M3;
    /** depth the face sits at */
    depth: number;
    /** the head's drawn outline in screen space (convex) */
    outline: P2[];
}

type Feature = { facing: number; screen: V3 };

export function addFace(ctx: Ctx, skel: Skeleton, c: Character, g: HeadGeo) {
    const { pack } = ctx;
    const manga = pack.palette === 'manga';
    const { rx, ry, rz, hc, R, depth } = g;
    const p = resolveFace(c.face, c.emotion);

    const surf = (lon: number, lat: number, out = 1): Feature => {
        const u: V3 = [Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat)];
        const local: V3 = [
            hc[0] + u[0] * rx * out,
            hc[1] + u[1] * ry * out,
            hc[2] + u[2] * rz * out,
        ];
        const n = normalize(apply(R, normalize([u[0] / rx, u[1] / ry, u[2] / rz])));
        return {
            facing: project(ctx.view, n)[2],
            screen: project(ctx.view, on(ctx, 'head', local)),
        };
    };
    const xy = (f: Feature): P2 => [f.screen[0], f.screen[1]];
    // screen direction and squash of the head's sideways axis (eyes foreshorten along it)
    const side = project(ctx.view, apply(R, [1, 0, 0]));
    const squash = Math.hypot(side[0], side[1]);
    const tilt = (Math.atan2(side[1], side[0]) * 180) / Math.PI;
    const ux = Math.cos((tilt * Math.PI) / 180);
    const uy = Math.sin((tilt * Math.PI) / 180);
    const ink = manga ? MANGA_INK : darken(ctx.fill.skin, 0.75);
    const lineW = skel.height * pack.face.featureLine;
    /** visible: faces the viewer and lies inside the head's outline (centre and `reach` to each side) */
    const shows = (f: Feature, reach = 0) =>
        f.facing > 0.12 &&
        [
            [0, 0],
            [reach, 0],
            [-reach, 0],
        ].every(([k]) => insideConvex(g.outline, [f.screen[0] + ux * k, f.screen[1] + uy * k]));
    const push = (
        key: string,
        d: string,
        fill: string,
        stroke: string | null,
        w = lineW,
        bias = 0,
        tone = 0,
    ) =>
        ctx.parts.push({
            key,
            group: 'head',
            role: stroke && fill === 'none' ? 'line' : 'feature',
            d,
            fill,
            stroke,
            strokeWidth: w,
            depth: depth + bias,
            ...(tone ? { tone } : {}),
        });

    const f = c.face;
    const kid = skel.height / skel.headHeight < 6.2 ? 1.15 : 1;
    // eyes are sized against the drawn head, then by the style (anime big and tall, realistic small)
    // (against the style's head scale, not the drawn one: a manga body draws a smaller head and keeps the same face)
    const shape = EYE_SHAPES[f.eyeStyle];
    const er =
        (rx / Math.sqrt(pack.proportion.headScale)) * 0.17 * kid * pack.eyes.scale * shape.size;
    const baseRy = er * pack.eyes.tall * shape.tall;
    const eyeRy = baseRy * Math.max(0.0001, p.eyeOpen);
    const shut = p.eyeOpen < 0.2;
    const irisFill = manga ? MANGA_INK : ctx.tint(f.eyeColor);

    for (const sx of [-1, 1]) {
        const k = sx < 0 ? 'R' : 'L';
        const eye = surf(sx * 0.36, -0.1);
        const w = er * Math.max(0.25, squash);
        const [ex, ey] = xy(eye);
        // toward the outer corner on screen: sharp eyes lift it, droopy ones drop it (an almond, faceEyes.ts)
        const outer: P2 = [sx * ux, sx * uy];

        // cheeks first, so the eyes sit over them
        if (p.blush > 0.05) {
            const cheek = surf(sx * 0.5, -0.33);
            const bw = rx * 0.14 * Math.max(0.25, squash);
            if (shows(cheek, bw))
                push(
                    `blush${k}`,
                    ellipse(xy(cheek), bw, ry * 0.07, tilt),
                    manga
                        ? MANGA_PAPER
                        : mixColor(ctx.fill.skin, '#ff5d6c', 0.55 * Math.min(1, p.blush)),
                    null,
                    0,
                    -0.005,
                    manga ? 0.25 : 0,
                );
        }

        // visible like a round eye of the style: a bigger eye style must not hide the far eye earlier in a ¾ view
        if (shows(eye, w / shape.size)) {
            if (shut) {
                // a closed eye: a sleeping curve, or an arch when laughing
                const mid: P2 = [ex, ey + (p.arch ? -1 : 0.7) * baseRy * 0.55];
                push(`eye${k}`, curve3([ex - w, ey], mid, [ex + w, ey]), 'none', ink, lineW * 1.3);
            } else {
                push(
                    `eye${k}`,
                    eyeOutline([ex, ey], w, eyeRy, tilt, outer, shape.lift) ??
                        ellipse([ex, ey], w, eyeRy, tilt),
                    '#ffffff',
                    ink,
                    lineW * 0.8,
                );
                // gaze moves the iris and pupil inside the white
                const irisW = w * pack.eyes.iris;
                const irisH = eyeRy * (pack.eyes.iris + 0.1);
                const gx = f.gaze.x * Math.max(0, w - irisW) * 0.9;
                const gy = f.gaze.y * Math.max(0, eyeRy - irisH) * 0.9;
                const ix = ex + ux * gx;
                const iy = ey + uy * gx - gy;
                push(`iris${k}`, ellipse([ix, iy], irisW, irisH, tilt), irisFill, null, 0, 0.01);
                push(
                    `pupil${k}`,
                    ellipse([ix, iy], w * 0.3 * p.pupil, eyeRy * 0.36 * p.pupil, tilt),
                    '#120c0a',
                    null,
                    0,
                    0.02,
                );
                push(
                    `shine${k}`,
                    ellipse([ix - irisW * 0.3, iy - irisH * 0.3], er * 0.16, er * 0.16),
                    '#ffffff',
                    null,
                    0,
                    0.03,
                );
                if (pack.eyes.shine === 2)
                    push(
                        `shine2${k}`,
                        ellipse([ix + irisW * 0.25, iy + irisH * 0.28], er * 0.08, er * 0.08),
                        '#ffffff',
                        null,
                        0,
                        0.03,
                    );
                if (f.eyeStyle === 'sparkle') {
                    // big shojo eyes: a star highlight and a second small one
                    const star: P2 = [ix - irisW * 0.28, iy - irisH * 0.38];
                    push(`sparkle${k}`, starPath(star, er * 0.3), '#ffffff', null, 0, 0.035);
                    push(
                        `sparkleDot${k}`,
                        ellipse([ix + irisW * 0.4, iy - irisH * 0.1], er * 0.06, er * 0.06),
                        '#ffffff',
                        null,
                        0,
                        0.035,
                    );
                }
                if (f.lashes)
                    push(
                        `lash${k}`,
                        lashPath([ex, ey], w, eyeRy, tilt, outer, shape.lift),
                        'none',
                        // darker than the brows (hair colour) so the two lines do not merge into one clump
                        manga ? MANGA_INK : darken(ctx.fill.hair, 0.7),
                        lineW * 1.1,
                        0.045,
                    );
                if (f.eyeStyle === 'sleepy')
                    push(
                        `lid${k}`,
                        `M${ex - w * 1.1} ${ey}A${w * 1.1} ${eyeRy * 1.1} ${tilt} 0 1 ${ex + w * 1.1} ${ey}Z`,
                        ctx.fill.skin,
                        ink,
                        lineW * 0.8,
                        0.04,
                        ctx.tone.skin, // a manga lid is toned like the face
                    );
            }
            if (p.tears > 0.05)
                push(
                    `tear${k}`,
                    ellipse(
                        [ex + ux * w * 0.5, ey + baseRy * 1.7],
                        w * 0.2,
                        baseRy * 0.6 * p.tears,
                        0,
                    ),
                    manga ? MANGA_PAPER : '#8fd3ff',
                    ink,
                    lineW * 0.6,
                    0.05,
                );
        }

        // brows rise and tilt (inner end first); they ride above the eye's own height
        // bigger eyes (sparkle) push the brows up so they do not sit on the lids
        const bs = BROW_SHAPES[f.browStyle];
        const browY =
            bs.y +
            p.browRaise * 0.1 +
            (p.eyeOpen - 1) * 0.04 +
            Math.max(0, shape.size * shape.tall - 1) * 0.12;
        const b1 = surf(sx * 0.18, browY + bs.inner - p.browTilt * 0.07);
        const b2 = surf(sx * 0.36, browY + bs.mid + Math.abs(p.browTilt) * 0.01);
        const b3 = surf(sx * 0.54, browY + bs.outer + p.browTilt * 0.05);
        if (shows(b2, w))
            push(
                `brow${k}`,
                polyline([xy(b1), xy(b2), xy(b3)]),
                'none',
                manga ? MANGA_INK : darken(ctx.fill.hair, 0.3),
                lineW * bs.width,
            );
    }

    const nose = surf(0, -0.3, 1.04);
    if (shows(nose, rx * 0.07)) {
        const [nx, ny] = xy(nose);
        const d =
            f.noseStyle === 'dot'
                ? ellipse([nx, ny], rx * 0.045, rx * 0.04)
                : f.noseStyle === 'line'
                  ? polyline([
                        [nx, ny - ry * 0.12],
                        [nx, ny],
                    ])
                  : curve3([nx - rx * 0.07, ny], [nx, ny + ry * 0.03], [nx + rx * 0.07, ny]);
        push(
            'nose',
            d,
            f.noseStyle === 'dot' ? (manga ? MANGA_INK : darken(ctx.fill.skin, 0.25)) : 'none',
            manga ? MANGA_INK : darken(ctx.fill.skin, 0.45),
            lineW * 0.9,
        );
    }

    // seen from below the underside shows: the jaw's edge and the nostrils under the nose
    const below = project(ctx.view, apply(R, [0, -1, 0]))[2];
    if (below > 0.5) {
        const jawL = surf(-0.62, -0.62);
        const jawM = surf(0, -0.98, 1.02);
        const jawR = surf(0.62, -0.62);
        if (shows(jawM, rx * 0.4))
            push('jaw-line', curve3(xy(jawL), xy(jawM), xy(jawR)), 'none', ink, lineW * 1.1, -0.02);
        for (const sx of [-1, 1]) {
            const n = surf(sx * 0.07, -0.33, 1.05);
            if (shows(n))
                push(
                    `nostril${sx < 0 ? 'R' : 'L'}`,
                    ellipse(xy(n), rx * 0.03 * Math.max(0.4, squash), rx * 0.02),
                    ink,
                    null,
                    0,
                    0.02,
                );
        }
    }

    // mouth: corners widen or narrow, the middle dips for a smile and lifts for a frown, opening adds a lower lip
    const half = 0.24 * p.mouthWidth;
    const lat = -0.5;
    const ml = surf(-half, lat);
    const mr = surf(half, lat);
    const mm = surf(0, lat - 0.02 - p.mouthCurve * 0.16);
    if (shows(mm, Math.abs(xy(mr)[0] - xy(ml)[0]) / 2)) {
        if (p.mouthOpen > 0.06) {
            const top = surf(0, lat + 0.01 - p.mouthCurve * 0.03);
            const bottom = surf(0, lat - 0.02 - p.mouthCurve * 0.1 - p.mouthOpen * 0.24);
            push(
                'mouth',
                lens(xy(ml), xy(top), xy(bottom), xy(mr)),
                manga ? MANGA_INK : '#7a2a2a',
                ink,
                lineW * 0.9,
            );
            if (p.teeth) {
                const tb = surf(
                    0,
                    lat + 0.01 - p.mouthCurve * 0.03 - Math.min(0.1, p.mouthOpen * 0.1),
                );
                const tl = surf(-half * 0.8, lat + 0.005);
                const tr = surf(half * 0.8, lat + 0.005);
                push('teeth', lens(xy(tl), xy(top), xy(tb), xy(tr)), '#ffffff', null, 0, 0.01);
            }
        } else if (f.mouthStyle === 'cat') {
            // ω: two small dips meeting in a point under the nose
            const mid = surf(0, lat + 0.015);
            const dl = surf(-half * 0.5, lat - 0.045);
            const dr = surf(half * 0.5, lat - 0.045);
            push(
                'mouth',
                curve3(xy(ml), xy(dl), xy(mid)) + curve3(xy(mid), xy(dr), xy(mr)),
                'none',
                ink,
                lineW,
            );
        } else push('mouth', curve3(xy(ml), xy(mm), xy(mr)), 'none', ink, lineW);
        if (f.mouthStyle === 'fang') {
            // one small fang under the lip on the character's left, following the smile's dip
            const dip = (x: number) => lat - 0.02 - p.mouthCurve * 0.16 * (1 - (x / half) ** 2);
            const fx = half * 0.42;
            const a = surf(fx - half * 0.07, dip(fx - half * 0.07));
            const b = surf(fx + half * 0.07, dip(fx + half * 0.07));
            const tip = surf(fx + half * 0.02, dip(fx) - 0.075);
            push(
                'fang',
                polyline([xy(a), xy(tip), xy(b)]) + 'Z',
                '#ffffff',
                ink,
                lineW * 0.6,
                0.01,
            );
        }
    }

    addFaceAccessories(ctx, c, {
        at: (lon, lat, out = 1) => {
            const e = surf(lon, lat, out);
            return { facing: e.facing, p: xy(e) };
        },
        shows: (lon, lat, reach) => shows(surf(lon, lat), reach),
        eye: er * Math.max(0.25, squash),
        tilt,
        depth,
        lineW,
    });
}
