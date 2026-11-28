// @vitest-environment node
/** Design board fit (2026-11-17, InDesign "Fit Page" / "Fit width"): one formula for CanvasBoard and the Page slice. */
import { describe, expect, it } from 'vitest';
import { FIT_GAP, PORTRAIT_OPEN_ZOOM, fitGap, fitStage, openZoom, pageFitScale } from '../pageFit';

describe('pageFitScale', () => {
    const view = { w: 1280, h: 758 };
    const page = { w: 1080, h: 1920 };

    it('fit page: the whole page fills the view minus a small gap (portrait = by height)', () => {
        expect(fitGap(view)).toBe(FIT_GAP);
        expect(pageFitScale(view, page, 0, 'page')).toBeCloseTo((758 - 2 * FIT_GAP) / 1920, 9);
    });

    it('leaves room for bleed / slug / crop marks around the page', () => {
        const extent = 60; // page px past every edge
        expect(pageFitScale(view, page, extent, 'page')).toBeCloseTo(
            (758 - 2 * FIT_GAP) / (1920 + 2 * extent),
            9,
        );
    });

    it('fit width fills the width (may pass 100 %); fit page never enlarges past 100 %', () => {
        expect(pageFitScale(view, page, 0, 'width')).toBeCloseTo((1280 - 2 * FIT_GAP) / 1080, 9);
        expect(pageFitScale({ w: 4000, h: 4000 }, { w: 300, h: 250 }, 0, 'page')).toBe(1);
    });

    it('a small view (phone) keeps a smaller gap; an empty view or page gives 1', () => {
        expect(fitGap({ w: 390, h: 700 })).toBeLessThan(FIT_GAP);
        expect(pageFitScale({ w: 0, h: 0 }, page, 0, 'page')).toBe(1);
        expect(pageFitScale(view, { w: 0, h: 0 }, 0, 'page')).toBe(1);
    });
});

describe('fitStage (the scroll area around the page)', () => {
    it('a fitted page (+ frames) never overflows the view, even after rounding; frames still fit', () => {
        let worst = 0;
        for (let vw = 300; vw <= 1900; vw += 37)
            for (let vh = 300; vh <= 1100; vh += 41)
                for (const [pw, ph] of [
                    [1080, 1920],
                    [794, 1123],
                    [816, 1056],
                    [1920, 1080],
                ])
                    for (const extent of [0, 8, 32, 72, 140])
                        for (const mode of ['page', 'width'] as const) {
                            const view = { w: vw, h: vh };
                            const page = { w: pw, h: ph };
                            const s = pageFitScale(view, page, extent, mode);
                            const dw = Math.max(1, Math.round(pw * s));
                            const k = dw / pw; // CSS px per page px as drawn
                            const margin = fitGap(view) + extent * k;
                            const stage = fitStage(vw, dw, margin);
                            if (mode === 'page' || mode === 'width')
                                worst = Math.max(worst, stage - vw);
                            // the frames (extent) and PageFrame's 1 px pad fit inside the stage
                            expect((stage - dw) / 2).toBeGreaterThanOrEqual(extent * k + 1);
                        }
        expect(worst).toBeLessThanOrEqual(0);
    });

    it('a zoomed-in page scrolls: the stage grows past the view', () => {
        expect(fitStage(800, 2000, 40)).toBe(2080);
        expect(fitStage(800, 300, 40)).toBe(800);
    });
});

describe('openZoom (portrait pages open a bit taller than the board, owner 2026-11-17)', () => {
    it('a portrait page opens at 1.3 × the fit, so it scrolls a little; landscape / square at the fit', () => {
        expect(PORTRAIT_OPEN_ZOOM).toBe(1.3);
        expect(openZoom({ w: 1280, h: 758 }, { w: 1080, h: 1920 }, 0)).toBe(1.3);
        expect(openZoom({ w: 1280, h: 758 }, { w: 1920, h: 1080 }, 0)).toBe(1);
        expect(openZoom({ w: 1280, h: 758 }, { w: 2048, h: 2048 }, 0)).toBe(1);
    });

    it('never wider than the board: capped at Fit width (a narrow / portrait screen)', () => {
        const view = { w: 700, h: 900 };
        const page = { w: 794, h: 1123 };
        const cap = pageFitScale(view, page, 0, 'width') / pageFitScale(view, page, 0, 'page');
        expect(cap).toBeLessThan(1.3);
        expect(openZoom(view, page, 0)).toBeCloseTo(Math.max(1, cap), 9);
    });

    it('unknown view: the fit', () => {
        expect(openZoom({ w: 0, h: 0 }, { w: 1080, h: 1920 }, 0)).toBe(1);
    });
});
