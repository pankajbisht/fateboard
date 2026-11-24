import { arrowKeysOwnedByFocus } from '@/lib/keyboard/modalOpen';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

/**
 * Keyboard-only commands for the board. Kept apart from the bar configs, which also build toolbars
 * and the right-click menu. While a command is not `enabled` the key stays with the browser.
 */
const usingSelectTool = () => {
    const { canvas, activeTool, nodeEditor } = useStore.getState();
    return !!canvas && activeTool === 'select' && !nodeEditor;
};

const canNudge = () =>
    usingSelectTool() &&
    !!useStore.getState().canvas?.getActiveObject() &&
    !arrowKeysOwnedByFocus();

const FAR = 10;

const nudge = (id: string, label: string, key: string, dx: number, dy: number, far: boolean) => ({
    id: far ? `${id}-far` : id,
    label: far ? `${label} ${FAR} px` : label,
    title: far ? `${label} ${FAR} px` : label,
    description: far ? `${label} ${FAR} px` : label,
    shortcut: far ? shortcut(`⇧${key}`, `Shift+${key}`) : key,
    enabled: canNudge,
    handler: ({ get }: { get: typeof useStore.getState }) =>
        get().nudgeSelection(far ? dx * FAR : dx, far ? dy * FAR : dy),
});

const ARROWS = [
    ['nudge-left', 'Nudge left', '←', -1, 0],
    ['nudge-right', 'Nudge right', '→', 1, 0],
    ['nudge-up', 'Nudge up', '↑', 0, -1],
    ['nudge-down', 'Nudge down', '↓', 0, 1],
] as const;

export const CanvasKeysConfig = [
    {
        id: 'select-all',
        label: 'Select all',
        title: 'Select all',
        description: 'Select everything on the board',
        shortcut: shortcut('⌘A', 'Ctrl+a'),
        enabled: usingSelectTool,
        handler: ({ get }: { get: typeof useStore.getState }) => get().selectAllObjects(),
    },
    ...ARROWS.flatMap(([id, label, key, dx, dy]) => [
        nudge(id, label, key, dx, dy, false),
        nudge(id, label, key, dx, dy, true),
    ]),
];
