import clsx from 'clsx';
import React from 'react';

export type ButtonProps = {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'danger' | 'ghost';
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    ariaLabel?: string;
    title?: string;
};

export const Button: React.FC<ButtonProps> = ({
    size = 'md',
    variant = 'primary',
    onClick,
    children,
    className = '',
    disabled = false,
    ariaLabel,
    title,
}) => {
    const sizes: Record<string, string> = {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-5 py-3 text-lg',
    };

    const variants: Record<string, string> = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-800 border border-transparent',
    };

    const disabledStyle = 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none opacity-80';

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title={title}
            disabled={disabled}
            onClick={disabled ? undefined : onClick}
            className={clsx(
                'inline-flex items-center justify-center rounded-md transition-shadow duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                sizes[size],
                disabled ? disabledStyle : variants[variant],
                className,
            )}
            aria-disabled={disabled}
        >
            {children}
        </button>
    );
};

export default Button;
