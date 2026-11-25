import React from 'react';
import clsx from 'clsx';
import { Select } from './Select';

export type DropdownOption = { value: string | number; label: string };
export type DropdownProps = {
    options?: DropdownOption[];
    value?: string;
    onChange?: (v: string) => void;
    className?: string;
    label?: string;
    preview?: React.ReactNode;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'error';
};

/**
 * Compact labelled dropdown for toolbars (string values). Built on the app `Select`, so it has the
 * same popover list, keyboard support and dark mode. Prefer `Select` / `SelectField` in panels.
 */
export function Dropdown({
    options = [],
    value,
    onChange,
    className = '',
    label,
    preview,
    disabled,
    size = 'sm',
    variant = 'default',
}: DropdownProps) {
    return (
        <div className={clsx('flex items-center gap-1.5', className)}>
            {label && <span className="text-xs text-ink-muted">{label}</span>}
            {preview && <div>{preview}</div>}
            <Select
                aria-label={label ?? 'Options'}
                block={false}
                size={size === 'sm' ? 'sm' : 'md'}
                disabled={disabled}
                options={options.map((o) => ({ value: String(o.value), label: o.label }))}
                value={value === undefined ? undefined : String(value)}
                onChange={(v) => onChange?.(v)}
                className={variant === 'error' ? 'border-danger' : undefined}
            />
        </div>
    );
}

export default Dropdown;
