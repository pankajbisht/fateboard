import React from 'react';
import clsx from 'clsx';

export type DropdownOption = { value: string; label: string };
export type DropdownProps = {
    options?: DropdownOption[];
    value?: string;
    onChange?: (v: string) => void;
    className?: string;
    label?: string;
    preview?: React.ReactNode;
    disabled?: boolean;
};

export function Dropdown({
    options = [],
    value,
    onChange,
    className = '',
    label,
    preview,
    disabled,
}: DropdownProps) {
    return (
        <div className={clsx('flex items-center gap-1', className)}>
            {label && <span className="text-xs text-gray-600">{label}</span>}
            {preview && <div>{preview}</div>}

            <select
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={disabled}
                className="px-1 h-6 text-xs border border-gray-300 rounded cursor-pointer"
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
