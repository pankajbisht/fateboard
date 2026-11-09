import clsx from 'clsx';
import { FOCUS_RING } from './control.styles';

export type SwitchProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
    id?: string;
    className?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
};

const TRACK = { sm: 'h-4 w-7', md: 'h-5 w-9' } as const;
const KNOB = { sm: 'h-3 w-3', md: 'h-4 w-4' } as const;
const SHIFT = { sm: 'translate-x-3', md: 'translate-x-4' } as const;

/** On/off switch (role="switch"). Pair with a visible label via `Field` or `aria-label`. */
export function Switch({
    checked,
    onChange,
    disabled,
    size = 'md',
    id,
    className,
    ...aria
}: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            id={id}
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={clsx(
                'relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                FOCUS_RING,
                TRACK[size],
                checked ? 'bg-primary-600' : 'bg-line-strong',
                className,
            )}
            {...aria}
        >
            <span
                aria-hidden
                className={clsx(
                    'rounded-full bg-white shadow-sm transition-transform',
                    KNOB[size],
                    checked ? SHIFT[size] : 'translate-x-0',
                )}
            />
        </button>
    );
}

export default Switch;
