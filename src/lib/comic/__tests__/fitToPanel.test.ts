/** Fitting a scene or picture into a comic panel (pure geometry). */
import { describe, expect, it } from 'vitest';
import { bestPanel, fitInto } from '../fitToPanel';

const panel = { left: 100, top: 50, width: 300, height: 400 };

describe('fitInto', () => {
    it('fill covers the whole panel with the picture`s proportions, centred on the panel', () => {
        // a wide 16:9 scene in a tall panel: the height decides, the sides are cropped
        const f = fitInto({ width: 800, height: 450 }, panel, 'fill');
        expect(f.scale).toBeCloseTo(400 / 450, 6);
        expect(800 * f.scale).toBeGreaterThanOrEqual(panel.width);
        expect(450 * f.scale).toBeCloseTo(panel.height, 6);
        expect(f.cx).toBe(250);
        expect(f.cy).toBe(250);
    });

    it('fit shows the whole picture inside the panel', () => {
        const f = fitInto({ width: 800, height: 450 }, panel, 'fit');
        expect(f.scale).toBeCloseTo(300 / 800, 6);
        expect(800 * f.scale).toBeCloseTo(panel.width, 6);
        expect(450 * f.scale).toBeLessThanOrEqual(panel.height);
    });

    it('a picture that already has the panel shape fills and fits to the same scale', () => {
        const a = fitInto({ width: 150, height: 200 }, panel, 'fill');
        const b = fitInto({ width: 150, height: 200 }, panel, 'fit');
        expect(a.scale).toBeCloseTo(b.scale, 9);
        expect(a.scale).toBeCloseTo(2, 9);
    });

    it('an empty picture or panel never gives NaN or zero', () => {
        for (const size of [
            { width: 0, height: 0 },
            { width: 0, height: 10 },
        ]) {
            const f = fitInto(size, panel, 'fill');
            expect(Number.isFinite(f.scale) && f.scale > 0).toBe(true);
        }
        expect(
            fitInto({ width: 10, height: 10 }, { left: 0, top: 0, width: 0, height: 0 }, 'fit')
                .scale,
        ).toBe(1);
    });
});

describe('bestPanel', () => {
    const panels = [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 110, top: 0, width: 100, height: 100 },
        { left: 0, top: 110, width: 210, height: 100 },
    ];
    it('is the panel the picture overlaps most', () => {
        expect(bestPanel({ left: 120, top: 10, width: 60, height: 60 }, panels)).toBe(1);
        expect(bestPanel({ left: 10, top: 120, width: 150, height: 60 }, panels)).toBe(2);
        // straddling two panels: the larger share wins
        expect(bestPanel({ left: 60, top: 10, width: 100, height: 50 }, panels)).toBe(1);
    });
    it('the panel the centre is in wins, even when a bigger part of the picture overlaps another', () => {
        // a wide scene whose centre is in panel 0 but which reaches far into panels 1 and 2
        expect(bestPanel({ left: -150, top: -100, width: 400, height: 300 }, panels)).toBe(0);
    });
    it('falls back to the nearest panel when it overlaps none, and to -1 with no panels', () => {
        expect(bestPanel({ left: 400, top: 5, width: 20, height: 20 }, panels)).toBe(1);
        expect(bestPanel({ left: 0, top: 0, width: 10, height: 10 }, [])).toBe(-1);
    });
});
