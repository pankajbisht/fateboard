import * as fabric from 'fabric';
import type { SliceCreator } from '../types';
import { fontFamilyConfig } from '@/components/config/fontfamily.config';
import { wirePlaceholderBehavior } from './colorSystemFixes';

type TextInput = {
    text?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontFamily?: string;
    width?: number;
    textColor?: string;
    placeholderColor?: string;
};

export interface TextSlice {
    fonts: string[];
    fontSize: number;
    bgColor: string;
    color: string;
    hasShadow: boolean;
    shadowColor: string;
    fontFamily: string;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    charSpacing: number;
    lineHeight: number;
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
    textAlign: string;

    setBgColor: (val: string) => void;
    setFontSize: (val: number) => void;
    setHasShadow: (val: boolean) => void;
    setShadowColor: (val: string) => void;
    setColor: (val: string) => void;
    setFontFamily: (val: string) => void;
    setIsBold: (val: boolean) => void;
    setIsItalic: (val: boolean) => void;
    setIsUnderline: (val: boolean) => void;
    setCharSpacing: (val: number) => void;
    setLineHeight: (val: number) => void;
    setStrokeColor: (val: string) => void;
    setStrokeWidth: (val: number) => void;
    setFillColor: (val: string) => void;
    setTextAlign: (val: string) => void;
    updateText: (props: Record<string, any>) => void;
    addText: (textObj?: TextInput) => void;
}

/*
 * NOTE: the setters below only update the STORE (they never touch the canvas).
 * Apply to the canvas with updateText(...) for text properties, and with
 * handleColorChange / setFill / setStroke for colors. strokeWidth also exists in the
 * shape-style slice; both default to 1, but keep one of them as the source of truth.
 */
export const createTextSlice: SliceCreator<TextSlice> = (set, get) => ({
    fonts: fontFamilyConfig,
    fontSize: 16,
    bgColor: '#000000',
    setBgColor: (val) => set({ bgColor: val }),
    setFontSize: (val) => set({ fontSize: val }),
    color: '#000000',
    hasShadow: false,
    setHasShadow: (val) => set({ hasShadow: val }),
    shadowColor: '',
    setShadowColor: (val) => set({ shadowColor: val }),
    setColor: (val) => set({ color: val }),
    fontFamily: 'Arial',
    setFontFamily: (val) => set({ fontFamily: val }),
    isBold: false,
    setIsBold: (val) => set({ isBold: val }),
    isItalic: false,
    setIsItalic: (val) => set({ isItalic: val }),
    isUnderline: false,
    setIsUnderline: (val) => set({ isUnderline: val }),
    charSpacing: 0,
    setCharSpacing: (val) => set({ charSpacing: val }),
    lineHeight: 1.2,
    setLineHeight: (val) => set({ lineHeight: val }),
    strokeColor: '#000000',
    setStrokeColor: (val) => set({ strokeColor: val }),
    strokeWidth: 1,
    setStrokeWidth: (val) => set({ strokeWidth: val }),
    fillColor: '#000000',
    setFillColor: (val) => set({ fillColor: val }),
    textAlign: '',
    setTextAlign: (val) => set({ textAlign: val }),

    // Fabric v6 types are 'Textbox' / 'IText' - the old `type.includes('text')` was always false
    updateText: (props) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const targets = canvas
            .getActiveObjects()
            .filter((o: any) => (o.type || '').toLowerCase().includes('text'));
        if (targets.length === 0) return;

        targets.forEach((o: any) => o.set(props));
        canvas.requestRenderAll();
        get().saveState?.();
    },

    addText: (textObj: TextInput = {}) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const {
            text = 'Enter text', // placeholder text
            fontSize = 36,
            bold = false,
            italic = false,
            underline = false,
            fontFamily = 'Arial',
            width = 200,
            textColor = '#000000',
            placeholderColor = '#9ca3af',
        } = textObj;

        const center = canvas.getVpCenter();

        const fabricText = new fabric.Textbox(text, {
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
            fontSize,
            fontWeight: bold ? 'bold' : 'normal',
            fontStyle: italic ? 'italic' : 'normal',
            underline,
            fill: placeholderColor, // starts as placeholder
            fontFamily,
            width,
            editable: true,
            objectCaching: false,
            padding: 4,
            splitByGrapheme: true,
        });

        // Placeholder handling that no longer overwrites a color the user picked
        wirePlaceholderBehavior(fabricText, canvas, { text, textColor, placeholderColor });

        canvas.add(fabricText);
        canvas.setActiveObject(fabricText);

        // Enter editing immediately
        fabricText.enterEditing();
        setTimeout(() => {
            fabricText.hiddenTextarea?.focus();
            fabricText.selectAll();
        }, 0);

        set({ showTextToolbar: true, selectedObject: fabricText }, false, 'text/add');
        get().saveState?.();
        canvas.requestRenderAll();
    },
});
