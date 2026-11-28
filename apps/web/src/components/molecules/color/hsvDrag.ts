import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { HSV } from '@/lib/colorMath';

/** Thumb drawn on the square, the bar and the wheel ring (white ring, dark outline: visible on any colour). */
export const THUMB =
    'pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_1px_3px_rgba(0,0,0,0.4)]';

export const SLIDER_FOCUS =
    'touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * Where the pointer is inside the element: x / y as 0 … 1 and the offset from its centre in px.
 * `start` is true for the press itself (false while dragging), so a control can accept a press only
 * on part of itself (the wheel's ring) yet keep following the pointer anywhere once the drag started.
 */
export type DragPoint = {
    x: number;
    y: number;
    dx: number;
    dy: number;
    w: number;
    h: number;
    start: boolean;
};

/**
 * Pointer drag on a colour control: pointer capture, the preview on every move (`onPreview`, local state)
 * and the commit once per animation frame (`onCommit`, the paint). `apply` turns the point into a colour,
 * or null to ignore it (e.g. a press in the wheel's hole).
 */
export function useHsvDrag(onPreview: (next: HSV) => void, onCommit: (next: HSV) => void) {
    const frame = useRef<number | null>(null);
    useEffect(
        () => () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        },
        [],
    );

    const dragTo = (
        e: ReactPointerEvent<HTMLElement>,
        apply: (p: DragPoint) => HSV | null,
        start: boolean,
    ) => {
        const r = e.currentTarget.getBoundingClientRect();
        const w = r.width || 1;
        const h = r.height || 1;
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        const next = apply({
            x: Math.min(1, Math.max(0, px / w)),
            y: Math.min(1, Math.max(0, py / h)),
            dx: px - w / 2,
            dy: py - h / 2,
            w,
            h,
            start,
        });
        if (!next) return false;
        onPreview(next);
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
            frame.current = null;
            onCommit(next);
        });
        return true;
    };

    return (apply: (p: DragPoint) => HSV | null) => ({
        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
            if (e.button !== 0) return;
            if (!dragTo(e, apply, true)) return;
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);
            e.currentTarget.focus();
        },
        onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) dragTo(e, apply, false);
        },
    });
}
