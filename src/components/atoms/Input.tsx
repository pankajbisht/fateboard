import React, { forwardRef } from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string | boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', ...rest }, ref) => {
        const base =
            'w-full rounded-md px-3 py-2 border bg-white dark:bg-transparent text-sm transition-shadow duration-150';
        const errorClass = error ? 'border-red-500' : 'border-gray-300 focus:border-blue-500';

        return (
            <div className={clsx('w-full', className)}>
                {label ? (
                    <label className="block text-xs font-medium mb-1 text-gray-600">{label}</label>
                ) : null}
                <input
                    ref={ref}
                    className={`${base} ${errorClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300`}
                    {...rest}
                />
                {error ? (
                    <div className="mt-1 text-xs text-red-500">
                        {typeof error === 'string' ? error : ''}
                    </div>
                ) : null}
            </div>
        );
    },
);

// lazy local import for clsx to keep bundle small when not used
import clsx from 'clsx';

export default Input;
