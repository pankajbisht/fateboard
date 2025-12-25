import React from 'react';
import clsx from 'clsx';

export type TextProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    className?: string;
};

export const Text: React.FC<TextProps> = ({ label, className = '', ...rest }) => {
    return (
        <div className={clsx('flex items-center', className)}>
            <input
                type="text"
                placeholder={label}
                className="mr-2 py-2 px-4 border-2 border-blue-200 rounded-full bg-white w-full"
                {...rest}
            />
        </div>
    );
};

export default Text;
