import clsx from 'clsx';
import React from 'react';
import { Icon, type IconName } from './Icon';
import { FOCUS_RING } from './control.styles';
import { useControlSize } from './controlSize';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Icon before the label. */
    icon?: IconName;
    /** Icon after the label. */
    trailingIcon?: IconName;
    /** Shows a spinner and disables the button. */
    loading?: boolean;
    /** Full width. */
    block?: boolean;
    type?: 'button' | 'submit' | 'reset';
    /** @deprecated use `aria-label` */
    ariaLabel?: string;
};

const VARIANT: Record<ButtonVariant, string> = {
    primary: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800',
    secondary:
        'border border-line-strong bg-surface text-ink hover:bg-surface-muted active:bg-surface-strong',
    ghost: 'text-ink-muted hover:bg-surface-strong hover:text-ink',
    danger: 'bg-danger text-white shadow-sm hover:bg-danger-hover',
    /** Destructive action inside a panel (not the main action): red text, quiet border. */
    'danger-outline':
        'border border-line-strong bg-surface text-danger hover:border-danger/50 hover:bg-danger/10',
};

const SIZE: Record<ButtonSize, string> = {
    sm: 'h-7 gap-1.5 px-2.5 text-xs',
    md: 'h-8 gap-1.5 px-3 text-xs',
    lg: 'h-9 gap-2 px-4 text-sm',
};

/** The app's text button. Use `IconButton` for icon-only buttons. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = 'primary',
        size: sizeProp,
        icon,
        trailingIcon,
        loading = false,
        block = false,
        type = 'button',
        ariaLabel,
        disabled,
        className,
        children,
        ...rest
    },
    ref,
) {
    const size = useControlSize<ButtonSize>(sizeProp) as ButtonSize;
    const isDisabled = disabled || loading;
    return (
        <button
            ref={ref}
            type={type}
            aria-label={rest['aria-label'] ?? ariaLabel}
            aria-busy={loading || undefined}
            disabled={isDisabled}
            className={clsx(
                'inline-flex shrink-0 select-none items-center justify-center rounded-md font-semibold whitespace-nowrap transition-colors',
                'disabled:pointer-events-none disabled:opacity-50 dark:disabled:opacity-60 [[data-dimmed]_&]:disabled:opacity-100',
                FOCUS_RING,
                VARIANT[variant],
                SIZE[size],
                block && 'w-full',
                className,
            )}
            {...rest}
        >
            {loading ? <Icon name="spinner" spin /> : icon && <Icon name={icon} />}
            {children}
            {trailingIcon && !loading && <Icon name={trailingIcon} />}
        </button>
    );
});

export default Button;
