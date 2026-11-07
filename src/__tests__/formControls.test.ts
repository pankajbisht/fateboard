/**
 * Every form control in the app comes from the shared atoms / molecules (docs/DESIGN.md "Controls"):
 * Input / Textarea / Select / Switch / SegmentedControl / Chip. No second look.
 */
import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob<string>(
    [
        '/src/components/**/*.tsx',
        '!/src/components/**/__tests__/**',
        '!/src/components/atoms/**',
        '!/src/components/pages/web/**',
    ],
    { query: '?raw', import: 'default', eager: true },
);

/** Drop comments (incl. commented-out JSX) so dead code does not count. */
const strip = (src: string) =>
    src
        .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/^\s*\/\/.*$/gm, '');

const find = (re: RegExp) =>
    Object.entries(SOURCES).flatMap(([file, src]) =>
        [...strip(src).matchAll(re)].map(
            (m) => `${file}:${src.slice(0, m.index).split('\n').length}: ${m[0].slice(0, 60)}`,
        ),
    );

describe('form controls are the shared components', () => {
    it('no raw text / number / search / radio inputs (file and color pickers are native)', () => {
        const raw = Object.entries(SOURCES).flatMap(([file, src]) =>
            [...strip(src).matchAll(/<input\b(?:[^>{]|\{(?:[^{}]|\{[^{}]*\})*\})*>/g)]
                .filter((m) => !/type="(file|color)"/.test(m[0]))
                .map((m) => `${file}:${src.slice(0, m.index).split('\n').length}`),
        );
        expect(raw).toEqual([]);
    });

    it('no native <select> or <textarea>', () => {
        expect(find(/<(select|textarea)\b/g)).toEqual([]);
    });

    it('no local copies of SegmentedControl / Switch / chips', () => {
        const copies = find(
            /function (Segmented|Seg|Switch|Toggle)\b|const Toggle = |role="tablist"/g,
        ).filter(
            (h) => !h.includes('tabs/ui/TabsLayout'), // the dock's real tab strip
        );
        expect(copies).toEqual([]);
        expect(find(/rounded-full px-2\.5 text-xs font-medium/g)).toEqual([]);
    });
});
