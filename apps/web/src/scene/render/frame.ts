import type { SceneFrame } from '../schema/types';
import { LAYER, type SortItem } from './types';

/**
 * The frame over the picture: a rounded or round frame covers the corners with a paper mat (a path with a hole,
 * even-odd, so no clip path is needed: Fabric's SVG loader keeps it), then the border on the frame's edge.
 */
export const MAT = '#ffffff';

const f = (n: number) => (Math.round(n * 10) / 10).toString();

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
    return (
        `M${f(x + r)} ${f(y)}L${f(x + w - r)} ${f(y)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)}` +
        `L${f(x + w)} ${f(y + h - r)}Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)}` +
        `L${f(x + r)} ${f(y + h)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)}` +
        `L${f(x)} ${f(y + r)}Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`
    );
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
    return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
}

/** The frame's inner shape (where the picture shows). */
export function frameShapePath(frame: SceneFrame, w: number, h: number): string {
    const inset = frame.border / 2;
    if (frame.shape === 'circle') {
        const r = Math.min(w, h) / 2 - inset;
        return ellipsePath(w / 2, h / 2, r, r);
    }
    const r = frame.shape === 'rounded' ? Math.min(w, h) * 0.07 : 0;
    return roundedRect(inset, inset, w - 2 * inset, h - 2 * inset, r);
}

export function frameItems(frame: SceneFrame, w: number, h: number): SortItem[] {
    const shape = frameShapePath(frame, w, h);
    const items: SortItem['items'] = [];
    if (frame.shape !== 'rect')
        items.push({
            key: 'mat',
            d: `M0 0L${f(w)} 0L${f(w)} ${f(h)}L0 ${f(h)}Z${shape}`,
            fill: MAT,
            stroke: null,
            strokeWidth: 0,
            evenOdd: true,
        });
    if (frame.border > 0)
        items.push({
            key: 'border',
            d: shape,
            fill: 'none',
            stroke: frame.borderColor,
            strokeWidth: frame.border,
        });
    return items.length ? [{ layer: LAYER.frame, distance: 0, items }] : [];
}
