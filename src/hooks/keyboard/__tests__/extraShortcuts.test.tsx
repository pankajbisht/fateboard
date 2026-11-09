/**
 * BUG-103: the Delete key deletes like Backspace (commands may list extra `keys`).
 * BUG-096: ⌘B / ⌘I / ⌘U style text, also while typing on the canvas; with no text selected the
 * browser keeps the key (`enabled()` false = not handled, no preventDefault).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useStore } from '@store';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { isMac } from '@/lib/utils/isMac';

/* eslint-disable @typescript-eslint/no-explicit-any */
const runCommand = vi.fn();
let textSelected = true;
let prev: any;

const commands = [
    { id: 'delete', shortcut: isMac ? '⌫' : 'Backspace', keys: ['Delete'] },
    {
        id: 'text-bold',
        shortcut: isMac ? '⌘B' : 'Ctrl+b',
        enabled: () => textSelected,
        allowWhileTyping: true,
    },
];

const press = (target: HTMLElement, code: string, mod = false) => {
    const e = new KeyboardEvent('keydown', {
        code,
        key: code,
        metaKey: mod && isMac,
        ctrlKey: mod && !isMac,
        bubbles: true,
        cancelable: true,
    });
    act(() => {
        target.dispatchEvent(e);
    });
    return e;
};

beforeEach(() => {
    prev = { ...useStore.getState() };
    runCommand.mockReset();
    textSelected = true;
    useStore.setState({ commands, runCommand } as any);
    renderHook(() => useKeyboardShortcuts());
});
afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    useStore.setState({ commands: prev.commands, runCommand: prev.runCommand } as any);
});

describe('extra keys and text style shortcuts', () => {
    it('Delete runs the delete command, like Backspace', () => {
        press(document.body, 'Delete');
        expect(runCommand).toHaveBeenCalledWith('delete');
        press(document.body, 'Backspace');
        expect(runCommand).toHaveBeenCalledTimes(2);
    });

    it('⌘B styles text, also while typing on the canvas (Fabric textarea)', () => {
        press(document.body, 'KeyB', true);
        expect(runCommand).toHaveBeenLastCalledWith('text-bold');
        const ta = document.createElement('textarea');
        ta.setAttribute('data-fabric', 'textarea');
        document.body.appendChild(ta);
        ta.focus();
        press(ta, 'KeyB', true);
        expect(runCommand).toHaveBeenCalledTimes(2);
    });

    it('with no text selected ⌘B is left to the browser', () => {
        textSelected = false;
        const e = press(document.body, 'KeyB', true);
        expect(runCommand).not.toHaveBeenCalled();
        expect(e.defaultPrevented).toBe(false);
    });

    it('never fires from an ordinary input', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        press(input, 'Delete');
        press(input, 'KeyB', true);
        expect(runCommand).not.toHaveBeenCalled();
    });
});

describe('canvas shortcuts are off while a modal dialog is open (BUG-062 / BUG-061)', () => {
    it('Delete / ⌘B under an open aria-modal dialog do nothing', () => {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        document.body.appendChild(dialog);
        press(document.body, 'Delete');
        press(dialog, 'Delete');
        press(document.body, 'KeyB', true);
        expect(runCommand).not.toHaveBeenCalled();
        dialog.remove();
        press(document.body, 'Delete');
        expect(runCommand).toHaveBeenCalledWith('delete');
    });
});
