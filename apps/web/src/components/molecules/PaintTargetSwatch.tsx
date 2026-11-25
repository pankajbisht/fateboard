import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '@store';

const CHECKER = 'repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%) 50% / 8px 8px';

const isTransparent = (c: string) =>
    !c || c === 'transparent' || /rgba?\([^)]*,\s*0(\.0+)?\s*\)$/i.test(c.replace(/\s+/g, ' '));

/**
 * A panel's color, painted from the right dock palette.
 *
 * The app has ONE color picker: the palette in the right dock. A panel that owns a color
 * (text color, brush fill, connector line, page background...) shows this swatch instead of
 * its own <input type="color">. Clicking it makes the swatch the palette's target; the next
 * palette pick (swatch, custom color, eyedropper) calls `onChange`. Click again, or pick
 * Fill / Stroke in the dock, to hand the palette back to the selection.
 */
export function PaintTargetSwatch({
    id,
    label,
    value,
    onChange,
    showLabel = false,
    disabled = false,
    tone = 'light',
    className = '',
}: {
    /** unique per color slot, e.g. 'brush-fill' */
    id: string;
    label: string;
    value: string;
    onChange: (hex: string) => void;
    showLabel?: boolean;
    disabled?: boolean;
    tone?: 'light' | 'dark';
    className?: string;
}) {
    const active = useStore((s) => s.paintTarget?.id === id);
    const setPaintTarget = useStore((s) => s.setPaintTarget);

    // Always call the latest onChange (it usually closes over the current selection)
    const applyRef = useRef(onChange);
    applyRef.current = onChange;

    const target = useMemo(
        () => ({ id, label, apply: (hex: string) => applyRef.current(hex) }),
        [id, label],
    );

    // Keep the dock indicator in step when the value changes elsewhere (undo, selection...)
    useEffect(() => {
        if (active && useStore.getState().paintTarget?.color !== value) {
            setPaintTarget({ ...target, color: value });
        }
    }, [active, value, target, setPaintTarget]);

    // A target whose panel is gone must not keep swallowing palette picks
    useEffect(
        () => () => {
            if (useStore.getState().paintTarget?.id === id)
                useStore.getState().setPaintTarget(null);
        },
        [id],
    );

    const toggle = () => setPaintTarget(active ? null : { ...target, color: value });

    const text = tone === 'dark' ? 'text-ink-subtle' : 'text-ink-muted';
    const border = 'border-line-strong'; // tokens already follow the theme

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={disabled}
            aria-pressed={active}
            aria-label={`${label}: ${value}. ${active ? 'Painting from the palette' : 'Paint from the palette'}`}
            title={
                active
                    ? `${label} - pick a color in the right palette (click to stop)`
                    : `${label} - click, then pick a color in the right palette`
            }
            data-paint-target={id}
            className={`inline-flex items-center gap-2 text-xs ${text} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
            <span
                className={`h-6 w-6 shrink-0 rounded border ${border} ${
                    active ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                }`}
                style={{ background: isTransparent(value) ? CHECKER : value }}
            />
            {showLabel && <span>{label}</span>}
            {active && <span className="text-[10px] font-medium text-primary-500">palette →</span>}
        </button>
    );
}
