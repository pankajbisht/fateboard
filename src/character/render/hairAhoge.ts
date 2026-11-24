import { ACCESSORY_DEFS } from '../data/wardrobe';
import type { Character } from '../schema/types';
import type { HairGeo } from './hair';
import { addSurface, on, toScreen, type Ctx } from './parts';
import { fmt, type P2 } from './shapes';

/**
 * The ahoge (docs/CHARACTER_STUDIO.md, manga look): one strand standing up from the top of the head and curling
 * forward, drawn as a tapering ribbon along a curve in the head's frame, so it turns with the head and shows from
 * every side. Anything worn on the head except a headband hides it; a bald head has none.
 */
const CURVE: [number, number, number][] = [
    // base on the crown, a rise, then the tip bends forward and to one side (head units, like hairStyles.ts)
    [0.04, 1.02, 0.2],
    [0.22, 1.6, 0.3],
    [-0.12, 1.78, 0.55],
];
const STEPS = 10;

export const showsAhoge = (c: Character): boolean => {
    if (!c.hair.ahoge || c.hair.style === 'bald') return false;
    const cover = c.dress.accessories.find((a) => ACCESSORY_DEFS[a.kind].slot === 'head')?.kind;
    return !cover || cover === 'headband';
};

export function addAhoge(ctx: Ctx, c: Character, g: HairGeo) {
    if (!showsAhoge(c)) return;
    const { rx, ry, rz, hc, headDepth, facing } = g;
    const [a, b, e] = CURVE;
    // the centre line: a quadratic curve, projected point by point
    const mid: P2[] = [];
    for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const k = [(1 - t) ** 2, 2 * t * (1 - t), t * t];
        const u = [0, 1, 2].map((j) => k[0] * a[j] + k[1] * b[j] + k[2] * e[j]);
        const s = toScreen(
            ctx,
            on(ctx, 'head', [hc[0] + u[0] * rx, hc[1] + u[1] * ry, hc[2] + u[2] * rz]),
        );
        mid.push([s[0], s[1]]);
    }
    // a ribbon round it: wide at the root, a point at the tip
    const left: P2[] = [];
    const right: P2[] = [];
    mid.forEach((p, i) => {
        const q = mid[Math.min(i + 1, STEPS)];
        const o = mid[Math.max(i - 1, 0)];
        const tx = q[0] - o[0];
        const ty = q[1] - o[1];
        const len = Math.hypot(tx, ty) || 1;
        const w = rx * 0.11 * (1 - i / STEPS) ** 0.8;
        left.push([p[0] - (ty / len) * w, p[1] + (tx / len) * w]);
        right.push([p[0] + (ty / len) * w, p[1] - (tx / len) * w]);
    });
    const poly = [...left, ...right.reverse()];
    const d = `M${poly.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`;
    // just in front of the hair cap (hair.ts) from every side
    const depth = headDepth + rz * (0.7 + 0.1 * facing) + 0.01;
    // no shading pieces: a crescent needs a convex shape, and the strand is thin
    addSurface(ctx, 'hair-ahoge', 'hair', 'hair', poly, d, depth, rx * 0.2, true, []);
}
