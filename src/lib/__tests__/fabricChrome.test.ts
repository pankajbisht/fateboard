import { describe, expect, it } from 'vitest';
import { Rect } from 'fabric';
import { applyFabricChrome, selectionChrome } from '../fabricChrome';

describe('selection handles', () => {
    it('use solid, brand-colored corners that show on light and dark backgrounds', () => {
        applyFabricChrome();
        const r = new Rect({ width: 10, height: 10 });
        expect(r.transparentCorners).toBe(false);
        expect(r.cornerStrokeColor).toBe(selectionChrome().cornerStrokeColor);
        expect(r.borderColor).toBe(selectionChrome().borderColor);
        // chrome, not document content
        expect(r.toObject()).not.toHaveProperty('cornerColor');
    });
});

describe('selection handles follow the color theme', () => {
    it('read the theme color, and restyle existing objects when the theme changes', async () => {
        const { restyleSelectionChrome } = await import('../fabricChrome');
        document.documentElement.style.setProperty('--color-primary-400', '#2dd4bf');
        applyFabricChrome();
        expect(new Rect({ width: 1, height: 1 }).borderColor).toBe('#2dd4bf');

        const existing = new Rect({ width: 1, height: 1 });
        document.documentElement.style.setProperty('--color-primary-400', '#a78bfa');
        restyleSelectionChrome([existing]);
        expect(existing.borderColor).toBe('#a78bfa');
        expect(existing.cornerStrokeColor).toBe('#a78bfa');
        document.documentElement.style.removeProperty('--color-primary-400');
    });
});
