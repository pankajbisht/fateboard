import { useState } from 'react';

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
