/**
 * Fitting a picture or a scene into a comic panel (pure). `fill` covers the whole panel (the overflow is cut by the
 * panel's clip: the usual way to put art in a manga panel); `fit` shows the whole picture inside the panel. Both keep
 * the picture's proportions and centre it on the panel. `bestPanel` says which panel a picture belongs to: the one its
 * centre is in (a big scene dragged onto a panel), else the one it overlaps most, else the nearest.
 */
import type { Rect as Box } from '@/lib/document/pageSetup';

export type FitMode = 'fill' | 'fit';

export interface Fitted {
    /** the scale to give the picture (its own width and height times this) */
    scale: number;
    /** the panel's centre: where the picture's centre goes */
    cx: number;
    cy: number;
}

export function fitInto(size: { width: number; height: number }, box: Box, mode: FitMode): Fitted {
    const sx = size.width > 0 ? box.width / size.width : 1;
    const sy = size.height > 0 ? box.height / size.height : 1;
    const scale = mode === 'fill' ? Math.max(sx, sy) : Math.min(sx, sy);
    return {
        scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
        cx: box.left + box.width / 2,
        cy: box.top + box.height / 2,
    };
}

const overlap = (a: Box, b: Box) =>
    Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));

/** The index of the panel `target` belongs to, or -1 when there are no panels. */
export function bestPanel(target: Box, panels: Box[]): number {
    const tx0 = target.left + target.width / 2;
    const ty0 = target.top + target.height / 2;
    const home = panels.findIndex(
        (p) => tx0 >= p.left && tx0 <= p.left + p.width && ty0 >= p.top && ty0 <= p.top + p.height,
    );
    if (home >= 0) return home;
    let best = -1;
    let bestArea = -1;
    let bestDist = Infinity;
    const tx = target.left + target.width / 2;
    const ty = target.top + target.height / 2;
    panels.forEach((p, i) => {
        const area = overlap(target, p);
        const dist = Math.hypot(p.left + p.width / 2 - tx, p.top + p.height / 2 - ty);
        if (area > bestArea || (area === bestArea && dist < bestDist)) {
            best = i;
            bestArea = area;
            bestDist = dist;
        }
    });
    return best;
}
