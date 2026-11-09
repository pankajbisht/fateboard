import { describe, expect, it } from 'vitest';

import { commandRegistry } from '@/components/config/commandConfig';

import { HELP_SHORTCUT_CATEGORIES, helpShortcuts, inlineCaps, keyCaps } from '../helpShortcuts';

const press = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

describe('keyCaps', () => {
    it.each([
        ['⌘C', ['⌘', 'C']],
        ['Ctrl+c', ['Ctrl', 'C']],
        ['⌘⇧↓', ['⌘', '⇧', '↓']],
        ['⇧⌥D', ['⇧', '⌥', 'D']],
        ['⌘z', ['⌘', 'Z']],
        ['V', ['V']],
        ['⌫', ['⌫']],
        ['Backspace', ['Backspace']],
    ])('splits %s into separate keys', (input, caps) => {
        expect(keyCaps(input)).toEqual(caps);
    });

    it('shows key codes as the key people see', () => {
        expect(keyCaps('⌘+equal')).toEqual(['⌘', '=']);
        expect(keyCaps('Ctrl+Minus')).toEqual(['Ctrl', '−']);
        expect(keyCaps('Ctrl+Digit0')).toEqual(['Ctrl', '0']);
    });

    it('always orders Windows modifiers Ctrl, Shift, Alt', () => {
        expect(keyCaps('Shift+Ctrl+↓')).toEqual(['Ctrl', 'Shift', '↓']);
    });
});

describe('inlineCaps', () => {
    it('resolves the platform modifiers used in help text', () => {
        expect(inlineCaps('mod+shift+U')).toEqual(['Ctrl', 'Shift', 'U']);
        expect(inlineCaps('alt+D')).toEqual(['Alt', 'D']);
        expect(inlineCaps('Enter')).toEqual(['Enter']);
    });
});

describe('helpShortcuts', () => {
    const rows = helpShortcuts();

    it('lists every command that has a shortcut, and no menu-only command', () => {
        const listed = new Set(rows.map((r) => r.id));
        for (const command of commandRegistry) {
            expect(listed.has(command.id)).toBe(typeof command.shortcut === 'string');
        }
    });

    it('files every shortcut under a known category', () => {
        for (const row of rows) expect(HELP_SHORTCUT_CATEGORIES).toContain(row.category);
        expect(rows.filter((r) => r.category === 'Other')).toEqual([]);
    });

    it('matches a key press the same way the editor does', () => {
        const match = (init: KeyboardEventInit) =>
            rows.filter((r) => r.matches(press(init))).map((r) => r.id);

        expect(match({ code: 'KeyD', ctrlKey: true })).toContain('duplicate');
        expect(match({ code: 'KeyU', ctrlKey: true, shiftKey: true })).toContain('ungroup');
        expect(match({ code: 'Equal', ctrlKey: true })).toContain('zoom-in');
        expect(match({ code: 'KeyV' })).toContain('tool-select');
    });

    it('matches a command through its alternative key', () => {
        const hits = rows.filter((r) => r.matches(press({ code: 'Delete', key: 'Delete' })));
        expect(hits.map((r) => r.id)).toContain('delete');
    });

    it('matches shortcuts that live outside the command registry', () => {
        const ids = (init: KeyboardEventInit) =>
            rows.filter((r) => r.matches(press(init))).map((r) => r.id);

        expect(ids({ code: 'Semicolon', ctrlKey: true })).toContain('toggle-snap');
        expect(ids({ code: 'BracketRight' })).toContain('brush-bigger');
        expect(ids({ code: 'KeyK' })).toContain('anim-keyframe');
    });

    it('leaves the key the browser keeps for itself out of practice', () => {
        expect(rows.find((r) => r.id === 'newfile')?.practice).toBe(false);
        expect(rows.find((r) => r.id === 'save')?.practice).toBe(true);
    });

    it('does not match when a modifier differs', () => {
        const hits = rows.filter((r) => r.matches(press({ code: 'BracketRight', ctrlKey: true })));
        expect(hits.map((r) => r.id)).not.toContain('brush-bigger');
    });
});
