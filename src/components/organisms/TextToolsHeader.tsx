import { useEffect } from 'react';
import { useStore } from '@store';
import { IconButton } from '../atoms/IconButton.tsx';
import { ColorPicker } from '../atoms/ColorPicker.tsx';
import { ToggleGroup } from '../molecules/ToggleGroup.tsx';
import Dropdown from '../atoms/Dropdown.tsx';
import { textAlignmentConfig } from '../config/textalignment.config.ts';
import { textFormattingConfig } from '../config/textformatting.config.ts';
import { fontSizeConfig } from '../config/fontsize.config.ts';
import { GlowDivider } from '../atoms/GlowDivider.tsx';

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

    // console.log('here', isBold, isItalic, isUnderline);

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

    const textAlign = useStore((state) => state.textAlign);
    const setTextAlign = useStore((state) => state.setTextAlign);
    const updateText = useStore((state) => state.updateText);

    const fonts = useStore((s) => s.fonts);

    // 🔑 Apply updates to active text object
    // const updateText = (props) => {
    //     console.log(props);
    //     const active = canvas?.getActiveObject();
    //     if (active && active.type.includes('text')) {
    //         active.set(props);
    //         canvas.requestRenderAll();
    //     }
    // };

    // 🔑 Sync toolbar with selected text
    useEffect(() => {
        if (!canvas) return;

        const handleSelection = () => {
            const active = canvas.getActiveObject();
            if (active && active.type.includes('text')) {
                setFontSize(active.fontSize || 24);
                setFontFamily(active.fontFamily || 'Arial');
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
                <Dropdown
                    value={fontFamily}
                    options={fonts}
                    onChange={(fontFamily) => {
                        console.log(fontFamily);
                        setFontFamily(fontFamily);
                        updateText({ fontFamily: fontFamily });
                    }}
                />

                <FontSizeDropdown
                    value={fontSize}
                    options={fontSizeConfig}
                    handleApply={(val) => {
                        console.log(val);
                        setFontSize(val);
                        updateText({ fontSize: val });
                    }}
                />

                <ToggleGroup
                    options={textFormattingConfig}
                    value={{
                        bold: isBold,
                        italic: isItalic,
                        underline: isUnderline,
                    }}
                    onChange={(formats) => {
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
                    options={textAlignmentConfig}
                    value={{
                        left: textAlign === 'left',
                        center: textAlign === 'center',
                        right: textAlign === 'right',
                        justify: textAlign === 'justify',
                    }}
                    onChange={(formats) => {
                        const { center, right, justify } = formats;
                        let textAlign = 'left';

                        if (center) textAlign = 'center';
                        else if (right) textAlign = 'right';
                        else if (justify) textAlign = 'justify';

                        setTextAlign(textAlign);
                        updateText({ textAlign: textAlign });
                    }}
                />

                {/*<NumberInput
                        label="STR"
                        max={10}
                        value={strokeWidth}
                        onChange={(strokeWidth) => {
                            const val = parseInt(String(strokeWidth), 10);
                            setStrokeWidth(val);
                            updateText({ strokeWidth: val });
                        }}
                    />
                </div>*/}

                {/*<div className="flex items-center gap-2">
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
                    />
                </div>*/}

                {/*<ColorPicker
                    label="BG"
                    value={bgColor}
                    onChange={(bgColor) => {
                        setBgColor(color);
                        updateText({ backgroundColor: bgColor });
                    }}
                />*/}

                <GlowDivider />

                <IconButton
                    icon={<i className="fa-solid fa-circle text-xs"></i>}
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
                )}
            </div>
        </div>
    );
};
