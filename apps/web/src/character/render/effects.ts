import type { V3 } from '../rig/math';
import { hasEffects, type Effects } from '../schema/effects';
import type { Ctx, Part } from './parts';
import type { P2 } from './shapes';

/**
 * Effects on hair and hanging cloth (2026-11-27; schema/effects.ts): a displacement field in the world, applied to
 * every point of a generator while it runs (`withField`: `toScreen` moves the point before projecting it), so a skirt
 * or a ponytail bends the same in every view and pose with no change to its shape code. A point moves by how far it
 * hangs below its anchor (the crown for hair, the waist for cloth), so the roots stay and the ends fly.
 *
 * `anchor` is the world point the stretch hangs from (x, z: the body's axis for twirl and wet), `length` how long the
 * stretch is (cm): a point that far below the anchor takes the full effect.
 */
export interface Field {
    anchor: V3;
    length: number;
    /** how far below the anchor the free stretch starts (hair: the chin; the fringe and sides lie on the head) */
    start: number;
    /** how much a point at the anchor still moves (a fringe flutters a little in the wind) */
    base: number;
    /** wet: how close it pulls in to the axis (hair hangs flat; cloth clings less than hair) */
    cling: number;
    /** updraft: how high the ends go, in lengths (hair flies up past the crown; a skirt only flares up) */
    lift: number;
    /** updraft: how far the ends fan out (hair floats out round the head, behind which straight-up hair hides) */
    spread: number;
    /** the part group the wet drops belong to */
    group: Part['group'];
    /** wet drops at the far parts' depth (hair: its ends hang behind the back) rather than the near ones' */
    dripsBehind: boolean;
}

export function effectWarp(e: Effects, f: Field): ((p: V3) => V3) & { hung: () => number } {
    const a = (e.windDir * Math.PI) / 180;
    const dir: V3 = [Math.cos(a), 0, Math.sin(a)];
    const L = f.length;
    let hung = 0;
    const warp = (p: V3): V3 => {
        const below = Math.max(0, (f.anchor[1] - f.start - p[1]) / L);
        // how much of the effect a point takes: the free stretch below `start` (the cap and fringe stay on the head
        // when hair lifts or flares); wind bends it from the anchor down and stirs the roots a little (`base`)
        const k = Math.min(1.6, below) ** 1.4;
        const fromTop = Math.max(0, (f.anchor[1] - p[1]) / L);
        const kw = f.base + (1 - f.base) * Math.min(1.6, fromTop) ** 1.4;
        hung = Math.max(hung, below);
        const rx = p[0] - f.anchor[0];
        const rz = p[2] - f.anchor[2];
        const r = Math.hypot(rx, rz) || 1;
        // wet: in toward the axis (flat, close), before the rest pushes it out
        const pull = 1 - e.wet * f.cling * Math.min(1, 0.35 + below);
        let x = f.anchor[0] + rx * pull;
        let z = f.anchor[2] + rz * pull;
        let y = p[1];
        // wind: along its direction, and up a little (hair streams, not just leans)
        const w = e.wind * L * 0.6 * kw;
        x += dir[0] * w;
        z += dir[2] * w;
        y += e.wind * L * 0.12 * kw;
        // updraft: up (hair past the crown, standing up and out; a hem only so far), and a little open
        y += e.updraft * L * f.lift * k;
        const open = (e.updraft * f.spread + e.twirl * 0.55) * L * k;
        x += (rx / r) * open;
        z += (rz / r) * open;
        // twirl: the flared hem rises a little with the spin
        y += e.twirl * L * 0.15 * k;
        return [x, y, z];
    };
    /** how far below `start` the lowest point reached (in lengths): hair that ends at the jaw has nothing to drip */
    return Object.assign(warp, { hung: () => hung });
}

/**
 * Run `draw` with the field applied to every point it projects; nothing changes without effects. Wet: drops fall from
 * the lowest points it drew (the ends of the hair, the hem), whatever the style or the pose.
 */
export function withField(ctx: Ctx, e: Effects | undefined, f: () => Field, draw: () => void) {
    if (!hasEffects(e)) return draw();
    const field = f();
    const prev = ctx.warp;
    const from = ctx.points.length;
    const parts = ctx.parts.length;
    const warp = effectWarp(e, field);
    ctx.warp = warp;
    try {
        draw();
    } finally {
        ctx.warp = prev;
    }
    if (e.wet > 0.05 && ctx.parts.length > parts && warp.hung() > 0.1)
        addDrops(ctx, e.wet, ctx.points.slice(from), field, ctx.parts.slice(parts));
}

/** A few drops under the lowest points, spread across (more when wetter), in front of what was drawn. */
function addDrops(ctx: Ctx, wet: number, pts: P2[], field: Field, drawn: Part[]) {
    const group = field.group;
    const s = ctx.line * 2.6;
    const want = Math.round(2 + wet * 3);
    const picked: P2[] = [];
    for (const p of [...pts].sort((a, b) => b[1] - a[1])) {
        if (picked.length >= want) break;
        if (picked.every((q) => Math.abs(q[0] - p[0]) > s * 6)) picked.push(p);
    }
    // hair drips from its ends, which hang behind the back: at the back hair's depth, so the body hides those
    // drops; a hem drips in front of the legs
    const depths = drawn.map((x) => x.depth);
    const depth = (field.dripsBehind ? Math.min(...depths) : Math.max(...depths)) + 0.01;
    const paint = ctx.paint('#a9d6f5');
    // a skirt and a long top both drop: keys stay unique (and the same from one render to the next)
    const tag = ctx.parts.length;
    picked.forEach(([x, y0], i) => {
        // falling: the further drops are smaller, a step below the one before
        const y = y0 + s * (2.5 + (i % 2) * 2.5);
        const r = s * (1 - (i % 3) * 0.18);
        ctx.parts.push({
            key: `${group}-drop-${tag}-${i}`,
            group,
            role: 'acc',
            d: `M${x},${y - r * 1.8}C${x + r},${y - r * 0.3} ${x + r},${y + r} ${x},${y + r}C${x - r},${y + r} ${x - r},${y - r * 0.3} ${x},${y - r * 1.8}Z`,
            fill: paint.fill,
            stroke: ctx.outline(paint.fill),
            strokeWidth: ctx.line * 0.5,
            depth,
            ...(paint.tone ? { tone: paint.tone } : {}),
        });
    });
}
