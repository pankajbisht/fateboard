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
    // one side's strap and armhole, from the armpit up to the strap's inner edge (sx: -1 / 1)
    const side = (sx: number): P2[] => [
        ...chaikin(
            [
                [4.3, 0.98],
                [3.9, 0.8],
                [3.4, 0.62],
                [2.6, 0.6],
                [1.6, 0.64],
                [1, 0.66],
            ].map(([k, c]) => xy(at(k, sx * c))),
            2,
        ),
        // the strap's inner edge; a covered top runs on to the base of the neck
        xy(scoop ? at(1, sx * 0.4) : at(0, sx * 0.9)),
    ];
    const left = side(-1);
    const right = side(1);
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
    // the bottom: a little under the armpit ring, so it overlaps the torso's cloth (ending on the ring, the edge of the
    // skin under it showed as a light line across the top)
    const bottom = [0.99, 0.5, 0, -0.5, -0.99].map((c) => xy(at(4.5, c)));
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
    edge('tank-armhole-l', left.slice(0, -1), [true, false]);
    edge('tank-armhole-r', right.slice(0, -1), [true, false]);
    if (scoop) edge('tank-neckline', neck, [false, false]);
}
