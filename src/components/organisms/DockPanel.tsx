import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { SIDE_PANEL_WIDTH, sidePanelFrame } from './sidebar/sidebar.const';

export const DockPanel = ({
    open,
    width = SIDE_PANEL_WIDTH,
    snapPoints = [240, 320, SIDE_PANEL_WIDTH, 480],
    onToggle,
    onWidthChange,
    children,
}: {
    open: boolean;
    width?: number;
    snapPoints?: number[];
    onToggle: () => void;
    onWidthChange?: (width: number) => void;
    children: React.ReactNode;
}) => {
    const [dragging, setDragging] = useState(false);
    const drag = useRef<{ startX: number; startW: number; moved: boolean } | null>(null);

    const min = snapPoints[0];
    const max = snapPoints[snapPoints.length - 1];
    const clamp = (w: number) => Math.min(max, Math.max(min, w));
    const nearestSnap = (w: number) =>
        snapPoints.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));

    const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startX: e.clientX, startW: open ? width : 0, moved: false };
    };

    const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        if (!d) return;

        // panel is LEFT of the handle -> dragging left makes it wider
        const dx = d.startX - e.clientX;
        if (!d.moved && Math.abs(dx) < 4) return; // tiny movement = click

        if (!d.moved) {
            d.moved = true;
            setDragging(true);
            if (!open) onToggle();
        }
        onWidthChange?.(clamp(d.startW + dx));
    };

    const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (!d) return;

        if (!d.moved) {
            onToggle(); // plain click
            return;
        }
        setDragging(false);
        onWidthChange?.(nearestSnap(clamp(d.startW + (d.startX - e.clientX))));
    };

    return (
        <div className="relative flex h-full">
            {/* panel (opens to the LEFT of the handle) */}
            <div
                data-testid="dock-panel"
                aria-hidden={!open}
                inert={!open}
                className={clsx(sidePanelFrame, open && 'border-l', dragging && 'transition-none')}
                style={{ width: open ? width : 0, minWidth: 0 }}
            >
                <div
                    style={{ width }} // fixed inner width -> no reflow while animating
                    className="h-full"
                >
                    {children}
                </div>
            </div>

            {/* 3-dot handle */}
            {/*<button
                type="button"
                aria-label={open ? 'Collapse panel' : 'Expand panel'}
                aria-expanded={open}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle();
                    }
                }}
                className={clsx(
                    'group flex w-3 shrink-0 touch-none select-none items-center justify-center',
                    'cursor-ew-resize border-l border-line transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
                    dragging ? 'bg-primary-100' : 'bg-surface-muted hover:bg-primary-50',
                )}
            >
                <span
                    className={clsx(
                        'flex h-12 w-1.5 flex-col items-center justify-center gap-[3px] rounded-full transition-colors',
                        dragging || open
                            ? 'bg-primary-500'
                            : 'bg-line-strong group-hover:bg-primary-400',
                    )}
                >
                    <span className="h-[3px] w-[3px] rounded-full bg-surface" />
                    <span className="h-[3px] w-[3px] rounded-full bg-surface" />
                    <span className="h-[3px] w-[3px] rounded-full bg-surface" />
                </span>
            </button>*/}
        </div>
    );
};
