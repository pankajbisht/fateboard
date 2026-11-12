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
        handler: ({ get }) => get().copy(), // returned: Macro playback awaits async commands
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
        handler: ({ get }) => get().cut(), // returned: Macro playback awaits async commands
    },
    {
        id: 'paste',
        label: 'Paste',
        title: 'Paste object',
        description: 'Paste object',
        shortcut: shortcut('⌘V', 'Ctrl+v'),
        icon: <Icon name="paste" />,
        // pasting needs something copied, not a selection (BUG-033)
        when: () => !!useStore.getState().clipboard,
        onClick: () => useStore.getState().paste(),
        handler: ({ get }) => get().paste(), // returned: Macro playback awaits async commands
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
        handler: ({ get }) => get().duplicate(), // returned: Macro playback awaits async commands
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
        handler: ({ get }) => get().clone(), // returned: Macro playback awaits async commands
    },
    {
        id: 'delete',
        label: 'Delete',
        title: 'Delete selected object',
        description: 'Delete selected object',
        shortcut: shortcut('⌫', 'Backspace'),
        keys: ['Delete'], // the main delete key on PC keyboards (BUG-103)
        icon: <Icon name="trash" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().removeLayer(),
        handler: ({ get }) => get().removeLayer(), // returned: Macro playback awaits async commands
    },
];
