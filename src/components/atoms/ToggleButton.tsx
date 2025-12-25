import React from 'react';
import clsx from 'clsx';

type ToggleButtonProps = {
    on: boolean;
    onClick?: () => void;
    className?: string;
};

export const ToggleButton: React.FC<ToggleButtonProps> = ({ on, onClick, className = '' }) => {
    return (
        <div
            className={clsx('inline-flex mt-1', className)}
            role="group"
            aria-label="toggle buttons"
        >
            <button
                type="button"
                onClick={onClick}
                className={clsx(
                    'px-4 py-1 rounded-l-full text-white',
                    on ? 'bg-teal-600' : 'bg-yellow-400',
                )}
            >
                <i className="fa-solid fa-list"></i>
            </button>

            <button
                type="button"
                onClick={onClick}
                className={clsx(
                    'px-4 py-1 rounded-r-full text-white',
                    !on ? 'bg-teal-600' : 'bg-yellow-400',
                )}
            >
                <i className="fa-solid fa-border-all"></i>
            </button>
        </div>
    );
};

export default ToggleButton;
