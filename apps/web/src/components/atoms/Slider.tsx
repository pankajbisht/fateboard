import { useRef } from 'react';
import clsx from 'clsx';

export type SliderProps = {
    min: number;
    max: number;
    step?: number;
    value: number;
    onChange: (value: number) => void;
    /** Fires once when the user releases the thumb (pointer up / key up). Use for history. */
    onCommit?: (value: number) => void;
    disabled?: boolean;
    id?: string;
    className?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-valuetext'?: string;
};

const THUMB = [
    // WebKit / Blink
    '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none',
    '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-600',
    '[&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-sm',
    '[&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-110',
    'focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-primary-400/30',
    // Firefox
    '[&::-moz-range-track]:bg-transparent',
    '[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full',
    '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-600 [&::-moz-range-thumb]:bg-surface',
].join(' ');

/** The app's range slider (track + brand fill + thumb). Pair with `SliderField` for label/value. */
function Slider({
    min,
    max,
    step = 1,
    value,
    onChange,
    onCommit,
    disabled,
    id,
    className,
    ...aria
}: SliderProps) {
    const span = max - min || 1;
    const pct = Math.min(100, Math.max(0, ((value - min) / span) * 100));
    // Firefox sends one more `input` with the same value AFTER pointerup; it would reopen what the commit
    // just closed (the landing time-lapse stayed half-blended, BUG-204). That one echo is ignored.
    const committed = useRef<number | null>(null);
    const commit = (e: { currentTarget: HTMLInputElement }) => {
        const v = Number(e.currentTarget.value);
        committed.current = v;
        onCommit?.(v);
    };
    const change = (v: number) => {
        const echo = committed.current === v;
        committed.current = null;
        if (!echo) onChange(v);
    };
    const restart = () => {
        committed.current = null;
    };

    return (
        <div
            className={clsx(
                'relative flex h-4 w-full items-center',
                disabled && 'opacity-50',
                className,
            )}
        >
            <div className="absolute inset-x-0 h-1 rounded-full bg-surface-strong" />
            <div
                className="absolute left-0 h-1 rounded-full bg-primary-500"
                style={{ width: `${pct}%` }}
            />
            <input
                type="range"
                id={id}
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => change(Number(e.target.value))}
                onPointerDown={restart}
                onKeyDown={restart}
                onPointerUp={commit}
                onKeyUp={commit}
                className={clsx(
                    'relative h-4 w-full cursor-pointer appearance-none bg-transparent focus:outline-none',
                    'disabled:cursor-not-allowed',
                    THUMB,
                )}
                {...aria}
            />
        </div>
    );
}

export { Slider };
export default Slider;
