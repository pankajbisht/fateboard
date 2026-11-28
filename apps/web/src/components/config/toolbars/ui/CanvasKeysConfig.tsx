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

const hasBoard = () => !!useStore.getState().canvas;

const MODE_NAMES: Record<string, string> = {
    x: 'left-right',
    y: 'top-bottom',
    both: '4-way',
    angle: 'any axis',
    radial: 'radial',
    point: 'point',
    kaleido: 'kaleidoscope',
    glide: 'glide',
    spiral: 'spiral',
    wallpaper: 'wallpaper',
    chain: 'mirror chain',
};

/** Symmetry keys: M on / off, Shift + [ / ] fewer / more copies (plain [ / ] stay the brush size). */
const symmetryKeys = [
    {
        id: 'symmetry-toggle',
        label: 'Symmetry on / off',
        title: 'Symmetry on / off',
        description: 'Turn drawing symmetry on or off (back to the last mode)',
        shortcut: 'M',
        enabled: hasBoard,
        handler: ({ get }: { get: typeof useStore.getState }) => {
            const mode = get().toggleSymmetry();
            get().showToast({
                message:
                    mode === 'none' ? 'Symmetry off' : `Symmetry on: ${MODE_NAMES[mode] ?? mode}`,
            });
        },
    },
    ...(
        [
            ['symmetry-fewer', 'Fewer symmetry copies', 'Shift+BracketLeft', -1],
            ['symmetry-more', 'More symmetry copies', 'Shift+BracketRight', 1],
        ] as const
    ).map(([id, label, key, delta]) => ({
        id,
        label,
        title: label,
        description: label,
        shortcut: key,
        enabled: () => hasBoard() && useStore.getState().symmetry !== 'none',
        handler: ({ get }: { get: typeof useStore.getState }) => {
            const n = get().stepSymmetryCount(delta);
            get().showToast({ message: `${n} symmetry copies` });
        },
    })),
];

export const CanvasKeysConfig = [
    ...symmetryKeys,
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
