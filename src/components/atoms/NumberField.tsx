import clsx from 'clsx';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { Icon } from './Icon';

/** `inline` = [− value +] (default), `stack` = small ▲▼ on the right (dense rows), `false` = none. */
export type NumberFieldStepper = 'inline' | 'stack' | false;

export type NumberFieldProps = {
    value: number | string | undefined;
    /** Called once per finished edit (Enter, blur, outside click, step), never per keystroke. */
    onCommit: (value: number) => void;
    min?: number;
    max?: number;
    /** Arrow-key / button step (Shift = 10×). */
    step?: number;
    /** Decimals shown (trailing zeros dropped). */
    precision?: number;
    /** Short label inside the field on the left (X, Y, W, H, R). */
    label?: string;
    /** Unit inside the field on the right (°, px, %). */
    unit?: string;
    /** Counter buttons. Default `inline`. */
    stepper?: NumberFieldStepper;
    /**
     * `panel` = fixed 28 px (panels, floats). `toolbar` = follows Settings > Icon size
     * (--ui-btn: 24 / 28 / 34 px) so the field matches the toolbar buttons beside it.
     */
    size?: 'panel' | 'toolbar';
    /** Accessible names of the buttons. Default "Increase / Decrease <aria-label>". */
    incrementLabel?: string;
    decrementLabel?: string;
    disabled?: boolean;
    className?: string;
    title?: string;
    'aria-label': string;
};

const HOLD_DELAY_MS = 400;

/** − / +: square, 4 px shorter than the field; icon = 55 % of the button. */
const INLINE_BUTTON =
    'h-[calc(100%-4px)] aspect-square rounded-[5px] [&_svg]:h-[55%] [&_svg]:w-[55%]';
/** ▲ / ▼: half the field height each; icon = 70 % of the half (never taller than it). */
const STACK_BUTTON = 'h-1/2 w-full [&_svg]:h-[70%] [&_svg]:w-[70%]';
const HOLD_REPEAT_MS = 60;

const format = (v: unknown, precision: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? String(Number(n.toFixed(precision))) : '';
};

/**
 * Compact numeric field that behaves like Figma / Illustrator: typing edits a draft, Enter,
 * blur or a click outside applies it once, Escape cancels, empty / invalid input reverts (never
 * becomes 0), Up / Down and the − / + buttons step by `step` (Shift 10×, press and hold repeats).
 * Outside changes show up unless you are typing.
 */
export function NumberField({
    value,
    onCommit,
    min,
    max,
    step = 1,
    precision = 2,
    label,
    unit,
    stepper = 'inline',
    size = 'panel',
    incrementLabel,
    decrementLabel,
    disabled,
    className,
    title,
    'aria-label': ariaLabel,
}: NumberFieldProps) {
    const [draft, setDraft] = useState(() => format(value, precision));
    const editing = useRef(false);
    const rootRef = useRef<HTMLLabelElement>(null);
    const shown = format(value, precision);

    // follow outside changes (mouse drags, undo) unless the user is typing
    useEffect(() => {
        if (!editing.current) setDraft(shown);
    }, [shown]);

    // Commit on the outside pointerdown, not only on blur. The browser fires pointerdown before
    // it moves focus, and the canvas changes / clears the selection on pointerdown, so a
    // blur-only commit would hit the wrong object (or none). Capture phase runs before the canvas.
    // Presses on this field's own − / + are not "outside": they step from the draft.
    const commitRef = useRef<() => void>(() => {});
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (!editing.current || rootRef.current?.contains(e.target as Node)) return;
            commitRef.current();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, []);

    const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

    const commit = (text: string) => {
        const n = Number(text);
        if (text.trim() === '' || text === '-' || !Number.isFinite(n)) {
            setDraft(shown); // nothing valid typed: back to the current value
            return;
        }
        const next = Number(clamp(n).toFixed(precision));
        setDraft(format(next, precision));
        if (next !== Number(shown)) onCommit(next);
    };

    // finish the edit once: the blur that follows an outside pointerdown is then a no-op
    const finishEdit = () => {
        if (!editing.current) return;
        editing.current = false;
        commit(draft);
    };
    commitRef.current = finishEdit;

    // Value the next step starts from. A ref, so press-and-hold repeats (timer callbacks) do not
    // read a stale render; reset from the props on every render.
    const current = Number(editing.current ? draft : shown);
    const baseRef = useRef(current);
    baseRef.current = Number.isFinite(current) ? current : 0;

    /** One step; returns false when already at the limit (stops a hold). */
    const nudge = (dir: 1 | -1, big: boolean) => {
        const next = Number(
            clamp(baseRef.current + dir * step * (big ? 10 : 1)).toFixed(precision),
        );
        if (next === baseRef.current) return false;
        baseRef.current = next;
        setDraft(format(next, precision));
        onCommit(next);
        return true;
    };
    const nudgeRef = useRef(nudge);
    nudgeRef.current = nudge;

    // press and hold (stable function: the same reference must be added and removed)
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stopHold = useCallback(() => {
        if (holdTimer.current !== null) clearTimeout(holdTimer.current);
        holdTimer.current = null;
        window.removeEventListener('pointerup', stopHold);
        window.removeEventListener('pointercancel', stopHold);
        window.removeEventListener('blur', stopHold);
    }, []);
    useEffect(() => stopHold, [stopHold]);

    const startHold = (dir: 1 | -1) => (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        e.preventDefault(); // keep focus (and the draft) in the input
        stopHold();
        if (!nudgeRef.current(dir, e.shiftKey)) return;
        const big = e.shiftKey;
        const repeat = () => {
            holdTimer.current = nudgeRef.current(dir, big)
                ? setTimeout(repeat, HOLD_REPEAT_MS)
                : null;
        };
        holdTimer.current = setTimeout(repeat, HOLD_DELAY_MS);
        window.addEventListener('pointerup', stopHold);
        window.addEventListener('pointercancel', stopHold);
        window.addEventListener('blur', stopHold);
    };

    // keyboard / assistive-tech activation has no pointerdown (detail 0); mouse clicks already stepped
    const onButtonClick = (dir: 1 | -1) => (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault(); // inside a <label>: don't forward the click to the input
        if (e.detail === 0) nudge(dir, e.shiftKey);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // typing here must not trigger canvas shortcuts (Delete, arrows); ⌘Z / ⌘⇧Z / ⌘Y may go
        // through to the canvas history once the value is applied (nothing half-typed)
        const key = e.key.toLowerCase();
        const history = (e.metaKey || e.ctrlKey) && (key === 'z' || key === 'y');
        if (!(history && draft === shown)) e.stopPropagation();
        if (e.key === 'Enter') {
            commit(draft);
            e.currentTarget.select();
        } else if (e.key === 'Escape') {
            editing.current = false;
            setDraft(shown);
            e.currentTarget.blur();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            nudge(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey);
        }
    };

    const atMin = min !== undefined && baseRef.current <= min;
    const atMax = max !== undefined && baseRef.current >= max;

    const stepButton = (
        dir: 1 | -1,
        cls: string,
        icon: 'minus' | 'plus' | 'chevron-up' | 'chevron-down',
    ) => (
        <button
            type="button"
            tabIndex={-1}
            aria-label={
                dir === 1
                    ? (incrementLabel ?? `Increase ${ariaLabel}`)
                    : (decrementLabel ?? `Decrease ${ariaLabel}`)
            }
            title={dir === 1 ? 'Increase (Shift: ×10)' : 'Decrease (Shift: ×10)'}
            disabled={disabled || (dir === 1 ? atMax : atMin)}
            onPointerDown={startHold(dir)}
            onClick={onButtonClick(dir)}
            className={clsx(
                'grid shrink-0 select-none place-items-center overflow-hidden text-ink-subtle transition-colors',
                'hover:bg-surface-muted hover:text-ink active:bg-line disabled:pointer-events-none disabled:opacity-40',
                cls,
            )}
        >
            {/* sized from the button (not fixed px), so it can never be cut at any icon size */}
            <Icon name={icon} strokeWidth={2.25} />
        </button>
    );

    return (
        <label
            ref={rootRef}
            title={title}
            className={clsx(
                'group flex min-w-0 items-center rounded-md border border-line-strong bg-surface text-xs transition-colors',
                size === 'toolbar' ? 'h-[var(--ui-btn)]' : 'h-7',
                'hover:border-ink-subtle focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-400/30',
                stepper === 'inline' && 'gap-1 px-[3px]',
                stepper === 'stack' && 'gap-1.5 pl-2',
                stepper === false && 'gap-1.5 px-2',
                disabled && 'pointer-events-none opacity-50',
                className,
            )}
        >
            {stepper === 'inline' && stepButton(-1, INLINE_BUTTON, 'minus')}
            {label && (
                <span
                    aria-hidden
                    className={clsx(
                        'shrink-0 select-none font-medium text-ink-subtle',
                        stepper === 'inline' && 'pl-1',
                    )}
                >
                    {label}
                </span>
            )}
            <input
                type="text"
                role="spinbutton"
                inputMode="decimal"
                aria-label={ariaLabel}
                aria-valuenow={Number(shown) || 0}
                // nothing half-typed: ⌘Z / ⌘⇧Z go to the canvas history (useKeyboardShortcuts)
                data-history-passthrough={draft === shown ? 'true' : undefined}
                aria-valuemin={min}
                aria-valuemax={max}
                value={draft}
                disabled={disabled}
                onFocus={(e) => {
                    editing.current = true;
                    e.currentTarget.select();
                }}
                onChange={(e) => {
                    editing.current = true;
                    // keep anything number-like while typing ("", "-", "12.", "-0.5")
                    if (/^-?\d*\.?\d*$/.test(e.target.value)) setDraft(e.target.value);
                }}
                onBlur={finishEdit}
                onKeyDown={onKeyDown}
                // no ring here: the field box shows focus (focus-within). FOCUS_RING + ring-0 left
                // Tailwind 4's 1 px ring-offset drawn as a square box inside the field.
                className={clsx(
                    'w-full min-w-0 bg-transparent text-ink tabular-nums outline-none',
                    stepper === 'inline' && 'text-center',
                )}
            />
            {unit && (
                <span aria-hidden className="shrink-0 select-none text-ink-subtle">
                    {unit}
                </span>
            )}
            {stepper === 'inline' && stepButton(1, INLINE_BUTTON, 'plus')}
            {stepper === 'stack' && (
                <span className="ml-0.5 flex h-full w-[18px] shrink-0 flex-col overflow-hidden rounded-r-[5px] border-l border-line opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    {stepButton(1, STACK_BUTTON, 'chevron-up')}
                    {stepButton(-1, `${STACK_BUTTON} border-t border-line`, 'chevron-down')}
                </span>
            )}
        </label>
    );
}

export default NumberField;
