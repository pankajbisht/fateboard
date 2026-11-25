import type { BrowStyle } from '../schema/types';

/**
 * Brow shapes (docs/CHARACTER_STUDIO.md, manga look), in latitude on the head (+ = up) and line widths against the face
 * line. A brow is three points: inner end, middle, outer end. `y` is the base height; `mid`, `inner` and `outer` raise
 * (+) or lower (-) the middle and the ends from it; emotion tilt and raise come on top (face.ts). The first three are
 * the original brows, unchanged; angry (shonen: inner ends low, a straight slope) and thin (shojo arch) are manga.
 */
export interface BrowShape {
    y: number;
    mid: number;
    inner: number;
    outer: number;
    width: number;
}

export const BROW_SHAPES: Record<BrowStyle, BrowShape> = {
    soft: { y: 0.22, mid: 0.04, inner: -0.03, outer: -0.04, width: 1.3 },
    straight: { y: 0.2, mid: 0, inner: -0.03, outer: -0.04, width: 1.3 },
    thick: { y: 0.22, mid: 0, inner: -0.03, outer: -0.04, width: 2.1 },
    angry: { y: 0.21, mid: -0.02, inner: -0.08, outer: 0.01, width: 1.8 },
    thin: { y: 0.25, mid: 0.05, inner: -0.04, outer: -0.05, width: 0.85 },
};
