import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import type { Track } from '@/animation/engine';
import { useUnit } from '@hooks/useUnit';
import { shortcut } from '@/lib/utils/isMac';
import { Button } from '../../atoms/Button';
import { NumberField } from '../../atoms/NumberField';
import { Slider } from '../../atoms/Slider';
import { LANE_PAD, LANE_X, MAX_PPS, MIN_PPS, clampPps, snapTime } from './animation.logic';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack } from './TimelineTrack';
import { usePresentIds } from './useAnimationCanvas';
import { useKeyframeDrag } from './useKeyframeDrag';

function Playhead({ pps }: { pps: number }) {
    const t = useStore((s) => s.currentTime);
    return (
        <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-danger"
            style={{ left: LANE_X + (t / 1000) * pps }}
        />
    );
}

/** The timeline: one row per animated object, keyframes as diamonds, a ruler to scrub. */
export function Timeline({ selectedIds }: { selectedIds: string[] }) {
    const s = useStore(
        useShallow((st) => ({
            tracks: st.tracks,
            duration: st.animDuration,
            fps: st.animFps,
            selected: st.selectedKeyframes,
            workIn: st.workIn,
            workOut: st.workOut,
            snap: st.snap,
        })),
    );
    const selectKeyframe = useStore((st) => st.selectKeyframe);
    const setAnimDuration = useStore((st) => st.setAnimDuration);
    const unit = useUnit();
    const present = usePresentIds();

    const [pps, setPps] = useState(90); // pixels per second
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    const outMs = s.workOut ?? s.duration;
    const laneW = (s.duration / 1000) * pps + LANE_PAD;
    const rows = Object.values(s.tracks);
    const selected = useMemo(() => new Set(s.selected.map((r) => r.keyframeId)), [s.selected]);
    const onCanvas = useMemo(() => new Set(selectedIds), [selectedIds]);

    // Ctrl / ⌘ + wheel zooms the timeline
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setPps((p) => clampPps(p * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const timeAt = (clientX: number, targets?: number[]) => {
        const left = innerRef.current?.getBoundingClientRect().left ?? 0;
        return snapTime(((clientX - left - LANE_X) / pps) * 1000, {
            duration: s.duration,
            fps: s.fps,
            pps,
            targets: s.snap ? targets : undefined,
        });
    };
    const drag = useKeyframeDrag(timeAt);

    const fit = () => {
        const w = scrollRef.current?.clientWidth ?? 320;
        setPps(clampPps((w - LANE_X - LANE_PAD) / (s.duration / 1000)));
    };
    const toggleRow = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const onLaneDown = (e: PointerEvent) => {
        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) selectKeyframe(null);
    };
    /** Double-click a row: a keyframe for that object, at that time, holding what it shows there. */
    const onLaneDoubleClick = (e: MouseEvent, track: Track) => {
        if (!present.has(track.objectId)) return;
        const st = useStore.getState();
        st.pause();
        st.seek(timeAt(e.clientX));
        st.selectObject(track.objectId);
        st.addKeyframe();
    };

    return (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center gap-2 px-2 py-1.5">
                <span className="text-[11px] text-ink-muted">Length</span>
                <NumberField
                    aria-label="Timeline length"
                    title="How long the animation is"
                    className="w-[72px]"
                    unit="s"
                    stepper={false}
                    min={0.5}
                    step={0.5}
                    precision={2}
                    value={+(s.duration / 1000).toFixed(2)}
                    onCommit={(v) => setAnimDuration(v * 1000)}
                />
                <Button
                    variant="secondary"
                    size="sm"
                    className="ml-auto"
                    onClick={fit}
                    title="Fit the whole timeline in the panel"
                >
                    Fit
                </Button>
                <Slider
                    min={MIN_PPS}
                    max={MAX_PPS}
                    value={pps}
                    onChange={setPps}
                    className="w-20"
                    aria-label="Timeline zoom"
                />
            </div>

            <div ref={scrollRef} className="max-h-72 overflow-auto border-t an-bd">
                <div
                    ref={innerRef}
                    className="relative"
                    style={{ width: LANE_X + laneW, minWidth: '100%' }}
                >
                    <TimelineRuler pps={pps} timeAt={timeAt} />

                    {rows.length === 0 && (
                        <p className="px-3 py-6 text-center text-[11px] text-ink-muted">
                            No animation yet. Select an object and pick an animation above, or press
                            K to add a keyframe.
                        </p>
                    )}

                    {rows.map((tr) => (
                        <TimelineTrack
                            key={tr.objectId}
                            track={tr}
                            open={expanded.has(tr.objectId)}
                            onToggle={() => toggleRow(tr.objectId)}
                            exists={present.has(tr.objectId)}
                            highlighted={onCanvas.has(tr.objectId)}
                            fps={s.fps}
                            unit={unit}
                            ctx={{ pps, selected, drag }}
                            onLaneDown={onLaneDown}
                            onLaneDoubleClick={onLaneDoubleClick}
                        />
                    ))}

                    {/* dim everything outside the work area */}
                    {s.workIn > 0 && (
                        <div
                            className="pointer-events-none absolute bottom-0 top-7 z-10 an-dim"
                            style={{ left: LANE_X, width: (s.workIn / 1000) * pps }}
                        />
                    )}
                    {outMs < s.duration && (
                        <div
                            className="pointer-events-none absolute bottom-0 top-7 z-10 an-dim"
                            style={{
                                left: LANE_X + (outMs / 1000) * pps,
                                width: ((s.duration - outMs) / 1000) * pps + LANE_PAD,
                            }}
                        />
                    )}
                    <Playhead pps={pps} />
                </div>
            </div>
            <p className="border-t an-bd px-2 py-1.5 text-[10px] text-ink-muted">
                Click a keyframe to jump to it, drag to retime, Shift-click to select more.
                Double-click a row to add one. {shortcut('⌘', 'Ctrl')} + wheel zooms.
            </p>
        </div>
    );
}

export default Timeline;
