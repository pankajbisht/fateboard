import * as fabric from 'fabric';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import type { SliceCreator } from '../types';
import { fontFamilyConfig } from '@/components/config/fontfamily.config';
import { wirePlaceholderBehavior } from './colorSystemFixes';
import { textTargets } from '@/lib/textTargets';

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

export type TextCase = 'upper' | 'lower' | 'title';

/** Props Fabric can store per character (`styles`); everything else is box-level only. */
const CHAR_PROPS = new Set([
    'fill',
    'stroke',
    'strokeWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'underline',
    'overline',
    'linethrough',
    'textBackgroundColor',
    'deltaY',
]);

/** A text object (Text / IText / Textbox). Editing fields exist on IText and Textbox only. */
type TextObject = fabric.FabricText &
    Partial<Pick<fabric.IText, 'isEditing' | 'selectionStart' | 'selectionEnd'>>;

const toCase = (text: string, mode: TextCase) =>
    mode === 'upper'
        ? text.toUpperCase()
        : mode === 'lower'
          ? text.toLowerCase()
          : text
                .toLowerCase()
                .replace(/(^|[\s\-_/(])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

/** Web fonts load on demand: measure again once the face is ready, or line breaks come out wrong. */
function remeasureWhenLoaded(
    objs: TextObject[],
    family: string,
    canvas: { requestRenderAll: () => void },
    after?: () => void,
) {
    const fonts: Pick<FontFaceSet, 'load'> | undefined =
        typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts?.load) return;
    fonts
        // a stored value can be a list ("'Inter', Arial, sans-serif"): load its first family
        .load(`16px "${family.split(',')[0].replace(/['"]/g, '').trim()}"`)
        .then(() => {
            objs.forEach((o) => {
                o.initDimensions();
                o.setCoords();
            });
            after?.(); // e.g. re-fit text shapes to the real glyph widths
            canvas.requestRenderAll();
        })
        .catch(() => {
            /* font unavailable: Fabric keeps the fallback face */
        });
}

export interface TextSlice {
    fonts: { label: string; value: string }[];
    fontSize: number;
    bgColor: string;
    hasShadow: boolean;
    shadowColor: string;
    fontFamily: string;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    charSpacing: number;
    lineHeight: number;
    strokeColor: string;
    textAlign: string;

    setBgColor: (val: string) => void;
    setFontSize: (val: number) => void;
    setHasShadow: (val: boolean) => void;
    setShadowColor: (val: string) => void;
    setFontFamily: (val: string) => void;
    setIsBold: (val: boolean) => void;
    setIsItalic: (val: boolean) => void;
    setIsUnderline: (val: boolean) => void;
    setCharSpacing: (val: number) => void;
    setLineHeight: (val: number) => void;
    setStrokeColor: (val: string) => void;
    setTextAlign: (val: string) => void;
    /**
     * Style the selected text. While typing with characters selected, character-level props apply
     * to those characters only. `history: false` previews without an undo step (slider drag);
     * commit with a final call that records history.
     */
    updateText: (props: Record<string, unknown>, opts?: { history?: boolean }) => void;
    /** Change the letter case of the selected text boxes. */
    setTextCase: (mode: TextCase) => void;
    addText: (textObj?: TextInput) => void;
}

/*
 * NOTE: the setters below only update the STORE (they never touch the canvas).
 * Apply to the canvas with updateText(...) for text properties, and with
 * handleColorChange / setFill / setStroke for colors. `strokeWidth` belongs to the shape-style
 * slice and the brush owns `color` / `fillColor` (BUG-002: one owner per key).
 */
export const createTextSlice: SliceCreator<TextSlice> = (set, get) => ({
    fonts: fontFamilyConfig,
    fontSize: 16,
    bgColor: '#000000',
    setBgColor: (val) => set({ bgColor: val }),
    setFontSize: (val) => set({ fontSize: val }),
    hasShadow: false,
    setHasShadow: (val) => set({ hasShadow: val }),
    shadowColor: '',
    setShadowColor: (val) => set({ shadowColor: val }),
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
    textAlign: '',
    setTextAlign: (val) => set({ textAlign: val }),

    // Fabric types are 'Textbox' / 'IText' / 'Text' (case differs by version)
    updateText: (rawProps, opts = {}) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const props = { ...rawProps };
        // plain { color, blur, offsetX, offsetY } -> fabric.Shadow (null removes it)
        if (props.shadow && !(props.shadow instanceof fabric.Shadow)) {
            props.shadow = new fabric.Shadow(props.shadow);
        }

        // text boxes AND the text inside shapes / sticky notes (lib/textTargets)
        const found = textTargets(canvas.getActiveObjects());
        if (found.length === 0) return;
        const targets = found.map((f) => f.text as TextObject);
        const refit = () =>
            found.forEach(({ shape }) => {
                if (!shape) return;
                shape.set('dirty', true);
                get().fitTextShape?.(shape); // grow / re-wrap the shape around its text
            });

        targets.forEach((o) => {
            const charProps: Record<string, unknown> = {};
            const boxProps: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(props)) {
                (CHAR_PROPS.has(k) ? charProps : boxProps)[k] = v;
            }

            const start = o.selectionStart ?? 0;
            const end = o.selectionEnd ?? 0;
            const hasRange = !!o.isEditing && end > start;

            if (hasRange && Object.keys(charProps).length) {
                // style only the highlighted characters
                o.setSelectionStyles(charProps, start, end);
                o.set(boxProps);
            } else {
                // whole box: drop per-character overrides of the same props so the change shows
                // keys come from CHAR_PROPS, i.e. character style properties
                Object.keys(charProps).forEach((k) =>
                    o.removeStyle(k as Parameters<typeof o.removeStyle>[0]),
                );
                o.set(props);
            }
            o.initDimensions();
            o.setCoords();
        });

        refit();
        if (typeof props.fontFamily === 'string') {
            remeasureWhenLoaded(targets, props.fontFamily, canvas, refit);
        }

        canvas.requestRenderAll();
        if (opts.history !== false) get().saveState?.();
    },

    setTextCase: (mode) => {
        const canvas = get().canvas;
        if (!canvas) return;
        const found = textTargets(canvas.getActiveObjects());
        if (found.length === 0) return;
        const targets = found.map((f) => f.text as TextObject);

        targets.forEach((o) => {
            // upper / lower / title keep the length for almost all text, so per-character styles stay aligned
            o.set({ text: toCase(String(o.text ?? ''), mode) });
            o.initDimensions();
            o.setCoords();
        });
        found.forEach(({ shape }) => shape && get().fitTextShape?.(shape));
        canvas.requestRenderAll();
        get().saveState?.();
    },

    addText: (textObj: TextInput = {}) => {
        const canvas = get().canvas;
        if (!canvas) return;

        // `fontSize` and `width` are base sizes: sized for the page / zoom (lib/canvas/creationScale)
        const k = creationScaleOf(get());
        const {
            text = 'Enter text', // placeholder text
            fontSize: baseFontSize = 36,
            bold = false,
            italic = false,
            underline = false,
            fontFamily = 'Arial',
            width: baseWidth = 200,
            textColor = '#000000',
            placeholderColor = '#9ca3af',
        } = textObj;

        const fontSize = baseFontSize * k;
        const width = baseWidth * k;
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
            // wrap at word boundaries (true broke words mid-word)
            splitByGrapheme: false,
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
