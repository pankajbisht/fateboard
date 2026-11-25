/**
 * One storage layer: only `src/lib/storage/**` talks to the storage library (opendb-store) or the
 * browser storage APIs, and the rest of the app imports it through `@/lib/storage` only. Swapping
 * the library or adding a backend then means one new adapter, not edits across slices and panels.
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/**/__tests__/**', '!/src/test/**'],
    { query: '?raw', import: 'default', eager: true },
);

const code = (text: string) =>
    text
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)) // comments
        .join('\n');

const outsideStorage = Object.entries(SRC).filter(
    ([file]) => !file.startsWith('/src/lib/storage/'),
);

const offenders = (pattern: RegExp) =>
    outsideStorage.filter(([, text]) => pattern.test(code(text))).map(([file]) => file);

describe('storage boundary', () => {
    it('only lib/storage imports opendb-store', () => {
        expect(offenders(/from\s+['"]opendb-store/)).toEqual([]);
    });

    it('only lib/storage uses localStorage, sessionStorage or indexedDB', () => {
        expect(offenders(/\b(localStorage|sessionStorage|indexedDB)\b/)).toEqual([]);
    });

    it('the app imports storage through @/lib/storage, not its files', () => {
        expect(offenders(/from\s+['"]@\/lib\/storage\//)).toEqual([]);
    });
});
