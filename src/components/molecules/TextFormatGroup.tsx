import { useState } from 'react';

export const TextFormatGroup = ({ onChange }) => {
    const [formats, setFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
    });

    const toggle = (key) => {
        const updated = { ...formats, [key]: !formats[key] };
        setFormats(updated);
        onChange?.(updated); // pass back to parent
    };

    return (
        <div className="inline-flex rounded-md border border-gray-300 bg-white shadow-sm overflow-hidden">
            {/* Bold */}
            <button
                type="button"
                onClick={() => toggle('bold')}
                className={`px-3 py-1 text-sm font-bold ${
                    formats.bold ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
                B
            </button>

            {/* Italic */}
            <button
                type="button"
                onClick={() => toggle('italic')}
                className={`px-3 py-1 text-sm italic ${
                    formats.italic ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
                I
            </button>

            {/* Underline */}
            <button
                type="button"
                onClick={() => toggle('underline')}
                className={`px-3 py-1 text-sm underline ${
                    formats.underline ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
                U
            </button>
        </div>
    );
};
