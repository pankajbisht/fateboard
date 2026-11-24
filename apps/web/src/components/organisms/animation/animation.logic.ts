/** Pure helpers of the Animation panel: time formatting, timeline snapping, preset timing, keys. */
import { PRESETS, type PresetId, type Tracks } from '@/animation/engine';

/** Timeline geometry (px). The label column leaves room for a readable object name (BUG-177). */
export const LABEL_W = 148;
/** Gap between the label column and 0 s, so a keyframe at 0 s is not cut in half. */
export const LANE_GUTTER = 8;
/** x of 0 s inside the timeline. */
export const LANE_X = LABEL_W + LANE_GUTTER;
export const LANE_PAD = 16;
export const MIN_PPS = 20;
export const MAX_PPS = 400;
/** A dragged keyframe snaps to a target closer than this many px. */
const SNAP_PX = 7;

const pad = (n: number) => String(n).padStart(2, '0');

/** MM:SS:FF at the given frame rate. */
export const timecode = (ms: number, fps: number) => {
    const totalFrames = Math.round((Math.max(0, ms) / 1000) * fps);
    const sec = Math.floor(totalFrames / fps);
    return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}:${pad(totalFrames % fps)}`;
};

/** "0.6 s", "12 s": times in labels and hints. */
export const seconds = (ms: number) => `${+(ms / 1000).toFixed(2)} s`;

export const clampPps = (pps: number) => Math.min(MAX_PPS, Math.max(MIN_PPS, pps));

/** Ruler ticks in seconds: the smallest step that keeps the labels about 48 px apart. */
export function rulerTicks(durationMs: number, pps: number): number[] {
    const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30].find((v) => v * pps >= 48) ?? 60;
    const ticks: number[] = [];
    for (let v = 0; v <= durationMs / 1000 + 1e-6; v += step) ticks.push(+v.toFixed(3));
    return ticks;
}

/** A pointer time → the nearest snap target within reach (when given), else the nearest frame. */
export function snapTime(
    ms: number,
    o: { duration: number; fps: number; pps: number; targets?: number[] },
): number {
    const t = Math.min(o.duration, Math.max(0, ms));
    const reach = (SNAP_PX / o.pps) * 1000;
    let best: number | null = null;
    let bestDistance = reach;
    for (const target of o.targets ?? []) {
        const d = Math.abs(target - t);
        if (d < bestDistance) {
            bestDistance = d;
            best = target;
        }
    }
    if (best !== null) return Math.round(best);
    const frameMs = 1000 / o.fps;
    return Math.round(Math.round(t / frameMs) * frameMs);
}

/** Times a dragged keyframe snaps to: timeline ends, playhead, work area and the other keyframes. */
export function snapTargets(
    st: {
        animDuration: number;
        currentTime: number;
        workIn: number;
        workOut: number | null;
        tracks: Tracks;
    },
    movingIds: Set<string>,
): number[] {
    return [
        0,
        st.animDuration,
        st.currentTime,
        st.workIn,
        ...(st.workOut !== null ? [st.workOut] : []),
        ...Object.values(st.tracks).flatMap((t) =>
            t.keyframes.filter((k) => !movingIds.has(k.id)).map((k) => k.time),
        ),
    ];
}

/** Where a new preset starts. */
export type StartMode = 'playhead' | 'start' | 'after';

/** `after` = right after the last keyframe of the selected objects (builds a sequence). */
export function presetStart(
    mode: StartMode,
    o: { currentTime: number; tracks: Tracks; objectIds: string[] },
): number {
    if (mode === 'start') return 0;
    if (mode === 'playhead') return Math.round(o.currentTime);
    let end = 0;
    for (const id of o.objectIds) {
        const kfs = o.tracks[id]?.keyframes;
        if (kfs?.length) end = Math.max(end, kfs[kfs.length - 1].time);
    }
    return end;
}

/** End of a preset applied to `count` objects: repeats (emphasis only) and the stagger included. */
export function presetEnd(
    id: PresetId,
    start: number,
    duration: number,
    o: { repeat: number; stagger: number; count: number },
): number {
    const cycles = PRESETS.find((p) => p.id === id)?.repeatable ? Math.max(1, o.repeat) : 1;
    return start + duration * cycles + o.stagger * Math.max(0, o.count - 1);
}

export type AnimCommand =
    | 'toggle-play'
    | 'undo'
    | 'redo'
    | 'select-all'
    | 'copy'
    | 'paste'
    | 'delete'
    | 'back'
    | 'forward'
    | 'home'
    | 'end'
    | 'keyframe'
    | 'loop'
    | 'work-in'
    | 'work-out';

interface KeyLike {
    key: string;
    code: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
}

const LETTERS: Record<string, AnimCommand> = {
    k: 'keyframe',
    l: 'loop',
    i: 'work-in',
    o: 'work-out',
};
const NAMED: Record<string, AnimCommand> = {
    Delete: 'delete',
    Backspace: 'delete',
    ArrowLeft: 'back',
    ArrowRight: 'forward',
    Home: 'home',
    End: 'end',
};

/**
 * The panel command of a key press, or null when the key is not the panel's. Plain keys never
 * match with Ctrl / ⌘ / Alt held: ⌘O, ⌘K, ⌘L… belong to the app and the browser (BUG-179).
 */
export function keyCommand(e: KeyLike): AnimCommand | null {
    if (e.altKey) return null;
    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
        if (key === 'z') return e.shiftKey ? 'redo' : 'undo';
        if (e.shiftKey) return null;
        return (
            ({ y: 'redo', a: 'select-all', c: 'copy', v: 'paste' } as Record<string, AnimCommand>)[
                key
            ] ?? null
        );
    }
    if (e.code === 'Space') return 'toggle-play';
    return NAMED[e.key] ?? LETTERS[key] ?? null;
}
