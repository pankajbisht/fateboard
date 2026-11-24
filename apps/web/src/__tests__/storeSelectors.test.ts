/** BUG-029: components subscribe with a selector; `useStore()` re-rendered on every store change (60 fps in playback). */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    ['/src/**/*.tsx', '/src/**/*.ts', '!/src/**/*.test.*', '!/src/**/__tests__/**'],
    { query: '?raw', import: 'default', eager: true },
);

describe('store subscriptions (BUG-029)', () => {
    it('no useStore() without a selector', () => {
        const offenders = Object.entries(SRC)
            .filter(([, code]) => /\buseStore\(\s*\)/.test(code))
            .map(([f]) => f);
        expect(offenders).toEqual([]);
    });
});
