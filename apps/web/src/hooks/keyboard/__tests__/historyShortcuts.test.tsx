/**
 * Undo / redo from where the focus really is: right after committing a number field (Enter keeps
 * the focus in it) and while typing on the canvas (Fabric's hidden textarea), ⌘Z / Ctrl+Z must
 * reach the canvas history. Every other shortcut still ignores text inputs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useStore } from '@store';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { isMac } from '@/lib/utils/isMac';

/* eslint-disable @typescript-eslint/no-explicit-any */
const runCommand = vi.fn();
let prev: any;

const commands = [
    { id: 'select-linked' }, // menu-only command: no shortcut must not break the lookup
    { id: 'undo', shortcut: isMac ? '⌘z' : 'Ctrl+z' },
    { id: 'redo', shortcut: isMac ? '⌘⇧z' : 'Ctrl+Shift+z' },
    { id: 'copy', shortcut: isMac ? '⌘C' : 'Ctrl+c' },
];

const press = (target: HTMLElement, code: string, shift = false) =>
    act(() => {
        target.dispatchEvent(
            new KeyboardEvent('keydown', {
                code,
                key: code.replace('Key', '').toLowerCase(),
                metaKey: isMac,
                ctrlKey: !isMac,
                shiftKey: shift,
                bubbles: true,
            }),
        );
    });

const make = (tag: 'input' | 'textarea', attrs: Record<string, string> = {}) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.body.appendChild(el);
    el.focus();
    return el;
};

beforeEach(() => {
    prev = { ...useStore.getState() };
    runCommand.mockReset();
    useStore.setState({ commands, runCommand } as any);
    renderHook(() => useKeyboardShortcuts());
});
afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    useStore.setState({ commands: prev.commands, runCommand: prev.runCommand } as any);
});

describe('undo / redo shortcuts and focus', () => {
    it('a committed number field passes ⌘Z / ⌘⇧Z to the canvas history and lets go of the focus', () => {
        const field = make('input', { 'data-history-passthrough': 'true' });
        press(field, 'KeyZ');
        expect(runCommand).toHaveBeenCalledWith('undo');
        expect(document.activeElement).not.toBe(field);

        const again = make('input', { 'data-history-passthrough': 'true' });
        press(again, 'KeyZ', true);
        expect(runCommand).toHaveBeenLastCalledWith('redo');
    });

    it('typing on the canvas (Fabric textarea) can be undone with ⌘Z', () => {
        const ta = make('textarea', { 'data-fabric': 'textarea' });
        press(ta, 'KeyZ');
        expect(runCommand).toHaveBeenCalledWith('undo');
    });

    it('a field with an unsaved value keeps ⌘Z for itself; other shortcuts never fire from inputs', () => {
        press(make('input'), 'KeyZ'); // plain / half-typed field
        press(make('input', { 'data-history-passthrough': 'true' }), 'KeyC'); // copy
        expect(runCommand).not.toHaveBeenCalled();
    });

    it('commands without a shortcut never break the other shortcuts', () => {
        press(document.body, 'KeyZ');
        expect(runCommand).toHaveBeenCalledWith('undo');
    });
});
