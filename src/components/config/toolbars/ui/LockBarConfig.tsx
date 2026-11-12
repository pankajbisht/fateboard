import { Icon } from '@/components/atoms/Icon';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';
import { arrangeWhen } from './arrangeWhen';

export const LockBarConfig = [
    {
        id: 'lock',
        label: 'Lock',
        title: 'Lock selected object',
        description: 'Lock selected object',
        shortcut: shortcut('⌘L', 'Ctrl+L'),
        icon: <Icon name="lock" />,
        rule: 'lock' as const,
        when: arrangeWhen('lock'),
        enabled: arrangeWhen('lock'),
        onClick: () => useStore.getState().lock(),
        handler: ({ get }) => {
            const { lock } = get();
            lock();
        },
    },
    {
        id: 'unlock',
        label: 'Unlock',
        title: 'Unlock selected object',
        description: 'Unlock selected object',
        shortcut: shortcut('⌘⇧L', 'Ctrl+Shift+L'),
        icon: <Icon name="lock-open" />,
        rule: 'unlock' as const,
        when: arrangeWhen('unlock'),
        enabled: arrangeWhen('unlock'),
        onClick: () => useStore.getState().unlock(),
        handler: ({ get }) => {
            const { unlock } = get();
            unlock();
        },
    },
];
