/// <reference types="node" />
/**
 * Settings > Icon size (small / medium / large) drives every editor icon: top toolbars, left rail,
 * right rail and the bottom bar. One mechanism: `data-icon-size` on <html> + CSS variables.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { applyIconSize } from '@/store/slices/createSettingSlice';
import { IconButton } from '@/components/atoms/IconButton';
import { Icon } from '@/components/atoms/Icon';
import { SidebarRail } from '@/components/organisms/sidebar/ui/SidebarRail';

globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

afterEach(() => {
    cleanup();
    act(() => useStore.getState().setIconSize('md'));
});

const CSS = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');
const SOURCES = import.meta.glob<string>(
    ['/src/components/**/*.tsx', '!/src/components/**/__tests__/**'],
    { query: '?raw', import: 'default', eager: true },
);

describe('icon size setting', () => {
    it('is applied to <html> when it changes', () => {
        act(() => useStore.getState().setIconSize('lg'));
        expect(document.documentElement.dataset.iconSize).toBe('lg');
        act(() => useStore.getState().setIconSize('sm'));
        expect(document.documentElement.dataset.iconSize).toBe('sm');
        applyIconSize('md');
        expect(document.documentElement.dataset.iconSize).toBe('md');
    });

    it('CSS defines the button / icon / rail sizes for small, medium and large', () => {
        for (const v of ['--ui-btn', '--ui-icon', '--ui-rail', '--ui-rail-btn', '--ui-rail-icon']) {
            expect(CSS).toMatch(new RegExp(`:root[^}]*${v}:`));
            expect(CSS).toMatch(new RegExp(`\\[data-icon-size='sm'\\][^}]*${v}:`));
            expect(CSS).toMatch(new RegExp(`\\[data-icon-size='lg'\\][^}]*${v}:`));
        }
    });

    it('toolbar buttons (size="chrome") and rail buttons follow the CSS variables', () => {
        render(<IconButton size="chrome" icon={<Icon name="copy" />} aria-label="Copy" />);
        const btn = screen.getByRole('button', { name: 'Copy' }).className;
        expect(btn).toContain('size-[var(--ui-btn)]');
        expect(btn).toContain('[&_svg]:size-[var(--ui-icon)]');

        render(
            <SidebarRail
                items={[{ id: 'a', label: 'Shapes', icon: 'shapes', kind: 'panel', panel: null }]}
                activeId={null}
                expanded={false}
                canExpand
                width={52}
                onSelect={() => {}}
                onToggle={() => {}}
            />,
        );
        const rail = screen.getByRole('navigation');
        expect(rail.style.width).toContain('var(--ui-rail');
        expect(screen.getByRole('button', { name: 'Shapes' }).className).toContain(
            'size-[var(--ui-rail-btn)]',
        );
    });

    it('no component sizes chrome icons from the store by hand (one mechanism)', () => {
        const hits = Object.entries(SOURCES)
            .filter(([file, src]) => !file.includes('/settings/') && /settings\.iconSize/.test(src))
            .map(([file]) => file);
        expect(hits).toEqual([]);
    });
});

describe('rail layout math matches the CSS', () => {
    it('RAIL_BUTTON_PX equals --ui-rail-btn for every size', async () => {
        const { RAIL_BUTTON_PX } = await import('@hooks/useRailButtonPx');
        const block = (sel: string) =>
            CSS.slice(CSS.indexOf(sel), CSS.indexOf('}', CSS.indexOf(sel)));
        const px = (sel: string) => Number(/--ui-rail-btn:\s*(\d+)px/.exec(block(sel))?.[1]);
        expect(px(":root[data-icon-size='sm']")).toBe(RAIL_BUTTON_PX.sm);
        expect(px(":root[data-icon-size='lg']")).toBe(RAIL_BUTTON_PX.lg);
        expect(px(':root {')).toBe(RAIL_BUTTON_PX.md);
    });
});
