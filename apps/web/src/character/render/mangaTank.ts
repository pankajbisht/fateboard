import { apply, lerp3, type V3 } from '../rig/math';
import { project } from './camera';
import { inkRibbon } from './ink';
import { toScreen, type Ctx } from './parts';
import { chaikin, polyline, type P2 } from './shapes';
import { darken } from './styles';

/**
 * A sleeveless top on the manga body (owner review 2026-11-26). The shoulders and upper chest are bare skin (a loft
 * drawn by mangaTorso.ts, as for a strapless top) and the cloth over them is one panel: two straps on the shoulders,
 * an armhole curving in from each strap to the armpit, and a neckline. Before, the torso was cloth up to the neck and
 * a skin cap was laid over each shoulder: the cloth shoulder stood out above the cap and the cap's straight inner side
 * read as a flat slab stuck on the body.
 *
 * `rings` are the torso's top rings, from the neck base to one below the armpit (mangaTorso.ts: 0 neck base, 1 slope,
 * 2 shoulder point, 3 deltoid, 4 armpit, 5 under the arm). Positions on a ring are given by the cosine of its angle (x across the body:
 * -1 one side, 1 the other), on the front (`back` false) or the back.
 */
export function addTankPanel(
    ctx: Ctx,
    rings: V3[][],
    depth: number,
    /** a scoop neckline (a tank top); false: the cloth runs up to the base of the neck (a vest, a hoodie) */
    scoop: boolean,
) {
    // which side faces the viewer: the front panel, or the back one (no scoop at the back)
    const facing = project(ctx.view, apply(ctx.posed.rot.chest, [0, 0, 1]))[2];
    const back = facing < 0;
    const at = (k: number, c: number): V3 => {
        const r = rings[Math.floor(k)];
        const r2 = rings[Math.min(rings.length - 1, Math.ceil(k))];
        const point = (ring: V3[]) => {
            const a = Math.acos(Math.max(-1, Math.min(1, c))) * (back ? -1 : 1);
            const f =
                ((((a / (Math.PI * 2)) * ring.length) % ring.length) + ring.length) % ring.length;
            const i = Math.floor(f);
            return lerp3(ring[i], ring[(i + 1) % ring.length], f - i);
        };
        return lerp3(point(r), point(r2), k - Math.floor(k));
    };
    const xy = (v: V3): P2 => {
        const s = toScreen(ctx, v);
        return [s[0], s[1]];
    };
    // The top of the shoulder straight above a point on the slope ring's front (same screen x): the highest point of
    // the rings from the neck base to the slope ring there, on the crest of the slope or, nearer the neck, the front of
    // the neck base. The strap climbs to it, keeping its width. Ending on the slope ring's front, the strap's top was a
    // flat cut across the shoulder with a band of skin (the trapezius) above it (owner review 2026-11-27)
    const above = (sx: number, c: number): P2 => {
        const target = xy(at(1, sx * c));
        let best = target;
        for (let k = 0; k <= 1; k += 0.1)
            for (let cc = 0; cc <= 0.98; cc += 0.07) {
                const p = xy(at(k, sx * cc));
                if (Math.abs(p[0] - target[0]) < ctx.line && p[1] < best[1])
                    best = [target[0], p[1]];
            }
        return best;
    };
    // one side's armhole from the armpit up to the strap's outer edge (sx: -1 / 1)
    // The armhole, placed by distance across the body (along the chest's x axis, from the ring's middle) rather than
    // by a share of each ring's width: rings 2 and 3 take in the deltoids and are far wider than the rest, so a fixed
    // share ran the curve out over the shoulder, back in and out again to the armpit, a kink under the strap in a 3/4
    // view (owner review 2026-11-27). From the strap's outer edge it runs straight down, cuts in a little under the
    // shoulder and sweeps out to the armpit.
    const X = apply(ctx.posed.rot.chest, [1, 0, 0]);
    const across = (k: number, c: number, sx: number) => {
        const m = lerp3(at(k, 1), at(k, -1), 0.5);
        const d = (v: V3) => (v[0] - m[0]) * X[0] + (v[1] - m[1]) * X[1] + (v[2] - m[2]) * X[2];
        return d(at(k, sx * c)) * Math.sign(d(at(k, sx)) || 1);
    };
    // the point on ring k's near face this far across the body (bisection on the cosine; across grows with it)
    const atAcross = (k: number, w: number, sx: number): V3 => {
        let lo = 0;
        let hi = 0.99;
        for (let n = 0; n < 12; n++) {
            const mid = (lo + hi) / 2;
            if (across(k, mid, sx) < w) lo = mid;
            else hi = mid;
        }
        return at(k, (sx * (lo + hi)) / 2);
    };
    const armhole = (sx: number): P2[] => {
        const top = across(1, 0.66, sx);
        const pit = across(4.3, 0.98, sx);
        return chaikin(
            [
                [4.3, 1],
                [3.9, 0.56],
                [3.4, 0.07],
                [2.6, -0.04],
                [1.6, 0],
                [1, 0],
            ].map(([k, t]) => xy(atAcross(k, top + (pit - top) * t, sx))),
            2,
        );
    };
    // the armhole, then over the shoulder to the strap's inner edge; a covered top runs on to the base of the neck
    const side = (sx: number, hole: P2[]): P2[] => [
        ...hole,
        above(sx, 0.66),
        ...(scoop ? [above(sx, 0.53), above(sx, 0.4), xy(at(1, sx * 0.4))] : [xy(at(0, sx * 0.9))]),
    ];
    const holeL = armhole(-1);
    const holeR = armhole(1);
    const left = side(-1, holeL);
    const right = side(1, holeR);
    // the neckline from the left strap's inner edge to the right one's: a scoop on the front of a tank top, else the
    // base of the neck
    // the neckline from the left strap's inner edge to the right one's: a scoop on a tank top (deep at the front,
    // shallow at the back; running along the neck base at the back, it stepped up at each strap as a notch of skin),
    // else the base of the neck
    const scoopAt = (deep: number) =>
        chaikin(
            [
                [1, -0.4],
                [1 + deep * 0.5, -0.36],
                [1 + deep * 0.95, -0.2],
                [1 + deep * 1.05, 0],
                [1 + deep * 0.95, 0.2],
                [1 + deep * 0.5, 0.36],
                [1, 0.4],
            ].map(([k, c]) => xy(at(k, c))),
            2,
        );
    const neck: P2[] = scoop
        ? scoopAt(back ? 0.6 : 2)
        : [-0.6, -0.3, 0, 0.3, 0.6].map((c) => xy(at(0, c)));
    // the bottom: on the ring under the arm, so it overlaps the torso's cloth (ending on the armpit ring, the edge of
    // the skin under it showed as a light line across the top) and covers the foot of the bare shoulder's cap, which
    // lies under this cloth (mangaSleeveCap.ts; at 4.5 it stuck out below the armpit as a nub of skin)
    const bottom = [0.99, 0.5, 0, -0.5, -0.99].map((c) => xy(at(rings.length - 1, c)));
    const outline = [...left, ...neck, ...[...right].reverse(), ...bottom];
    ctx.parts.push({
        key: 'tank-panel',
        group: 'torso',
        role: 'top',
        d: `${polyline(outline)}Z`,
        fill: ctx.fill.top,
        stroke: null,
        strokeWidth: 0,
        depth,
        ...(ctx.tone.top ? { tone: ctx.tone.top } : {}),
    });
    // the armholes and the neckline in the cloth's ink; the straps' tops are the shoulder's own outline. With a
    // fallback ink, so a style without outlines draws the same parts (the style test; inkLine draws nothing there)
    const ink = ctx.outline(ctx.fill.top) ?? darken(ctx.fill.top, 0.4);
    const edge = (key: string, pts: P2[], taper: [boolean, boolean]) => {
        const d = inkRibbon([{ pts, taper }], ctx.line * 0.7);
        if (d)
            ctx.parts.push({
                key,
                group: 'torso',
                role: 'line',
                d,
                fill: ink,
                stroke: null,
                strokeWidth: 0,
                depth: depth + 0.001,
            });
    };
    // the armholes and the scoop run on up the straps' sides to the top of the shoulder (left uninked, the strap read
    // as a flat block of colour)
    edge('tank-armhole-l', left.slice(0, holeL.length + 1), [true, true]);
    edge('tank-armhole-r', right.slice(0, holeR.length + 1), [true, true]);
    if (scoop)
        edge(
            'tank-neckline',
            [left[left.length - 2], ...neck, right[right.length - 2]],
            [true, true],
        );
}
