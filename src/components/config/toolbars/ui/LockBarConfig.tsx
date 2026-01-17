import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const LockBarConfig = [
    {
        id: 'lock',
        label: 'Lock',
        name: 'Lock selected object',
        description: 'Lock selected object',
        shortcut: shortcut('⌘L', 'Ctrl+L'),
        icon: <i className="fa-solid fa-lock" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().lock(),
        handler: ({ get, set }) => {
            const { lock } = get();
            lock();
        },
    },
    {
        id: 'unlock',
        label: 'Unlock',
        name: 'Unlock selected object',
        description: 'Unlock selected object',
        shortcut: shortcut('⌘⇧L', 'Ctrl+Shift+L'),
        icon: <i className="fa-solid fa-lock-open" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().unlock(),
        handler: ({ get, set }) => {
            const { unlock } = get();
            unlock();
        },
    },
];
