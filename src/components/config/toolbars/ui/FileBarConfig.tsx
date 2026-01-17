import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const FileBarConfig = [
    {
        id: 'newfile',
        label: 'Create New Board',
        name: 'Create New Board',
        description: 'New File',
        shortcut: shortcut('⌘N', 'Ctrl+n'),
        icon: <i className="fa-solid fa-file" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().clearBoard(),
        handler: ({ get, set }) => {
            const { clearBoard } = get();
            clearBoard();
        },
    },
    {
        id: 'open',
        label: 'Open Board',
        name: 'Open Board',
        description: 'Open Board',
        shortcut: shortcut('⌘O', 'Ctrl+o'),
        icon: <i className="fa-regular fa-folder-open" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => {},
        handler: ({ get, set }) => {
            const { clearBoard } = get();
            clearBoard();
        },
    },
    {
        id: 'save',
        label: 'Save Board',
        name: 'Save Board',
        description: 'Save Board',
        shortcut: shortcut('⌘S', 'Ctrl+s'),
        icon: <i className="fa-regular fa-floppy-disk" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().saveBoard(),
        handler: ({ get, set }) => {
            const { clearBoard } = get();
            clearBoard();
        },
    },
];
