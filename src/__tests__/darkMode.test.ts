/// <reference types="node" />
/**
 * Dark mode (docs/DESIGN.md "Dark mode"): every UI color comes from a token that `.dark` redefines,
 * text keeps WCAG AA contrast on dark surfaces, and brand buttons keep white text on hover.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');
const darkBlock = css.slice(css.indexOf('.dark {'), css.indexOf('}', css.indexOf('.dark {')));
const lightBlock = css.slice(css.indexOf('@theme'), css.indexOf('.dark {'));

/** Token value as #hex; follows `var(--other)` references (theme-relative tokens) via the light block. */
const tok = (block: string, name: string): string | undefined => {
    const raw = new RegExp(`--${name}:\\s*([^;]+);`).exec(block)?.[1]?.trim();
    if (!raw) return undefined;
    const ref = /^var\(--([a-z0-9-]+)\)/.exec(raw);
    if (ref) return tok(lightBlock, ref[1]);
    return /^#[0-9a-fA-F]{6}/.exec(raw)?.[0];
};
const light = (n: string) => tok(lightBlock, n)!;
const dark = (n: string) => tok(darkBlock, n) ?? light(n);

const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
};

const SOURCES = import.meta.glob<string>(
    [
        '/src/components/**/*.tsx',
        '!/src/components/**/__tests__/**',
        '!/src/components/pages/web/**',
    ],
    { query: '?raw', import: 'default', eager: true },
);
const hits = (re: RegExp, allow: (file: string, match: string) => boolean = () => false) =>
    Object.entries(SOURCES).flatMap(([file, src]) =>
        src
            .split('\n')
            .flatMap((line, i) =>
                /^\s*(\/\/|\*|\/\*)/.test(line)
                    ? []
                    : [...line.matchAll(re)]
                          .filter((m) => !allow(file, m[0]))
                          .map((m) => `${file}:${i + 1} ${m[0]}`),
            ),
    );

describe('dark mode tokens', () => {
    it('keeps the brand blue scale for backgrounds (button hover / pressed stay dark blue)', () => {
        for (const shade of [600, 700, 800]) {
            expect(tok(darkBlock, `color-primary-${shade}`), `primary-${shade}`).toBeUndefined();
            expect(contrast('#ffffff', light(`color-primary-${shade}`))).toBeGreaterThanOrEqual(
                4.5,
            );
        }
    });

    it('brand-colored text uses primary-ink, readable in both themes', () => {
        expect(contrast(light('color-primary-ink'), light('color-surface'))).toBeGreaterThanOrEqual(
            4.5,
        );
        expect(contrast(dark('color-primary-ink'), dark('color-surface'))).toBeGreaterThanOrEqual(
            4.5,
        );
        expect(hits(/\btext-primary-(600|700|800|900)\b/g)).toEqual([]);
    });

    it('all text tokens pass AA on dark surfaces (muted and raised included)', () => {
        for (const text of ['color-ink', 'color-ink-muted', 'color-ink-subtle']) {
            for (const bg of ['color-surface', 'color-surface-muted', 'color-surface-strong']) {
                expect(contrast(dark(text), dark(bg)), `${text} on ${bg}`).toBeGreaterThanOrEqual(
                    4.5,
                );
            }
        }
    });

    it('lines are visible against dark surfaces', () => {
        const onSurface = (t: string) => contrast(dark(t), dark('color-surface'));
        expect(onSurface('color-line')).toBeGreaterThanOrEqual(1.6); // dividers
        expect(onSurface('color-line-strong')).toBeGreaterThanOrEqual(2); // input / button borders
    });
});

describe('no fixed light colors in the UI', () => {
    it('no fixed neutral Tailwind colors (use surface / ink / line tokens)', () => {
        const allow = (file: string, m: string) =>
            file.endsWith('organisms/ColorPicker.tsx') || // palette swatches are colors, not chrome
            file.endsWith('atoms/Swatch.tsx') || // edge drawn on paint colors
            (file.endsWith('organisms/ColorPickerPopover.tsx') && /white/.test(m)) || // drag handles on the color square / hue bar
            (file.endsWith('effects/ui/TemplateGallery.tsx') && /black|white/.test(m)) || // photo overlays
            (file.endsWith('atoms/Switch.tsx') && m === 'bg-white') || // knob on a colored track
            m === 'text-white'; // on brand / danger fills
        expect(
            hits(
                /\b(?:bg|text|border|from|via|to|fill|stroke|ring|divide)-(?:black|white|gray|stone|slate|zinc|neutral)(?:-\d{2,3})?(?:\/\d+)?\b/g,
                allow,
            ),
        ).toEqual([]);
    });

    it('chrome components have no hard-coded hex colors', () => {
        const files = ['molecules/OriginSelector.tsx', 'organisms/board/ui/Ruler.tsx'].map(
            (f) => `/src/components/${f}`,
        );
        const hex = files.flatMap((f) =>
            [...SOURCES[f].matchAll(/['"`]#[0-9a-fA-F]{3,8}\b/g)].map((m) => `${f}: ${m[0]}`),
        );
        expect(hex).toEqual([]);

        // shape previews: the outline / page fill follow the theme (a shape's own fill is content)
        const shapePanel = SOURCES['/src/components/organisms/ShapePanel.tsx'];
        expect(shapePanel).not.toMatch(/(?:fill|stroke)=(?:"#|\{[^}]*'#)/);
    });
});

const CONTROL_STYLES = import.meta.glob<string>('/src/components/atoms/control.styles.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
});

describe('icons and secondary text in dark mode', () => {
    it('flip icons are Lucide outline icons (the old filled glyph faded to 50% on dark)', () => {
        const cfg = SOURCES['/src/components/config/toolbars/ui/FlipBarConfig.tsx'];
        expect(cfg).not.toMatch(/assets\/icons\/flip/);
        expect(cfg).toMatch(/name="flip-horizontal"/);
        expect(cfg).toMatch(/name="flip-vertical"/);
    });

    it('disabled controls stay readable on dark (higher opacity in dark mode)', () => {
        for (const f of ['atoms/Button.tsx', 'atoms/IconButton.tsx']) {
            expect(SOURCES[`/src/components/${f}`], f).toMatch(/dark:disabled:opacity-\d+/);
        }
        expect(SOURCES['/src/components/organisms/StrokeControls.tsx']).toMatch(/dark:opacity-\d+/);
        // a faded group (data-dimmed) must not fade its disabled controls a second time
        expect(SOURCES['/src/components/organisms/StrokeControls.tsx']).toMatch(/data-dimmed=/);
        expect(Object.values(CONTROL_STYLES)[0]).toMatch(
            /\[\[data-dimmed\]_&\]:disabled:opacity-100/,
        );
    });

    it('secondary text uses the ink tokens, not opacity (one grey for all hints)', () => {
        expect(hits(/text-xs opacity-60/g)).toEqual([]);
    });
});
