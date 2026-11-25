import type { FabricObject } from 'fabric';
import { sampleTrack, type Track } from '../engine';

/**
 * Motion path: where an animated object's centre travels, as a dashed line with a dot per frame (the
 * spacing shows the speed, as in After Effects) and a diamond at each position keyframe.
 */
export interface MotionPath {
    /** scene x, y pairs along the path */
    points: number[];
    /** scene x, y pairs of the position keyframes */
    keys: number[];
    /** one point per frame (false when long paths are sampled more sparsely) */
    frameDots: boolean;
}

/** Path colour (brand violet) with a light halo, readable on dark and light art. */
export const PATH_COLOR = '#7c3aed';
const HALO = 'rgba(255, 255, 255, 0.85)';
/** Most points sampled per path (a 10 min timeline at 60 fps would be 36 000 frames). */
export const MAX_PATH_SAMPLES = 400;

const GEOMETRY = ['left', 'top', 'scaleX', 'scaleY', 'angle', 'skewX', 'skewY'] as const;
type Obj = FabricObject & Record<string, unknown>;

const isPositionKey = (k: Track['keyframes'][number]) =>
    k.props.left !== undefined || k.props.top !== undefined;

export const movesPosition = (track: Track) => track.keyframes.filter(isPositionKey).length > 1;

/**
 * Samples the object's centre between its first and last position keyframe. The object's geometry is
 * set directly (no `set`, so no cache is marked dirty) and put back before returning. Every geometry value
 * comes from the track (its absolute rest + the sample), so the path is in scene coordinates even for an
 * object inside a multi-selection, whose own values are relative to the selection.
 */
export function computeMotionPath(obj: FabricObject, track: Track, fps: number): MotionPath | null {
    const keyed = track.keyframes.filter(isPositionKey);
    if (keyed.length < 2) return null;
    const from = keyed[0].time;
    const to = keyed[keyed.length - 1].time;
    if (!(to > from)) return null;

    const o = obj as Obj;
    const saved = GEOMETRY.map((k) => o[k]);
    const center = (t: number): [number, number] => {
        const s = { ...track.rest, ...sampleTrack(track, t) } as Record<string, unknown>;
        for (const k of GEOMETRY) if (typeof s[k] === 'number') o[k] = s[k];
        const p = obj.getRelativeCenterPoint();
        return [p.x, p.y];
    };

    const frame = 1000 / fps;
    const frames = Math.ceil((to - from) / frame);
    const stride = Math.max(1, Math.ceil(frames / MAX_PATH_SAMPLES));
    const points: number[] = [];
    const keys: number[] = [];
    try {
        for (let f = 0; f < frames; f += stride) points.push(...center(from + f * frame));
        points.push(...center(to));
        for (const k of keyed) keys.push(...center(k.time));
    } finally {
        GEOMETRY.forEach((k, i) => {
            o[k] = saved[i];
        });
    }
    return { points, keys, frameDots: stride === 1 };
}

/** Draws a path on a context in scene coordinates; `px` = one device pixel in scene units. */
export function drawMotionPath(ctx: CanvasRenderingContext2D, path: MotionPath, px: number) {
    const p = path.points;
    if (p.length < 4) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.setLineDash([]);
    ctx.lineWidth = 3 * px;
    ctx.strokeStyle = HALO;
    ctx.stroke();
    ctx.setLineDash([5 * px, 4 * px]);
    ctx.lineWidth = 1.5 * px;
    ctx.strokeStyle = PATH_COLOR;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = PATH_COLOR;
    if (path.frameDots) {
        for (let i = 0; i < p.length; i += 2)
            ctx.fillRect(p[i] - px, p[i + 1] - px, 2 * px, 2 * px);
    }
    const r = 5 * px;
    ctx.lineWidth = 1.5 * px;
    ctx.strokeStyle = HALO;
    for (let i = 0; i < path.keys.length; i += 2) {
        const x = path.keys[i];
        const y = path.keys[i + 1];
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}
