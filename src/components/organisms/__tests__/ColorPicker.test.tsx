import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useStore } from '@store';
import { PALETTE_FAMILIES } from '@/lib/palette';
import { ColorPicker, PaletteTools } from '../ColorPicker';

// jsdom cannot rasterize oklch; give every palette color a stable fake hex
vi.mock('@/store/slices/colorSystemFixes', async (orig) => {
    const real = await orig<typeof import('@/store/slices/colorSystemFixes')>();
    const fake = (c: string) => {
        if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
        if (c === '#fff') return '#ffffff';
        if (c === '#000') return '#000000';
        let h = 0;
        for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        return `#${(h & 0xffffff).toString(16).padStart(6, '0')}`;
    };
    return { ...real, toOpaqueHex: fake };
});

const { toOpaqueHex } = await import('@/store/slices/colorSystemFixes');
const red = PALETTE_FAMILIES.find((f) => f.id === 'red')!;
const handleColorChange = vi.fn();
let prev: ReturnType<typeof useStore.getState>;

beforeEach(() => {
    prev = useStore.getState();
    handleColorChange.mockReset();
    act(() =>
        useStore.setState({
            handleColorChange,
            paintTarget: null,
            activePaint: 'fill',
            fill: '#123456',
        } as never),
    );
});

afterEach(() => {
    cleanup();
    act(() =>
        useStore.setState({
            handleColorChange: prev.handleColorChange,
            fill: prev.fill,
            activePaint: prev.activePaint,
        } as never),
    );
});

describe('palette strip', () => {
    it('keeps every shade: White, Black, then each family dark -> light in its own group', () => {
        render(<ColorPicker />);
        const strip = screen.getByRole('group', { name: 'Color palette' });
        const swatches = within(strip).getAllByRole('button');
        expect(swatches).toHaveLength(2 + PALETTE_FAMILIES.length * 10);
        expect(swatches[0].getAttribute('aria-label')).toMatch(/^White · #ffffff$/);
        expect(swatches[1].getAttribute('aria-label')).toMatch(/^Black · #000000$/);
        const redGroup = within(strip).getByRole('group', { name: 'Red' });
        const reds = within(redGroup).getAllByRole('button');
        expect(reds.map((b) => b.getAttribute('aria-label')!.split(' · ')[0])).toEqual(
            ['900', '800', '700', '600', '500', '400', '300', '200', '100', '50'].map(
                (n) => `Red ${n}`,
            ),
        );
        expect(within(strip).getByRole('group', { name: 'Stone' })).toBeTruthy();
    });

    it('swatches are real buttons that apply their color', () => {
        render(<ColorPicker />);
        const blue = screen.getByRole('button', { name: /^Blue 300/ });
        expect(blue.tagName).toBe('BUTTON');
        fireEvent.click(blue);
        expect(handleColorChange).toHaveBeenCalledWith('bg-blue-300');
    });

    it('rings the current color and scrolls it into view', () => {
        const scroll = vi.fn();
        Element.prototype.scrollIntoView = scroll;
        act(() => useStore.setState({ fill: toOpaqueHex(red.shades[2].css) } as never)); // red 200
        render(<ColorPicker />);
        const red200 = screen.getByRole('button', { name: /^Red 200/ });
        expect(red200.getAttribute('aria-pressed')).toBe('true');
        expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
        expect(scroll).toHaveBeenCalled();
        expect(scroll.mock.contexts.at(-1)).toBe(red200);
    });

    it('follows what the palette paints (stroke, or a panel color)', () => {
        act(() => useStore.setState({ activePaint: 'stroke', stroke: '#000000' } as never));
        render(<ColorPicker />);
        expect(screen.getByRole('button', { name: /^Black/ }).getAttribute('aria-pressed')).toBe(
            'true',
        );
    });
});

describe('All colors grid', () => {
    const open = () => {
        render(<PaletteTools />);
        fireEvent.click(screen.getByRole('button', { name: 'All colors' }));
        return screen.getByRole('dialog', { name: 'All colors' });
    };

    it('shows every shade of every family plus White / Black', () => {
        const dialog = open();
        const swatches = within(dialog).getAllByRole('button', { pressed: false });
        // 10 shades × families + 2 basics (close button has no aria-pressed)
        expect(swatches).toHaveLength(PALETTE_FAMILIES.length * 10 + 2);
        expect(within(dialog).getByRole('group', { name: 'Red' })).toBeTruthy();
        fireEvent.click(within(dialog).getByRole('button', { name: /^Red 300/ }));
        expect(handleColorChange).toHaveBeenCalledWith('bg-red-300');
        expect(screen.getByRole('dialog')).toBeTruthy(); // stays open while trying colors
    });

    it('arrow keys move between swatches; Escape closes and returns focus', () => {
        const dialog = open();
        const red50 = within(dialog).getByRole('button', { name: /^Red 50 / });
        red50.focus();
        fireEvent.keyDown(red50, { key: 'ArrowRight' });
        expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Red 100/);
        fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
        expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Orange 100/);
        fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement?.getAttribute('aria-label')).toBe('All colors');
    });

    it('closes on a click outside', () => {
        open();
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('Custom color / Hex tools open the in-app picker', () => {
    const commitRecentColor = vi.fn();
    beforeEach(() => {
        commitRecentColor.mockReset();
        act(() => useStore.setState({ commitRecentColor, fill: '#123456' } as never));
    });

    it('Custom color opens the picker (no browser color dialog)', () => {
        render(<PaletteTools />);
        expect(document.querySelector('input[type="color"]')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Custom color' }));
        const dialog = screen.getByRole('dialog', { name: 'Custom color' });
        expect(
            (within(dialog).getByRole('textbox', { name: 'Hex' }) as HTMLInputElement).value,
        ).toBe('123456');
    });

    it('# opens the same picker with the hex field focused; a typed hex applies live', () => {
        render(<PaletteTools />);
        fireEvent.click(screen.getByRole('button', { name: 'Enter a hex color' }));
        const hex = screen.getByRole('textbox', { name: 'Hex' });
        expect(document.activeElement).toBe(hex);
        fireEvent.change(hex, { target: { value: 'ff8000' } });
        fireEvent.keyDown(hex, { key: 'Enter' });
        expect(handleColorChange).toHaveBeenLastCalledWith('#ff8000');
        expect(commitRecentColor).not.toHaveBeenCalled(); // Recent gets it once, on close
        fireEvent.keyDown(hex, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(commitRecentColor).toHaveBeenCalledTimes(1);
        expect(commitRecentColor).toHaveBeenCalledWith('#ff8000');
        expect(document.activeElement?.getAttribute('aria-label')).toBe('Enter a hex color');
    });

    it('closing without a change adds nothing to Recent; only one popover is open at a time', () => {
        render(<PaletteTools />);
        fireEvent.click(screen.getByRole('button', { name: 'Custom color' }));
        fireEvent.click(screen.getByRole('button', { name: 'All colors' }));
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
        expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('All colors');
        expect(commitRecentColor).not.toHaveBeenCalled();
    });
});

describe('Escape closes the popovers even when focus is outside them (Safari: clicks do not focus buttons)', () => {
    it('All colors grid', () => {
        render(<PaletteTools />);
        fireEvent.click(screen.getByRole('button', { name: 'All colors' }));
        expect(screen.getByRole('dialog', { name: 'All colors' })).toBeTruthy();
        (document.activeElement as HTMLElement | null)?.blur();
        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('Custom color picker', () => {
        render(<PaletteTools />);
        fireEvent.click(screen.getByRole('button', { name: 'Custom color' }));
        (document.activeElement as HTMLElement | null)?.blur();
        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
