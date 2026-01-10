import { useState, useEffect } from 'react';
import { useStore } from '@store';
import { IconButton } from '../atoms/IconButton.tsx';
import { ColorPicker } from '../atoms/ColorPicker.tsx';
import { Select } from '../atoms/Select.tsx';
import { NumberInput } from '../atoms/NumberInput.tsx';
import { ToggleGroup } from '../molecules/ToggleGroup.tsx';
import Dropdown from '../atoms/Dropdown.tsx';

const FontSizeDropdown = ({ value, options, handleApply, className = '' }) => {
    return (
        <Dropdown
            value={value}
            options={options}
            className={className}
            onChange={(selected) => {
                handleApply?.(selected);
            }}
        />
    );
};

const options = [
    { label: '8px', value: 8 },
    { label: '10px', value: 10 },
    { label: '12px', value: 12 },
    { label: '14px', value: 14 },
    { label: '16px', value: 16 },
    { label: '18px', value: 18 },
    { label: '20px', value: 20 },
    { label: '24px', value: 24 },
    { label: '28px', value: 28 },
    { label: '32px', value: 32 },
    { label: '36px', value: 36 },
    { label: '48px', value: 48 },
    { label: '64px', value: 64 },
    { label: '72px', value: 72 },
    { label: '96px', value: 96 },
    { label: '144px', value: 144 },
];

export const TextToolsHeader = () => {
    const { canvas } = useStore();
    const fontSize = useStore((state) => state.fontSize);
    const setFontSize = useStore((state) => state.setFontSize);

    const bgColor = useStore((state) => state.bgColor);
    const setBgColor = useStore((state) => state.setBgColor);

    const color = useStore((state) => state.color);
    const setColor = useStore((state) => state.setColor);

    const hasShadow = useStore((state) => state.hasShadow);
    const setHasShadow = useStore((state) => state.setHasShadow);

    const shadowColor = useStore((state) => state.shadowColor);
    const setShadowColor = useStore((state) => state.setShadowColor);

    const fontFamily = useStore((state) => state.fontFamily);
    const setFontFamily = useStore((state) => state.setFontFamily);

    const align = useStore((state) => state.align);
    const setAlign = useStore((state) => state.setAlign);

    const isBold = useStore((state) => state.isBold);
    const setIsBold = useStore((state) => state.setIsBold);

    const isItalic = useStore((state) => state.isItalic);
    const setIsItalic = useStore((state) => state.setIsItalic);

    const isUnderline = useStore((state) => state.isUnderline);
    const setIsUnderline = useStore((state) => state.setIsUnderline);

    const charSpacing = useStore((state) => state.charSpacing);
    const setCharSpacing = useStore((state) => state.setCharSpacing);

    const lineHeight = useStore((state) => state.lineHeight);
    const setLineHeight = useStore((state) => state.setLineHeight);

    const strokeWidth = useStore((state) => state.strokeWidth);
    const setStrokeWidth = useStore((state) => state.setStrokeWidth);

    const strokeColor = useStore((state) => state.strokeColor);
    const setStrokeColor = useStore((state) => state.setStrokeColor);

    const fillColor = useStore((state) => state.fillColor);
    const setFillColor = useStore((state) => state.setFillColor);

    const fonts = useStore((s) => s.fonts);

    // 🔑 Apply updates to active text object
    const updateText = (props) => {
        const active = canvas?.getActiveObject();
        if (active && active.type.includes('text')) {
            active.set(props);
            canvas.requestRenderAll();
        }
    };

    // 🔑 Sync toolbar with selected text
    useEffect(() => {
        if (!canvas) return;

        const handleSelection = () => {
            const active = canvas.getActiveObject();
            if (active && active.type.includes('text')) {
                setFontSize(active.fontSize || 24);
                setFontFamily(active.fontFamily || 'Arial');
                //        setIsBold(active.fontWeight === "bold");
                //        setIsItalic(active.fontStyle === "italic");
                //        setIsUnderline(!!active.underline);
                //        setAlign(active.textAlign || "left");
                //        setFillColor(active.fill || "#000000");
                //
                //        if (active.shadow) {
                //          setHasShadow(true);
                //          setShadowColor(active.shadow.color || "#888888");
                //        } else {
                //          setHasShadow(false);
                //        }
                //
                //        setStrokeWidth(active.strokeWidth || 0);
                //        setStrokeColor(active.stroke || "#000000");
                //        setLineHeight(active.lineHeight || 1.2);
                //        setCharSpacing(active.charSpacing || 0);
                //        setBgColor(active.backgroundColor || "");
            }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
        };
    }, [canvas]);

    return (
        <div className="px-5 flex flex-wrap gap-4 overflow-x-auto items-center bg-white text-sm">
            <div className="flex items-center justify-between whitespace-nowrap text-sm gap-4">
                <FontSizeDropdown
                    value={fontSize}
                    options={options}
                    handleApply={(val) => {
                        console.log(val);
                        setFontSize(val);
                        updateText({ fontSize: val });
                    }}
                />

                {/*<ColorPicker
                    label="BG"
                    value={bgColor}
                    onChange={(bgColor) => {
                        setBgColor(color);
                        updateText({ backgroundColor: bgColor });
                    }}
                />*/}

                {/*<ColorPicker
                    label="TXT"
                    value={fillColor}
                    onChange={(color) => {
                        setFillColor(color);
                        updateText({ fill: color });
                    }}
                />*/}

                {/*<Select
                    onChange={(fontFamily) => {
                        console.log(fontFamily);
                        setFontFamily(fontFamily);
                        updateText({ fontFamily: fontFamily });
                    }}
                    options={fonts}
                    value={fontFamily}
                />*/}

                {/*<NumberInput
                    value={fontSize}
                    onChange={(fontSize) => {
                        const val = parseInt(String(fontSize), 10);
                        setFontSize(val);
                        updateText({ fontSize: val });
                    }}
                />*/}

                <ToggleGroup
                    options={[
                        { key: 'bold', icon: 'fa-solid fa-bold', tooltip: 'Bold' },
                        { key: 'italic', icon: 'fa-solid fa-italic', tooltip: 'Italic' },
                        { key: 'underline', icon: 'fa-solid fa-underline', tooltip: 'Underline' },
                    ]}
                    onChange={(formats) => {
                        console.log('formats:', formats);
                        const { bold, italic, underline } = formats;

                        setIsBold(bold);
                        setIsItalic(italic);
                        setIsUnderline(underline);

                        updateText({ fontWeight: bold ? 'bold' : 'normal' });
                        updateText({ fontStyle: italic ? 'italic' : 'normal' });
                        updateText({ underline: underline });
                    }}
                />

                <ToggleGroup
                    single
                    options={[
                        { key: 'left', icon: 'fa-solid fa-align-left', tooltip: 'Left Align' },
                        {
                            key: 'center',
                            icon: 'fa-solid fa-align-center',
                            tooltip: 'Center Align',
                        },
                        { key: 'right', icon: 'fa-solid fa-align-right', tooltip: 'Right Align' },
                        { key: 'justify', icon: 'fa-solid fa-align-justify', tooltip: 'Justify' },
                    ]}
                    onChange={(formats) => {
                        console.log('align:', formats);
                        const { left, center, right, justify } = formats;
                        let textAlign = 'left'; // default fallback

                        if (center) textAlign = 'center';
                        else if (right) textAlign = 'right';
                        else if (justify) textAlign = 'justify';

                        updateText({ textAlign: textAlign });
                    }}
                />

                <div className="flex items-center gap-2">
                    {/*<ColorPicker
                        label="Stroke"
                        value={strokeColor}
                        onChange={(color) => {
                            setStrokeColor(color);
                            updateText({ stroke: color });
                        }}
                    />*/}

                    {/*<NumberInput
                        label="STR"
                        max={10}
                        value={strokeWidth}
                        onChange={(strokeWidth) => {
                            const val = parseInt(String(strokeWidth), 10);
                            setStrokeWidth(val);
                            updateText({ strokeWidth: val });
                        }}
                    />*/}
                </div>

                <div className="flex items-center gap-2">
                    {/*<NumberInput
                        label="LH"
                        step={0.1}
                        value={lineHeight}
                        onChange={(lineHeight) => {
                            const val = parseFloat(String(lineHeight));
                            setLineHeight(val);
                            updateText({ lineHeight: val });
                        }}
                    />*/}

                    {/*<NumberInput
                        label="LS"
                        value={charSpacing}
                        onChange={(charSpacing) => {
                            const val = parseInt(String(charSpacing), 10);
                            setCharSpacing(val);
                            updateText({ charSpacing: val });
                        }}
                    />*/}
                </div>

                {/*<IconButton
                    icon={<i className="fa-solid fa-square text-xs"></i>}
                    onClick={() => {
                        const newVal = !hasShadow;
                        setHasShadow(newVal);
                        updateText({
                            shadow: newVal
                                ? { color: shadowColor, blur: 5, offsetX: 2, offsetY: 2 }
                                : null,
                        });
                    }}
                    active={hasShadow}
                    title="Shadow"
                />

                {hasShadow && (
                    <ColorPicker
                        label="Shadow"
                        value={shadowColor}
                        onChange={(color) => {
                            setShadowColor(color);
                            updateText({
                                shadow: { color: color, blur: 5, offsetX: 2, offsetY: 2 },
                            });
                        }}
                    />
                )}*/}
            </div>
        </div>
    );
};
