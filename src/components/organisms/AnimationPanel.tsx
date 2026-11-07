import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store'; // ← your combined zustand store hook
import {
    COLOR_PROPS,
    NUM_PROPS,
    PRESETS,
    getAnimId,
    isTextObject,
    toHex,
    usedProps,
    type AnimProp,
    type PresetGroup,
    type PresetMeta,
    type PropValues,
} from '@/animation/engine';
import {
    getRealtimeFormats,
    supportsWebCodecs,
    type ContainerFormat,
    type ExportMode,
} from '@/animation/exportVideo';
import type { KfRef } from '@/store/slices/createAnimationSlice';
import { ANIM_CSS, useAnimationTheme } from '../hooks/useAnimationTheme';
import CurveEditor from './CurveEditor';
import { PaintTargetSwatch } from '../molecules/PaintTargetSwatch';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';
import { NumberField } from '../atoms/NumberField';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { Select } from '../atoms/Select';
import { Slider } from '../atoms/Slider';
import LabeledToggle from '../molecules/LabeledToggle';
import { Field as FieldMolecule } from '../molecules/Field';
import { PanelSection } from '../molecules/PanelSection';
import { PanelAction } from '../molecules/PanelAction';

/* ─────────── Styles: shared control recipes + app tokens (docs/DESIGN.md) ─────────── */
const ui = {
    card: 'rounded-lg border border-line bg-surface',
    muted: 'text-ink-muted',
    bg: 'bg-surface',
};

/* ─────────── Utils ─────────── */
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const timecode = (ms: number, fps: number) => {
    const totalFrames = Math.round((Math.max(0, ms) / 1000) * fps);
    const f = totalFrames % fps;
    const sec = Math.floor(totalFrames / fps);
    return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}:${pad(f)}`;
};
const isEditable = (el: EventTarget | null) => {
    const tag = (el as HTMLElement | null)?.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
};

function Section({
    title,
    children,
    defaultOpen = true,
}: {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}) {
    return (
        <PanelSection title={title} collapsible defaultOpen={defaultOpen}>
            {children}
        </PanelSection>
    );
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <FieldMolecule wrap label={label}>
        {children}
    </FieldMolecule>
);

/* ═════════════════════════════ Transport ═════════════════════════════ */
function Transport() {
    const { isPlaying, loop, rate, duration, fps, snap, canUndo, canRedo } = useStore(
        useShallow((s) => ({
            isPlaying: s.isPlaying,
            loop: s.loop,
            rate: s.playbackRate,
            duration: s.animDuration,
            fps: s.animFps,
            snap: s.snap,
            canUndo: s.past.length > 0,
            canRedo: s.future.length > 0,
        })),
    );
    const a = useStore(
        useShallow((s) => ({
            togglePlay: s.togglePlay,
            stop: s.stop,
            stepFrames: s.stepFrames,
            setLoop: s.setLoop,
            setPlaybackRate: s.setPlaybackRate,
            setSnap: s.setSnap,
            undo: s.animUndo,
            redo: s.animRedo,
        })),
    );
    const currentTime = useStore((s) => s.currentTime);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-0.5">
                <IconButton
                    icon={<Icon name="stop" />}
                    onClick={a.stop}
                    title="Stop / back to start (Home)"
                    aria-label="Stop"
                />
                <IconButton
                    icon={<Icon name="step-back" />}
                    onClick={() => a.stepFrames(-1)}
                    title="Previous frame (←)"
                    aria-label="Previous frame"
                />
                <IconButton
                    size="lg"
                    icon={<Icon name={isPlaying ? 'pause' : 'play'} filled />}
                    tone="primary"
                    onClick={a.togglePlay}
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                />
                <IconButton
                    icon={<Icon name="step-forward" />}
                    onClick={() => a.stepFrames(1)}
                    title="Next frame (→)"
                    aria-label="Next frame"
                />
                <IconButton
                    icon={<Icon name="repeat" />}
                    active={loop}
                    onClick={() => a.setLoop(!loop)}
                    title="Loop (L)"
                    aria-label="Loop"
                />
                <div className="ml-auto text-right font-mono text-[11px] tabular-nums leading-tight">
                    {timecode(currentTime, fps)}
                    <div className={`text-[10px] ${ui.muted}`}>{timecode(duration, fps)}</div>
                </div>
            </div>
            <div className="flex items-center gap-0.5">
                <IconButton
                    icon={<Icon name="undo" />}
                    disabled={!canUndo}
                    onClick={a.undo}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                />
                <IconButton
                    icon={<Icon name="redo" />}
                    disabled={!canRedo}
                    onClick={a.redo}
                    title="Redo (Ctrl+Shift+Z)"
                    aria-label="Redo"
                />
                <LabeledToggle label="Snap" checked={snap} onChange={a.setSnap} className="ml-2" />
                <div className="ml-auto">
                    <Select
                        size="sm"
                        block={false}
                        aria-label="Playback speed"
                        value={rate}
                        onChange={a.setPlaybackRate}
                        options={[0.25, 0.5, 1, 1.5, 2].map((r) => ({ value: r, label: `${r}×` }))}
                    />
                </div>
            </div>
        </div>
    );
}

/* ═════════════════════════════ Timeline ═════════════════════════════ */
const LABEL_W = 104;
const PAD = 16;

function Playhead({ pps }: { pps: number }) {
    const t = useStore((s) => s.currentTime);
    return (
        <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-danger"
            style={{ left: LABEL_W + (t / 1000) * pps }}
        >
            <div className="absolute -left-[5px] -top-px h-2.5 w-[11px] rounded-b-sm bg-danger" />
        </div>
    );
}

function Timeline() {
    const s = useStore(
        useShallow((st) => ({
            tracks: st.tracks,
            duration: st.animDuration,
            fps: st.animFps,
            selected: st.selectedKeyframes,
            canvas: st.canvas,
            workIn: st.workIn,
            workOut: st.workOut,
            snap: st.snap,
        })),
    );
    const a = useStore(
        useShallow((st) => ({
            seek: st.seek,
            pause: st.pause,
            beginEdit: st.beginEdit,
            moveSelectedTo: st.moveSelectedTo,
            selectKeyframe: st.selectKeyframe,
            clearTrack: st.clearTrack,
            selectObject: st.selectObject,
            toggleMute: st.toggleMute,
            setWorkArea: st.setWorkArea,
        })),
    );

    const [pps, setPps] = useState(90); // pixels per second
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const scrubbing = useRef(false);
    const workDrag = useRef<'in' | 'out' | null>(null);
    const drag = useRef<{ ref: KfRef; targets: number[]; moved: boolean } | null>(null);

    const frameMs = 1000 / s.fps;
    const outMs = s.workOut ?? s.duration;
    const laneW = (s.duration / 1000) * pps + PAD;
    const rows = Object.values(s.tracks);
    const selSet = useMemo(() => new Set(s.selected.map((r) => r.keyframeId)), [s.selected]);
    const present = useMemo(
        () => new Set(s.canvas?.getObjects().map((o) => getAnimId(o)) ?? []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [s.canvas, s.tracks],
    );

    // Ctrl/⌘ + wheel zooms the timeline
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setPps((p) => Math.min(400, Math.max(20, p * (e.deltaY < 0 ? 1.12 : 1 / 1.12))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const msFromPointer = (clientX: number) => {
        const r = innerRef.current!.getBoundingClientRect();
        return ((clientX - r.left - LABEL_W) / pps) * 1000;
    };
    const quantize = (ms: number, targets?: number[]) => {
        const t = Math.min(s.duration, Math.max(0, ms));
        if (targets && s.snap) {
            const thr = (7 / pps) * 1000;
            let best: number | null = null;
            let bd = thr;
            for (const c of targets) {
                const d = Math.abs(c - t);
                if (d < bd) {
                    bd = d;
                    best = c;
                }
            }
            if (best !== null) return Math.round(best);
        }
        return Math.round(Math.round(t / frameMs) * frameMs);
    };

    const fit = () => {
        const w = scrollRef.current?.clientWidth ?? 320;
        setPps(Math.max(20, Math.min(400, (w - LABEL_W - PAD) / (s.duration / 1000))));
    };

    const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30].find((v) => v * pps >= 48) ?? 60;
    const ticks: number[] = [];
    for (let v = 0; v <= s.duration / 1000 + 1e-6; v += step) ticks.push(+v.toFixed(3));

    const onKfDown = (e: React.PointerEvent, objectId: string, keyframeId: string) => {
        e.stopPropagation();
        a.pause();
        const ref = { objectId, keyframeId };
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
            a.selectKeyframe(ref, true);
            return;
        }
        a.selectKeyframe(ref, false);
        const st = useStore.getState();
        const moving = new Set(st.selectedKeyframes.map((r) => r.keyframeId));
        moving.add(keyframeId);
        const targets = [
            0,
            st.animDuration,
            st.currentTime,
            st.workIn,
            ...(st.workOut !== null ? [st.workOut] : []),
            ...Object.values(st.tracks).flatMap((t) =>
                t.keyframes.filter((k) => !moving.has(k.id)).map((k) => k.time),
            ),
        ];
        drag.current = { ref, targets, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onKfMove = (e: React.PointerEvent, keyframeId: string) => {
        const d = drag.current;
        if (!d || d.ref.keyframeId !== keyframeId) return;
        if (!d.moved) {
            d.moved = true;
            a.beginEdit();
        }
        a.moveSelectedTo(d.ref, quantize(msFromPointer(e.clientX), d.targets));
    };
    const onKfUp = (keyframeId: string) => {
        const d = drag.current;
        if (d && d.ref.keyframeId === keyframeId && !d.moved) {
            useStore.setState({ selectedKeyframes: [d.ref] }); // plain click collapses a group to one
        }
        drag.current = null;
    };

    const renderKf = (
        objectId: string,
        keyframeId: string,
        time: number,
        title: string,
        small = false,
    ) => {
        const isSel = selSet.has(keyframeId);
        return (
            <button
                key={keyframeId}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none ${
                    isSel ? 'z-10 scale-125 text-danger' : 'text-primary-500 hover:text-primary-400'
                } ${small ? 'opacity-80' : ''}`}
                style={{ left: (time / 1000) * pps }}
                title={title}
                aria-pressed={isSel}
                onPointerDown={(e) => onKfDown(e, objectId, keyframeId)}
                onPointerMove={(e) => onKfMove(e, keyframeId)}
                onPointerUp={() => onKfUp(keyframeId)}
            >
                <Icon name="keyframe" filled size={small ? 9 : 12} />
            </button>
        );
    };

    const laneProps = {
        onPointerDown: (e: React.PointerEvent) => {
            if (!e.shiftKey && !e.metaKey && !e.ctrlKey) a.selectKeyframe(null);
        },
    };

    return (
        <div className={`${ui.card} overflow-hidden`}>
            <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold">Timeline</span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={fit}
                        title="Fit timeline to panel"
                    >
                        Fit
                    </Button>
                    <Slider
                        min={20}
                        max={400}
                        value={pps}
                        onChange={setPps}
                        className="w-20"
                        aria-label="Timeline zoom (Ctrl + wheel)"
                    />
                </div>
            </div>

            <div ref={scrollRef} className="overflow-x-auto border-t an-bd">
                <div
                    ref={innerRef}
                    className="relative"
                    style={{ width: LABEL_W + laneW, minWidth: '100%' }}
                >
                    {/* Ruler: drag to scrub; flags set the work area */}
                    <div className="flex h-7 border-b an-bd">
                        <div
                            className={`sticky left-0 z-30 shrink-0 ${ui.bg}`}
                            style={{ width: LABEL_W }}
                        />
                        <div
                            className="relative flex-1 cursor-col-resize touch-none select-none"
                            onPointerDown={(e) => {
                                a.pause();
                                scrubbing.current = true;
                                e.currentTarget.setPointerCapture(e.pointerId);
                                a.seek(quantize(msFromPointer(e.clientX)));
                            }}
                            onPointerMove={(e) =>
                                scrubbing.current && a.seek(quantize(msFromPointer(e.clientX)))
                            }
                            onPointerUp={() => (scrubbing.current = false)}
                        >
                            <div
                                className="absolute bottom-0 h-1 rounded bg-primary-500/60"
                                style={{
                                    left: (s.workIn / 1000) * pps,
                                    width: ((outMs - s.workIn) / 1000) * pps,
                                }}
                            />
                            {ticks.map((v) => (
                                <div
                                    key={v}
                                    className="absolute top-0 h-full"
                                    style={{ left: v * pps }}
                                >
                                    <div className="h-2 w-px bg-ink-subtle" />
                                    <span
                                        className={`absolute left-1 top-2 text-[9px] ${ui.muted}`}
                                    >
                                        {v}s
                                    </span>
                                </div>
                            ))}
                            {(['in', 'out'] as const).map((which) => (
                                <div
                                    key={which}
                                    role="slider"
                                    aria-label={`Work area ${which}`}
                                    aria-valuenow={which === 'in' ? s.workIn : outMs}
                                    className="absolute bottom-0 z-10 h-3 w-2 -translate-x-1/2 cursor-ew-resize touch-none rounded-sm bg-primary-600"
                                    style={{
                                        left: ((which === 'in' ? s.workIn : outMs) / 1000) * pps,
                                    }}
                                    title={
                                        which === 'in' ? 'Work area start (I)' : 'Work area end (O)'
                                    }
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        workDrag.current = which;
                                        e.currentTarget.setPointerCapture(e.pointerId);
                                    }}
                                    onPointerMove={(e) => {
                                        if (workDrag.current !== which) return;
                                        const t = quantize(msFromPointer(e.clientX));
                                        if (which === 'in')
                                            a.setWorkArea(Math.min(t, outMs - frameMs), s.workOut);
                                        else
                                            a.setWorkArea(
                                                s.workIn,
                                                Math.max(t, s.workIn + frameMs),
                                            );
                                    }}
                                    onPointerUp={() => (workDrag.current = null)}
                                />
                            ))}
                        </div>
                    </div>

                    {rows.length === 0 && (
                        <div className={`px-3 py-8 text-center text-[11px] ${ui.muted}`}>
                            Select an object, then pick a preset or press K to add a keyframe.
                        </div>
                    )}

                    {rows.map((tr) => {
                        const open = expanded.has(tr.objectId);
                        const exists = present.has(tr.objectId);
                        const props = open ? usedProps(tr) : [];
                        return (
                            <div key={tr.objectId}>
                                <div className="flex h-8 border-b an-bd-soft">
                                    <div
                                        className={`sticky left-0 z-30 flex shrink-0 items-center gap-1 px-1.5 ${ui.bg}`}
                                        style={{ width: LABEL_W }}
                                    >
                                        <IconButton
                                            size="sm"
                                            icon={
                                                <Icon
                                                    name="chevron-right"
                                                    className={`transition-transform ${open ? 'rotate-90' : ''}`}
                                                />
                                            }
                                            aria-label={
                                                open ? 'Collapse properties' : 'Expand properties'
                                            }
                                            aria-expanded={open}
                                            onClick={() =>
                                                setExpanded((prev) => {
                                                    const n = new Set(prev);
                                                    if (n.has(tr.objectId)) n.delete(tr.objectId);
                                                    else n.add(tr.objectId);
                                                    return n;
                                                })
                                            }
                                        />
                                        <IconButton
                                            size="sm"
                                            icon={<Icon name={tr.muted ? 'eye-slash' : 'eye'} />}
                                            onClick={() => a.toggleMute(tr.objectId)}
                                            title={tr.muted ? 'Enable animation' : 'Mute animation'}
                                            aria-label={
                                                tr.muted
                                                    ? `Enable animation of ${tr.label}`
                                                    : `Mute animation of ${tr.label}`
                                            }
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => a.selectObject(tr.objectId)}
                                            className={`min-w-0 flex-1 px-1 text-[11px] font-medium ${exists ? 'text-ink' : 'line-through opacity-40'}`}
                                            title={
                                                exists
                                                    ? 'Select on canvas'
                                                    : 'Object no longer on canvas'
                                            }
                                        >
                                            <span className="w-full truncate text-left">
                                                {tr.label}
                                            </span>
                                        </Button>
                                        <IconButton
                                            size="sm"
                                            tone="danger"
                                            icon={<Icon name="trash-can" />}
                                            onClick={() => a.clearTrack(tr.objectId)}
                                            title="Remove animation"
                                            aria-label={`Remove animation from ${tr.label}`}
                                        />
                                    </div>
                                    <div
                                        className={`relative flex-1 ${tr.muted ? 'opacity-40' : ''}`}
                                        {...laneProps}
                                    >
                                        {tr.keyframes.length > 1 && (
                                            <div
                                                className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary-500/25"
                                                style={{
                                                    left: (tr.keyframes[0].time / 1000) * pps,
                                                    width:
                                                        ((tr.keyframes[tr.keyframes.length - 1]
                                                            .time -
                                                            tr.keyframes[0].time) /
                                                            1000) *
                                                        pps,
                                                }}
                                            />
                                        )}
                                        {tr.keyframes.map((k) =>
                                            renderKf(
                                                tr.objectId,
                                                k.id,
                                                k.time,
                                                `${timecode(k.time, s.fps)} · ${k.bezier ? 'custom curve' : k.easing}`,
                                            ),
                                        )}
                                    </div>
                                </div>

                                {props.map((p: AnimProp) => (
                                    <div key={p} className="flex h-6 border-b an-bd-soft">
                                        <div
                                            className={`sticky left-0 z-30 flex shrink-0 items-center pl-7 text-[10px] ${ui.muted} ${ui.bg}`}
                                            style={{ width: LABEL_W }}
                                        >
                                            {p}
                                        </div>
                                        <div className="relative flex-1" {...laneProps}>
                                            {tr.keyframes
                                                .filter((k) => k.props[p] !== undefined)
                                                .map((k) =>
                                                    renderKf(
                                                        tr.objectId,
                                                        k.id,
                                                        k.time,
                                                        `${p}: ${typeof k.props[p] === 'number' ? (k.props[p] as number).toFixed(2) : k.props[p]}`,
                                                        true,
                                                    ),
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    {/* dim everything outside the work area */}
                    {s.workIn > 0 && (
                        <div
                            className="pointer-events-none absolute bottom-0 top-7 z-10 an-dim"
                            style={{ left: LABEL_W, width: (s.workIn / 1000) * pps }}
                        />
                    )}
                    {outMs < s.duration && (
                        <div
                            className="pointer-events-none absolute bottom-0 top-7 z-10 an-dim"
                            style={{
                                left: LABEL_W + (outMs / 1000) * pps,
                                width: ((s.duration - outMs) / 1000) * pps + PAD,
                            }}
                        />
                    )}
                    <Playhead pps={pps} />
                </div>
            </div>
            <p className={`border-t an-bd px-3 py-1.5 text-[10px] ${ui.muted}`}>
                Shift-click to multi-select · drag to move · Ctrl+wheel to zoom · I / O set the work
                area
            </p>
        </div>
    );
}

/* ═════════════════════════════ Keyframe inspector ═════════════════════════════ */
function Inspector() {
    const { selected, tracks, fps } = useStore(
        useShallow((s) => ({ selected: s.selectedKeyframes, tracks: s.tracks, fps: s.animFps })),
    );
    const a = useStore(
        useShallow((s) => ({
            updateKeyframe: s.updateKeyframe,
            updateSelectedCurve: s.updateSelectedCurve,
            deleteSelected: s.deleteSelected,
            copyKeyframes: s.copyKeyframes,
            pasteKeyframes: s.pasteKeyframes,
        })),
    );

    const items = selected
        .map((ref) => {
            const tr = tracks[ref.objectId];
            const kf = tr?.keyframes.find((k) => k.id === ref.keyframeId);
            return tr && kf ? { tr, kf } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x);
    if (!items.length) return null;

    const first = items[0];
    const single = items.length === 1;
    const mixed = items.some(
        (i) =>
            i.kf.easing !== first.kf.easing ||
            JSON.stringify(i.kf.bezier) !== JSON.stringify(first.kf.bezier),
    );
    const { tr, kf } = first;
    const set = (props: Record<string, number | string | undefined>) =>
        a.updateKeyframe(tr.objectId, kf.id, { props: props as PropValues });

    const numericProps = NUM_PROPS.filter((p) => p !== 'reveal' || tr.fullText !== undefined);

    return (
        <Section title={single ? `Keyframe · ${tr.label}` : `${items.length} keyframes selected`}>
            <div>
                <span className={`mb-1 block text-[11px] ${ui.muted}`}>
                    Easing out of this keyframe
                </span>
                <CurveEditor
                    easing={first.kf.easing}
                    bezier={mixed ? undefined : first.kf.bezier}
                    mixed={mixed}
                    onChange={a.updateSelectedCurve}
                />
            </div>

            {single && (
                <>
                    <Field label={`Time (s) · frame ${Math.round((kf.time / 1000) * fps)}`}>
                        <NumberField
                            aria-label="Keyframe time"
                            unit="s"
                            step={1 / fps}
                            min={0}
                            precision={3}
                            value={+(kf.time / 1000).toFixed(3)}
                            onCommit={(v) =>
                                a.updateKeyframe(tr.objectId, kf.id, { time: v * 1000 })
                            }
                        />
                    </Field>

                    <div className="grid grid-cols-3 gap-2">
                        {numericProps.map((p) => (
                            <Field key={p} label={p}>
                                <NumberField
                                    aria-label={p}
                                    stepper="stack"
                                    step={
                                        p === 'opacity' || p === 'reveal' || p.startsWith('scale')
                                            ? 0.05
                                            : 1
                                    }
                                    precision={3}
                                    value={
                                        kf.props[p] !== undefined
                                            ? +(kf.props[p] as number).toFixed(3)
                                            : ''
                                    }
                                    onCommit={(v) => set({ [p]: v })}
                                />
                            </Field>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {COLOR_PROPS.map((p) => {
                            const v = kf.props[p];
                            return (
                                <Field key={p} label={p}>
                                    {v !== undefined ? (
                                        <div className="flex gap-1">
                                            <PaintTargetSwatch
                                                id={`keyframe-${p}`}
                                                label={`Keyframe ${p}`}
                                                value={toHex(v)}
                                                onChange={(hex) => set({ [p]: hex })}
                                                className="flex-1"
                                            />
                                            <IconButton
                                                icon={<Icon name="xmark" />}
                                                tone="danger"
                                                title="Stop animating this property"
                                                aria-label={`Stop animating ${p}`}
                                                onClick={() => set({ [p]: undefined })}
                                            />
                                        </div>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            block
                                            icon="plus"
                                            disabled={!tr.rest[p]}
                                            onClick={() => set({ [p]: tr.rest[p] })}
                                        >
                                            Animate {p}
                                        </Button>
                                    )}
                                </Field>
                            );
                        })}
                    </div>
                </>
            )}

            <div className="flex gap-1.5">
                <Button variant="secondary" size="sm" icon="copy" onClick={a.copyKeyframes}>
                    Copy
                </Button>
                <Button variant="secondary" size="sm" icon="paste" onClick={a.pasteKeyframes}>
                    Paste at playhead
                </Button>
                <Button
                    variant="danger-outline"
                    size="sm"
                    icon="trash-can"
                    className="ml-auto"
                    onClick={a.deleteSelected}
                >
                    Delete
                </Button>
            </div>
        </Section>
    );
}

/* ═════════════════════════════ Presets ═════════════════════════════ */
function Presets({ selCount, selHasText }: { selCount: number; selHasText: boolean }) {
    const a = useStore(
        useShallow((s) => ({
            applyPreset: s.applyPreset,
            addKeyframe: s.addKeyframe,
            seek: s.seek,
            play: s.play,
            autoKey: s.autoKey,
            setAutoKey: s.setAutoKey,
        })),
    );
    const currentTime = useStore((s) => s.currentTime);
    const [group, setGroup] = useState<PresetGroup>('entrance');
    const [start, setStart] = useState(0); // seconds
    const [dur, setDur] = useState<number | ''>('');
    const [stagger, setStagger] = useState(0); // ms
    const [repeat, setRepeat] = useState(1);

    const apply = (p: PresetMeta) => {
        const duration = dur === '' ? p.defaultDuration : Math.round(dur * 1000);
        const startMs = Math.round(start * 1000);
        if (a.applyPreset(p.id, { start: startMs, duration, stagger, repeat })) {
            a.seek(startMs);
            a.play(); // instant preview
        }
    };

    return (
        <Section title="Animate">
            <SegmentedControl<PresetGroup>
                aria-label="Preset group"
                value={group}
                onChange={setGroup}
                options={[
                    { value: 'entrance', label: 'Entrance' },
                    { value: 'emphasis', label: 'Emphasis' },
                    { value: 'exit', label: 'Exit' },
                ]}
            />

            <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.filter((p) => p.group === group).map((p) => (
                    <Button
                        variant="secondary"
                        size="sm"
                        key={p.id}
                        disabled={!selCount || (p.textOnly && !selHasText)}
                        title={p.textOnly && !selHasText ? 'Select a text object' : undefined}
                        onClick={() => apply(p)}
                    >
                        {p.label}
                    </Button>
                ))}
            </div>
            {!selCount && (
                <p className={`text-[11px] ${ui.muted}`}>
                    Select one or more objects on the canvas.
                </p>
            )}

            <div className="grid grid-cols-2 gap-2">
                <Field label="Start (s)">
                    <div className="flex gap-1">
                        <NumberField
                            aria-label="Start"
                            unit="s"
                            min={0}
                            step={0.1}
                            precision={2}
                            value={start}
                            onCommit={(v) => setStart(Math.max(0, v))}
                        />
                        <IconButton
                            icon={<Icon name="crosshairs" />}
                            className="border border-line-strong"
                            title="Use playhead time"
                            aria-label="Use playhead time"
                            onClick={() => setStart(+(currentTime / 1000).toFixed(2))}
                        />
                    </div>
                </Field>
                <Field label="Length (s)">
                    <div className="flex gap-1">
                        <NumberField
                            aria-label="Length"
                            unit="s"
                            min={0.1}
                            step={0.1}
                            precision={2}
                            value={dur}
                            onCommit={(v) => setDur(Math.max(0.1, v))}
                        />
                        {dur !== '' && (
                            <IconButton
                                icon={<Icon name="rotate-left" />}
                                className="border border-line-strong"
                                title="Use the preset's own length"
                                aria-label="Use the preset's own length"
                                onClick={() => setDur('')}
                            />
                        )}
                    </div>
                </Field>
                <Field label="Stagger between objects (ms)">
                    <NumberField
                        aria-label="Stagger between objects"
                        unit="ms"
                        min={0}
                        step={50}
                        precision={0}
                        value={stagger}
                        onCommit={(v) => setStagger(Math.max(0, v))}
                    />
                </Field>
                <Field label="Repeat (emphasis)">
                    <NumberField
                        aria-label="Repeat"
                        min={1}
                        max={20}
                        step={1}
                        precision={0}
                        value={repeat}
                        disabled={group !== 'emphasis'}
                        onCommit={(v) => setRepeat(Math.max(1, Math.min(20, Math.round(v))))}
                    />
                </Field>
            </div>

            <div className="flex items-center gap-2 pt-1">
                <Button
                    variant="secondary"
                    size="sm"
                    icon="plus"
                    disabled={!selCount}
                    onClick={() => a.addKeyframe()}
                    title="Add keyframe (K)"
                >
                    Keyframe at playhead
                </Button>
            </div>
            <LabeledToggle
                label="Auto-key"
                hint={
                    a.autoKey
                        ? 'Move the playhead, then move / scale / rotate one object — a keyframe is recorded automatically.'
                        : 'Record a keyframe whenever you change an object.'
                }
                checked={a.autoKey}
                onChange={a.setAutoKey}
            />
        </Section>
    );
}

/* ═════════════════════════════ Export ═════════════════════════════ */
const SIZES = [
    { id: 'canvas', label: 'Canvas size', w: 0, h: 0 },
    { id: '720', label: '1280 × 720 (HD)', w: 1280, h: 720 },
    { id: '1080', label: '1920 × 1080 (Full HD)', w: 1920, h: 1080 },
    { id: '2160', label: '3840 × 2160 (4K)', w: 3840, h: 2160 },
    { id: 'vertical', label: '1080 × 1920 (Reels / Shorts)', w: 1080, h: 1920 },
    { id: 'square', label: '1080 × 1080 (Square)', w: 1080, h: 1080 },
];
const QUALITY = [
    { id: 'low', label: 'Low (2.5 Mbps)', bps: 2_500_000 },
    { id: 'medium', label: 'Medium (6 Mbps)', bps: 6_000_000 },
    { id: 'high', label: 'High (12 Mbps)', bps: 12_000_000 },
    { id: 'ultra', label: 'Ultra (25 Mbps)', bps: 25_000_000 },
];

function ExportSection() {
    const { exportState, duration, fps, isPlaying, workIn, workOut } = useStore(
        useShallow((s) => ({
            exportState: s.exportState,
            duration: s.animDuration,
            fps: s.animFps,
            isPlaying: s.isPlaying,
            workIn: s.workIn,
            workOut: s.workOut,
        })),
    );
    const a = useStore(
        useShallow((s) => ({
            exportVideo: s.exportVideo,
            cancelExport: s.cancelExport,
            setAnimDuration: s.setAnimDuration,
            setAnimFps: s.setAnimFps,
            setWorkArea: s.setWorkArea,
        })),
    );

    const fast = useMemo(() => supportsWebCodecs(), []);
    const realtimeFormats = useMemo(() => getRealtimeFormats(), []);
    const [mode, setMode] = useState<ExportMode>(fast ? 'mp4-fast' : 'realtime');
    const [container, setContainer] = useState<ContainerFormat>(realtimeFormats[0] ?? 'webm');
    const [range, setRange] = useState<'full' | 'work'>('full');
    const [size, setSize] = useState('1080');
    const [quality, setQuality] = useState('high');
    const [bg, setBg] = useState('#ffffff');
    const [name, setName] = useState('animation');
    const rendering = exportState.status === 'rendering';

    const hasWork = workIn > 0 || workOut !== null;
    const span = (range === 'work' ? (workOut ?? duration) - workIn : duration) / 1000 || 0;
    const bps = QUALITY.find((q) => q.id === quality)!.bps;
    const canRun =
        mode === 'png' ||
        (mode === 'mp4-fast' ? fast || realtimeFormats.length > 0 : realtimeFormats.length > 0);

    const run = () => {
        const sz = SIZES.find((x) => x.id === size)!;
        a.exportVideo({
            mode,
            container,
            range,
            width: sz.w,
            height: sz.h,
            bitrate: bps,
            background: bg,
            fileName: name.trim() || 'animation',
        });
    };

    return (
        <Section title="Export">
            <Field label="Output">
                <Select<ExportMode>
                    aria-label="Output"
                    value={mode}
                    onChange={setMode}
                    disabled={rendering}
                    options={[
                        {
                            value: 'mp4-fast',
                            label: `MP4 · fast, frame-exact${fast ? '' : ' (falls back to realtime)'}`,
                            disabled: !fast && realtimeFormats.length === 0,
                        },
                        {
                            value: 'realtime',
                            label: 'Video · realtime (compatibility)',
                            disabled: !realtimeFormats.length,
                        },
                        { value: 'png', label: 'PNG · current frame' },
                    ]}
                />
            </Field>

            <div className="grid grid-cols-2 gap-2">
                {mode !== 'png' && (
                    <>
                        <Field label="Frame rate">
                            <Select
                                aria-label="Frame rate"
                                value={fps}
                                onChange={a.setAnimFps}
                                disabled={rendering}
                                options={[24, 30, 60].map((f) => ({ value: f, label: `${f} fps` }))}
                            />
                        </Field>
                        <Field label="Quality">
                            <Select<string>
                                aria-label="Quality"
                                value={quality}
                                onChange={setQuality}
                                disabled={rendering}
                                options={QUALITY.map((q) => ({ value: q.id, label: q.label }))}
                            />
                        </Field>
                    </>
                )}
                <Field label="Resolution">
                    <Select<string>
                        aria-label="Resolution"
                        value={size}
                        onChange={setSize}
                        disabled={rendering}
                        options={SIZES.map((x) => ({ value: x.id, label: x.label }))}
                    />
                </Field>
                <Field label="Background">
                    <PaintTargetSwatch
                        id="video-export-background"
                        label="Video background"
                        value={bg}
                        onChange={setBg}
                        disabled={rendering}
                    />
                </Field>
                {mode === 'realtime' && (
                    <Field label="Container">
                        <Select<ContainerFormat>
                            aria-label="Container"
                            value={container}
                            onChange={setContainer}
                            disabled={rendering}
                            options={realtimeFormats.map((f) => ({
                                value: f,
                                label: f === 'mp4' ? 'MP4' : 'WebM',
                            }))}
                        />
                    </Field>
                )}
                {mode !== 'png' && (
                    <Field label="Range">
                        <Select<'full' | 'work'>
                            aria-label="Range"
                            value={range}
                            onChange={setRange}
                            disabled={rendering}
                            options={[
                                { value: 'full', label: 'Whole timeline' },
                                { value: 'work', label: 'Work area', disabled: !hasWork },
                            ]}
                        />
                    </Field>
                )}
            </div>

            {mode !== 'png' && (
                <Field label="Timeline length (s)">
                    <NumberField
                        aria-label="Timeline length"
                        unit="s"
                        min={0.5}
                        step={0.5}
                        precision={2}
                        value={+(duration / 1000).toFixed(2)}
                        onCommit={(v) => a.setAnimDuration(v * 1000)}
                        disabled={rendering}
                    />
                </Field>
            )}
            <Field label="File name">
                <Input
                    size="sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={rendering}
                />
            </Field>

            {rendering ? (
                <div className="space-y-1.5">
                    <div className="h-2 overflow-hidden rounded an-track">
                        <div
                            className="h-full bg-primary-600 transition-[width]"
                            style={{ width: `${Math.round(exportState.progress * 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className={ui.muted}>
                            Rendering… {Math.round(exportState.progress * 100)}%
                        </span>
                        <Button variant="secondary" size="sm" icon="xmark" onClick={a.cancelExport}>
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <PanelAction
                    icon={mode === 'png' ? 'image' : 'video'}
                    onClick={run}
                    disabled={!canRun || isPlaying}
                >
                    {mode === 'png' ? 'Save PNG' : 'Export video'}
                </PanelAction>
            )}

            {!rendering && mode !== 'png' && (
                <p className={`text-[11px] ${ui.muted}`}>
                    {span.toFixed(1)} s · about {((bps * span) / 8 / 1_000_000).toFixed(1)} MB.{' '}
                    {mode === 'mp4-fast' && fast
                        ? 'Frames are rendered one by one, so this is usually faster than realtime.'
                        : `Realtime export takes about ${span.toFixed(1)} s. Keep this tab open.`}
                </p>
            )}
            {exportState.status === 'done' && (
                <p className="text-[11px] text-success">{exportState.message}</p>
            )}
            {exportState.status === 'error' && (
                <p className="text-[11px] text-danger">{exportState.message}</p>
            )}
        </Section>
    );
}

/* ═════════════════════════════ Panel ═════════════════════════════ */
export default function AnimationPanel() {
    const canvas = useStore((s) => s.canvas);
    const bindAutoKey = useStore((s) => s.bindAutoKey);
    const [sel, setSel] = useState({ count: 0, hasText: false });
    const theme = useAnimationTheme();

    useEffect(() => {
        if (!canvas) return;
        const update = () => {
            const objs = canvas.getActiveObjects();
            setSel({ count: objs.length, hasText: objs.some(isTextObject) });
        };
        update();
        const offs = [
            canvas.on('selection:created', update),
            canvas.on('selection:updated', update),
            canvas.on('selection:cleared', update),
        ];
        return () => offs.forEach((off) => off());
    }, [canvas]);

    useEffect(() => bindAutoKey(), [canvas, bindAutoKey]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (isEditable(e.target)) return;
        const st = useStore.getState();
        const mod = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        const onButton = (e.target as HTMLElement).tagName === 'BUTTON';
        // every key handled here stays here: the global canvas shortcuts must not run too (BUG-018)
        let handled = true;

        if (e.code === 'Space') {
            if (onButton) return; // let buttons activate normally (and Space is not a canvas shortcut)
            e.preventDefault();
            st.togglePlay();
        } else if (mod && key === 'z') {
            e.preventDefault(); // keyframe history here, not the canvas history
            if (e.shiftKey) st.animRedo();
            else st.animUndo();
        } else if (mod && key === 'y') {
            e.preventDefault();
            st.animRedo();
        } else if (mod && key === 'a') {
            e.preventDefault();
            st.selectAllKeyframes();
        } else if (mod && key === 'c') {
            st.copyKeyframes();
        } else if (mod && key === 'v') {
            st.pasteKeyframes();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            st.deleteSelected();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const dir = e.key === 'ArrowLeft' ? -1 : 1;
            if (st.selectedKeyframes.length)
                st.nudgeSelected(dir * (e.shiftKey ? 100 : 1000 / st.animFps));
            else st.stepFrames(dir * (e.shiftKey ? st.animFps : 1));
        } else if (e.key === 'Home') {
            st.seek(0);
        } else if (e.key === 'End') {
            st.seek(st.animDuration);
        } else if (key === 'k') {
            st.addKeyframe();
        } else if (key === 'l') {
            st.setLoop(!st.loop);
        } else if (key === 'i') {
            st.setWorkArea(st.currentTime, st.workOut);
        } else if (key === 'o') {
            st.setWorkArea(st.workIn, st.currentTime);
        } else {
            handled = false;
        }
        if (handled) e.stopPropagation();
    };

    return (
        <div
            className="flex flex-col gap-4 outline-none"
            style={theme.style}
            data-anim-theme={theme.isDark ? 'dark' : 'light'}
            tabIndex={0}
            onKeyDown={onKeyDown}
        >
            <style>{ANIM_CSS}</style>
            <div className={`${ui.card} p-2`}>
                <Transport />
            </div>
            <Timeline />
            <Inspector />
            <Presets selCount={sel.count} selHasText={sel.hasText} />
            <ExportSection />
            <ClearAll />
        </div>
    );
}

function ClearAll() {
    const clear = useStore((s) => s.clearAllAnimations);
    const has = useStore((s) => Object.keys(s.tracks).length > 0);
    const confirmDialog = useStore((s) => s.confirmDialog);
    const onClear = async () => {
        const ok = await confirmDialog({
            title: 'Remove all animations?',
            message: 'You can undo this.',
            confirmLabel: 'Remove all',
            tone: 'danger',
        });
        if (ok) clear();
    };
    return (
        <PanelAction tone="danger" icon="trash-can" disabled={!has} onClick={onClear}>
            Clear all animations
        </PanelAction>
    );
}
