import { collectPaintTargets } from '@/store/slices/colorSystemFixes';

/**
 * Rules for the dock's fill / stroke toggles (Remove fill ⇄ Add fill, Remove stroke ⇄ Add stroke).
 * Pure: reads Fabric objects, never changes them (the store actions do that).
 */

type Paintable = {
    type?: string;
    fill?: unknown;
    stroke?: unknown;
    strokeWidth?: number;
};
export type PaintKind = 'fill' | 'stroke';

const TEXT_TYPES = ['text', 'itext', 'i-text', 'textbox'];
export const isTextObject = (o: Paintable) => TEXT_TYPES.includes((o.type || '').toLowerCase());
const isImage = (o: Paintable) => (o.type || '').toLowerCase() === 'image';

/** What "Add fill" / "Add stroke" puts back (same as a new shape / the Text panel outline). */
export const PAINT_DEFAULTS = {
    shape: { fill: '#FFFFFF', stroke: '#000000', strokeWidth: 2 },
    text: { fill: '#000000', stroke: '#000000', strokeWidth: 2 },
} as const;

/** null, '', 'transparent' and zero-alpha colors are "no paint"; gradients / patterns are paint. */
export function isVisiblePaint(v: unknown): boolean {
    if (v === null || v === undefined || v === '') return false;
    if (typeof v !== 'string') return true; // fabric.Gradient / Pattern
    const s = v.trim().toLowerCase();
    if (s === 'transparent' || s === 'none') return false;
    const fn = /^(?:rgba|hsla)\((.+)\)$/.exec(s);
    if (fn) {
        const alpha = fn[1].split(/[,\s/]+/).filter(Boolean)[3];
        return alpha === undefined || parseFloat(alpha) > 0;
    }
    const hex = /^#([0-9a-f]{4}|[0-9a-f]{8})$/.exec(s);
    if (hex) return !/^0+$/.test(hex[1].length === 4 ? hex[1][3] : hex[1].slice(6));
    return true;
}

export const hasFill = (o: Paintable) => isVisiblePaint(o.fill);
export const hasStroke = (o: Paintable) => isVisiblePaint(o.stroke) && (o.strokeWidth ?? 0) > 0;

/** The objects a toggle paints: group children (like color picks); no images for fill. */
export function paintTargets<T extends Paintable>(selection: T[], paint: PaintKind): T[] {
    const all = collectPaintTargets(selection, paint) as T[];
    return paint === 'fill' ? all.filter((o) => !isImage(o)) : all;
}

/**
 * `applicable`: something selected that this toggle can paint.
 * `present`: at least one target has it, so the click removes it (from all); otherwise it adds.
 */
export function paintState(selection: Paintable[], paint: PaintKind) {
    const targets = paintTargets(selection, paint);
    const has = paint === 'fill' ? hasFill : hasStroke;
    return { applicable: targets.length > 0, present: targets.some(has) };
}
