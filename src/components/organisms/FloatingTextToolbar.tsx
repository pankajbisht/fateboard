import { useRef, useLayoutEffect, useEffect } from 'react';
import { useStore } from '@store';
import { ToggleGroup } from '../molecules/ToggleGroup.tsx';
import Dropdown from '../atoms/Dropdown.tsx';
import { fontSizeConfig } from '../config/fontsize.config.ts';
import { textFormattingConfig } from '../config/textformatting.config.ts';

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

export function FloatingTextToolbar({ target, canvas, onChange }) {
    console.log(target.fontSize);

    const fontSize = useStore((state) => state.fontSize);
    const setFontSize = useStore((state) => state.setFontSize);

    const fontFamily = useStore((state) => state.fontFamily);
    const setFontFamily = useStore((state) => state.setFontFamily);

    const isBold = useStore((state) => state.isBold);
    const setIsBold = useStore((state) => state.setIsBold);

    const isItalic = useStore((state) => state.isItalic);
    const setIsItalic = useStore((state) => state.setIsItalic);

    const isUnderline = useStore((state) => state.isUnderline);
    const setIsUnderline = useStore((state) => state.setIsUnderline);

    const fonts = useStore((s) => s.fonts);
    const toolbarRef = useRef(null);

    useEffect(() => {
        if (!target) return;

        setIsBold(target.fontWeight === 'bold');
        setIsItalic(target.fontStyle === 'italic');
        setIsUnderline(!!target.underline);
        setFontFamily(target.fontFamily || 'Arial');
        setFontSize(target.fontSize || 14);
    }, [target]);

    // Positioning toolbar below text object
    useLayoutEffect(() => {
        if (!target || !canvas || !toolbarRef.current) return;

        const toolbarEl = toolbarRef.current;

        const place = () => {
            if (!target || !toolbarEl) return;
            target.setCoords();

            const { tl, tr, bl, br } = target.aCoords;
            const cx = (tl.x + tr.x) / 2; // center X
            const by = (bl.y + br.y) / 2; // bottom Y

            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const px = vpt[0] * cx + vpt[2] * by + vpt[4];
            const py = vpt[1] * cx + vpt[3] * by + vpt[5];

            const canvasBox = canvas.getElement().getBoundingClientRect();
            const GAP = 8;
            const left = canvasBox.left + px;
            const top = canvasBox.top + py + GAP;

            const tb = toolbarEl.getBoundingClientRect();
            toolbarEl.style.position = 'fixed';
            toolbarEl.style.left = `${left - tb.width / 2}px`;
            toolbarEl.style.top = `${top}px`;
            toolbarEl.style.zIndex = '500';
        };

        let rafId = null;
        const schedule = () => {
            if (rafId != null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                place();
            });
        };

        place();

        const events = [
            'object:moving',
            'object:scaling',
            'object:rotating',
            'object:modified',
            'mouse:wheel',
            'after:render',
        ];

        events.forEach((ev) => canvas.on(ev, schedule));
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);

        return () => {
            events.forEach((ev) => canvas.off(ev, schedule));
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
            if (rafId != null) cancelAnimationFrame(rafId);
        };
    }, [target, canvas]);

    if (!target) return null;

    return (
        <div
            ref={toolbarRef}
            className="absolute z-50 flex items-center gap-2 bg-stone-50 shadow-lg rounded-full border-1 border-stone-100 px-4 py-2"
        >
            <Dropdown
                value={fontFamily}
                options={fonts}
                onChange={(fontFamily) => {
                    console.log(fontFamily);
                    setFontFamily(fontFamily);
                    onChange?.({ fontFamily: fontFamily });
                }}
            />

            <FontSizeDropdown
                value={fontSize}
                options={fontSizeConfig}
                handleApply={(fontSize) => {
                    const val = parseInt(String(fontSize), 10);
                    setFontSize(val);
                    onChange?.({ fontSize: val });
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
                    onChange?.({
                        fontWeight: bold ? 'bold' : 'normal',
                        fontStyle: italic ? 'italic' : 'normal',
                        underline: underline,
                    });
                }}
            />
        </div>
    );
}
