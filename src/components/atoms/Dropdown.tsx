import React from 'react';
import clsx from 'clsx';

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

export function Dropdown({
    options = [],
    value,
    onChange,
    className = '',
    label,
    preview,
    disabled,
    size = 'sm', // sm | md | lg
    variant = 'default', // default | error
}: DropdownProps) {
    const sizeMap = {
        sm: 'h-4 text-xs px-1',
        md: 'h-6 text-sm px-2',
        lg: 'h-8 text-base px-3',
    };

    const variantMap = {
        default: 'border-gray-300',
        error: 'border-red-400',
    };

    return (
        <div className={clsx('flex items-center gap-1', className)}>
            {label && <span className="text-xs text-gray-600">{label}</span>}
            {preview && <div>{preview}</div>}

            <select
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={disabled}
                className={clsx(
                    'px-1 h-6 text-xs border border-gray-300 rounded cursor-pointer',
                    sizeMap[size],
                    variantMap[variant],
                )}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default Dropdown;
