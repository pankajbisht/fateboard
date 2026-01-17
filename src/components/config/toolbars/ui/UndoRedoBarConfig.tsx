import { shortcut } from '@/lib/utils/isMac';

export const UndoRedoBarConfig = [
    {
        id: 'undo',
        name: 'Undo',
        description: 'Undo',
        shortcut: shortcut('⌘Z', 'Ctrl+Z'),
        handler: ({ get, set }) => {
            const { undo } = get();
            undo();
        },
    },
    {
        id: 'redo',
        name: 'Redo',
        description: 'Redo',
        shortcut: shortcut('⌘⇧Z', 'Ctrl+Y'),
        handler: ({ get, set }) => {
            const { redo } = get();
            redo();
        },
    },
];
