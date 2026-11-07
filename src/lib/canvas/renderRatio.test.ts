/** BUG-108: the design canvas renders at the pixel density it is shown at (sharp zoomed in, light zoomed out). */
import { describe, expect, it } from 'vitest';
import { MAX_BACKSTORE_PX, designRenderRatio } from './renderRatio';

describe('designRenderRatio', () => {
    it('= devicePixelRatio × on-screen scale', () => {
        // 1920 × 1080 page at 40 % on a retina screen: 1 (was 2 = 3840 × 2160 backstore);
        // never below 1: Fabric's pointer maths breaks under 1
        expect(designRenderRatio({ dpr: 2, displayScale: 0.4, width: 1920, height: 1080 })).toBe(1);
        expect(
            designRenderRatio({ dpr: 2, displayScale: 0.75, width: 1920, height: 1080 }),
        ).toBeCloseTo(1.5);
        // zoomed to 200 %: 4, so it stays sharp (was 2 = blurry)
        expect(
            designRenderRatio({ dpr: 2, displayScale: 2, width: 1920, height: 1080 }),
        ).toBeCloseTo(4);
        expect(designRenderRatio({ dpr: 1, displayScale: 1, width: 800, height: 600 })).toBe(1);
    });

    it('never makes a backstore side larger than the browser limit', () => {
        const r = designRenderRatio({ dpr: 2, displayScale: 4, width: 4000, height: 3000 });
        expect(4000 * r).toBeLessThanOrEqual(MAX_BACKSTORE_PX);
    });

    it('falls back to 1 on bad input', () => {
        expect(designRenderRatio({ dpr: NaN, displayScale: 0, width: 0, height: 0 })).toBe(1);
    });
});
