/** Print frames around the design page (2026-11-17): bleed, slug and crop marks outside the page. */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SETUP, type PageSetup } from '@/lib/document/pageSetup';
import { CROP_MARK } from '@/lib/document/printMarks';
import { PageFrame } from '../PageFrame';

const setup = (patch: Partial<PageSetup>): PageSetup => ({ ...DEFAULT_PAGE_SETUP, ...patch });
const draw = (s: PageSetup) =>
    render(<PageFrame left={200} top={100} scale={0.5} width={100} height={60} setup={s} />)
        .container;
const box = (el: Element | null) =>
    ['x', 'y', 'width', 'height'].map((k) => Number(el?.getAttribute(k)));

describe('PageFrame', () => {
    it('draws the bleed (red) and slug (blue) frames around the page at the board scale', () => {
        const c = draw(setup({ bleed: 10, slug: 20 }));
        const svg = c.querySelector('svg')!;
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        // extent 30 page px = 15 CSS px (+1 so the outer line is not cut)
        expect(svg.style.left).toBe(`${200 - 16}px`);
        expect(svg.style.top).toBe(`${100 - 16}px`);
        expect(svg.style.width).toBe(`${50 + 32}px`);
        expect(box(c.querySelector('[data-frame="bleed"]'))).toEqual([16 - 5, 16 - 5, 60, 40]);
        expect(box(c.querySelector('[data-frame="slug"]'))).toEqual([16 - 15, 16 - 15, 80, 60]);
        expect(c.querySelector('[data-frame="crop-marks"]')).toBeNull();
    });

    it('draws eight crop marks outside the bleed when shown', () => {
        const c = draw(setup({ bleed: 10, cropMarks: true, guides: false }));
        const marks = c.querySelector('[data-frame="crop-marks"]');
        expect(marks?.getAttribute('d')?.match(/M/g)).toHaveLength(8);
        expect(c.querySelector('[data-frame="bleed"]')).toBeNull(); // frames follow Show guides
        const pad = (10 + CROP_MARK.length) * 0.5 + 1;
        expect(c.querySelector('svg')!.style.left).toBe(`${200 - pad}px`);
    });

    it('draws nothing without bleed, slug or crop marks, or with guides and marks off', () => {
        expect(draw(setup({})).querySelector('svg')).toBeNull();
        expect(draw(setup({ bleed: 10, slug: 5, guides: false })).querySelector('svg')).toBeNull();
    });
});
