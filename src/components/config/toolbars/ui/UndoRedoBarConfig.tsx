import RedoIcon from '@/assets/icons/RedoIcon';
import UndoIcon from '@/assets/icons/UndoRedo';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const UndoRedoBarConfig = [
    {
        id: 'undo',
        label: 'Undo',
        title: 'Undo',
        description: 'Undo',
        shortcut: shortcut('⌘z', 'Ctrl+z'),
        icon: <UndoIcon />,
        onClick: () => useStore.getState().undo(),
        handler: ({ get }) => get().undo(), // returned: Macro playback awaits async commands
    },
    {
        id: 'redo',
        label: 'Redo',
        title: 'Redo',
        description: 'Redo',
        shortcut: shortcut('⌘⇧z', 'Ctrl+Shift+z'),
        icon: <RedoIcon />,
        onClick: () => useStore.getState().redo(),
        handler: ({ get }) => get().redo(), // returned: Macro playback awaits async commands
    },
];
