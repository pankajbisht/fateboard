import { describe, expect, it } from 'vitest';
import { isMac, replaceToShortcut } from '../isMac';
import { commandRegistry } from '@/components/config/commandConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('replaceToShortcut', () => {
    it.skipIf(isMac)('normalises Windows/Linux combos case-insensitively', () => {
        expect(replaceToShortcut('Ctrl+Shift+z')).toBe(replaceToShortcut('Ctrl+Shift+Z'));
        expect(replaceToShortcut('Ctrl+s')).toBe('ctrl+s');
        expect(replaceToShortcut('Backspace')).toBe('Backspace');
    });

    it.runIf(isMac)('normalises macOS combos to symbols', () => {
        expect(replaceToShortcut('Meta+Shift+z')).toBe('⌘⇧z');
    });
});

describe('command registry', () => {
    const commands = commandRegistry as any[];

    it('every command has an id and a handler', () => {
        for (const c of commands) {
            expect(typeof c.id).toBe('string');
            expect(typeof c.handler).toBe('function');
        }
    });

    it('command ids are unique', () => {
        const ids = commands.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('no two commands share a keyboard shortcut', () => {
        const seen = new Map<string, string>();
        for (const c of commands) {
            if (!c.shortcut) continue;
            const key = replaceToShortcut(c.shortcut);
            expect(seen.get(key) ?? c.id).toBe(c.id);
            seen.set(key, c.id);
        }
    });
});
