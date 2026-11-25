export const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

export const shortcut = (mac: string, win: string) => (isMac ? mac : win);

const MAC_KEY_MAP: Record<string, string> = {
    Meta: '⌘',
    Shift: '⇧',
    Alt: '⌥',
    Control: '⌃',

    Enter: '↩',
    Backspace: '⌫',
    Escape: '⎋',
    Tab: '⇥',

    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
};

const WIN_KEY_MAP: Record<string, string> = {
    Meta: 'Ctrl',
    Shift: 'Shift',
    Alt: 'Alt',
    Control: 'Ctrl',

    Enter: 'Enter',
    Backspace: 'Backspace',
    Escape: 'Esc',
    Tab: 'Tab',

    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
};

export const replaceToShortcut = (shortcut) => {
    const map = isMac ? MAC_KEY_MAP : WIN_KEY_MAP;

    return shortcut
        .split('+')
        .map((key) => map[key] ?? key.toLowerCase())
        .join(isMac ? '' : '+');
};
