import clsx from 'clsx';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type SwatchState = 'none' | 'active';

type SwatchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
    /** CSS color painted in the box. */
    color: string;
    /** Accessible name and tooltip, e.g. "Red 500 · #fb2c36". */
    label: string;
    /** `active` = this is the current color (brand ring). */
    state?: SwatchState;
};

/**
 * One palette color. Square box sized by Settings > Icon size (`--ui-swatch`); the current color
 * gets a brand ring.
 */
export const Swatch = forwardRef<HTMLButtonElement, SwatchProps>(
    ({ color, label, state = 'none', className, style, ...rest }, ref) => (
        <button
            ref={ref}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={state === 'active'}
            data-state={state}
            className={clsx(
                'relative size-[var(--ui-swatch)] shrink-0 cursor-pointer border border-black/10 dark:border-white/15',
                'transition-transform hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                state === 'active' &&
                    'z-10 ring-2 ring-primary-500 ring-offset-1 ring-offset-surface',
                className,
            )}
            style={{ ...style, backgroundColor: color }}
            {...rest}
        ></button>
    ),
);
Swatch.displayName = 'Swatch';

export default Swatch;
