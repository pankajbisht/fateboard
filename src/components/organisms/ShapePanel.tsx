import { useEffect } from 'react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { useShapeFactory } from '@hooks/shape/useShapeFactory';
import { PanelHeader } from '../molecules/PanelHeader.tsx';
import { Tooltip } from '../molecules/Tooltip.tsx';
import IconButton from '../atoms/IconButton.tsx';

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
    const iconSize = useStore((state) => state.iconSize);

    function handleAddShape(type) {
        if (type === 'line') {
            enableLineDrawing();
        } else {
            add(type, commonProps);
        }

        closePanel?.(type);
    }

    const renderIcon = (icon) => {
        if (!icon) return null;

        // 1️⃣ Font Awesome class string
        if (typeof icon === 'string') {
            // Image URL
            if (icon.match(/\.(png|jpg|jpeg|webp|svg)$/)) {
                return <img src={icon} alt="" />;
            }

            // SVG markup string
            if (icon.trim().startsWith('<svg')) {
                return <span dangerouslySetInnerHTML={{ __html: icon }} />;
            }

            // Font Awesome class
            return <i className={icon} />;
        }

        // 2️⃣ React component (SVG component)
        if (typeof icon === 'function') {
            const IconComponent = icon;
            return <IconComponent />;
        }

        // 3️⃣ JSX element (<svg />, <img />, <i />, etc.)
        if (React.isValidElement(icon)) {
            return icon;
        }

        return null;
    };

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

                {/*<div className="flex items-center justify-between pl-4 flex-wrap py-4">
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
                </div>*/}

                <div className="gap-1.5 flex items-center justify-start pl-4 flex-wrap py-4">
                    {shapesList.map((shape, i) => (
                        <Tooltip
                            key={shape.id ?? `${shape.type}-${i}`}
                            position="bottom"
                            content={shape.tooltip}
                        >
                            <IconButton
                                icon={renderIcon(shape.icon)}
                                title={shape.tooltip}
                                aria-label={shape.tooltip}
                                onClick={() => handleAddShape(shape.type)}
                                size={iconSize}
                            />
                        </Tooltip>
                    ))}
                </div>

                {/*<ul className="flex items-center gap-2 px-1">
                {actions.map(action => (
                    <li key={action.id}>
                    <Tooltip position="bottom" content={action.tooltip}>
                        <IconButton
                        icon={action.icon}
                        title={action.tooltip}
                        aria-label={action.tooltip}
                        onClick={action.onClick}
                        />
                    </Tooltip>
                    </li>
                ))}
                </ul>*/}

                {/* Right Column Top: Color Picker */}
                {/*<div className="flex items-center justify-between pl-4 py-2">
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
                </div>*/}

                {/* Right Column Middle: Quick Brush Width Presets */}
                {/*<div className="flex flex-row items-center justify-start gap-2 pl-4">
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
                </div>*/}

                {/* Right Column Middle: Custom content */}
                {/*<div className="flex flex-row items-center justify-start gap-2 pl-4">
                    <div
                        className="flex items-center justify-center rounded-full border h-6 w-6"
                        style={{
                            backgroundColor: fill,
                            borderColor: '#333',
                        }}
                    >
                        <span className="text-xs text-white select-none">A</span>
                    </div>

                    <span className="text-sm">{fill}px</span>
                </div>*/}
            </div>
        </div>
    );
}
