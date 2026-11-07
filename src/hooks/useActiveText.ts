import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@store';
import { textTargets } from '@/lib/textTargets';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TextShadowSnapshot = { color: string; blur: number; offsetX: number; offsetY: number };

/** What the text panel shows: the first selected text box (or the selected characters). */
export type ActiveTextSnapshot = {
    count: number;
    /** Typing inside the box with characters highlighted: char-level edits apply to them only. */
    hasRange: boolean;
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    linethrough: boolean;
    textAlign: string;
    charSpacing: number;
    lineHeight: number;
    fill: string;
    stroke: string | null;
    strokeWidth: number;
    textBackgroundColor: string;
    shadow: TextShadowSnapshot | null;
    opacity: number;
};

/** Canvas events after which the selected text (or its look) may have changed. */
const EVENTS = [
    'selection:created',
    'selection:updated',
    'selection:cleared',
    'object:modified',
    'text:changed',
    'text:selection:changed',
    'text:editing:entered',
    'text:editing:exited',
] as const;

const asColor = (v: unknown, fallback: string) => (typeof v === 'string' && v ? v : fallback);

/** The selected text's look (also used by the ⌘B / ⌘I / ⌘U commands). */
export function readActiveText(canvas: any): ActiveTextSnapshot | null {
    // text boxes and the text inside shapes / sticky notes (same rule as updateText)
    const texts = textTargets(canvas?.getActiveObjects?.() ?? []).map((t) => t.text);
    const o = texts[0];
    if (!o) return null;

    const hasRange =
        !!o.isEditing && typeof o.selectionStart === 'number' && o.selectionEnd > o.selectionStart;
    // inside a highlighted range, show the style of its first character
    const ch: Record<string, any> = hasRange
        ? { ...o, ...(o.getSelectionStyles?.(o.selectionStart, o.selectionStart + 1)?.[0] ?? {}) }
        : o;

    const weight = ch.fontWeight;
    const shadow = o.shadow
        ? {
              color: asColor(o.shadow.color, '#000000'),
              blur: Number(o.shadow.blur) || 0,
              offsetX: Number(o.shadow.offsetX) || 0,
              offsetY: Number(o.shadow.offsetY) || 0,
          }
        : null;

    return {
        count: texts.length,
        hasRange,
        fontFamily: String(ch.fontFamily ?? 'Arial'),
        fontSize: Number(ch.fontSize) || 16,
        bold: weight === 'bold' || Number(weight) >= 600,
        italic: ch.fontStyle === 'italic',
        underline: !!ch.underline,
        linethrough: !!ch.linethrough,
        textAlign: String(o.textAlign || 'left'),
        charSpacing: Number(o.charSpacing) || 0,
        lineHeight: Number(o.lineHeight) || 1.16,
        fill: asColor(ch.fill, '#000000'),
        stroke: ch.stroke && Number(ch.strokeWidth) > 0 ? asColor(ch.stroke, '#000000') : null,
        strokeWidth: Number(ch.strokeWidth) || 0,
        textBackgroundColor: asColor(ch.textBackgroundColor, ''),
        shadow,
        opacity: o.opacity ?? 1,
    };
}

/**
 * Live snapshot of the selected text box, read from the Fabric canvas (the source of truth).
 * Re-reads on selection / typing / modify events; call `refresh()` after a store action that
 * changed the object without firing an event (e.g. `updateText`).
 */
export function useActiveText(): [ActiveTextSnapshot | null, () => void] {
    const canvas = useStore((s) => s.canvas) as any;
    const [version, setVersion] = useState(0);
    const refresh = useCallback(() => setVersion((v) => v + 1), []);

    useEffect(() => {
        if (!canvas?.on) return;
        EVENTS.forEach((name) => canvas.on(name, refresh));
        return () => EVENTS.forEach((name) => canvas.off?.(name, refresh));
    }, [canvas, refresh]);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the change signal
    const snapshot = useMemo(() => readActiveText(canvas), [canvas, version]);
    return [snapshot, refresh];
}
