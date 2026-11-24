/**
 * Print marks (InDesign / Clip Studio style, 2026-11-17), pure. Page coordinates: the trim (page) is
 * 0 … w × 0 … h; marks and frames sit outside it (negative or past w / h). Used by the board overlay
 * (`organisms/board/ui/PageFrame.tsx`), the fit (`lib/canvas/pageFit.ts`) and export with crop marks.
 * Lengths are page px (96 per inch).
 */
import type { PageSetup } from './pageSetup';

/** Crop mark size: 0.25 in long, at least 1/12 in (6 pt) from the trim, never inside the bleed. */
export const CROP_MARK = { length: 24, minOffset: 8 } as const;

/** Line segment [x1, y1, x2, y2] in page px. */
export type MarkLine = [number, number, number, number];

/** How far from the trim the crop marks start. */
export const cropMarkOffset = (s: Pick<PageSetup, 'bleed'>): number =>
    Math.max(s.bleed, CROP_MARK.minOffset);

/** The eight crop marks of a w × h page: each trim edge extended outward at every corner. */
export function cropMarkLines(w: number, h: number, s: Pick<PageSetup, 'bleed'>): MarkLine[] {
    const o = cropMarkOffset(s);
    const L = CROP_MARK.length;
    return [
        [-o - L, 0, -o, 0], // top-left
        [0, -o - L, 0, -o],
        [w + o, 0, w + o + L, 0], // top-right
        [w, -o - L, w, -o],
        [-o - L, h, -o, h], // bottom-left
        [0, h + o, 0, h + o + L],
        [w + o, h, w + o + L, h], // bottom-right
        [w, h + o, w, h + o + L],
    ];
}

/**
 * How far past every page edge something is shown (page px): the bleed + slug frames and / or the crop
 * marks. The fit leaves room for it; export with crop marks includes it.
 */
export function pageFrameExtent(
    s: Pick<PageSetup, 'bleed' | 'slug'>,
    show: { frames: boolean; marks: boolean },
): number {
    const frames = show.frames ? s.bleed + s.slug : 0;
    const marks = show.marks ? cropMarkOffset(s) + CROP_MARK.length : 0;
    return Math.max(frames, marks);
}
