import RedoIcon from '@/assets/icons/RedoIcon';
import UndoIcon from '@/assets/icons/UndoRedo';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const UndoRedoBarConfig = [
    {
        id: 'undo',
        label: 'Undo',
        name: 'Undo',
        description: 'Undo',
        shortcut: shortcut('⌘z', 'Ctrl+z'),
        icon: <UndoIcon />,
        onClick: () => useStore.getState().undo(),
        handler: ({ get, set }) => {
            const { undo } = get();
            undo();
        },
    },
    {
        id: 'redo',
        label: 'Redo',
        description: 'Redo',
        shortcut: shortcut('⌘⇧z', 'Ctrl+Shift+z'),
        icon: <RedoIcon />,
        onClick: () => useStore.getState().redo(),
        handler: ({ get, set }) => {
            const { redo } = get();
            redo();
        },
    },
];
