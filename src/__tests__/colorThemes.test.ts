/// <reference types="node" />
/**
 * Color themes (Settings > Appearance > Color theme): each one swaps the brand scale for the whole
 * app, in light and dark mode, and keeps text readable.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { act } from '@testing-library/react';
import { useStore } from '@store';
import {
    COLOR_THEMES,
    DEFAULT_SETTINGS,
    applyColorTheme,
    sanitizeSettings,
} from '@/store/slices/createSettingSlice';

const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');

const block = (selector: string) => {
    const i = css.indexOf(selector);
    return i < 0 ? '' : css.slice(i, css.indexOf('}', i));
};
const hex = (b: string, name: string) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(b)?.[1];

const lum = (h: string) => {
    const [r, g, b] = [1, 3, 5]
        .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
};
const DARK_SURFACE = '#0f1726';

afterEach(() => act(() => useStore.getState().setColorTheme('fate')));

describe('color themes', () => {
    it('offers several themes; Fate Blue is the default', () => {
        expect(COLOR_THEMES.map((t) => t.id)).toEqual(
            expect.arrayContaining(['fate', 'ocean', 'violet', 'rose', 'emerald', 'graphite']),
        );
        expect(DEFAULT_SETTINGS.colorTheme).toBe('fate');
        expect(sanitizeSettings({ colorTheme: 'nope' }).colorTheme).toBe('fate');
        expect(sanitizeSettings({ colorTheme: 'rose' }).colorTheme).toBe('rose');
    });

    it('is applied to <html> (data-theme) when it changes', () => {
        act(() => useStore.getState().setColorTheme('ocean'));
        expect(document.documentElement.dataset.theme).toBe('ocean');
        applyColorTheme('fate');
        expect(document.documentElement.dataset.theme).toBe('fate');
    });

    it.each(COLOR_THEMES.filter((t) => t.id !== 'fate').map((t) => t.id))(
        '%s: full brand scale; white text readable on buttons; brand text readable in dark',
        (id) => {
            const b = block(`:root[data-theme='${id}']`);
            for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
                expect(hex(b, `color-primary-${shade}`), `${id} ${shade}`).toMatch(/^#/);
            }
            for (const shade of [600, 700, 800]) {
                expect(
                    contrast('#ffffff', hex(b, `color-primary-${shade}`)!),
                ).toBeGreaterThanOrEqual(4.5);
            }
            expect(contrast(hex(b, 'color-primary-300')!, DARK_SURFACE)).toBeGreaterThanOrEqual(
                4.5,
            );
        },
    );

    it('dark mode tints and brand text follow the active theme (no fixed blue)', () => {
        const dark = block(':root.dark {');
        expect(dark).toMatch(/--color-primary-100:\s*color-mix\([^;]*var\(--color-primary-400\)/);
        expect(dark).toMatch(/--color-primary-ink:\s*var\(--color-primary-300\)/);
    });

    it('the board (workspace, whiteboard paper) is tinted by the theme, not flat gray', () => {
        expect(css).toMatch(/--color-workspace:\s*color-mix\([^;]*var\(--color-primary-/);
        expect(css).toMatch(/--color-board:\s*color-mix\([^;]*var\(--color-primary-/);
    });
});
