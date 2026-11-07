import { Icon } from '@/components/atoms/Icon';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const EditBarConfig = [
    {
        id: 'copy',
        label: 'Copy',
        title: 'Copy selected object',
        description: 'Copy selected object',
        shortcut: shortcut('⌘C', 'Ctrl+c'),
        icon: <Icon name="copy" />,
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
        title: 'Cut selected object',
        description: 'Cut selected object',
        shortcut: shortcut('⌘X', 'Ctrl+x'),
        icon: <Icon name="scissors" />,
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
        title: 'Paste object',
        description: 'Paste object',
        shortcut: shortcut('⌘V', 'Ctrl+v'),
        icon: <Icon name="paste" />,
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
        title: 'Duplicate on top of the original',
        description: 'Independent copy exactly on top of the original',
        shortcut: shortcut('⌘D', 'Ctrl+D'),
        icon: <Icon name="clone" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().duplicate(),
        handler: ({ get, set }) => {
            const { duplicate } = get();
            duplicate();
        },
    },
    {
        id: 'clone',
        label: 'Clone (linked)',
        title: 'Linked copy: edit any copy and the others follow',
        description: 'Linked copy on top of the original; editing any copy updates the others',
        shortcut: shortcut('⌥D', 'Alt+D'),
        icon: <Icon name="layer-group" />,
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
        title: 'Delete selected object',
        description: 'Delete selected object',
        shortcut: shortcut('⌫', 'Backspace'),
        icon: <Icon name="trash" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().removeLayer(),
        handler: ({ get, set }) => {
            const { removeLayer } = get();
            removeLayer();
        },
    },
];
