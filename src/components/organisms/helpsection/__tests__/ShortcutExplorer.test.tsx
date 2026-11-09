/** Help > Keyboard shortcuts lists the registry; menu-only commands (no shortcut) must not break it. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ShortcutExplorer from '../ui/ShortcutExplorer';

const press = (init: KeyboardEventInit) =>
    act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }));
    });

describe('ShortcutExplorer', () => {
    afterEach(() => vi.restoreAllMocks());

    it('lists only commands that have a shortcut, and searching never crashes', () => {
        render(<ShortcutExplorer />);
        expect(screen.queryByText('Link copies')).toBeNull(); // menu-only
        expect(screen.getByText('Unlink clone')).toBeInTheDocument();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Filter shortcuts' }), {
            target: { value: 'zzz-no-match' },
        });
        expect(screen.getByText('No shortcuts found.')).toBeInTheDocument();
    });

    it('filters by category', () => {
        render(<ShortcutExplorer />);
        fireEvent.click(screen.getByRole('button', { name: 'Animate' }));
        expect(screen.getByText('Add a keyframe')).toBeInTheDocument();
        expect(screen.queryByText('Unlink clone')).toBeNull();
    });

    it('finds what a pressed key does', () => {
        render(<ShortcutExplorer />);
        fireEvent.click(screen.getByRole('button', { name: /press keys to find/i }));
        press({ code: 'KeyD', ctrlKey: true });

        expect(screen.getByRole('status')).toHaveTextContent(/duplicate/i);
    });

    it('says when a pressed key does nothing', () => {
        render(<ShortcutExplorer />);
        fireEvent.click(screen.getByRole('button', { name: /press keys to find/i }));
        press({ code: 'KeyQ', ctrlKey: true, altKey: true });

        expect(screen.getByRole('status')).toHaveTextContent(/not a shortcut/i);
    });

    it('waits through a modifier on its own', () => {
        render(<ShortcutExplorer />);
        fireEvent.click(screen.getByRole('button', { name: /press keys to find/i }));
        press({ code: 'ControlLeft', ctrlKey: true });

        expect(screen.getByRole('status')).toHaveTextContent(/press/i);
        expect(screen.getByRole('status')).not.toHaveTextContent(/not a shortcut/i);
    });

    it('scores a practice round', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0); // first practice command
        render(<ShortcutExplorer />);
        fireEvent.click(screen.getByRole('button', { name: /practice/i }));

        const status = screen.getByRole('status');
        expect(status).toHaveTextContent(/press the keys for/i);
        expect(status).toHaveTextContent('Select');

        press({ code: 'KeyV' });
        expect(screen.getByText(/1 right/i)).toBeInTheDocument();
    });

    it('counts a wrong answer and shows the right keys', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        render(<ShortcutExplorer />);
        fireEvent.click(screen.getByRole('button', { name: /practice/i }));

        press({ code: 'KeyQ', ctrlKey: true, altKey: true });
        expect(screen.getByText(/1 missed/i)).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(/it was/i);
    });

    it('leaves Tab alone during practice, so the keyboard can still leave', () => {
        render(<ShortcutExplorer />);
        fireEvent.click(screen.getByRole('button', { name: /practice/i }));
        const event = new KeyboardEvent('keydown', { code: 'Tab', cancelable: true });
        act(() => {
            window.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(false);
        expect(screen.queryByText(/1 missed/i)).toBeNull();
    });

    it('stops listening when practice ends', () => {
        render(<ShortcutExplorer />);
        fireEvent.click(screen.getByRole('button', { name: /practice/i }));
        fireEvent.click(screen.getByRole('button', { name: /stop/i }));
        const event = new KeyboardEvent('keydown', {
            code: 'KeyS',
            ctrlKey: true,
            cancelable: true,
        });
        act(() => {
            window.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(false);
    });
});
