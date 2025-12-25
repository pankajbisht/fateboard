import React from 'react';
import clsx from 'clsx';

type SwatchProp = {
    bgColor: string;
    isActive?: boolean;
    onClick?: () => void;
    className?: string;
};

export const Swatch: React.FC<SwatchProp> = ({
    bgColor,
    isActive = false,
    onClick,
    className = '',
}) => {
    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            className={clsx(
                'relative w-8 h-5 ml-px mb-px border border-stone-300 cursor-pointer',
                bgColor,
                className,
            )}
        >
            {isActive && (
                <span
                    className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white"
                    style={{ boxShadow: '0 0 0 1px #000' }}
                />
            )}
        </div>
    );
};

export default Swatch;
