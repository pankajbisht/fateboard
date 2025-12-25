import React from 'react';
import clsx from 'clsx';

type EInputFieldProps = {
    label?: string;
    id?: string;
    value?: string;
    onChange?: (e: any) => void;
    className?: string;
};

const EInputField: React.FC<EInputFieldProps> = ({
    label,
    id,
    value,
    onChange,
    className = '',
}) => (
    <div className={clsx('flex justify-between items-center', className)}>
        <label className="text-stone-500 text-sm" htmlFor={id}>
            {label}
        </label>
        <input
            id={id}
            type="text"
            value={value}
            onChange={onChange}
            className="border border-stone-500 p-1 w-24 rounded-lg"
        />
    </div>
);

export default EInputField;
