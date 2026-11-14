/** BUG-128: the context menu closes on Escape (not only on a click outside). */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { ContextMenu } from '../ContextMenu';

/* eslint-disable @typescript-eslint/no-explicit-any */
afterEach(() => {
    cleanup();
    useStore.getState().closeMenu();
});

describe('ContextMenu', () => {
    it('closes on Escape', () => {
        act(() =>
            useStore.setState({
                visible: true,
                x: 10,
                y: 10,
                items: [{ id: 'copy', label: 'Copy', onClick: () => undefined }],
            } as any),
        );
        render(<ContextMenu />);
        expect(screen.getByText('Copy')).toBeTruthy();
        act(() => {
            fireEvent.keyDown(window, { key: 'Escape' });
        });
        expect(useStore.getState().visible).toBe(false);
        expect(screen.queryByText('Copy')).toBeNull();
    });

    // BUG-216: a real menu for screen readers and the keyboard (long press opens it on touch too)
    const open = () =>
        act(() =>
            useStore.setState({
                visible: true,
                x: 10,
                y: 10,
                items: [
                    { id: 'copy', label: 'Copy', onClick: () => undefined },
                    { id: 'paste', label: 'Paste', onClick: () => undefined, disabled: true },
                    { type: 'divider' },
                    { id: 'delete', label: 'Delete', onClick: () => undefined },
                ],
            } as any),
        );

    it('is a menu of menu items with a separator; the first item gets focus', () => {
        const before = document.createElement('button');
        document.body.append(before);
        before.focus();
        open();
        render(<ContextMenu />);
        const menu = screen.getByRole('menu', { name: 'Canvas actions' });
        expect(menu).toBeTruthy();
        expect(screen.getAllByRole('menuitem').map((b) => b.textContent)).toEqual([
            'Copy',
            'Paste',
            'Delete',
        ]);
        expect(screen.getAllByRole('separator')).toHaveLength(1);
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Copy' }));

        // closing gives focus back to where it was
        act(() => {
            fireEvent.keyDown(window, { key: 'Escape' });
        });
        expect(document.activeElement).toBe(before);
        before.remove();
    });

    it('arrow keys, Home and End move between enabled items and wrap', () => {
        open();
        render(<ContextMenu />);
        const menu = screen.getByRole('menu');
        const item = (name: string) => screen.getByRole('menuitem', { name });
        fireEvent.keyDown(menu, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(item('Delete')); // Paste is disabled
        fireEvent.keyDown(menu, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(item('Copy'));
        fireEvent.keyDown(menu, { key: 'ArrowUp' });
        expect(document.activeElement).toBe(item('Delete'));
        fireEvent.keyDown(menu, { key: 'Home' });
        expect(document.activeElement).toBe(item('Copy'));
        fireEvent.keyDown(menu, { key: 'End' });
        expect(document.activeElement).toBe(item('Delete'));
    });

    it('Tab closes the menu (focus does not wander behind it)', () => {
        open();
        render(<ContextMenu />);
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
        expect(useStore.getState().visible).toBe(false);
    });

    it('stays inside a phone screen: never above or left of the viewport, scrolls when too tall', () => {
        act(() =>
            useStore.getState().openMenu(-50, -50, [{ id: 'a', label: 'A', onClick: () => 0 }]),
        );
        render(<ContextMenu />);
        const menu = screen.getByRole('menu');
        expect(parseFloat(menu.style.left)).toBeGreaterThanOrEqual(8);
        expect(parseFloat(menu.style.top)).toBeGreaterThanOrEqual(8);
        expect(menu.className).toMatch(/overflow-y-auto/);
        expect(menu.className).toMatch(/max-h-/);
    });
});
