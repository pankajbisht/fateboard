import { Icon } from '@/components/atoms/Icon';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';
import { arrangeWhen } from './arrangeWhen';

export const GroupBarConfig = [
    {
        id: 'group',
        label: 'Group',
        title: 'Group selected object',
        description: 'Group selected object',
        shortcut: shortcut('⌘G', 'Ctrl+G'),
        icon: <Icon name="object-group" />,
        rule: 'group' as const,
        when: arrangeWhen('group'),
        enabled: arrangeWhen('group'),
        onClick: () => useStore.getState().groupLayers(),
        handler: ({ get }) => {
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
        icon: <Icon name="object-ungroup" />,
        rule: 'ungroup' as const,
        when: arrangeWhen('ungroup'),
        enabled: arrangeWhen('ungroup'),
        onClick: () => useStore.getState().ungroupSelected(),
        handler: ({ get }) => {
            const { ungroupSelected } = get();
            ungroupSelected();
        },
    },
];
