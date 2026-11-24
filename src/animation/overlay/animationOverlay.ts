import type { Canvas } from 'fabric';
import { getAnimId, type Tracks } from '../engine';
import {
    drawGhosts,
    freeGhosts,
    ghostTimes,
    renderGhost,
    type Animated,
    type Ghost,
} from './ghosts';
import { computeMotionPath, drawMotionPath, movesPosition, type MotionPath } from './motionPath';

/**
 * The timeline's board overlay: onion skin and motion paths. Painted by the layer compositor's
 * `paintOverlay` (only on the editor's own canvas element, so never in an export, a thumbnail or a video
 * frame) on a context that is already in scene coordinates. Work is cached: ghosts are rendered again only
 * when the frame, the tracks, the settings, the objects or the zoom (by about 20 %) change; paths only when
 * the tracks, the frame rate or the objects change. A render that changes nothing of that only blits.
 */
export interface OnionSkinOptions {
    on: boolean;
    count: number;
    step: number;
    opacity: number;
}

export interface OverlayInput {
    canvas: Canvas;
    tracks: Tracks;
    time: number;
    fps: number;
    duration: number;
    /** playing or exporting: no ghosts (they would be rendered again every frame) */
    busy: boolean;
    onionSkin: OnionSkinOptions;
    motionPath: boolean;
}

/** Animated objects on the board: tracks that are not muted, with keyframes, whose object is shown. */
export function animatedObjects(canvas: Canvas, tracks: Tracks): Animated[] {
    const ids = Object.keys(tracks);
    if (!ids.length) return [];
    const out: Animated[] = [];
    for (const obj of canvas.getObjects()) {
        const id = getAnimId(obj);
        const track = id ? tracks[id] : undefined;
        if (track && !track.muted && track.keyframes.length && obj.visible !== false)
            out.push({ obj, track });
    }
    return out;
}

const sameKey = (a: unknown[], b: unknown[]) =>
    a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

export function createAnimationOverlay(
    createBuffer: () => HTMLCanvasElement = () => document.createElement('canvas'),
) {
    let ghostKey: unknown[] = [];
    let ghosts: Ghost[] = [];
    let pathKey: unknown[] = [];
    let paths: MotionPath[] = [];

    const dropGhosts = () => {
        freeGhosts(ghosts);
        ghosts = [];
        ghostKey = [];
    };

    /** Frees every cached bitmap and path (overlay turned off, timeline closed). */
    const release = () => {
        dropGhosts();
        paths = [];
        pathKey = [];
    };

    const paint = (ctx: CanvasRenderingContext2D, s: OverlayInput) => {
        const wantGhosts = s.onionSkin.on && !s.busy;
        if (!s.onionSkin.on) dropGhosts();
        if (!s.motionPath) {
            paths = [];
            pathKey = [];
        }
        if (!wantGhosts && !s.motionPath) return;
        const items = animatedObjects(s.canvas, s.tracks);
        if (!items.length) return;
        const m = ctx.getTransform();
        const scale = Math.hypot(m.a, m.b) || 1;
        const objs = items.map((i) => i.obj);

        if (wantGhosts) {
            const o = s.onionSkin;
            const zoomStep = Math.round(Math.log2(scale) * 4);
            const key: unknown[] = [
                s.tracks,
                s.time,
                s.fps,
                s.duration,
                o.count,
                o.step,
                o.opacity,
                zoomStep,
            ];
            // no ghost for objects inside a selection or group (their positions are relative to it,
            // BUG-250) nor for a text being typed in (swapping its text would move the cursor)
            const free = items.filter(
                (i) => !i.obj.group && !(i.obj as { isEditing?: boolean }).isEditing,
            );
            key.push(...free.map((i) => i.obj));
            if (!sameKey(key, ghostKey)) {
                dropGhosts();
                ghostKey = key;
                for (const at of ghostTimes(s.time, { ...o, fps: s.fps, duration: s.duration })) {
                    const g = renderGhost(free, at, s.time, scale, createBuffer);
                    if (g) ghosts.push(g);
                }
            }
            drawGhosts(ctx, ghosts);
        }

        if (s.motionPath) {
            const key: unknown[] = [s.tracks, s.fps, ...objs];
            if (!sameKey(key, pathKey)) {
                pathKey = key;
                paths = [];
                for (const { obj, track } of items) {
                    const p = movesPosition(track) ? computeMotionPath(obj, track, s.fps) : null;
                    if (p) paths.push(p);
                }
            }
            for (const p of paths) drawMotionPath(ctx, p, 1 / scale);
        }
    };

    return { paint, release };
}

export type AnimationOverlay = ReturnType<typeof createAnimationOverlay>;
