import clsx from 'clsx';
import { useRef, type KeyboardEvent } from 'react';
import { FOCUS_RING } from '../atoms/control.styles';

export type OriginChoice = {
    originX: 'left' | 'center' | 'right';
    originY: 'top' | 'center' | 'bottom';
    id: string;
};

/** The 9 standard anchor (reference) points, row by row. */
export const ANCHOR_POINTS: (OriginChoice & { label: string })[] = [
    { id: 'tl', originX: 'left', originY: 'top', label: 'Top left' },
    { id: 't', originX: 'center', originY: 'top', label: 'Top' },
    { id: 'tr', originX: 'right', originY: 'top', label: 'Top right' },
    { id: 'l', originX: 'left', originY: 'center', label: 'Left' },
    { id: 'c', originX: 'center', originY: 'center', label: 'Center' },
    { id: 'r', originX: 'right', originY: 'center', label: 'Right' },
    { id: 'bl', originX: 'left', originY: 'bottom', label: 'Bottom left' },
    { id: 'b', originX: 'center', originY: 'bottom', label: 'Bottom' },
    { id: 'br', originX: 'right', originY: 'bottom', label: 'Bottom right' },
];

const MOVE: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};

/**
 * Anchor point (reference point) for the transform fields: X / Y show this point, and
 * rotation, width / height and flips keep it fixed. 3×3 grid, like Illustrator / Affinity.
 * Arrow keys move around the grid.
 */
export default function OriginSelector({
    size = 28,
    value = 'c',
    onChange,
}: {
    size?: number;
    value?: string;
    onChange?: (origin: OriginChoice) => void;
}) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const current = Math.max(
        0,
        ANCHOR_POINTS.findIndex((p) => p.id === value),
    );

    const pick = (i: number) => {
        const { id, originX, originY } = ANCHOR_POINTS[i];
        onChange?.({ id, originX, originY });
    };

    const onKey = (e: KeyboardEvent, i: number) => {
        const d = MOVE[e.key];
        if (!d) return;
        e.preventDefault();
        e.stopPropagation(); // arrows must not also nudge the selected object
        const col = Math.min(2, Math.max(0, (i % 3) + d[0]));
        const row = Math.min(2, Math.max(0, Math.floor(i / 3) + d[1]));
        const next = row * 3 + col;
        pick(next);
        refs.current[next]?.focus();
    };

    // handles sit on the corners / edge midpoints of the box, like a real selection box
    const inset = size / 6;

    return (
        <div
            role="radiogroup"
            aria-label="Anchor point"
            title="Anchor point: X / Y show it; rotation, size and flip keep it in place"
            className="relative grid shrink-0 grid-cols-3 grid-rows-3 rounded-md bg-surface-muted"
            style={{ width: size, height: size }}
        >
            <span
                aria-hidden
                data-box
                className="pointer-events-none absolute rounded-[2px] border border-dashed border-ink-subtle"
                style={{ inset }}
            />

            {ANCHOR_POINTS.map((p, i) => {
                const checked = i === current;
                return (
                    <button
                        key={p.id}
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={p.label}
                        title={p.label}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => pick(i)}
                        onKeyDown={(e) => onKey(e, i)}
                        className={clsx(
                            'group relative z-10 flex cursor-pointer items-center justify-center rounded-sm',
                            FOCUS_RING,
                        )}
                    >
                        <span
                            aria-hidden
                            data-handle
                            className={clsx(
                                'block rounded-[1.5px] border transition-all duration-100',
                                checked
                                    ? 'size-[7px] border-primary-600 bg-primary-500 shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary-500)_25%,transparent)]'
                                    : 'size-[5px] border-ink-subtle bg-surface group-hover:size-[6px] group-hover:border-primary-500',
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
}
