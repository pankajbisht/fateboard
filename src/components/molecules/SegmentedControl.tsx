import clsx from 'clsx';
import { useRef, type KeyboardEvent } from 'react';
import { Icon, type IconName } from '../atoms/Icon';
import { FOCUS_RING, CONTROL_SIZE, type ControlSize } from '../atoms/control.styles';
import { useControlSize } from '../atoms/controlSize';

export type SegmentOption<T extends string> = {
    value: T;
    label?: string;
    icon?: IconName;
    /** Tooltip / accessible name when there is no label. */
    title?: string;
    disabled?: boolean;
};

/** Pick one of 2–5 options shown side by side (radio group). Arrow keys move the selection. */
export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    size: sizeProp,
    block = true,
    className,
    'aria-label': ariaLabel,
}: {
    /** T is inferred from `value` only, so inline option literals keep the narrow type. */
    options: SegmentOption<NoInfer<T>>[];
    value: T;
    onChange: (value: NoInfer<T>) => void;
    size?: ControlSize;
    block?: boolean;
    className?: string;
    'aria-label': string;
}) {
    const size = useControlSize(sizeProp) as ControlSize;
    const refs = useRef<(HTMLButtonElement | null)[]>([]);

    const move = (e: KeyboardEvent, from: number) => {
        const dir =
            e.key === 'ArrowRight' || e.key === 'ArrowDown'
                ? 1
                : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                  ? -1
                  : 0;
        if (!dir) return;
        e.preventDefault();
        e.stopPropagation();
        const n = options.length;
        for (let k = 1; k <= n; k++) {
            const i = (from + dir * k + n) % n;
            if (!options[i].disabled) {
                onChange(options[i].value);
                refs.current[i]?.focus();
                return;
            }
        }
    };

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={clsx(
                'inline-flex gap-0.5 rounded-md bg-surface-strong p-0.5',
                block && 'flex w-full',
                CONTROL_SIZE[size],
                className,
            )}
        >
            {options.map((o, i) => {
                const checked = o.value === value;
                return (
                    <button
                        key={o.value}
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={o.label ? undefined : o.title}
                        title={o.title}
                        disabled={o.disabled}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => onChange(o.value)}
                        onKeyDown={(e) => move(e, i)}
                        className={clsx(
                            'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded px-2 font-medium whitespace-nowrap transition-colors',
                            'disabled:cursor-not-allowed disabled:opacity-40',
                            FOCUS_RING,
                            checked
                                ? 'bg-surface text-ink shadow-sm'
                                : 'text-ink-muted hover:text-ink',
                        )}
                    >
                        {o.icon && <Icon name={o.icon} />}
                        {o.label && <span className="truncate">{o.label}</span>}
                    </button>
                );
            })}
        </div>
    );
}

export default SegmentedControl;
