/** Fonts the app loads in index.html must also be pickable in the font list. */
import { describe, expect, it } from 'vitest';
import { FONT_GROUPS } from '../shapeFonts';

const library = FONT_GROUPS.flatMap((g) => g.fonts);
const byLabel = (label: string) => library.find((f) => f.label === label);

describe('font library', () => {
    it.each([
        ['Comic Neue', true],
        ['Patrick Hand', false],
        ['Bubblegum Sans', false],
        ['Fredoka One', false],
        ['Poppins', true],
    ])('%s is in the picker and loads from Google Fonts (bold: %s)', (label, bold) => {
        const font = byLabel(label);
        expect(font).toBeDefined();
        expect(font!.google).toBe(label);
        expect(!!font!.bold).toBe(bold);
    });

    it('lists every font once', () => {
        const labels = library.map((f) => f.label);
        expect(new Set(labels).size).toBe(labels.length);
    });
});
