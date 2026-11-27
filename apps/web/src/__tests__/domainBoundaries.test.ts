/**
 * The character and scene domains are pure TypeScript (docs/CHARACTER_STUDIO.md §9.1): no React, no Fabric, no
 * store, no components. Their `board.ts` is the only file that talks to Fabric. Pure code is testable without a
 * browser and reusable by every consumer (studio view, SVG download, the page, a future worker or server).
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    [
        '/src/character/**/*.ts',
        '/src/scene/**/*.ts',
        '/src/props/**/*.ts',
        '!/src/**/__tests__/**',
        '!/src/**/*.test.ts',
    ],
    { query: '?raw', import: 'default', eager: true },
);

const code = (text: string) =>
    text
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');

const pure = Object.entries(SRC).filter(([file]) => !/\/board\.ts$/.test(file));

const offenders = (pattern: RegExp, files = pure) =>
    files.filter(([, text]) => pattern.test(code(text))).map(([file]) => file);

describe('domain boundaries (src/character, src/scene, src/props)', () => {
    it('has files to check', () => {
        expect(pure.length).toBeGreaterThan(30);
    });

    it('imports no React, Fabric, store or components', () => {
        expect(
            offenders(
                /from\s+['"](react|react-dom|fabric|@store|@\/store|@components|@\/components)[/'"]/,
            ),
        ).toEqual([]);
    });

    it('scenes and props never use Math.random (seeded: same JSON, same picture)', () => {
        expect(
            offenders(
                /Math\.random/,
                pure.filter(([f]) => f.startsWith('/src/scene/') || f.startsWith('/src/props/')),
            ),
        ).toEqual([]);
    });
});
