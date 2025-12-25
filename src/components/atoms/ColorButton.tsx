import React from 'react';
import clsx from 'clsx';

type ColorButtonProps = {
    color: string;
    isSelected?: boolean;
    onClick?: () => void;
    className?: string;
};

export const ColorButton: React.FC<ColorButtonProps> = ({
    color,
    isSelected = false,
    onClick,
    className = '',
}) => {
    return (
        <button
            type="button"
            title={color}
            aria-label={`color ${color}`}
            className={clsx(
                'w-6 h-6 rounded-full cursor-pointer border-2 flex-shrink-0',
                isSelected ? 'border-gray-700' : 'border-transparent',
                className,
            )}
            style={{ backgroundColor: color }}
            onClick={onClick}
        />
    );
};

export default ColorButton;
