/// <reference types="node" />
/**
 * Icons are Lucide (`atoms/Icon.tsx`). Font Awesome (CDN + npm) was removed; it must not come back.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCES = import.meta.glob<string>(
    ['/src/**/*.{ts,tsx}', '!/src/**/__tests__/**', '!/src/test/**', '!/src/**/*.test.{ts,tsx}'],
    { query: '?raw', import: 'default', eager: true },
);

const root = (file: string) => readFileSync(`${process.cwd()}/${file}`, 'utf8');

describe('no Font Awesome', () => {
    it('no source file uses fa-* icon classes', () => {
        const hits = Object.entries(SOURCES).flatMap(([file, text]) =>
            text
                .split('\n')
                .map((line, i) => ({ line, at: `${file}:${i + 1}` }))
                .filter(({ line }) => /\bfa-[a-z]/.test(line))
                .map(({ at }) => at),
        );
        expect(hits).toEqual([]);
    });

    it('index.html does not load the Font Awesome CDN', () => {
        expect(root('index.html')).not.toMatch(/fontawesome|font-awesome/i);
    });

    it('package.json does not depend on Font Awesome', () => {
        expect(root('package.json')).not.toMatch(/@fortawesome/);
    });
});
