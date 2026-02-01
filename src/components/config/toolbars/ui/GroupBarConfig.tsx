import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const GroupBarConfig = [
    {
        id: 'group',
        label: 'Group',
        title: 'Group selected object',
        description: 'Group selected object',
        shortcut: shortcut('⌘G', 'Ctrl+G'),
        icon: <i className="fa-solid fa-object-group" />,
        when: () => useStore.getState().hasMultipleSelection(),
        onClick: () => useStore.getState().groupLayers(),
        handler: ({ get, set }) => {
            const { groupLayers } = get();
            groupLayers();
        },
    },
    {
        id: 'ungroup',
        label: 'Ungroup',
        title: 'Ungroup selected object',
        description: 'Ungroup selected object',
        shortcut: shortcut('⌘⇧U', 'Ctrl+Shift+U'),
        icon: <i className="fa-solid fa-object-ungroup" />,
        when: () => useStore.getState().isGroupSelected(),
        onClick: () => useStore.getState().ungroupSelected(),
        handler: ({ get, set }) => {
            const { ungroupSelected } = get();
            ungroupSelected();
        },
    },
];
