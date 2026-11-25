/**
 * Key caps for help text, kept apart from `helpShortcuts.ts` (which reads the command registry) so
 * light pages can show key marks without loading the editor's commands (landing page, BUG-196).
 */
import { isMac } from '@/lib/utils/isMac';

export const MOD = isMac ? '⌘' : 'Ctrl';
export const SHIFT = isMac ? '⇧' : 'Shift';
export const ALT = isMac ? '⌥' : 'Alt';

const WORD_KEYS: Record<string, string> = { equal: '=', minus: '−' };
const WINDOWS_MODIFIER_ORDER = ['Ctrl', 'Shift', 'Alt'];

const prettyKey = (key: string): string => {
    const lower = key.toLowerCase();
    if (WORD_KEYS[lower]) return WORD_KEYS[lower]!;
    const digit = /^digit(\d)$/.exec(lower);
    if (digit) return digit[1]!;
    return key.length === 1 ? key.toUpperCase() : key;
};

/** A registry shortcut string ('⌘⇧↓', 'Shift+Ctrl+↓', '⌘+equal') as separate key caps. */
export function keyCaps(shortcut: string): string[] {
    const parts = shortcut.length > 1 && shortcut.includes('+') ? shortcut.split('+') : [shortcut];
    const caps = parts
        .filter(Boolean)
        .flatMap((part) => {
            const [, glyphs = '', rest = ''] = /^([⌘⇧⌥⌃]*)(.*)$/u.exec(part) ?? [];
            return [...glyphs, rest].filter(Boolean);
        })
        .map(prettyKey);
    const rank = (cap: string) => {
        const i = WINDOWS_MODIFIER_ORDER.indexOf(cap);
        return i === -1 ? WINDOWS_MODIFIER_ORDER.length : i;
    };
    return [...caps].sort((a, b) => rank(a) - rank(b));
}

/** A key mark from help text (`mod+shift+U`) as key caps for this platform. */
export function inlineCaps(mark: string): string[] {
    const named: Record<string, string> = { mod: MOD, shift: SHIFT, alt: ALT };
    return mark.split('+').map((key) => named[key] ?? key);
}
