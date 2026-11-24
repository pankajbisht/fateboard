import type { FabricObject } from 'fabric';
import { sampleTrack, type PropValues, type Track } from '../engine';
import { captureLook, putBackLook, showSample } from './objectLook';

/**
 * Onion skin: the frames before (red) and after (green) the playhead, drawn faintly over the board. Each
 * ghost is rendered once into its own small bitmap in scene coordinates (only the box the moving objects
 * cover), so panning only redraws the bitmaps; a new frame, an edit or a big zoom change renders them again.
 */
export interface GhostTime {
    time: number;
    side: 'before' | 'after';
    alpha: number;
}

export interface Ghost {
    canvas: HTMLCanvasElement;
    /** scene box the bitmap covers */
    x: number;
    y: number;
    w: number;
    h: number;
    alpha: number;
}

export interface Animated {
    obj: FabricObject;
    track: Track;
}

export const GHOST_TINT = { before: '#ef4444', after: '#16a34a' } as const;
/** How strongly the tint covers the ghost's own colours (details stay readable). */
const TINT_STRENGTH = 0.6;
/** Pixel cap per ghost bitmap; past it the bitmap is rendered at a lower resolution. */
export const MAX_GHOST_PX = 4_000_000;

/**
 * Ghost times around `t`: `count` on each side, `step` frames apart, inside the timeline. Farther ghosts
 * are fainter (down to half the opacity).
 */
export function ghostTimes(
    t: number,
    o: { fps: number; duration: number; count: number; step: number; opacity: number },
): GhostTime[] {
    const frame = 1000 / o.fps;
    const out: GhostTime[] = [];
    for (let i = 1; i <= o.count; i++) {
        const alpha = o.opacity * (1 - ((i - 1) / o.count) * 0.5);
        const d = i * o.step * frame;
        if (t - d >= 0) out.push({ time: Math.round(t - d), side: 'before', alpha });
        if (t + d <= o.duration) out.push({ time: Math.round(t + d), side: 'after', alpha });
    }
    return out;
}

export function sameSample(a: PropValues, b: PropValues): boolean {
    const ka = Object.keys(a) as (keyof PropValues)[];
    if (ka.length !== Object.keys(b).length) return false;
    return ka.every((k) => a[k] === b[k]);
}

/** Scene box of the objects as they look now. */
function sceneBox(items: Animated[]) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const { obj } of items) {
        const r = obj.getBoundingRect();
        minX = Math.min(minX, r.left);
        minY = Math.min(minY, r.top);
        maxX = Math.max(maxX, r.left + r.width);
        maxY = Math.max(maxY, r.top + r.height);
    }
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

/** Draws the objects (shown at the ghost time) into a new tinted bitmap over their scene box. */
function paintGhost(
    items: Animated[],
    side: GhostTime['side'],
    scale: number,
    createBuffer: () => HTMLCanvasElement,
) {
    const box = sceneBox(items);
    if (!box) return null;
    const pad = 2 / scale; // antialiasing and hairline strokes
    const x = box.minX - pad;
    const y = box.minY - pad;
    const w = box.maxX - box.minX + 2 * pad;
    const h = box.maxY - box.minY + 2 * pad;
    if (!(w > 0 && h > 0)) return null;
    const s = Math.min(scale, Math.sqrt(MAX_GHOST_PX / (w * h)));
    const canvas = createBuffer();
    canvas.width = Math.max(1, Math.ceil(w * s));
    canvas.height = Math.max(1, Math.ceil(h * s));
    const b = canvas.getContext('2d');
    if (!b) return null;
    b.setTransform(s, 0, 0, s, -x * s, -y * s);
    for (const { obj } of items) obj.render(b);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = 'source-atop';
    b.globalAlpha = TINT_STRENGTH;
    b.fillStyle = GHOST_TINT[side];
    b.fillRect(0, 0, canvas.width, canvas.height);
    b.globalCompositeOperation = 'source-over';
    b.globalAlpha = 1;
    return { canvas, x, y, w, h };
}

/**
 * Renders the objects that look different at `at.time` than at `now` into one tinted bitmap.
 * `scale` = device px per scene unit of the board (the bitmap is as sharp as the board).
 */
export function renderGhost(
    items: Animated[],
    at: GhostTime,
    now: number,
    scale: number,
    createBuffer: () => HTMLCanvasElement,
): Ghost | null {
    const moving = items.filter(
        ({ track }) => !sameSample(sampleTrack(track, at.time), sampleTrack(track, now)),
    );
    if (!moving.length) return null;
    // one pass: show every object at the ghost time, measure, draw, then always put them back
    const looks = moving.map(({ obj }) => captureLook(obj));
    try {
        for (const { obj, track } of moving) showSample(obj, track, at.time);
        const g = paintGhost(moving, at.side, scale, createBuffer);
        return g ? { ...g, alpha: at.alpha } : null;
    } finally {
        moving.forEach(({ obj }, i) => putBackLook(obj, looks[i]));
    }
}

/** Draws ghost bitmaps on a context that is in scene coordinates (the board's own render). */
export function drawGhosts(ctx: CanvasRenderingContext2D, ghosts: Ghost[]) {
    for (const g of ghosts) {
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.drawImage(g.canvas, g.x, g.y, g.w, g.h);
        ctx.restore();
    }
}

/** Frees the bitmaps' memory now (a 0 × 0 canvas), instead of when they are collected. */
export function freeGhosts(ghosts: Ghost[]) {
    for (const g of ghosts) {
        g.canvas.width = 0;
        g.canvas.height = 0;
    }
}
