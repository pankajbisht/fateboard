// import React from 'react';
// import clsx from 'clsx';

// type ToggleButtonProps = {
//     on: boolean;
//     onClick?: () => void;
//     className?: string;
// };

// export const ToggleButton: React.FC<ToggleButtonProps> = ({ on, onClick, className = '' }) => {
//     return (
//         <div
//             className={clsx('inline-flex mt-1', className)}
//             role="group"
//             aria-label="toggle buttons"
//         >
//             <button
//                 type="button"
//                 onClick={onClick}
//                 className={clsx(
//                     'px-4 py-1 rounded-l-full text-white h-8',
//                     on ? 'bg-teal-600' : 'bg-yellow-400',
//                 )}
//             >
//             </button>

//             <button
//                 type="button"
//                 onClick={onClick}
//                 className={clsx(
//                     'px-4 py-1 rounded-r-full text-white h-8',
//                     !on ? 'bg-teal-600' : 'bg-yellow-400',
//                 )}
//             >
//             </button>
//         </div>
//     );
// };

// export default ToggleButton;

import { useState } from 'react';

// type ToggleButtonProps = {
//     on: boolean;
//     onClick?: () => void;
//     className?: string;
// };

function ToggleButton({ label, onChange }: { label: string; onChange: (v: boolean) => void }) {
    const [checked, setChecked] = useState(false);

    const handleChange = (value: boolean) => {
        setChecked(value);
        onChange(value);
    };

    return (
        <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">{label}</span>

            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => handleChange(!checked)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
          ${checked ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </div>
    );
}

export default ToggleButton;
