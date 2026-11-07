/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fabric from 'fabric';
import { loadTemplateFonts } from './fontLoader';
import {
    REFERENCE_WIDTH,
    type FontRole,
    type FontTemplate,
    type FontTemplateItem,
} from './fontTemplates.config';

type CanvasInstance = fabric.Canvas;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isTextObject = (object: any): boolean =>
    String(object?.type ?? '')
        .toLowerCase()
        .includes('text');

/** Visible area of the canvas in SCENE coordinates (respects viewport zoom / pan). */
function getVisibleArea(canvas: CanvasInstance) {
    const vt = (canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as fabric.TMat2D;
    const inverse = fabric.util.invertTransform(vt);

    const center = fabric.util.transformPoint(
        new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
        inverse,
    );

    const zoom = canvas.getZoom() || 1;

    return {
        center,
        width: canvas.getWidth() / zoom,
        height: canvas.getHeight() / zoom,
    };
}

/** Template sizes are designed for a 1280px canvas; scale them to the real canvas. */
const getScale = (visibleWidth: number) => clamp(visibleWidth / REFERENCE_WIDTH, 0.5, 2.5);

const fontStyleOf = (item: FontTemplateItem) => (item.italic ? 'italic' : 'normal');

/* ------------------------------------------------------------------ */
/* 1) Add a whole template as new text objects                         */
/* ------------------------------------------------------------------ */
export async function addFontTemplate(
    canvas: CanvasInstance,
    template: FontTemplate,
): Promise<fabric.FabricObject[]> {
    // Fonts first: Fabric measures the text when the Textbox is created.
    await loadTemplateFonts(template.items);

    const area = getVisibleArea(canvas);
    const scale = getScale(area.width);
    const width = Math.min(template.width * scale, area.width * 0.86);

    const objects = template.items.map(
        (item) =>
            new fabric.Textbox(item.uppercase ? item.text.toUpperCase() : item.text, {
                left: 0,
                top: 0,
                width,
                fontFamily: item.fontFamily,
                fontSize: Math.max(8, Math.round(item.fontSize * scale)),
                fontWeight: item.fontWeight,
                fontStyle: fontStyleOf(item),
                fill: item.fill,
                charSpacing: item.charSpacing ?? 0,
                lineHeight: item.lineHeight ?? 1.2,
                textAlign: item.textAlign ?? 'left',
            }),
    );

    // Stack the lines and centre the block in the visible area.
    const gaps = template.items.map((item) => (item.gapAfter ?? 14) * scale);
    const heights = objects.map((object) => object.getScaledHeight());
    const total =
        heights.reduce((sum, h) => sum + h, 0) + gaps.slice(0, -1).reduce((sum, g) => sum + g, 0);

    let y = area.center.y - total / 2;
    const left = area.center.x - width / 2;

    objects.forEach((object, index) => {
        object.set({ left, top: y });
        object.setCoords();
        y += heights[index]! + (gaps[index] ?? 0);
    });

    canvas.discardActiveObject();
    canvas.add(...objects);

    // Select the block so it can be moved as one piece right away.
    if (objects.length === 1) {
        canvas.setActiveObject(objects[0]!);
    } else {
        canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
    }

    canvas.requestRenderAll();
    return objects;
}

/* ------------------------------------------------------------------ */
/* 2) Apply a template to text that is already on the canvas           */
/* ------------------------------------------------------------------ */
function itemForPosition(template: FontTemplate, index: number): FontTemplateItem {
    const role: FontRole = index === 0 ? 'heading' : index === 1 ? 'subheading' : 'body';
    return (
        template.items.find((item) => item.role === role) ??
        template.items[Math.min(index, template.items.length - 1)]!
    );
}

/**
 * Applies the template's fonts to the selected text, top to bottom:
 * first line -> heading style, second -> subheading, the rest -> body.
 * A single selected text gets the heading style.
 * Returns how many text objects were changed.
 */
export async function applyFontTemplateToSelection(
    canvas: CanvasInstance,
    template: FontTemplate,
    options: { includeSize?: boolean } = {},
): Promise<number> {
    const targets = canvas
        .getActiveObjects()
        .filter(isTextObject)
        .sort((a: any, b: any) => (a.top ?? 0) - (b.top ?? 0));

    if (targets.length === 0) return 0;

    await loadTemplateFonts(template.items);

    const scale = getScale(getVisibleArea(canvas).width);

    targets.forEach((object: any, index) => {
        const item = itemForPosition(template, index);

        object.set({
            fontFamily: item.fontFamily,
            fontWeight: item.fontWeight,
            fontStyle: fontStyleOf(item),
            fill: item.fill,
            charSpacing: item.charSpacing ?? 0,
            lineHeight: item.lineHeight ?? object.lineHeight,
            ...(options.includeSize
                ? { fontSize: Math.max(8, Math.round(item.fontSize * scale)) }
                : {}),
        });

        object.initDimensions?.(); // re-measure with the new font
        object.set('dirty', true);
        object.setCoords();
    });

    canvas.getActiveObject()?.setCoords();
    canvas.requestRenderAll();

    return targets.length;
}

/* ------------------------------------------------------------------ */
/* 3) Save the selected text as a reusable template                    */
/* ------------------------------------------------------------------ */
const hexLuminance = (hex: string): number | null => {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const full =
        m[1]!.length === 3
            ? m[1]!
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : m[1]!;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export function createTemplateFromSelection(
    canvas: CanvasInstance,
    name: string,
): FontTemplate | null {
    const texts = canvas
        .getActiveObjects()
        .filter(isTextObject)
        .sort((a: any, b: any) => (a.top ?? 0) - (b.top ?? 0))
        .slice(0, 3) as any[];

    if (texts.length === 0) return null;

    const scale = getScale(getVisibleArea(canvas).width);
    const roles: FontRole[] = ['heading', 'subheading', 'body'];

    const items: FontTemplateItem[] = texts.map((object, index) => {
        const next = texts[index + 1];
        const gap = next ? (next.top - (object.top + object.getScaledHeight())) / scale : 0;

        const align = object.textAlign;

        return {
            role: roles[index]!,
            text: String(object.text ?? ''),
            fontFamily: String(object.fontFamily ?? 'Inter'),
            fontSize: Math.round(((object.fontSize ?? 32) * (object.scaleY ?? 1)) / scale),
            fontWeight: Number(object.fontWeight) || 400,
            italic: object.fontStyle === 'italic',
            fill: typeof object.fill === 'string' ? object.fill : '#111827',
            charSpacing: object.charSpacing ?? 0,
            lineHeight: object.lineHeight ?? 1.2,
            textAlign: align === 'center' || align === 'right' ? align : 'left',
            gapAfter: Math.round(clamp(gap, 0, 80)),
        };
    });

    const first = texts[0];
    const lum = hexLuminance(items[0]!.fill);

    return {
        id: `custom-${Date.now()}`,
        name: name.trim() || 'My font set',
        category: 'Mine',
        background: lum !== null && lum > 0.7 ? '#1c1917' : '#ffffff',
        width: Math.round(((first.width ?? 600) * (first.scaleX ?? 1)) / scale),
        items,
        custom: true,
    };
}
