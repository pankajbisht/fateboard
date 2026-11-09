/**
 * Everything the Help page knows about keys. Editor commands come straight from the command
 * registry, so the list cannot drift; keys handled outside the registry (panels, timeline) are
 * listed here. Pressed keys are compared the same way `useKeyboardShortcuts` compares them.
 */
import { commandRegistry } from '@/components/config/commandConfig';
import { buildCombo } from '@/hooks/keyboard/useKeyboardShortcuts';
import { isMac, replaceToShortcut } from '@/lib/utils/isMac';

export const HELP_SHORTCUT_CATEGORIES = [
    'Tools',
    'File',
    'History',
    'Edit',
    'Arrange',
    'Text',
    'View',
    'Pages',
    'Draw',
    'Animate',
    'Other',
] as const;

export type HelpShortcutCategory = (typeof HELP_SHORTCUT_CATEGORIES)[number];

export interface HelpShortcut {
    id: string;
    label: string;
    category: HelpShortcutCategory;
    caps: string[];
    /** Another key that does the same thing (Delete next to Backspace). */
    altCaps?: string[];
    /** Where the key works, when that is not everywhere in the editor. */
    where?: string;
    /** Offered in practice mode. */
    practice?: boolean;
    matches: (e: KeyboardEvent) => boolean;
}

const MOD = isMac ? '⌘' : 'Ctrl';
const SHIFT = isMac ? '⇧' : 'Shift';
const ALT = isMac ? '⌥' : 'Alt';

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

const CODE_CAPS: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Equal: '=',
    Minus: '−',
    Slash: '/',
    Backslash: '\\',
    Comma: ',',
    Period: '.',
    Backquote: '`',
    PageUp: 'Page Up',
    PageDown: 'Page Down',
    Backspace: isMac ? '⌫' : 'Backspace',
    Enter: isMac ? '↩' : 'Enter',
};

const codeCap = (code: string): string =>
    CODE_CAPS[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '');

/** Only a modifier so far: the real key is still to come. */
export const isModifierOnly = (e: KeyboardEvent): boolean =>
    /^(Meta|Control|Shift|Alt|OS)/.test(e.code);

/** What was pressed, as key caps. */
export function pressedCaps(e: KeyboardEvent): string[] {
    return [
        ...(e.metaKey || e.ctrlKey ? [MOD] : []),
        ...(e.shiftKey ? [SHIFT] : []),
        ...(e.altKey ? [ALT] : []),
        codeCap(e.code),
    ];
}

const CATEGORY_BY_ID: Record<string, HelpShortcutCategory> = {
    'tool-select': 'Tools',
    'tool-hand': 'Tools',
    'tool-node': 'Tools',
    newfile: 'File',
    open: 'File',
    save: 'File',
    undo: 'History',
    redo: 'History',
    copy: 'Edit',
    cut: 'Edit',
    paste: 'Edit',
    duplicate: 'Edit',
    clone: 'Edit',
    delete: 'Edit',
    'unlink-clone': 'Edit',
    group: 'Arrange',
    ungroup: 'Arrange',
    lock: 'Arrange',
    unlock: 'Arrange',
    sendtoback: 'Arrange',
    sendbackward: 'Arrange',
    bringforward: 'Arrange',
    bringtofront: 'Arrange',
    'text-bold': 'Text',
    'text-italic': 'Text',
    'text-underline': 'Text',
    'zoom-in': 'View',
    'zoom-out': 'View',
    'fit-to-screen': 'View',
    'actual-size': 'View',
};

/** The browser keeps these for itself, so a web page can never see them being pressed. */
const BROWSER_RESERVED = new Set(['newfile']);

interface PanelKey {
    id: string;
    label: string;
    category: HelpShortcutCategory;
    code: string;
    mod?: boolean;
    shift?: boolean;
    where?: string;
}

const TIMELINE = 'While the timeline has focus';

const PANEL_KEYS: PanelKey[] = [
    {
        id: 'toggle-grid',
        label: 'Show or hide the grid',
        category: 'View',
        code: 'Quote',
        mod: true,
    },
    {
        id: 'toggle-snap',
        label: 'Turn snapping on or off',
        category: 'View',
        code: 'Semicolon',
        mod: true,
    },
    { id: 'page-next', label: 'Next page', category: 'Pages', code: 'PageDown' },
    { id: 'page-prev', label: 'Previous page', category: 'Pages', code: 'PageUp' },
    {
        id: 'brush-smaller',
        label: 'Smaller brush',
        category: 'Draw',
        code: 'BracketLeft',
        where: 'While the Draw panel is open',
    },
    {
        id: 'brush-bigger',
        label: 'Bigger brush',
        category: 'Draw',
        code: 'BracketRight',
        where: 'While the Draw panel is open',
    },
    {
        id: 'anim-play',
        label: 'Play or pause',
        category: 'Animate',
        code: 'Space',
        where: TIMELINE,
    },
    {
        id: 'anim-keyframe',
        label: 'Add a keyframe',
        category: 'Animate',
        code: 'KeyK',
        where: TIMELINE,
    },
    {
        id: 'anim-loop',
        label: 'Turn looping on or off',
        category: 'Animate',
        code: 'KeyL',
        where: TIMELINE,
    },
    {
        id: 'anim-in',
        label: 'Set the work area start',
        category: 'Animate',
        code: 'KeyI',
        where: TIMELINE,
    },
    {
        id: 'anim-out',
        label: 'Set the work area end',
        category: 'Animate',
        code: 'KeyO',
        where: TIMELINE,
    },
    {
        id: 'anim-back',
        label: 'One frame back (or nudge keyframes)',
        category: 'Animate',
        code: 'ArrowLeft',
        where: TIMELINE,
    },
    {
        id: 'anim-forward',
        label: 'One frame forward (or nudge keyframes)',
        category: 'Animate',
        code: 'ArrowRight',
        where: TIMELINE,
    },
    {
        id: 'anim-home',
        label: 'Jump to the start',
        category: 'Animate',
        code: 'Home',
        where: TIMELINE,
    },
    { id: 'anim-end', label: 'Jump to the end', category: 'Animate', code: 'End', where: TIMELINE },
    {
        id: 'anim-select-all',
        label: 'Select all keyframes',
        category: 'Animate',
        code: 'KeyA',
        mod: true,
        where: TIMELINE,
    },
    {
        id: 'anim-copy',
        label: 'Copy keyframes',
        category: 'Animate',
        code: 'KeyC',
        mod: true,
        where: TIMELINE,
    },
    {
        id: 'anim-paste',
        label: 'Paste keyframes',
        category: 'Animate',
        code: 'KeyV',
        mod: true,
        where: TIMELINE,
    },
    {
        id: 'anim-undo',
        label: 'Undo a timeline change',
        category: 'Animate',
        code: 'KeyZ',
        mod: true,
        where: TIMELINE,
    },
    {
        id: 'anim-redo',
        label: 'Redo a timeline change',
        category: 'Animate',
        code: 'KeyZ',
        mod: true,
        shift: true,
        where: TIMELINE,
    },
];

/** Keys held during a mouse action. They cannot be "pressed to find", so they are shown apart. */
export const HELP_GESTURES: { label: string; caps: string[] }[] = [
    { label: 'Add to the selection', caps: [SHIFT, 'Click'] },
    { label: 'Resize freely from a corner', caps: [SHIFT, 'Drag'] },
    { label: 'Resize from the center', caps: [ALT, 'Drag'] },
    { label: 'Move without snapping', caps: [ALT, 'Drag'] },
    { label: 'Draw a straight line', caps: [SHIFT, 'Draw'] },
    { label: 'Zoom with the Hand tool', caps: ['Scroll'] },
    { label: 'Switch a node between corner and smooth', caps: [ALT, 'Click'] },
];

export function helpShortcuts(): HelpShortcut[] {
    const commands = commandRegistry.flatMap((command): HelpShortcut[] => {
        if (typeof command.shortcut !== 'string') return [];
        const extra = 'keys' in command ? (command.keys as string[]) : [];
        const combos = [command.shortcut, ...extra].map(replaceToShortcut);
        return [
            {
                id: command.id,
                label: command.label,
                category: CATEGORY_BY_ID[command.id] ?? 'Other',
                caps: keyCaps(command.shortcut),
                altCaps: extra[0] ? keyCaps(extra[0]) : undefined,
                practice: !BROWSER_RESERVED.has(command.id),
                matches: (e) => combos.includes(replaceToShortcut(buildCombo(e))),
            },
        ];
    });

    const panelKeys = PANEL_KEYS.map(
        ({ code, mod = false, shift = false, ...row }): HelpShortcut => ({
            ...row,
            caps: [...(mod ? [MOD] : []), ...(shift ? [SHIFT] : []), codeCap(code)],
            matches: (e) =>
                e.code === code &&
                (e.metaKey || e.ctrlKey) === mod &&
                e.shiftKey === shift &&
                !e.altKey,
        }),
    );

    return [...commands, ...panelKeys];
}
