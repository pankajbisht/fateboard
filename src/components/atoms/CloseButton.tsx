import React from 'react';
import clsx from 'clsx';

type CloseButtonProps = {
    onClick?: () => void;
    size?: number;
    className?: string;
    title?: string;
};

export const CloseButton: React.FC<CloseButtonProps> = ({
    onClick,
    size = 24,
    className = '',
    title = 'Close',
}) => {
    return (
        <button
            onClick={onClick}
            title={title}
            aria-label={title}
            className={clsx(
                'flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer',
                className,
            )}
            style={{ width: size, height: size }}
        >
            ✕
        </button>
    );
};

export default CloseButton;
