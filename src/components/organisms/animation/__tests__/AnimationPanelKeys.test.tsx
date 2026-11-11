/**
 * BUG-018: keys the Animation panel handles (Backspace, ⌘Z, ⌘C…) must not also reach the global
 * shortcuts (which deleted the selected canvas object / undid the canvas too).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { useStore } from '@store';
import AnimationPanel from '../AnimationPanel';
import { useKeyboardShortcuts } from '@/hooks/keyboard/useKeyboardShortcuts';
import { isMac } from '@/lib/utils/isMac';

/* eslint-disable @typescript-eslint/no-explicit-any */
const runCommand = vi.fn();
let prev: any;

beforeEach(() => {
    prev = { ...useStore.getState() };
    runCommand.mockReset();
    useStore.setState({
        runCommand,
        commands: [
            { id: 'delete', shortcut: isMac ? '⌫' : 'Backspace', keys: ['Delete'] },
            { id: 'undo', shortcut: isMac ? '⌘z' : 'Ctrl+z' },
            { id: 'copy', shortcut: isMac ? '⌘C' : 'Ctrl+c' },
        ],
    } as any);
    renderHook(() => useKeyboardShortcuts());
});
afterEach(() => {
    cleanup();
    useStore.setState({ commands: prev.commands, runCommand: prev.runCommand } as any);
});

const press = (el: Element, code: string, key: string, mod = false) =>
    act(() => {
        el.dispatchEvent(
            new KeyboardEvent('keydown', {
                code,
                key,
                metaKey: mod && isMac,
                ctrlKey: mod && !isMac,
                bubbles: true,
                cancelable: true,
            }),
        );
    });

describe('Animation panel keys stay in the panel (BUG-018)', () => {
    it('Backspace, Delete, ⌘Z and ⌘C inside the panel never run canvas commands', () => {
        const { container } = render(<AnimationPanel />);
        const panel = container.querySelector('[tabindex="0"]')!;
        (panel as HTMLElement).focus();
        press(panel, 'Backspace', 'Backspace');
        press(panel, 'Delete', 'Delete');
        press(panel, 'KeyZ', 'z', true);
        press(panel, 'KeyC', 'c', true);
        expect(runCommand).not.toHaveBeenCalled();
    });

    it('outside the panel the canvas shortcuts still work', () => {
        render(<AnimationPanel />);
        press(document.body, 'Backspace', 'Backspace');
        expect(runCommand).toHaveBeenCalledWith('delete');
    });
});
