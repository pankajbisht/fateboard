/**
 * BUG-003: every document write goes through `serializeCanvas` (one CUSTOM_PROPS list, animated
 * objects written at rest). A canvas-level `toObject(...)` / `toJSON()` anywhere else is a second
 * list that silently drops custom data. No exceptions.
 */
import { describe, expect, it } from 'vitest';

const SRC = import.meta.glob<string>(
    ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/test/**'],
    {
        query: '?raw',
        import: 'default',
        eager: true,
    },
);

// Share (the last exception, BUG-028) was removed until there is a backend (decision Q6)
const ALLOWED = new Set(['/src/lib/serialization.ts']);

describe('one serialize path (BUG-003)', () => {
    it('no canvas-level toObject / toJSON outside lib/serialization', () => {
        const offenders = Object.entries(SRC)
            .filter(([file]) => !ALLOWED.has(file))
            .filter(([, code]) =>
                code
                    .split('\n')
                    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)) // comments
                    .some((line) => /\bcanvas\??\.(toObject|toJSON)\(/.test(line)),
            )
            .map(([file]) => file);
        expect(offenders).toEqual([]);
    });
});
