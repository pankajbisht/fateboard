import { useState, useEffect, useRef } from 'react';

export function TextPanel({ target, onChange }) {
    const [fontSize, setFontSize] = useState(16);
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);
    const [underline, setUnderline] = useState(false);
    const [color, setColor] = useState('#000000');
    const toolbarRef = useRef(null);

    // position near the selected text element
    useEffect(() => {
        if (!target || !toolbarRef.current) return;
        const box = target.getBoundingClientRect();
        toolbarRef.current.style.left = `${box.x + box.width / 2}px`;
        toolbarRef.current.style.top = `${box.y - 45}px`; // appear above text
    }, [target]);

    if (!target) return null;

    const styleButton = (active) =>
        `w-8 h-8 flex items-center justify-center border rounded-md text-sm
     ${active ? 'bg-gray-200 border-gray-400' : 'hover:bg-gray-100'}`;

    return (
        <div
            ref={toolbarRef}
            className="absolute z-50 flex items-center gap-2 bg-white shadow-lg border rounded-lg px-2 py-1 text-sm"
        >
            {/* Font Size */}
            <input
                type="number"
                value={fontSize}
                onChange={(e) => {
                    const val = Number(e.target.value);
                    setFontSize(val);
                    onChange?.({ fontSize: val });
                }}
                className="w-14 border rounded-md px-1 py-0.5 text-sm"
            />

            {/* Color */}
            <input
                type="color"
                value={color}
                onChange={(e) => {
                    const val = e.target.value;
                    setColor(val);
                    onChange?.({ color: val });
                }}
                className="w-7 h-7 border rounded cursor-pointer"
            />

            {/* Styles */}
            <button
                className={styleButton(bold)}
                onClick={() => {
                    setBold(!bold);
                    onChange?.({ bold: !bold });
                }}
            >
                <span className="font-bold">B</span>
            </button>
            <button
                className={styleButton(italic)}
                onClick={() => {
                    setItalic(!italic);
                    onChange?.({ italic: !italic });
                }}
            >
                <span className="italic">I</span>
            </button>
            <button
                className={styleButton(underline)}
                onClick={() => {
                    setUnderline(!underline);
                    onChange?.({ underline: !underline });
                }}
            >
                <span className="underline">U</span>
            </button>
        </div>
    );
}
