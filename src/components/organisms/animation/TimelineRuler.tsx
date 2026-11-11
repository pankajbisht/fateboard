import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { LABEL_W, LANE_GUTTER, rulerTicks } from './animation.logic';

function PlayheadFlag({ pps }: { pps: number }) {
    const t = useStore((s) => s.currentTime);
    return (
        <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-danger"
            style={{ left: (t / 1000) * pps }}
        >
            <div className="absolute -left-[5px] -top-px h-2.5 w-[11px] rounded-b-sm bg-danger" />
        </div>
    );
}

/** Top row of the timeline: drag to scrub, drag the two flags to set the work area. */
export function TimelineRuler({
    pps,
    timeAt,
}: {
    pps: number;
    /** pointer x → snapped time (ms) */
    timeAt: (clientX: number) => number;
}) {
    const { duration, fps, workIn, workOut } = useStore(
        useShallow((s) => ({
            duration: s.animDuration,
            fps: s.animFps,
            workIn: s.workIn,
            workOut: s.workOut,
        })),
    );
    const seek = useStore((s) => s.seek);
    const pause = useStore((s) => s.pause);
    const setWorkArea = useStore((s) => s.setWorkArea);
    const scrubbing = useRef(false);
    const workDrag = useRef<'in' | 'out' | null>(null);

    const frameMs = 1000 / fps;
    const outMs = workOut ?? duration;
    const endScrub = () => {
        scrubbing.current = false;
    };
    const endWorkDrag = () => {
        workDrag.current = null;
    };

    return (
        <div className="sticky top-0 z-40 flex h-7 border-b an-bd bg-surface">
            <div className="sticky left-0 z-30 shrink-0 bg-surface" style={{ width: LABEL_W }} />
            <div
                className="relative flex-1 cursor-col-resize touch-none select-none"
                style={{ marginLeft: LANE_GUTTER }}
                onPointerDown={(e) => {
                    pause();
                    scrubbing.current = true;
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    seek(timeAt(e.clientX));
                }}
                onPointerMove={(e) => scrubbing.current && seek(timeAt(e.clientX))}
                onPointerUp={endScrub}
                onPointerCancel={endScrub}
            >
                <div
                    className="absolute bottom-0 h-1 rounded bg-primary-500/60"
                    style={{
                        left: (workIn / 1000) * pps,
                        width: ((outMs - workIn) / 1000) * pps,
                    }}
                />
                {rulerTicks(duration, pps).map((v) => (
                    <div key={v} className="absolute top-0 h-full" style={{ left: v * pps }}>
                        <div className="h-2 w-px bg-ink-subtle" />
                        <span className="absolute left-1 top-2 text-[9px] text-ink-muted">
                            {v}s
                        </span>
                    </div>
                ))}
                {(['in', 'out'] as const).map((which) => (
                    <div
                        key={which}
                        role="slider"
                        aria-label={which === 'in' ? 'Work area start' : 'Work area end'}
                        aria-valuemin={0}
                        aria-valuemax={duration}
                        aria-valuenow={which === 'in' ? workIn : outMs}
                        className="absolute bottom-0 z-10 h-3 w-2 -translate-x-1/2 cursor-ew-resize touch-none rounded-sm bg-primary-600"
                        style={{ left: ((which === 'in' ? workIn : outMs) / 1000) * pps }}
                        title={which === 'in' ? 'Work area start (I)' : 'Work area end (O)'}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            workDrag.current = which;
                            e.currentTarget.setPointerCapture?.(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                            if (workDrag.current !== which) return;
                            const t = timeAt(e.clientX);
                            if (which === 'in') setWorkArea(Math.min(t, outMs - frameMs), workOut);
                            else setWorkArea(workIn, Math.max(t, workIn + frameMs));
                        }}
                        onPointerUp={endWorkDrag}
                        onPointerCancel={endWorkDrag}
                    />
                ))}
                <PlayheadFlag pps={pps} />
            </div>
        </div>
    );
}

export default TimelineRuler;
