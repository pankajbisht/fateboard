/** Print marks (2026-11-17, InDesign style): crop marks, bleed / slug frames and how far they reach. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SETUP, type PageSetup } from '../pageSetup';
import { CROP_MARK, cropMarkLines, cropMarkOffset, pageFrameExtent } from '../printMarks';

const setup = (patch: Partial<PageSetup>): PageSetup => ({ ...DEFAULT_PAGE_SETUP, ...patch });

describe('print marks', () => {
    it('crop marks start past the bleed (at least the minimum offset) and do not enter it', () => {
        expect(cropMarkOffset(setup({ bleed: 0 }))).toBe(CROP_MARK.minOffset);
        expect(cropMarkOffset(setup({ bleed: 30 }))).toBe(30);
    });

    it('eight crop marks: each trim edge extended outward at every corner', () => {
        const lines = cropMarkLines(100, 50, setup({ bleed: 10 }));
        const o = 10;
        const L = CROP_MARK.length;
        expect(lines).toHaveLength(8);
        expect(lines).toEqual(
            expect.arrayContaining([
                // top-left: the top edge to the left, the left edge upward
                [-o - L, 0, -o, 0],
                [0, -o - L, 0, -o],
                // bottom-right: the bottom edge to the right, the right edge downward
                [100 + o, 50, 100 + o + L, 50],
                [100, 50 + o, 100, 50 + o + L],
            ]),
        );
        // no mark touches the page or the bleed
        for (const [x1, y1, x2, y2] of lines) {
            const inside = (x: number, y: number) => x > -o && x < 100 + o && y > -o && y < 50 + o;
            expect(inside(x1, y1) || inside(x2, y2)).toBe(false);
        }
    });

    it('extent: what is shown past the page edge (frames: bleed + slug; marks: offset + length)', () => {
        const s = setup({ bleed: 12, slug: 40 });
        expect(pageFrameExtent(s, { frames: false, marks: false })).toBe(0);
        expect(pageFrameExtent(s, { frames: true, marks: false })).toBe(52);
        expect(pageFrameExtent(s, { frames: false, marks: true })).toBe(12 + CROP_MARK.length);
        expect(pageFrameExtent(setup({ bleed: 3, slug: 0 }), { frames: true, marks: true })).toBe(
            CROP_MARK.minOffset + CROP_MARK.length,
        );
    });
});
