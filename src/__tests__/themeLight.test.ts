/**
 * `.theme-light` pins the light tokens on light-only pages under a dark editor theme (BUG-196):
 * every value it sets must be the light value from `@theme`, and it must cover every token that
 * dark mode changes, except the translucent brand tints (they follow the color theme).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// read from disk: Vitest stubs CSS imports, even `?raw`
const CSS = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

const block = (selector: string): Record<string, string> => {
    const start = CSS.indexOf(`${selector} {`);
    const body = CSS.slice(start, CSS.indexOf('\n}', start));
    return Object.fromEntries(
        [...body.matchAll(/^\s*(--color-[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1]!, m[2]!.trim()]),
    );
};

describe('.theme-light', () => {
    const light = block('@theme');
    const dark = block(':root.dark');
    const pinned = block(':root.dark .theme-light');

    it('uses the @theme light values', () => {
        expect(Object.keys(pinned).length).toBeGreaterThan(5);
        for (const [token, value] of Object.entries(pinned))
            expect(value, token).toBe(light[token]);
    });

    it('reads the theme blocks', () => {
        expect(Object.keys(light).length).toBeGreaterThan(20);
        expect(Object.keys(dark).length).toBeGreaterThan(10);
    });

    it('covers every token dark mode changes, but the brand tints and editor-only colors', () => {
        const skipped = /^--color-(primary-\d+|accent-\d+|workspace|board)$/;
        const missing = Object.keys(dark).filter((t) => !skipped.test(t) && !(t in pinned));
        expect(missing).toEqual([]);
    });
});
