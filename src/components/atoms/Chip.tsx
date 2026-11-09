import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { FOCUS_RING } from './control.styles';

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    /** Selected / on. Sets aria-pressed. */
    active: boolean;
    icon?: IconName;
};

/** Filter pill (categories, "Favorites"): a toggle button with a pressed state. */
export function Chip({ active, icon, className, children, ...rest }: ChipProps) {
    return (
        <button
            type="button"
            aria-pressed={active}
            {...rest}
            className={clsx(
                'inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                'disabled:pointer-events-none disabled:opacity-40',
                FOCUS_RING,
                active
                    ? 'bg-primary-100 text-primary-ink'
                    : 'bg-surface-strong text-ink-muted hover:text-ink',
                className,
            )}
        >
            {icon && <Icon name={icon} filled={active} />}
            {children}
        </button>
    );
}

export default Chip;
