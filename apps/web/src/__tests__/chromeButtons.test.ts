/** BUG-065: the editor chrome (top toolbars, header, footer) uses the shared Button / IconButton only. */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    [
        '/src/components/organisms/toolbars/**/*.tsx',
        '/src/components/organisms/header/**/*.tsx',
        '/src/components/organisms/footer/**/*.tsx',
        '!/src/**/__tests__/**',
    ],
    { query: '?raw', import: 'default', eager: true },
);

describe('editor chrome buttons (BUG-065)', () => {
    it('no hand-rolled <button> elements', () => {
        const offenders = Object.entries(SRC)
            .filter(([, code]) => /<button\b/.test(code))
            .map(([f]) => f);
        expect(offenders).toEqual([]);
    });
});
