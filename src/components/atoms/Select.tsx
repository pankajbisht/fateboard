import React from 'react';
import clsx from 'clsx';

export type SelectProps = {
    options: string[];
    value: string;
    onChange: (v: string) => void;
    className?: string;
};

export const Select: React.FC<SelectProps> = ({ options, value, onChange, className = '' }) => {
    return (
        <div className={clsx('relative inline-block', className)}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={clsx(
                    'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-1 pr-8 text-sm shadow-sm',
                    'focus:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none hover:border-gray-400 transition',
                )}
            >
                {options.map((option) => (
                    <option key={option} value={option} style={{ fontFamily: option }}>
                        {option}
                    </option>
                ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                ▼
            </div>
        </div>
    );
};

export default Select;
