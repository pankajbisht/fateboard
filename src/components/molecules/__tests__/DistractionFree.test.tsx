/** Distraction-free mode: only the canvas on screen; toggled like fullscreen (button, ⌘\ / Ctrl+\). */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { commandRegistry } from '@/components/config/commandConfig';
import { replaceToShortcut } from '@/lib/utils/isMac';
import { buildCombo } from '@/hooks/keyboard/useKeyboardShortcuts';
import { DistractionFreeExit, DistractionFreeToggle } from '../DistractionFree';

afterEach(() => {
    cleanup();
    act(() => useStore.setState({ distractionFree: false }));
});

describe('distraction-free mode', () => {
    it('is off by default and toggles in the store', () => {
        expect(useStore.getState().distractionFree).toBe(false);
        act(() => useStore.getState().toggleDistractionFree());
        expect(useStore.getState().distractionFree).toBe(true);
        act(() => useStore.getState().toggleDistractionFree());
        expect(useStore.getState().distractionFree).toBe(false);
    });

    it('has a command with the ⌘\\ / Ctrl+\\ shortcut (shortcut table + command palette)', () => {
        const cmd = commandRegistry.find((c: { id: string }) => c.id === 'distraction-free') as
            { shortcut: string; handler: (ctx: unknown) => void } | undefined;
        expect(cmd).toBeDefined();
        // matched the way useKeyboardShortcuts matches a real key press (Ctrl outside macOS)
        const press = new KeyboardEvent('keydown', { ctrlKey: true, code: 'Backslash' });
        expect(replaceToShortcut(cmd!.shortcut)).toBe(replaceToShortcut(buildCombo(press)));
        act(() => cmd!.handler({ get: useStore.getState, set: useStore.setState }));
        expect(useStore.getState().distractionFree).toBe(true);
    });

    it('the footer button turns it on and shows its state', () => {
        render(<DistractionFreeToggle />);
        const button = screen.getByRole('button', { name: 'Distraction-free mode' });
        expect(button.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(button);
        expect(useStore.getState().distractionFree).toBe(true);
    });

    it('while on, one small button leads back out', () => {
        const { rerender } = render(<DistractionFreeExit />);
        expect(screen.queryByRole('button', { name: /Exit distraction-free/ })).toBeNull();
        act(() => useStore.getState().toggleDistractionFree());
        rerender(<DistractionFreeExit />);
        fireEvent.click(screen.getByRole('button', { name: /Exit distraction-free/ }));
        expect(useStore.getState().distractionFree).toBe(false);
    });
});
