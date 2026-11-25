import { Suspense, lazy, useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import clsx from 'clsx';
import { useStore } from '@store';
import { TIMELINE_DEFAULT_HEIGHT, TIMELINE_MIN_HEIGHT } from '@/store/slices/createTimelineSlice';
import { FOCUS_RING } from '../../atoms/control.styles';
import { TIMELINE_LINK_TAB } from './timelineKeys';

// loaded when the timeline is first opened: most boards are never animated
const AnimationPanel = lazy(() => import('./AnimationPanel'));

/** The dock never takes more than this share of the window, so the board stays usable. */
export const TIMELINE_MAX_SHARE = 0.7;
const KEY_STEP = 16;

const maxHeight = () =>
    Math.max(TIMELINE_MIN_HEIGHT, Math.round(window.innerHeight * TIMELINE_MAX_SHARE));

/** Old links opened the right-dock Animate tab (`/draw?tab=animate`): they open the timeline now. */
const linkedToTimeline = () =>
    new URLSearchParams(window.location.search).get('tab') === TIMELINE_LINK_TAB;

/** The top edge of the dock: drag (or ↑ / ↓, Home / End) to resize, double-click for the default. */
function ResizeHandle({ height }: { height: number }) {
    const setHeight = useStore((s) => s.setTimelineHeight);
    const drag = useRef<{ y: number; h: number } | null>(null);
    const max = maxHeight();
    const shown = Math.min(height, max);
    const to = (px: number) => setHeight(Math.min(maxHeight(), px));

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const dock = e.currentTarget.parentElement;
        drag.current = { y: e.clientY, h: dock?.getBoundingClientRect().height || shown };
    };
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (drag.current) to(drag.current.h + drag.current.y - e.clientY);
    };
    const end = () => {
        drag.current = null;
    };
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
        const next =
            e.key === 'ArrowUp'
                ? shown + step
                : e.key === 'ArrowDown'
                  ? shown - step
                  : e.key === 'Home'
                    ? TIMELINE_MIN_HEIGHT
                    : e.key === 'End'
                      ? max
                      : null;
        if (next === null) return;
        // the board's own arrow keys (nudge) must not run as well
        e.preventDefault();
        e.stopPropagation();
        to(next);
    };

    return (
        <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize timeline"
            aria-valuemin={TIMELINE_MIN_HEIGHT}
            aria-valuemax={max}
            aria-valuenow={shown}
            tabIndex={0}
            title="Drag to resize the timeline. Double-click: default height"
            className={clsx(
                'group absolute inset-x-0 -top-1.5 z-30 flex h-3 cursor-row-resize touch-none items-center justify-center',
                FOCUS_RING,
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={end}
            onDoubleClick={() => setHeight(TIMELINE_DEFAULT_HEIGHT)}
            onKeyDown={onKeyDown}
        >
            <span
                aria-hidden
                className="h-1 w-10 rounded-full bg-line-strong transition-colors group-hover:bg-primary-500 group-focus-visible:bg-primary-500"
            />
        </div>
    );
}

/**
 * The animation timeline, docked under the board between the rails (owner request 2026-11-17: "like other
 * animation tools"). Open / height are per-browser preferences (Timeline slice). Closing it unmounts the
 * panel, which pauses playback and turns auto-key off (BUG-181).
 */
export function TimelineDock() {
    const open = useStore((s) => s.timelineOpen);
    const height = useStore((s) => s.timelineHeight);
    const setOpen = useStore((s) => s.setTimelineOpen);

    useEffect(() => {
        if (linkedToTimeline()) setOpen(true);
    }, [setOpen]);

    if (!open) return null;
    return (
        <section
            aria-label="Timeline"
            data-testid="timeline-dock"
            className="relative flex flex-col border-t border-line bg-surface"
            style={{ height: `min(${height}px, ${TIMELINE_MAX_SHARE * 100}dvh)` }}
        >
            <ResizeHandle height={height} />
            <Suspense
                fallback={<p className="p-3 text-xs text-ink-muted">Loading the timeline…</p>}
            >
                <AnimationPanel />
            </Suspense>
        </section>
    );
}

export default TimelineDock;
