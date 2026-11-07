/**
 * BUG-003: every document write goes through `serializeCanvas` (one CUSTOM_PROPS list, animated
 * objects written at rest). A canvas-level `toObject(...)` / `toJSON()` anywhere else is a second
 * list that silently drops custom data. Known exception: Share (BUG-028, waits on decision Q6).
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

const ALLOWED = new Set([
    '/src/lib/serialization.ts',
    '/src/components/organisms/toolbars/ui/bars/ExtraBar.tsx', // Share: BUG-028 / Q6
]);

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
