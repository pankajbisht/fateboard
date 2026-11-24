import { Icon } from '@/components/atoms/Icon';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';
import { newBoard, openBoardFile, saveBoardFile } from '../fileActions';

export const FileBarConfig = [
    {
        id: 'newfile',
        macro: false, // not recordable in a Macro
        label: 'Create New Board',
        title: 'Create New Board',
        description: 'New File',
        shortcut: shortcut('⌘N', 'Ctrl+n'),
        icon: <Icon name="file" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => newBoard(),
        handler: () => {
            void newBoard();
        },
    },
    {
        id: 'open',
        macro: false, // not recordable in a Macro
        label: 'Open Board',
        title: 'Open Board',
        description: 'Open Board',
        shortcut: shortcut('⌘O', 'Ctrl+o'),
        icon: <Icon name="folder-open" />,
        when: () => useStore.getState().hasSelection,
        // FileBar replaces onClick with its own hidden input; the keyboard command uses openBoardFile().
        // BUG-040: this handler used to call clearBoard(), so Ctrl/⌘+O deleted the board.
        onClick: () => openBoardFile(),
        handler: () => openBoardFile(),
    },
    {
        id: 'save',
        macro: false, // not recordable in a Macro
        label: 'Save Board',
        title: 'Save Board',
        description: 'Save Board',
        shortcut: shortcut('⌘S', 'Ctrl+s'),
        icon: <Icon name="floppy-disk" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => saveBoardFile(),
        // BUG-040: this handler used to call clearBoard(), so Ctrl/⌘+S deleted the board.
        handler: () => saveBoardFile(),
    },
];
