/**
 * BUG-214: a control that only appears on hover cannot be reached on a phone or tablet (touch has
 * no hover). A class string that hides something (`opacity-0` / `hidden`) and shows it on
 * `group-hover` must also show it on devices that cannot hover: `[@media(hover:none)]:…`.
 * Decorative overlays (`pointer-events-none` and never made clickable) are exempt.
 */
import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob<string>(
    ['/src/components/**/*.tsx', '!/src/**/__tests__/**', '!/src/**/*.test.tsx'],
    { query: '?raw', import: 'default', eager: true },
);

const REVEAL =
    /group-hover(?:\/[\w-]+)?:(?:opacity-100|flex|block|inline-flex|pointer-events-auto)\b/;
const HIDDEN = /(?:^|[\s'"`])(?:opacity-0|hidden)(?=[\s'"`]|$)/;
const DECORATIVE = (s: string) =>
    /\bpointer-events-none\b/.test(s) && !/group-hover:pointer-events-auto/.test(s);
const TOUCH_SAFE = /\[@media\(hover:none\)\]:/;

/** Files whose hover reveal is visual only, with the reason. */
const ALLOWED: Record<string, string> = {
    '/src/components/organisms/PaintToggle.tsx':
        'the red slash previews "none" on hover (aria-hidden); the toggle button is always visible',
};

describe('no hover-only controls (touch)', () => {
    it('everything shown on hover is also shown on touch screens', () => {
        const hits = Object.entries(SOURCES)
            .filter(([file]) => !(file in ALLOWED))
            .flatMap(([file, text]) =>
                text
                    .split('\n')
                    .map((line, i) => ({ line, at: `${file}:${i + 1}` }))
                    .filter(
                        ({ line }) =>
                            REVEAL.test(line) &&
                            HIDDEN.test(line) &&
                            !DECORATIVE(line) &&
                            !TOUCH_SAFE.test(line),
                    )
                    .map(({ at }) => at),
            );
        expect(hits).toEqual([]);
    });
});
