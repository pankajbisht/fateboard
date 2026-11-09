import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { CONTROL_BOX, CONTROL_SIZE, type ControlSize } from './control.styles';
import { useControlSize } from './controlSize';
import { Icon, type IconName } from './Icon';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    label?: string;
    error?: string | boolean;
    /** Defaults to the surrounding panel size (sm in panels, md elsewhere). */
    size?: ControlSize;
    /** Icon inside the field on the left (e.g. magnifying-glass for search). */
    leadingIcon?: IconName;
    /** Unit shown inside the field on the right (px, mm, %). */
    suffix?: string;
};

/** Text input with optional label and error message. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', size: sizeProp, leadingIcon, suffix, id, ...rest }, ref) => {
        const size = useControlSize(sizeProp) as ControlSize;
        const autoId = React.useId();
        const inputId = id ?? autoId;
        return (
            <div className={clsx('w-full', className)}>
                {label ? (
                    <label
                        htmlFor={inputId}
                        className="mb-1 block text-xs font-medium text-ink-muted"
                    >
                        {label}
                    </label>
                ) : null}
                <div className="relative">
                    {leadingIcon && (
                        <Icon
                            name={leadingIcon}
                            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-subtle"
                        />
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        aria-invalid={error ? true : undefined}
                        className={clsx(
                            'w-full placeholder:text-ink-subtle',
                            suffix ? 'pr-9' : 'pr-2.5',
                            leadingIcon ? 'pl-7' : 'pl-2.5',
                            CONTROL_BOX,
                            CONTROL_SIZE[size],
                            error && 'border-danger',
                        )}
                        {...rest}
                    />
                    {suffix && (
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-subtle">
                            {suffix}
                        </span>
                    )}
                </div>
                {error && typeof error === 'string' ? (
                    <div className="mt-1 text-xs text-danger">{error}</div>
                ) : null}
            </div>
        );
    },
);

export default Input;
