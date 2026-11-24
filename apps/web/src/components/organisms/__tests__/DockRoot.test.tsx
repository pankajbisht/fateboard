import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { useStore } from '@store';
import { DockRoot } from '../DockRoot';

// jsdom has no ResizeObserver; the dock panel/tabs use it only for sizing
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

afterEach(() => {
    cleanup();
    act(() => useStore.setState({ recentColors: [] }));
});

const renderWithRecent = () => {
    act(() => useStore.setState({ recentColors: ['#ff0000', '#00ff00'] }));
    render(<DockRoot />);
};

describe('DockRoot color columns', () => {
    it('left column holds the color tools and recent colors (fill / stroke toggles live in the footer)', () => {
        renderWithRecent();
        const tools = screen.getByTestId('dock-tools');

        expect(within(tools).getByLabelText('Custom color')).toBeTruthy();
        expect(within(tools).queryByRole('button', { name: 'Enter a hex color' })).toBeNull();
        expect(tools.querySelector('[data-paint]')).toBeNull();
        expect(
            within(tools).getByRole('button', { name: 'Use recent color #ff0000' }),
        ).toBeTruthy();
    });

    it('drops the "Painting" target swatch (the footer Fill/Stroke tiles do that job)', () => {
        renderWithRecent();
        expect(screen.queryByTestId('palette-target')).toBeNull();
    });

    it('keeps only swatches in the palette column', () => {
        renderWithRecent();
        const palette = screen.getByTestId('color-palette');

        expect(within(palette).queryByLabelText('Custom color')).toBeNull();
        expect(within(palette).queryByRole('button', { name: /recent color/ })).toBeNull();
    });

    it('gives every left-column box the same size', () => {
        renderWithRecent();
        const boxes = screen.getByTestId('dock-tools').querySelectorAll('[data-dock-box]');

        expect(boxes.length).toBe(4); // all colors, custom, 2 recent (hex + eyedropper are in custom)
        boxes.forEach((box) => {
            // one size for every box and swatch, following Settings > Icon size
            expect(box.className).toContain('size-[var(--ui-swatch)]');
            expect(box.className).not.toMatch(/rounded/);
        });
    });
});

describe('right dock matches the left sidebar (one side-panel system)', () => {
    it('rail, tab buttons and panel frame use the same sizes and styles as the left side', async () => {
        const { railWidthCss, SIDE_PANEL_WIDTH, activeButton, railButtonBase } =
            await import('../sidebar/sidebar.const');
        render(<DockRoot />);

        const rail = screen.getByRole('toolbar', { name: 'Dock panels' });
        expect(rail.style.width).toBe(railWidthCss()); // same source as the left rail

        const tab = within(rail).getAllByRole('button', { pressed: false })[0]; // a panel toggle
        act(() => tab.click());
        // same button recipe + same active look as the left rail (no extra ring / glow)
        for (const cls of `${railButtonBase} ${activeButton}`.split(/\s+/)) {
            expect(tab.className).toContain(cls);
        }
        expect(tab.className).not.toMatch(/\bring-1\b|shadow-sm/);

        const frame = screen.getByTestId('dock-panel');
        // the width comes from --panel-w (sidebar.const `panelSize`, shared with the left panel)
        expect(frame.style.getPropertyValue('--panel-w')).toBe(`${SIDE_PANEL_WIDTH}px`);
        // wide screens: no shadow; below lg the panel overlays the canvas and gets one (BUG-215)
        expect(frame.className).not.toMatch(/(?<!max-(?:lg|sm):)shadow-xl|duration-300/);
        expect(frame.className).toContain('duration-200');
    });
});

describe('dock collapse button', () => {
    it('has the same bottom chevron as the left rail to open / close the panel', () => {
        render(<DockRoot />);
        const toggle = screen.getByRole('button', { name: 'Expand dock panel' });
        act(() => toggle.click());
        expect(screen.getByTestId('dock-panel').getAttribute('aria-hidden')).toBe('false');
        act(() => screen.getByRole('button', { name: 'Collapse dock panel' }).click());
        expect(screen.getByTestId('dock-panel').getAttribute('aria-hidden')).toBe('true');
    });
});
