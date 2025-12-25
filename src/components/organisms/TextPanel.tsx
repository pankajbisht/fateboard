//// TextPanel.jsx
//import { useState } from "react";
//import {PanelHeader} from "../molecules/PanelHeader.tsx";
//
//export function TextPanel({ onAddText, closePanel }) {
//  const [text, setText] = useState("");
//  const [fontSize, setFontSize] = useState(16);
//  const [bold, setBold] = useState(false);
//  const [italic, setItalic] = useState(false);
//  const [underline, setUnderline] = useState(false);
//  const [color, setColor] = useState("#000000");
//
//  const handleAddText = () => {
//    if (!text.trim()) return;
//    onAddText?.({
//      text,
//      fontSize,
//      bold,
//      italic,
//      underline,
//      fill: color,
//    });
//    setText(""); // clear input after adding
//  };
//
//  const styleButton = (active) =>
//    `px-3 py-1 border rounded focus:outline-none focus:ring ${
//      active ? "bg-gray-300" : "hover:bg-gray-100"
//    }`;
//
//  return (
//    <div className="w-64 space-y-4 rounded">
//
//      <PanelHeader title="Text" onClose={closePanel} />
//
//      {/* Text Input */}
//      <div>
//        <label className="block text-sm font-medium mb-1">Text</label>
//        <input
//          type="text"
//          value={text}
//          onChange={(e) => setText(e.target.value)}
//          placeholder="Enter text..."
//          className="w-full border rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-300"
//        />
//      </div>
//
//      {/* Font Size + Color in same row */}
//      <div className="flex space-x-2 items-center">
//        <div className="flex-1">
//          <label className="block text-sm font-medium mb-1">Font Size</label>
//          <input
//            type="number"
//            value={fontSize}
//            onChange={(e) => setFontSize(Number(e.target.value))}
//            min={8}
//            max={100}
//            className="w-full border rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-300"
//          />
//        </div>
//
//        <div className="w-16">
//          <label className="block text-sm font-medium mb-1">Color</label>
//          <input
//            type="color"
//            value={color}
//            onChange={(e) => setColor(e.target.value)}
//            className="w-full h-8 p-0 border rounded cursor-pointer"
//          />
//        </div>
//      </div>
//
//      {/* Style Buttons */}
//      <div className="flex space-x-2">
//        <button className={styleButton(bold)} onClick={() => setBold((prev) => !prev)}>
//          <span className="font-bold">B</span>
//        </button>
//        <button className={styleButton(italic)} onClick={() => setItalic((prev) => !prev)}>
//          <span className="italic">I</span>
//        </button>
//        <button className={styleButton(underline)} onClick={() => setUnderline((prev) => !prev)}>
//          <span className="underline">U</span>
//        </button>
//      </div>
//
//      {/* Add to Canvas Button */}
//      <button
//        onClick={handleAddText}
//        className="w-full mt-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
//      >
//        Add to Canvas
//      </button>
//    </div>
//  );
//}

// FloatingTextToolbar.jsx
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
