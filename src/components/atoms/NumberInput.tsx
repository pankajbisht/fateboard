import React from 'react';
import clsx from 'clsx';

export type NumberInputProps = {
    label?: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
};

export const NumberInput: React.FC<NumberInputProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    className = '',
}) => {
    const increase = () => onChange(Math.min(max, value + step));
    const decrease = () => onChange(Math.max(min, value - step));

    return (
        <div className={clsx('inline-flex items-center gap-2', className)}>
            {label && <label className="text-xs">{label}:</label>}
            <div className="relative inline-flex w-18 rounded-md shadow-sm">
                <input
                    type="number"
                    value={Number(value).toString()}
                    onChange={(e) => onChange(Number(e.target.value))}
                    min={min}
                    max={max}
                    step={step}
                    className="w-full rounded-full border border-gray-300 bg-white px-3 py-[2px] text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none hover:border-gray-400 transition appearance-textfield"
                />

                <div className="absolute inset-y-1 right-1 flex flex-col divide-y border-l divide-gray-300 border-gray-300 bg-white rounded-r-md overflow-hidden">
                    <button
                        type="button"
                        onClick={increase}
                        className="flex-1 flex items-center justify-center px-1 text-gray-600 hover:bg-gray-100"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="8"
                            height="8"
                            viewBox="0 0 8 8"
                            fill="none"
                            stroke="currentColor"
                        >
                            <path
                                d="M2 5L4 3L6 5"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={decrease}
                        className="flex-1 flex items-center justify-center px-1 text-gray-600 hover:bg-gray-100"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="8"
                            height="8"
                            viewBox="0 0 8 8"
                            fill="none"
                            stroke="currentColor"
                        >
                            <path
                                d="M2 3L4 5L6 3"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NumberInput;
