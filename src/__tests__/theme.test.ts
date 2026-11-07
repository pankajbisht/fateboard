/**
 * Brand theme (docs/DESIGN.md). Colors come from the logo (public/fate.svg):
 * gradient #22a7ff -> #0a60d6, tint #e0f0ff, pencil-dot orange #ff7f0e.
 */
/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BRAND } from '@/lib/theme';

// read from disk: Vitest's CSS pipeline empties `?raw` CSS imports
const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');

const SOURCES = import.meta.glob<string>(
    ['/src/**/*.{ts,tsx}', '!/src/**/__tests__/**', '!/src/test/**', '!/src/**/*.test.{ts,tsx}'],
    { query: '?raw', import: 'default', eager: true },
);

const token = (name: string) =>
    css
        .match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]
        .trim()
        .toLowerCase();

describe('brand theme tokens', () => {
    it('primary and accent scales are anchored on the logo colors', () => {
        expect(token('color-primary-600')).toBe('#0a60d6');
        expect(token('color-primary-400')).toBe('#22a7ff');
        expect(token('color-primary-100')).toBe('#e0f0ff');
        expect(token('color-accent-500')).toBe('#ff7f0e');
    });

    it('defines every shade 50-950 for primary and accent', () => {
        for (const scale of ['primary', 'accent']) {
            for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
                expect(token(`color-${scale}-${shade}`), `${scale}-${shade}`).toMatch(
                    /^#[0-9a-f]{6}$/,
                );
            }
        }
    });

    it('the JS mirror (for canvas code) matches the CSS tokens', () => {
        expect(BRAND.primary).toBe(token('color-primary-600'));
        expect(BRAND.primaryLight).toBe(token('color-primary-400'));
        expect(BRAND.primaryTint).toBe(token('color-primary-100'));
        expect(BRAND.accent).toBe(token('color-accent-500'));
        expect(BRAND.ink).toBe(token('color-ink'));
        expect(BRAND.danger).toBe(token('color-danger'));
    });

    it('defines the 5 text styles and the tightened radius scale', () => {
        for (const style of ['display', 'title', 'body', 'label', 'caption']) {
            expect(token(`text-${style}`), style).toBeTruthy();
        }
        expect(token('radius-2xl')).toBe('0.75rem');
    });
});

describe('dark mode tokens', () => {
    const darkBlock = css.match(/\.dark\s*\{([^}]*)\}/)?.[1] ?? '';
    const dark = (name: string) =>
        darkBlock
            .match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]
            .trim()
            .toLowerCase();

    it('Tailwind dark: follows the .dark class set by applyTheme (not the OS media query)', () => {
        expect(css).toMatch(/@custom-variant dark \(&:where\(\.dark, \.dark \*\)\);/);
    });

    it('every semantic surface / ink / line token has a dark value', () => {
        for (const name of [
            'color-surface',
            'color-surface-muted',
            'color-surface-strong',
            'color-surface-raised',
            'color-line',
            'color-line-strong',
            'color-ink',
            'color-ink-muted',
            'color-ink-subtle',
        ]) {
            expect(token(name), `light ${name}`).toBeTruthy();
            expect(dark(name), `dark ${name}`).toBeTruthy();
            expect(dark(name), name).not.toBe(token(name));
        }
    });

    it('selected-state tints (primary-50..200) are toned down in dark mode', () => {
        for (const shade of [50, 100, 200]) {
            // translucent mix of the active theme's 400 (follows the color theme)
            expect(dark(`color-primary-${shade}`), `primary-${shade}`).toMatch(
                /^color-mix\(in srgb, var\(--color-primary-400\) \d+%, transparent\)/,
            );
        }
    });
});

describe('UI uses the brand, not raw Tailwind hues', () => {
    // swatch data in the color palette is user paint, not UI chrome
    const isPaletteData = (line: string) => /^'bg-[a-z]+-\d+',?$/.test(line);

    it('no blue / indigo / violet / sky utility classes in UI code', () => {
        const hits = Object.entries(SOURCES).flatMap(([file, text]) =>
            text
                .split('\n')
                .map((line, i) => ({ line: line.trim(), at: `${file}:${i + 1}` }))
                .filter(({ line }) => !isPaletteData(line))
                .filter(({ line }) =>
                    /\b(bg|text|border|ring|outline|from|to|via|accent|fill|stroke|shadow|divide|caret|decoration)-(blue|indigo|violet|sky)-\d/.test(
                        line,
                    ),
                )
                .map(({ at }) => at),
        );
        expect(hits).toEqual([]);
    });

    it('editor chrome (handles, guides, rulers, scrollbars) uses BRAND, not old blues', () => {
        const CHROME = [
            '/src/components/molecules/OriginSelector.tsx',
            '/src/components/organisms/board/ui/Ruler.tsx',
            '/src/lib/utils/shapeConnectors.ts',
            '/src/lib/utils/GradientTool.ts',
            '/src/lib/utils/shapeTextEditor.ts',
            '/src/lib/pathRepeat.ts',
            '/src/store/slices/createNodeEditorSlice.ts',
            '/src/components/organisms/effects/ui/RepeatAlongPath.tsx',
        ];
        const OLD = /#(3b82f6|2563eb|1d4ed8|6366f1|4f46e5)\b/i;
        const hits = CHROME.filter((file) => {
            expect(SOURCES[file], file).toBeDefined();
            return OLD.test(SOURCES[file]);
        });
        expect(hits).toEqual([]);
        expect(OLD.test(css)).toBe(false);
    });
});
