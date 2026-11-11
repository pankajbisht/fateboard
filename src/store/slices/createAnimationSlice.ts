import * as fabric from 'fabric';
import type { StateCreator } from 'zustand';
import {
    MAX_DURATION,
    MIN_DURATION,
    applyTracksAt,
    buildPreset,
    ensureAnimId,
    getAnimId,
    isShownAnimated,
    isTextObject,
    labelOf,
    mergeKeyframes,
    readProps,
    restoreObject,
    sortKeyframes,
    uid,
    usedProps,
    type AnimationData,
    type Bezier,
    type EasingName,
    type Keyframe,
    type PresetId,
    type PropValues,
    type Track,
    type Tracks,
} from '@/animation/engine';
import { absoluteProps } from '@/animation/absoluteProps';
import {
    WEBCODECS_UNSUPPORTED,
    downloadBlob,
    renderMp4Fast,
    renderRealtime,
    renderStill,
    type ContainerFormat,
    type ExportMode,
} from '@/animation/exportVideo';

/** The slice only needs the Fabric canvas from the rest of your store. Rename `canvas` if yours differs. */
export interface AnimationDeps {
    canvas: fabric.Canvas | null;
}

export interface KfRef {
    objectId: string;
    keyframeId: string;
}

export interface ExportSettings {
    mode: ExportMode;
    container: ContainerFormat; // used by 'realtime'
    range: 'full' | 'work';
    width: number; // 0 = canvas size
    height: number;
    fps?: number;
    bitrate: number;
    background: string;
    fileName?: string;
}

export interface ExportState {
    status: 'idle' | 'rendering' | 'done' | 'error';
    progress: number;
    message?: string;
}

interface Snapshot {
    tracks: Tracks;
    animDuration: number;
}

export interface AnimationSlice {
    animDuration: number;
    animFps: number;
    currentTime: number;
    isPlaying: boolean;
    loop: boolean;
    playbackRate: number;
    autoKey: boolean;
    snap: boolean;
    workIn: number;
    workOut: number | null; // null = end of timeline
    tracks: Tracks;
    selectedKeyframes: KfRef[];
    keyframeClipboard: { objectId: string; offset: number; kf: Keyframe }[];
    past: Snapshot[];
    future: Snapshot[];
    exportState: ExportState;

    setAnimDuration: (ms: number) => void;
    setAnimFps: (fps: number) => void;
    setLoop: (v: boolean) => void;
    setPlaybackRate: (v: number) => void;
    setAutoKey: (v: boolean) => void;
    setSnap: (v: boolean) => void;
    setWorkArea: (inMs: number, outMs: number | null) => void;

    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    stop: () => void;
    /** Plays [from, to] once and stops at `to`, whatever loop / the work area say (preset preview). */
    previewRange: (from: number, to: number) => void;
    seek: (ms: number) => void;
    stepFrames: (n: number) => void;

    beginEdit: (coalesceKey?: string) => void;
    /** Keyframe history (Q1: renamed from undo / redo, which are the canvas history). */
    animUndo: () => void;
    animRedo: () => void;

    addKeyframe: (time?: number) => void;
    updateKeyframe: (
        objectId: string,
        keyframeId: string,
        patch: { time?: number; props?: PropValues },
    ) => void;
    /** Applies to every selected keyframe. `bezier: null` clears a custom curve. */
    updateSelectedCurve: (patch: { easing?: EasingName; bezier?: Bezier | null }) => void;
    moveSelectedTo: (anchor: KfRef, time: number) => void;
    nudgeSelected: (deltaMs: number) => void;
    deleteSelected: () => void;
    selectKeyframe: (ref: KfRef | null, additive?: boolean) => void;
    selectAllKeyframes: () => void;
    copyKeyframes: () => void;
    pasteKeyframes: () => void;
    selectObject: (objectId: string) => void;
    toggleMute: (objectId: string) => void;

    applyPreset: (
        presetId: PresetId,
        opts: { start: number; duration: number; stagger?: number; repeat?: number },
    ) => boolean;
    clearTrack: (objectId: string) => void;
    clearAllAnimations: () => void;

    /** Call once from the panel; returns a disposer. Enables auto-key recording. */
    bindAutoKey: () => () => void;

    exportVideo: (settings: ExportSettings) => Promise<void>;
    cancelExport: () => void;

    getAnimationData: () => AnimationData;
    /** `keepHistory`: a page switch keeps the keyframe history of each page (Q7, BUG-141). */
    loadAnimationData: (data: AnimationData, options?: { keepHistory?: boolean }) => void;

    /**
     * Always-on canvas listeners (registered by the canvas slice with its other events): an
     * object edited while shown at rest updates its track's rest state, so mute / clear track /
     * saving never bring back a stale position (BUG-011).
     */
    registerAnimationEvents: (canvas: fabric.Canvas) => void;
    unregisterAnimationEvents: (canvas: fabric.Canvas) => void;
}

let rafId = 0;
let lastTs = 0;
let exportCtl: AbortController | null = null;
let lastHistoryKey = '';
let lastHistoryAt = 0;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const sameRef = (a: KfRef, b: KfRef) => a.objectId === b.objectId && a.keyframeId === b.keyframeId;

export const createAnimationSlice: StateCreator<
    AnimationDeps & AnimationSlice,
    [],
    [],
    AnimationSlice
> = (set, get, store) => {
    const getCanvas = () => get().canvas;
    let offRestEvents: (() => void) | null = null;
    let preview: [number, number] | null = null; // span of a running previewRange

    // Track edits are document changes: autosave the project (pages keep the tracks, BUG-010).
    // Keyframe history per page (Q7, BUG-141): park the page you leave, bring back the one you open.
    const pageHistory = new Map<string, { past: Snapshot[]; future: Snapshot[] }>();
    store?.subscribe?.((next, prev) => {
        const nextPage = (next as unknown as { currentPageId?: string | null }).currentPageId;
        const prevPage = (prev as unknown as { currentPageId?: string | null }).currentPageId;
        if (nextPage !== prevPage) {
            if (prevPage) pageHistory.set(prevPage, { past: next.past, future: next.future });
            if (prevPage !== null && prevPage !== undefined) {
                const back = nextPage ? pageHistory.get(nextPage) : undefined;
                set({ past: back?.past ?? [], future: back?.future ?? [] });
            }
        }
        if (
            next.tracks !== prev.tracks ||
            next.animDuration !== prev.animDuration ||
            next.animFps !== prev.animFps ||
            next.workIn !== prev.workIn ||
            next.workOut !== prev.workOut
        ) {
            (get() as unknown as { persist?: () => void }).persist?.();
        }
    });

    const refreshOne = (obj: fabric.FabricObject, tracks: Tracks): Tracks | null => {
        const id = getAnimId(obj);
        const tr = id ? tracks[id] : undefined;
        if (!tr) return null;
        const live = absoluteProps(obj);
        let rest: Track['rest'];
        let fullText = tr.fullText;
        if (!isShownAnimated(obj)) {
            // shown at rest: what you see IS the rest state
            rest = live;
            if (isTextObject(obj)) fullText = (obj as unknown as { text: string }).text;
        } else {
            // shown animated: only the props this track does not animate are rest values
            const animated = new Set<string>(usedProps(tr));
            rest = { ...tr.rest };
            for (const [k, v] of Object.entries(live)) {
                if (!animated.has(k)) (rest as Record<string, unknown>)[k] = v;
            }
        }
        if (JSON.stringify(rest) === JSON.stringify(tr.rest) && fullText === tr.fullText)
            return null;
        return {
            ...tracks,
            [tr.objectId]: { ...tr, rest, ...(fullText !== undefined ? { fullText } : {}) },
        };
    };

    /** Keeps `rest` in step with edits made outside the animation (see registerAnimationEvents). */
    const refreshRest = (obj: fabric.FabricObject | undefined) => {
        const s = get();
        if (!obj || s.autoKey || s.isPlaying) return;
        const objs = obj instanceof fabric.ActiveSelection ? obj.getObjects() : [obj];
        let tracks = s.tracks;
        let changed = false;
        for (const o of objs) {
            const next = refreshOne(o, tracks);
            if (next) {
                tracks = next;
                changed = true;
            }
        }
        if (changed) set({ tracks });
    };
    const range = (): [number, number] => {
        if (preview) return preview;
        const { workIn, workOut, animDuration } = get();
        const out = clamp(workOut ?? animDuration, 0, animDuration);
        return [clamp(workIn, 0, out), out];
    };

    const applyAt = (t: number) => {
        const c = getCanvas();
        if (!c) return;
        applyTracksAt(c, get().tracks, t);
        c.requestRenderAll();
    };

    /** Pushes an undo snapshot. Calls sharing a `key` within 800 ms collapse into one step (typing, dragging). */
    const pushHistory = (key?: string) => {
        const now = Date.now();
        if (key && key === lastHistoryKey && now - lastHistoryAt < 800) {
            lastHistoryAt = now;
            return;
        }
        lastHistoryKey = key ?? '';
        lastHistoryAt = now;
        const s = get();
        set({
            past: [...s.past.slice(-99), { tracks: s.tracks, animDuration: s.animDuration }],
            future: [],
        });
    };

    /** Runs fn with absolute-coordinate objects (an ActiveSelection stores children relative to the group). */
    const withTargets = <T>(fn: (objs: fabric.FabricObject[]) => T): T | undefined => {
        const c = getCanvas();
        if (!c) return undefined;
        const objs = c.getActiveObjects();
        if (!objs.length) return undefined;
        const multi = c.getActiveObject() instanceof fabric.ActiveSelection;
        if (multi) c.discardActiveObject();
        try {
            return fn(objs);
        } finally {
            if (multi) {
                c.setActiveObject(new fabric.ActiveSelection(objs, { canvas: c }));
                c.requestRenderAll();
            }
        }
    };

    const ensureTrack = (tracks: Tracks, obj: fabric.FabricObject): Track => {
        const id = ensureAnimId(obj);
        if (!tracks[id]) {
            tracks[id] = {
                objectId: id,
                label: labelOf(obj),
                rest: readProps(obj),
                keyframes: [],
                ...(isTextObject(obj)
                    ? { fullText: (obj as unknown as { text: string }).text }
                    : {}),
            };
        }
        return tracks[id];
    };

    /** Earliest and latest time among the selected keyframes ([Infinity, -Infinity] when none). */
    const selectedSpan = (): [number, number] => {
        const { tracks, selectedKeyframes } = get();
        const times = selectedKeyframes.flatMap((ref) => {
            const k = tracks[ref.objectId]?.keyframes.find((x) => x.id === ref.keyframeId);
            return k ? [k.time] : [];
        });
        return [Math.min(...times), Math.max(...times)];
    };

    const mapSelected = (fn: (k: Keyframe, track: Track) => Keyframe) => {
        const sel = get().selectedKeyframes;
        if (!sel.length) return;
        const tracks = { ...get().tracks };
        for (const ref of sel) {
            const tr = tracks[ref.objectId];
            if (!tr) continue;
            tracks[ref.objectId] = {
                ...tr,
                keyframes: sortKeyframes(
                    tr.keyframes.map((k) => (k.id === ref.keyframeId ? fn(k, tr) : k)),
                ),
            };
        }
        set({ tracks });
        applyAt(get().currentTime);
    };

    /** Undo (`past`) / redo (`future`): swaps the newest snapshot of that stack with the live tracks. */
    const stepHistory = (from: 'past' | 'future') => {
        const s = get();
        const snap = s[from][s[from].length - 1];
        if (!snap) return;
        get().pause();
        const c = getCanvas();
        // a track the snapshot does not have leaves its object at rest, not mid-animation (BUG-180)
        if (c)
            for (const tr of Object.values(s.tracks))
                if (!snap.tracks[tr.objectId]) restoreObject(c, tr);
        const to = from === 'past' ? 'future' : 'past';
        set({
            [from]: s[from].slice(0, -1),
            [to]: [...s[to], { tracks: s.tracks, animDuration: s.animDuration }],
            tracks: snap.tracks,
            animDuration: snap.animDuration,
            selectedKeyframes: [],
        } as Partial<AnimationSlice>);
        applyAt(get().currentTime);
    };

    const tick = (now: number) => {
        const s = get();
        if (!s.isPlaying) return;
        const [a, b] = range();
        let t = s.currentTime + (now - lastTs) * s.playbackRate;
        lastTs = now;
        if (t >= b) {
            if (s.loop && b > a && !preview) {
                t = a + ((t - a) % (b - a));
            } else {
                preview = null;
                applyAt(b);
                set({ currentTime: b, isPlaying: false });
                return;
            }
        }
        applyAt(t);
        set({ currentTime: t });
        rafId = requestAnimationFrame(tick);
    };

    return {
        animDuration: 5000,
        animFps: 30,
        currentTime: 0,
        isPlaying: false,
        loop: false,
        playbackRate: 1,
        autoKey: false,
        snap: true,
        workIn: 0,
        workOut: null,
        tracks: {},
        selectedKeyframes: [],
        keyframeClipboard: [],
        past: [],
        future: [],
        exportState: { status: 'idle', progress: 0 },

        setAnimDuration: (ms) => {
            pushHistory('duration');
            set({ animDuration: clamp(Math.round(ms), MIN_DURATION, MAX_DURATION) });
        },
        setAnimFps: (fps) => set({ animFps: clamp(Math.round(fps), 1, 120) }),
        setLoop: (loop) => set({ loop }),
        setPlaybackRate: (playbackRate) => set({ playbackRate }),
        setAutoKey: (autoKey) => set({ autoKey }),
        setSnap: (snap) => set({ snap }),
        setWorkArea: (inMs, outMs) => {
            const d = get().animDuration;
            const o = outMs === null ? null : clamp(Math.round(outMs), 0, d);
            set({
                workIn: clamp(Math.round(inMs), 0, o ?? d),
                workOut: o !== null && o >= d ? null : o,
            });
        },

        play: () => {
            if (get().isPlaying || get().exportState.status === 'rendering') return;
            const [a, b] = range();
            if (get().currentTime >= b - 1 || get().currentTime < a) get().seek(a);
            lastTs = performance.now();
            set({ isPlaying: true });
            rafId = requestAnimationFrame(tick);
        },
        pause: () => {
            preview = null;
            cancelAnimationFrame(rafId);
            if (get().isPlaying) set({ isPlaying: false });
        },
        togglePlay: () => (get().isPlaying ? get().pause() : get().play()),
        stop: () => {
            get().pause();
            get().seek(range()[0]);
        },
        previewRange: (from, to) => {
            if (get().exportState.status === 'rendering') return;
            get().pause();
            const a = clamp(from, 0, get().animDuration);
            preview = [a, clamp(to, a, get().animDuration)];
            get().seek(a);
            get().play();
        },
        seek: (ms) => {
            const t = clamp(ms, 0, get().animDuration);
            set({ currentTime: t });
            applyAt(t);
        },
        stepFrames: (n) => {
            get().pause();
            const frame = 1000 / get().animFps;
            const cur = Math.round(get().currentTime / frame);
            get().seek(Math.round((cur + n) * frame));
        },

        /* ───────── history ───────── */
        beginEdit: (key) => pushHistory(key),
        animUndo: () => stepHistory('past'),
        animRedo: () => stepHistory('future'),

        /* ───────── keyframes ───────── */
        addKeyframe: (time) => {
            const t = Math.round(time ?? get().currentTime);
            pushHistory();
            withTargets((objs) => {
                const tracks = { ...get().tracks };
                for (const obj of objs) {
                    const tr = ensureTrack(tracks, obj);
                    const incoming: Keyframe = {
                        id: uid(),
                        time: t,
                        props: readProps(obj),
                        easing: 'easeInOutQuad',
                    };
                    tracks[tr.objectId] = {
                        ...tr,
                        keyframes: mergeKeyframes(tr.keyframes, [incoming]),
                    };
                }
                set({ tracks });
            });
        },

        updateKeyframe: (objectId, keyframeId, patch) => {
            const tr = get().tracks[objectId];
            if (!tr) return;
            pushHistory(`kf:${keyframeId}`);
            const keyframes = sortKeyframes(
                tr.keyframes.map((k) =>
                    k.id !== keyframeId
                        ? k
                        : {
                              ...k,
                              time:
                                  patch.time !== undefined
                                      ? clamp(Math.round(patch.time), 0, get().animDuration)
                                      : k.time,
                              props: patch.props ? { ...k.props, ...patch.props } : k.props,
                          },
                ),
            );
            set({ tracks: { ...get().tracks, [objectId]: { ...tr, keyframes } } });
            applyAt(get().currentTime);
        },

        updateSelectedCurve: ({ easing, bezier }) => {
            pushHistory('curve');
            mapSelected((k) => ({
                ...k,
                easing: easing ?? k.easing,
                bezier:
                    bezier === undefined ? (easing ? undefined : k.bezier) : (bezier ?? undefined),
            }));
        },

        moveSelectedTo: (anchor, time) => {
            const { tracks, animDuration } = get();
            const anchorKf = tracks[anchor.objectId]?.keyframes.find(
                (k) => k.id === anchor.keyframeId,
            );
            if (!anchorKf) return;
            const [min, max] = selectedSpan();
            if (!isFinite(min)) return;
            const delta = clamp(Math.round(time - anchorKf.time), -min, animDuration - max);
            if (!delta) return;
            mapSelected((k) => ({ ...k, time: k.time + delta }));
        },
        nudgeSelected: (deltaMs) => {
            const { animDuration } = get();
            const [min, max] = selectedSpan();
            if (!isFinite(min)) return;
            const delta = clamp(deltaMs, -min, animDuration - max);
            if (!delta) return;
            pushHistory('nudge');
            mapSelected((k) => ({ ...k, time: k.time + delta }));
        },

        deleteSelected: () => {
            const sel = get().selectedKeyframes;
            if (!sel.length) return;
            pushHistory();
            const tracks = { ...get().tracks };
            for (const ref of sel) {
                const tr = tracks[ref.objectId];
                if (tr)
                    tracks[ref.objectId] = {
                        ...tr,
                        keyframes: tr.keyframes.filter((k) => k.id !== ref.keyframeId),
                    };
            }
            set({ tracks, selectedKeyframes: [] });
            applyAt(get().currentTime);
        },

        selectKeyframe: (ref, additive = false) => {
            if (!ref) return set({ selectedKeyframes: [] });
            const cur = get().selectedKeyframes;
            const has = cur.some((r) => sameRef(r, ref));
            if (additive)
                set({
                    selectedKeyframes: has ? cur.filter((r) => !sameRef(r, ref)) : [...cur, ref],
                });
            else if (!has || cur.length > 1) set({ selectedKeyframes: has ? cur : [ref] });
        },
        selectAllKeyframes: () =>
            set({
                selectedKeyframes: Object.values(get().tracks).flatMap((t) =>
                    t.keyframes.map((k) => ({ objectId: t.objectId, keyframeId: k.id })),
                ),
            }),

        copyKeyframes: () => {
            const { selectedKeyframes, tracks } = get();
            const items = selectedKeyframes
                .map((ref) => ({
                    objectId: ref.objectId,
                    kf: tracks[ref.objectId]?.keyframes.find((k) => k.id === ref.keyframeId),
                }))
                .filter((x): x is { objectId: string; kf: Keyframe } => !!x.kf);
            if (!items.length) return;
            const base = Math.min(...items.map((i) => i.kf.time));
            set({
                keyframeClipboard: items.map((i) => ({
                    objectId: i.objectId,
                    offset: i.kf.time - base,
                    kf: i.kf,
                })),
            });
        },
        pasteKeyframes: () => {
            const { keyframeClipboard, currentTime, animDuration } = get();
            if (!keyframeClipboard.length) return;
            pushHistory();
            const tracks = { ...get().tracks };
            const pasted: KfRef[] = [];
            let maxEnd = animDuration;
            for (const item of keyframeClipboard) {
                const tr = tracks[item.objectId];
                if (!tr) continue;
                const copy: Keyframe = {
                    ...item.kf,
                    id: uid(),
                    props: { ...item.kf.props },
                    time: Math.round(currentTime + item.offset),
                };
                tracks[item.objectId] = { ...tr, keyframes: mergeKeyframes(tr.keyframes, [copy]) };
                pasted.push({
                    objectId: item.objectId,
                    keyframeId: tracks[item.objectId].keyframes.find(
                        (k) => Math.abs(k.time - copy.time) < 1,
                    )!.id,
                });
                maxEnd = Math.max(maxEnd, copy.time);
            }
            set({
                tracks,
                selectedKeyframes: pasted,
                animDuration: Math.min(MAX_DURATION, maxEnd),
            });
            applyAt(get().currentTime);
        },

        selectObject: (objectId) => {
            const c = getCanvas();
            const obj = c?.getObjects().find((o) => getAnimId(o) === objectId);
            if (c && obj) {
                c.setActiveObject(obj);
                c.requestRenderAll();
            }
        },
        toggleMute: (objectId) => {
            const tr = get().tracks[objectId];
            if (!tr) return;
            set({ tracks: { ...get().tracks, [objectId]: { ...tr, muted: !tr.muted } } });
            applyAt(get().currentTime);
        },

        applyPreset: (presetId, { start, duration, stagger = 0, repeat = 1 }) => {
            pushHistory();
            const ok = withTargets((objs) => {
                const tracks = { ...get().tracks };
                let maxEnd = get().animDuration;
                let applied = 0;
                objs.forEach((obj) => {
                    // typewriter only makes sense on text
                    if (presetId === 'typewriter' && !isTextObject(obj)) return;
                    const tr = ensureTrack(tracks, obj);
                    const s = Math.round(start + applied * stagger);
                    const kfs = buildPreset(
                        presetId,
                        obj,
                        tr.rest,
                        s,
                        Math.round(duration),
                        repeat,
                    );
                    tracks[tr.objectId] = { ...tr, keyframes: mergeKeyframes(tr.keyframes, kfs) };
                    maxEnd = Math.max(maxEnd, kfs[kfs.length - 1]?.time ?? s + duration);
                    applied++;
                });
                if (!applied) return false;
                set({
                    tracks,
                    animDuration: Math.min(MAX_DURATION, Math.ceil(maxEnd / 100) * 100),
                });
                return true;
            });
            if (ok) applyAt(get().currentTime);
            return !!ok;
        },

        clearTrack: (objectId) => {
            const tr = get().tracks[objectId];
            if (!tr) return;
            pushHistory();
            const tracks = { ...get().tracks };
            delete tracks[objectId];
            const c = getCanvas();
            if (c) {
                restoreObject(c, tr);
                c.requestRenderAll();
            }
            set({
                tracks,
                selectedKeyframes: get().selectedKeyframes.filter((r) => r.objectId !== objectId),
            });
        },
        clearAllAnimations: () => {
            get().pause();
            pushHistory();
            const c = getCanvas();
            if (c) {
                Object.values(get().tracks).forEach((tr) => restoreObject(c, tr));
                c.requestRenderAll();
            }
            set({ tracks: {}, currentTime: 0, selectedKeyframes: [] });
        },

        bindAutoKey: () => {
            const c = getCanvas();
            if (!c) return () => {};

            // Capture each object's rest state at selection time so the first auto-key has a baseline.
            const onSelect = (e: { selected?: fabric.FabricObject[] }) => {
                if (!get().autoKey || get().isPlaying) return;
                const objs = e.selected ?? [];
                if (objs.length !== 1) return;
                const tracks = { ...get().tracks };
                ensureTrack(tracks, objs[0]);
                set({ tracks });
            };

            const onModified = (e: { target?: fabric.FabricObject }) => {
                const obj = e.target;
                const s = get();
                if (!s.autoKey || s.isPlaying || !obj || obj instanceof fabric.ActiveSelection)
                    return;
                pushHistory('autokey');
                const tracks = { ...get().tracks };
                const tr = ensureTrack(tracks, obj);
                const time = Math.round(s.currentTime);
                let keyframes = tr.keyframes;
                if (!keyframes.length && time > 0) {
                    keyframes = mergeKeyframes(keyframes, [
                        { id: uid(), time: 0, props: { ...tr.rest }, easing: 'easeInOutQuad' },
                    ]);
                }
                keyframes = mergeKeyframes(keyframes, [
                    { id: uid(), time, props: readProps(obj), easing: 'easeInOutQuad' },
                ]);
                tracks[tr.objectId] = { ...tr, keyframes };
                set({ tracks });
            };

            const offs = [
                c.on('selection:created', onSelect),
                c.on('selection:updated', onSelect),
                c.on('object:modified', onModified),
            ];
            return () => offs.forEach((off) => off());
        },

        /* ───────── export ───────── */
        exportVideo: async (settings) => {
            const canvas = getCanvas();
            if (!canvas || get().exportState.status === 'rendering') return;

            get().pause();
            const prevTime = get().currentTime;
            canvas.discardActiveObject();
            // Export what the board shows (BUG-026): the design page has an identity viewport (exactly
            // the page); the whiteboard keeps its current view. Resetting it exported the scene corner.

            const { tracks, animDuration } = get();
            const [from, to] = settings.range === 'work' ? range() : [0, animDuration];
            const fps = settings.fps ?? get().animFps;
            const width = settings.width || canvas.getWidth();
            const height = settings.height || canvas.getHeight();
            const base = {
                canvas,
                from,
                to,
                fps,
                width,
                height,
                bitrate: settings.bitrate,
                background: settings.background,
                onProgress: (p: number) =>
                    set({ exportState: { status: 'rendering', progress: p } }),
                renderFrame: (t: number) => {
                    applyTracksAt(canvas, tracks, t, false);
                },
            };

            exportCtl = new AbortController();
            const signal = exportCtl.signal;
            const name = settings.fileName || 'animation';
            set({ exportState: { status: 'rendering', progress: 0 } });

            try {
                let file: string;
                if (settings.mode === 'png') {
                    base.renderFrame(prevTime);
                    downloadBlob(await renderStill(base), (file = `${name}.png`));
                } else {
                    let done = false;
                    if (settings.mode === 'mp4-fast') {
                        try {
                            downloadBlob(
                                await renderMp4Fast({ ...base, signal }),
                                (file = `${name}.mp4`),
                            );
                            done = true;
                        } catch (err) {
                            if (!(err instanceof Error && err.message === WEBCODECS_UNSUPPORTED))
                                throw err;
                            // fall through to realtime
                        }
                    }
                    if (!done) {
                        const { blob, ext } = await renderRealtime({
                            ...base,
                            signal,
                            format: settings.container,
                        });
                        downloadBlob(blob, (file = `${name}.${ext}`));
                    }
                }
                set({ exportState: { status: 'done', progress: 1, message: `Saved ${file!}` } });
            } catch (err) {
                const cancelled = err instanceof DOMException && err.name === 'AbortError';
                set({
                    exportState: cancelled
                        ? { status: 'idle', progress: 0 }
                        : {
                              status: 'error',
                              progress: 0,
                              message: err instanceof Error ? err.message : 'Export failed',
                          },
                });
            } finally {
                exportCtl = null;
                get().seek(prevTime);
            }
        },
        cancelExport: () => exportCtl?.abort(),

        getAnimationData: () => ({
            version: 2,
            duration: get().animDuration,
            fps: get().animFps,
            workIn: get().workIn,
            workOut: get().workOut,
            tracks: get().tracks,
        }),
        loadAnimationData: (data, { keepHistory = false } = {}) => {
            get().pause();
            set({
                animDuration: data.duration,
                animFps: data.fps,
                workIn: data.workIn ?? 0,
                workOut: data.workOut ?? null,
                tracks: data.tracks ?? {},
                currentTime: 0,
                selectedKeyframes: [],
                ...(keepHistory ? {} : { past: [], future: [] }),
            });
            applyAt(0);
        },

        registerAnimationEvents: (canvas) => {
            offRestEvents?.();
            const onModified = (e: { target?: fabric.FabricObject }) => refreshRest(e.target);
            const off = canvas.on('object:modified', onModified);
            offRestEvents = () => {
                off();
                offRestEvents = null;
            };
        },

        unregisterAnimationEvents: () => {
            offRestEvents?.();
        },
    };
};
