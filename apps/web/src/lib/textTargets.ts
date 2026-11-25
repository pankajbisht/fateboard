/**
 * One rule for "the text" of a selection, used by the text float, the Text panel and the text
 * actions: a text box is its own text; a text shape (sticky note, text rectangle, …) gives the
 * Textbox inside its group, plus the group so the caller can re-fit the shape afterwards.
 * Pure: reads Fabric objects, never changes them.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const isTextType = (o: any) => (o?.type || '').toLowerCase().includes('text');

/** The editable Textbox inside a text shape (cached `__text` first), else null. */
export function shapeText(group: any): any | null {
    if (!group?.isTextShape) return null;
    return group.__text ?? group.getObjects?.().find(isTextType) ?? null;
}

export type TextTarget = { text: any; shape: any | null };

export function textTargets(selection: any[]): TextTarget[] {
    const out: TextTarget[] = [];
    for (const o of selection ?? []) {
        if (isTextType(o)) out.push({ text: o, shape: null });
        else {
            const text = shapeText(o);
            if (text) out.push({ text, shape: o });
        }
    }
    return out;
}

/** Objects that get the floating text bar: text boxes and text shapes. */
export const isTextFloatTarget = (o: any): boolean => !!o && (isTextType(o) || !!o.isTextShape);
