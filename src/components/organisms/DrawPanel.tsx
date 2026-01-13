import { useStore } from '@store';
import { PanelHeader } from '../molecules/PanelHeader.tsx';
import { useEffect } from 'react';
import * as fabric from 'fabric';

export function DrawPanel({ closePanel }) {
    const canvas = useStore((s) => s.canvas);
    const brushColor = useStore((s) => s.color);
    const setBrushColor = useStore((s) => s.setBrushColor);
    const brushWidth = useStore((s) => s.width);
    const setBrushWidth = useStore((s) => s.setBrushWidth);
    const brushType = useStore((s) => s.brush);
    const setBrush = useStore((s) => s.setBrush);

    console.log('brushColor', brushColor);

    const brushOptions = ['pencil', 'circle', 'spray', 'pattern', 'eraser'];

    return (
        <div className="bg-gray-100 w-60 p-3 flex flex-col gap-4">
            <PanelHeader title="Draw" onClose={closePanel} />

            <div className="grid grid-cols-[8%_92%] grid-rows-[auto_auto_auto] w-full">
                {/* Left Column: Vertical Slider */}
                <div className="row-span-4 flex flex-col items-center justify-center gap-4 h-48">
                    {/* Optional: value on top */}

                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={brushWidth}
                        onChange={(e) => setBrushWidth({ width: Number(e.target.value) })}
                        className="rotate-[-90deg] w-48 cursor-pointer"
                    />

                    {/* Optional: Brush preview */}
                </div>

                {/* Right Column Top: Color Picker */}
                <div className="flex items-center justify-between pl-4 relative">
                    <span className="text-sm font-medium">Color:</span>
                    <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor({ color: e.target.value })}
                        className="absolute right-0 w-8 h-8 opacity-0 cursor-pointer"
                    />
                    <div
                        className="h-6 w-6 rounded-full border shadow-sm"
                        style={{ backgroundColor: brushColor }}
                    />
                </div>

                {/* Right Column Bottom: Brush Type */}
                <div className="flex items-center justify-between pl-4">
                    <span className="text-sm font-medium">Brush:</span>
                    <select
                        value={brushType}
                        onChange={(e) =>
                            setBrush({
                                color: brushColor,
                                width: brushWidth,
                                brush: e.target.value,
                            })
                        }
                        className="ml-2 border rounded p-1 flex-1"
                    >
                        {brushOptions.map((b) => (
                            <option key={b} value={b}>
                                {b.charAt(0).toUpperCase() + b.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Right Column Middle: Quick Brush Width Presets */}
                <div className="flex flex-row items-center justify-start gap-2 pl-4">
                    <span className="text-sm font-medium">Width:</span>
                    {[12, 10, 8, 6, 4, 2].map((size) => (
                        <div
                            key={size}
                            onClick={() => setBrushWidth({ width: size })}
                            className={`rounded-full border cursor-pointer flex items-center justify-center transition-transform
                        ${brushWidth === size ? 'scale-110 border-blue-500' : 'border-gray-400'}`}
                            style={{
                                width: `${size * 2}px`, // visual scaling
                                height: `${size * 2}px`,
                                backgroundColor: brushColor,
                            }}
                        ></div>
                    ))}
                </div>

                {/* Right Column Middle: Custom content */}
                <div className="flex flex-row items-center justify-start gap-2 pl-4">
                    {/* Preview Circle */}
                    <div
                        className="flex items-center justify-center rounded-full border h-6 w-6"
                        style={{
                            backgroundColor: brushColor,
                            borderColor: '#333',
                        }}
                    >
                        {/* Optional: you could show brush type inside */}
                        <span className="text-xs text-white select-none">
                            {brushType.charAt(0).toUpperCase()}
                        </span>
                    </div>

                    {/* Brush Width */}
                    <span className="text-sm">{brushWidth}px</span>
                </div>
            </div>
        </div>
    );
}
