import { useEffect } from 'react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { useShapeFactory } from '@hooks/shape/useShapeFactory';
import { PanelHeader } from '../molecules/PanelHeader.tsx';

export function ShapePanel({ closePanel }) {
    const {
        fill,
        stroke,
        strokeWidth,
        strokeStyle,
        strokeStyleList,
        setFill,
        setStroke,
        setStrokeWidth,
        setStrokeStyle,
    } = useStore();

    const { shapesList, add, enableLineDrawing, disableLineDrawing } = useShapeFactory();
    const commonProps = { fill, stroke, strokeWidth };

    function handleAddShape(type) {
        if (type === 'line') {
            enableLineDrawing();
        } else {
            add(type, commonProps);
        }

        closePanel?.(type);
    }

    return (
        <div className="bg-gray-100 w-60 p-3 flex flex-col gap-4">
            <PanelHeader title="Shapes" onClose={closePanel} />

            <div className="grid grid-cols-[8%_92%] grid-rows-[auto_auto_auto] w-full">
                {/* Left Column: Vertical Slider */}
                <div className="row-span-4 flex flex-col items-center justify-center gap-4 h-48">
                    {/* Optional: value on top */}

                    <input
                        type="range"
                        min="0"
                        max="16"
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                        className="rotate-[-90deg] w-48 cursor-pointer"
                    />

                    {/* Optional: Brush preview */}
                </div>

                {/* Right Column Bottom: Brush Type */}
                <div className="flex items-center justify-between pl-4 flex-wrap py-4">
                    {shapesList.map((shape) => (
                        <button
                            key={shape.type}
                            className="rounded-sm hover:bg-gray-200 h-8 w-8 cursor-pointer"
                            onClick={() => handleAddShape(shape.type)}
                            title={shape.type}
                        >
                            <i className={shape.icon}></i>
                        </button>
                    ))}
                </div>

                {/* Right Column Top: Color Picker */}
                <div className="flex items-center justify-between pl-4 py-2">
                    <span className="text-sm font-medium">Stork:</span>
                    <input
                        type="color"
                        value={stroke}
                        onChange={(e) => setStroke(e.target.value)}
                        className="w-6 h-6 p-0 rounded border"
                    />

                    <span className="text-sm font-medium">Fill:</span>
                    <input
                        type="color"
                        value={fill}
                        onChange={(e) => setFill(e.target.value)}
                        className="w-6 h-6 p-0 rounded border"
                    />
                </div>

                {/* Right Column Middle: Quick Brush Width Presets */}
                <div className="flex flex-row items-center justify-start gap-2 pl-4">
                    <span className="text-sm font-medium">Width:</span>

                    <select
                        value={strokeStyle}
                        onChange={(e) => setStrokeStyle(e.target.value)}
                        className="ml-2 border rounded p-1 flex-1"
                    >
                        {strokeStyleList.map((style) => (
                            <option key={style.label} value={style.value}>
                                {style.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Right Column Middle: Custom content */}
                <div className="flex flex-row items-center justify-start gap-2 pl-4">
                    {/* Preview Circle */}
                    <div
                        className="flex items-center justify-center rounded-full border h-6 w-6"
                        style={{
                            backgroundColor: fill,
                            borderColor: '#333',
                        }}
                    >
                        {/* Optional: you could show brush type inside */}
                        <span className="text-xs text-white select-none">A</span>
                    </div>

                    {/* Brush Width */}
                    <span className="text-sm">{fill}px</span>
                </div>
            </div>
        </div>
    );
}
