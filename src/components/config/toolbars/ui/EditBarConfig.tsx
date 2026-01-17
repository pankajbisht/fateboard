import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const EditBarConfig = [
    {
        id: 'copy',
        label: 'Copy',
        name: 'Copy selected object',
        description: 'Copy selected object',
        shortcut: shortcut('⌘C', 'Ctrl+c'),
        icon: <i className="fa-regular fa-copy" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().copy(),
        handler: ({ get, set }) => {
            const { copy } = get();
            copy();
        },
    },
    {
        id: 'cut',
        label: 'Cut',
        name: 'Cut selected object',
        description: 'Cut selected object',
        shortcut: shortcut('⌘X', 'Ctrl+x'),
        icon: <i className="fa-solid fa-scissors -rotate-90"></i>,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().cut(),
        handler: ({ get, set }) => {
            const { cut } = get();
            cut();
        },
    },
    {
        id: 'paste',
        label: 'Paste',
        name: 'Paste object',
        description: 'Paste object',
        shortcut: shortcut('⌘V', 'Ctrl+v'),
        icon: <i className="fa-regular fa-paste" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().paste(),
        handler: ({ get, set }) => {
            const { paste } = get();
            paste();
        },
    },
    {
        id: 'duplicate',
        label: 'Duplicate',
        name: 'Duplicate object',
        description: 'Duplicate object',
        shortcut: shortcut('⌘D', 'Ctrl+D'),
        icon: <i className="fa-regular fa-clone" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().duplicate(),
        handler: ({ get, set }) => {
            const { duplicate } = get();
            duplicate();
        },
    },
    {
        id: 'clone',
        label: 'Clone',
        name: 'Clone selected object',
        description: 'Clone selected object',
        shortcut: shortcut('⌥D', 'Alt+D'),
        icon: <i className="fa-solid fa-layer-group" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().clone(),
        handler: ({ get, set }) => {
            const { clone } = get();
            clone();
        },
    },
    {
        id: 'delete',
        label: 'Delete',
        name: 'Delete selected object',
        description: 'Delete selected object',
        shortcut: shortcut('⌫', 'Backspace'),
        icon: <i className="fa-solid fa-trash" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().removeLayer(),
        handler: ({ get, set }) => {
            const { removeLayer } = get();
            removeLayer();
        },
    },
];
