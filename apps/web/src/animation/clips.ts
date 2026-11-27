import type { Canvas, FabricObject } from 'fabric';
import { applyTracksAt, type Tracks } from './engine';

/**
 * Fight clips on the timeline (docs/COMBAT_PACK.md, owner decision Q1): a clip group holds one cached drawing per
 * frame (`scene/board.ts` `buildFightClipObject`); at time t only the drawing for t is visible. Stepped, never
 * redrawn, no allocation per frame. Runs wherever the timeline is applied (scrub, play, video / GIF export).
 */
interface ClipTiming {
    start: number;
    fps: number;
    count: number;
    first: number;
    /** the over-the-fighters layer (−1: none) and the first whole frame (it is hidden from there on) */
    over: number;
    fullFrom: number;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The clip timing on a page object, or null for any other object (or broken data). */
export function clipTiming(obj: unknown): ClipTiming | null {
    const raw = (obj as { fightClip?: Record<string, unknown> } | null)?.fightClip;
    if (!raw || typeof raw !== 'object') return null;
    const { start, fps, count, first } = raw;
    if (!finite(start) || !finite(fps) || !finite(count) || !finite(first)) return null;
    if (fps <= 0 || count < 1) return null;
    const over = finite(raw.over) ? Math.floor(raw.over) : -1;
    const fullFrom = finite(raw.fullFrom) ? Math.floor(raw.fullFrom) : Math.floor(count);
    return {
        start,
        fps,
        count: Math.floor(count),
        first: Math.max(0, Math.floor(first)),
        over,
        fullFrom,
    };
}

/** The clip frame shown at time t (ms): held on the first before the start and on the last after the end. */
export const clipFrameAt = (c: ClipTiming, t: number) =>
    Math.min(c.count - 1, Math.max(0, Math.floor(((t - c.start) / 1000) * c.fps)));

/** Shows each clip's frame for time t. True when anything changed (the caller renders once). */
export function applyClipsAt(canvas: Canvas, t: number): boolean {
    let changed = false;
    for (const o of canvas.getObjects()) {
        const c = clipTiming(o);
        if (!c) continue;
        const kids = (o as FabricObject & { getObjects?: () => FabricObject[] }).getObjects?.();
        if (!kids) continue;
        const frame = clipFrameAt(c, t);
        const show = c.first + frame;
        let dirty = false;
        const overKid = c.over >= 0 ? kids[c.over] : undefined;
        if (overKid && overKid.visible !== frame < c.fullFrom) {
            overKid.visible = frame < c.fullFrom;
            dirty = true;
        }
        for (let i = c.first; i < Math.min(kids.length, c.first + c.count); i++) {
            const visible = i === show;
            if (kids[i].visible !== visible) {
                kids[i].visible = visible;
                dirty = true;
            }
        }
        if (dirty) {
            o.set({ dirty: true });
            changed = true;
        }
    }
    return changed;
}

/** The timeline at time t: keyframed tracks, then fight clips. */
export function applyTimelineAt(canvas: Canvas, tracks: Tracks, t: number, updateCoords = true) {
    applyTracksAt(canvas, tracks, t, updateCoords);
    applyClipsAt(canvas, t);
}
