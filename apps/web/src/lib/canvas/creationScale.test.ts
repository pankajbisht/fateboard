/**
 * New objects follow the page (design) or the zoom (whiteboard), like Canva / FigJam / Miro, so a
 * new shape or text never looks tiny on a big page or when zoomed out.
 */
import { describe, expect, it } from 'vitest';
import { DESIGN_REFERENCE_SIDE, creationScale } from './creationScale';

describe('creationScale', () => {
    it('design: follows the page’s shorter side (a 600 px side = the base sizes)', () => {
        expect(DESIGN_REFERENCE_SIDE).toBe(600);
        expect(creationScale({ boardMode: 'design', pageWidth: 1920, pageHeight: 1080 })).toBe(1.8);
        expect(creationScale({ boardMode: 'design', pageWidth: 1080, pageHeight: 1920 })).toBe(1.8);
        expect(creationScale({ boardMode: 'design', pageWidth: 600, pageHeight: 800 })).toBe(1);
    });

    it('design: zooming does not change the size of new objects', () => {
        const page = { boardMode: 'design' as const, pageWidth: 1920, pageHeight: 1080 };
        expect(creationScale({ ...page, viewportZoom: 3 })).toBe(creationScale(page));
    });

    it('whiteboard: new objects look the same on screen at any zoom', () => {
        expect(creationScale({ boardMode: 'whiteboard', viewportZoom: 1 })).toBe(1);
        expect(creationScale({ boardMode: 'whiteboard', viewportZoom: 0.5 })).toBe(2);
        expect(creationScale({ boardMode: 'whiteboard', viewportZoom: 4 })).toBe(0.25);
    });

    it('stays within sane limits and falls back to 1 without a size', () => {
        expect(creationScale({ boardMode: 'design', pageWidth: 10000, pageHeight: 10000 })).toBe(8);
        expect(creationScale({ boardMode: 'design', pageWidth: 10, pageHeight: 10 })).toBe(0.25);
        expect(creationScale({ boardMode: 'design' })).toBe(1);
        expect(creationScale({ boardMode: 'whiteboard', viewportZoom: 0 })).toBe(1);
    });
});
