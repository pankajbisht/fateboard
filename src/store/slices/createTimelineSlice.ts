import type { Canvas } from 'fabric';
import { uiPrefsStorage } from '@/lib/storage';
import { createAnimationOverlay } from '@/animation/overlay/animationOverlay';
import type { Tracks } from '@/animation/engine';
import type { SliceCreator } from '../types';

/**
 * The bottom timeline dock and its board overlays (owner request 2026-11-17: animation lives at the bottom,
 * as in other animation tools). View state only, per browser (`uiPrefsStorage` section `timeline`): the
 * animation itself stays in the Animation slice and the page document.
 *
 * Overlays (onion skin, motion path) are painted by `paintAnimationOverlay`, which the layer compositor
 * calls through its `paintOverlay` hook (createPageLayersSlice): only on the editor's own canvas, only while
 * the timeline is open.
 */

export const TIMELINE_MIN_HEIGHT = 160;
export const TIMELINE_MAX_HEIGHT = 1200;
export const TIMELINE_DEFAULT_HEIGHT = 300;
const PREFS_SECTION = 'timeline';
/** One write after a drag or a burst of changes settles. */
const SAVE_DELAY_MS = 400;

export interface OnionSkin {
    on: boolean;
    /** ghosts on each side of the playhead */
    count: number;
    /** frames between two ghosts */
    step: number;
    /** opacity of the nearest ghost (farther ones fade) */
    opacity: number;
}

export const ONION_DEFAULTS: OnionSkin = { on: false, count: 2, step: 3, opacity: 0.35 };
export const ONION_LIMITS = {
    count: [1, 3],
    step: [1, 30],
    opacity: [0.05, 0.8],
} as const;

export interface TimelinePrefs {
    open: boolean;
    height: number;
    onionSkin: OnionSkin;
    motionPath: boolean;
}

const clamp = (v: number, [a, b]: readonly [number, number]) => Math.min(b, Math.max(a, v));
const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;

function sanitizeOnion(raw: unknown, base: OnionSkin): OnionSkin {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
        on: typeof o.on === 'boolean' ? o.on : base.on,
        count: Math.round(clamp(num(o.count, base.count), ONION_LIMITS.count)),
        step: Math.round(clamp(num(o.step, base.step), ONION_LIMITS.step)),
        opacity: clamp(num(o.opacity, base.opacity), ONION_LIMITS.opacity),
    };
}

/** Saved preferences → valid values (anything missing or broken falls back to the default). */
export function sanitizeTimelinePrefs(raw: unknown): TimelinePrefs {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
        open: o.open === true,
        height: Math.round(
            clamp(num(o.height, TIMELINE_DEFAULT_HEIGHT), [
                TIMELINE_MIN_HEIGHT,
                TIMELINE_MAX_HEIGHT,
            ]),
        ),
        onionSkin: sanitizeOnion(o.onionSkin, ONION_DEFAULTS),
        motionPath: o.motionPath === true,
    };
}

export interface TimelineSlice {
    /** The bottom timeline dock is open. Closing it pauses playback and turns auto-key off (BUG-181). */
    timelineOpen: boolean;
    /** Height of the dock in CSS px (the dock never takes more than 70 % of the window). */
    timelineHeight: number;
    /** Ghosts of the frames before (red) and after (green) the playhead, while paused. */
    onionSkin: OnionSkin;
    /** Show where animated objects travel (dashed path, a dot per frame, a diamond per keyframe). */
    motionPath: boolean;
    setTimelineOpen: (open: boolean) => void;
    toggleTimeline: () => void;
    setTimelineHeight: (px: number) => void;
    setOnionSkin: (patch: Partial<OnionSkin>) => void;
    setMotionPath: (on: boolean) => void;
    /** Paints the overlays on a context in scene coordinates (layer compositor `paintOverlay`). */
    paintAnimationOverlay: (ctx: CanvasRenderingContext2D) => void;
}

type Peers = TimelineSlice & {
    canvas?: Canvas | null;
    tracks?: Tracks;
    currentTime?: number;
    animFps?: number;
    animDuration?: number;
    isPlaying?: boolean;
    exportState?: { status: string };
};

export const createTimelineSlice: SliceCreator<TimelineSlice> = (set, get, store) => {
    const peers = () => get() as Peers;
    const saved = sanitizeTimelinePrefs(uiPrefsStorage.load(PREFS_SECTION));
    const overlay = createAnimationOverlay();
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const save = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveTimer = null;
            const s = peers();
            const prefs: TimelinePrefs = {
                open: s.timelineOpen,
                height: s.timelineHeight,
                onionSkin: s.onionSkin,
                motionPath: s.motionPath,
            };
            if (!uiPrefsStorage.save(PREFS_SECTION, prefs))
                console.error('[timeline] could not save the timeline preferences');
        }, SAVE_DELAY_MS);
    };

    // a view change repaints the board (only the overlay changes, but it is painted with the objects)
    store?.subscribe?.((next: Peers, prev: Peers) => {
        const view =
            next.timelineOpen !== prev.timelineOpen ||
            next.onionSkin !== prev.onionSkin ||
            next.motionPath !== prev.motionPath;
        if (view || next.timelineHeight !== prev.timelineHeight) save();
        if (!view) return;
        if (!next.timelineOpen || (!next.onionSkin.on && !next.motionPath)) overlay.release();
        next.canvas?.requestRenderAll();
    });

    return {
        timelineOpen: saved.open,
        timelineHeight: saved.height,
        onionSkin: saved.onionSkin,
        motionPath: saved.motionPath,

        setTimelineOpen: (open) => set({ timelineOpen: open }),
        toggleTimeline: () => set({ timelineOpen: !peers().timelineOpen }),
        setTimelineHeight: (px) => {
            if (!Number.isFinite(px)) return;
            const h = Math.round(clamp(px, [TIMELINE_MIN_HEIGHT, TIMELINE_MAX_HEIGHT]));
            if (h !== peers().timelineHeight) set({ timelineHeight: h });
        },
        setOnionSkin: (patch) =>
            set({ onionSkin: sanitizeOnion({ ...peers().onionSkin, ...patch }, ONION_DEFAULTS) }),
        setMotionPath: (on) => set({ motionPath: on }),

        paintAnimationOverlay: (ctx) => {
            const s = peers();
            if (!s.timelineOpen || !s.canvas || (!s.onionSkin.on && !s.motionPath)) return;
            try {
                overlay.paint(ctx, {
                    canvas: s.canvas,
                    tracks: s.tracks ?? {},
                    time: s.currentTime ?? 0,
                    fps: s.animFps ?? 30,
                    duration: s.animDuration ?? 0,
                    busy: !!s.isPlaying || s.exportState?.status === 'rendering',
                    onionSkin: s.onionSkin,
                    motionPath: s.motionPath,
                });
            } catch (err) {
                // a broken overlay must never break the board's render
                console.error('[timeline] overlay paint failed', err);
            }
        },
    };
};
