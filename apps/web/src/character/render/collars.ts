import type { Collar } from '../data/garments';
import { apply, normalize, type V3 } from '../rig/math';
import type { Skeleton } from '../rig/skeleton';
import { project } from './camera';
import { inkRibbon } from './ink';
import { addShell, ellipsoid, on, ring, toScreen, type Ctx } from './parts';
import { polyline, type P2 } from './shapes';
import { darken } from './styles';

/** Collar and neckline on the chest's front; hidden when the chest turns away (a hood shows from behind). */
export function addCollar(ctx: Ctx, skel: Skeleton, collar: Collar) {
    if (collar === 'none') return;
    const z = skel.size;
    const t = skel.offset.spine2[1] / 0.26;
    const torso = ctx.parts.find((x) => x.key === 'torso');
    if (!torso) return;
    const facing = project(ctx.view, apply(ctx.posed.rot.chest, normalize([0, 0, 1])))[2];
    const depth = torso.depth + 0.4;
    const nw = z.neck * 1.12;
    const ny = t * 0.3;
    const nf = z.neck * 1.1;
    const at = (x: number, y: number, f: number): V3 => on(ctx, 'chest', [x, y, f]);
    const xy = (v: V3): P2 => {
        const s = toScreen(ctx, v);
        return [s[0], s[1]];
    };
    const ink = ctx.outline(ctx.fill.top) ?? darken(ctx.fill.top, 0.4);
    const line = (key: string, d: string) =>
        ctx.parts.push({
            key,
            group: 'torso',
            role: 'line',
            d,
            fill: 'none',
            stroke: ink,
            strokeWidth: ctx.line * 0.8,
            depth,
        });
    const front = z.chestDepth * 0.5;

    if (collar === 'hood') {
        // the hood hangs behind the neck: seen from behind it is the whole back of the collar
        const pts = ellipsoid(
            ctx,
            'chest',
            // a low roll lying on the shoulders behind the neck (a taller one stood up beside the neck like a ball)
            [0, ny - t * 0.01, -z.neck * 1.05],
            [z.neck * 1.9, z.neck * 0.9, z.neck * 1.2],
            () => true,
            5,
            9,
        );
        addShell(ctx, 'collar-hood', 'torso', 'top', pts, torso.depth + (facing > 0 ? -0.6 : 0.6));
        return;
    }
    // front collar lines only while the chest faces the viewer: from the side they stuck out past the neck
    if (facing < 0.4) return;
    if (collar === 'crew') {
        // The neckline: the front half of a ring round the base of the neck, dipping at the front (a curve between two
        // fixed front points ended inside the neck in a three-quarter view). Inside it the opening is skin, from the top
        // of the shirt down to the line: the shirt's colour showed between the neck and the neckline.
        const R = ctx.posed.rot.chest;
        const N = 24;
        const angle = (i: number) => (i / N) * Math.PI * 2;
        const facing = Array.from(
            { length: N },
            (_, i) =>
                project(ctx.view, apply(R, [Math.cos(angle(i)), 0, Math.sin(angle(i))]))[2] > 0,
        );
        const start = facing.findIndex((f, i) => f && !facing[(i - 1 + N) % N]);
        const run: number[] = [];
        for (let k = 0; start >= 0 && k < N && facing[(start + k) % N]; k++)
            run.push((start + k) % N);
        const point = (i: number, dip: boolean) => {
            const a = angle(i);
            const fwd = dip ? Math.max(0, Math.sin(a)) ** 1.5 : 0;
            // the opening's top edge reaches a hair over the shirt's own top edge: on the line a sliver of the shirt's
            // colour showed across the neck at a large zoom; at the front only (at the sides the lifted corners stood above
            // the shoulder line as a tab of skin beside the neck)
            const lift = dip ? 0 : t * 0.012 * Math.max(0, Math.sin(a)) ** 2;
            return xy(
                at(Math.cos(a) * nw * 1.08, ny + lift - t * 0.07 * fwd, Math.sin(a) * nf * 1.02),
            );
        };
        if (run.length >= 3) {
            const top = run.map((i) => point(i, false));
            const edge = run.map((i) => point(i, true));
            ctx.parts.push({
                key: 'neckline',
                group: 'torso',
                role: 'skin',
                d: `${polyline([...top, ...[...edge].reverse()])}Z`,
                fill: ctx.fill.skin,
                stroke: null,
                strokeWidth: 0,
                depth: depth - 0.001,
                ...(ctx.tone.skin ? { tone: ctx.tone.skin } : {}),
            });
            // in the collar's ink (with its fallback: a style without outlines still draws the neckline, as before), on
            // the part that faces forward only: round the side of the neck the ring turns back and, in a three-quarter
            // view, its end curled up as a hook
            const inked = run.filter((i) => Math.sin(angle(i)) > 0.3).map((i) => point(i, true));
            const d = inkRibbon(
                [{ pts: inked.length >= 2 ? inked : edge, taper: [true, true] }],
                ctx.line * 0.75,
            );
            if (d)
                ctx.parts.push({
                    key: 'collar-crew',
                    group: 'torso',
                    role: 'line',
                    d,
                    fill: ink,
                    stroke: null,
                    strokeWidth: 0,
                    depth,
                });
        }
    } else if (collar === 'high') {
        // a tube round the neck: its top ring rides on the neck, so it stays round the neck when the head turns or
        // tilts (two rings on the chest left a block beside the neck)
        const pts = [
            ...ring(ctx, 'chest', ny - t * 0.02, z.neck * 1.25, z.neck * 1.15, 10),
            ...ring(ctx, 'neck', skel.offset.head[1] * 0.95, z.neck * 1.12, z.neck * 1.05, 10),
        ];
        addShell(ctx, 'collar-high', 'torso', 'top', pts, depth);
    } else {
        const deep =
            collar === 'lapel' || collar === 'open' ? 0.34 : collar === 'polo' ? 0.16 : 0.2;
        // the opening: a sharp V of skin with no outline across the neck, and its two edges as lines (a smoothed
        // outlined shell read as a teardrop hanging under the chin)
        const [l, r, tip] = [
            at(-nw * 0.95, ny, nf),
            at(nw * 0.95, ny, nf),
            at(0, ny - t * deep, front),
        ].map(xy);
        ctx.parts.push({
            key: 'neckline',
            group: 'torso',
            role: 'skin',
            d: `${polyline([l, r, tip])}Z`,
            fill: ctx.fill.skin,
            stroke: null,
            strokeWidth: 0,
            depth,
            ...(ctx.tone.skin ? { tone: ctx.tone.skin } : {}),
        });
        line('neckline-v', polyline([l, tip, r]));
        if (collar !== 'v') {
            // Two flaps (a shirt collar, lapels): flat folded triangles of the cloth in a slightly deeper shade with a thin
            // ink edge. (A smoothed outlined shell of three points read as two dark sausages beside the neck.) Each folds
            // out from the opening's own edge: its top corner was above the top of the shirt and wider than the neck, so
            // in a three-quarter view the flaps ran up the neck as a band, and a thin flap beside the V drew three
            // parallel lines.
            for (const sx of [-1, 1]) {
                const flap = [
                    xy(at(sx * nw * 0.95, ny, nf)),
                    xy(at(sx * nw * 0.12, ny - t * deep * 0.92, front)),
                    xy(at(sx * nw * 1.45, ny - t * deep * 0.42, front * 1.02)),
                ];
                ctx.parts.push({
                    key: `collar-flap${sx}`,
                    group: 'torso',
                    role: 'top',
                    d: `${polyline(flap)}Z`,
                    fill: darken(ctx.fill.top, 0.08),
                    stroke: ink,
                    strokeWidth: ctx.line * 0.6,
                    depth: depth + 0.1,
                    ...(ctx.tone.top ? { tone: ctx.tone.top } : {}),
                });
            }
        }
        if (collar === 'open')
            line(
                'zip',
                polyline([
                    xy(at(0, ny - t * deep, front)),
                    xy(on(ctx, 'spine1', [0, 0, z.chestDepth * 0.45 + z.belly])),
                ]),
            );
    }
}
