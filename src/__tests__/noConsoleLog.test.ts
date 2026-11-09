/**
 * BUG-104 / CLAUDE.md never-do: no `console.log` in shipped code (it leaked selection data on every
 * context-menu open). Errors use `console.error('[slice] …')`, warnings `console.warn`.
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/**/__tests__/**', '!/src/test/**'],
    { query: '?raw', import: 'default', eager: true },
);

describe('no console.log in shipped code', () => {
    it('finds none outside tests', () => {
        const offenders = Object.entries(SRC).flatMap(([file, code]) =>
            code
                .split('\n')
                .map((line, i) => ({ line, n: i + 1 }))
                .filter(({ line }) => /^\s*console\.log\(/.test(line))
                .map(({ n }) => `${file}:${n}`),
        );
        expect(offenders).toEqual([]);
    });
});
