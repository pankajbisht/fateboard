import React from 'react';
import clsx from 'clsx';

type EIconButtonProps = {
    icon: string | React.ReactNode;
    onClick?: () => void;
    isActive?: boolean;
    className?: string;
};

const EIconButton: React.FC<EIconButtonProps> = ({
    icon,
    onClick,
    isActive = false,
    className = '',
}) => (
    <i
        role="button"
        tabIndex={0}
        className={clsx(
            icon,
            'cursor-pointer p-2 rounded-sm',
            isActive
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-stone-900 hover:bg-stone-200',
            className,
        )}
        onClick={onClick}
    />
);

export default EIconButton;
