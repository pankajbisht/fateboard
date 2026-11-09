import { Icon } from '@/components/atoms/Icon';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const LAYERCONTROL_ACTIONS = [
    {
        id: 'sendtoback',
        label: 'Send to Back',
        shortcut: shortcut('⌘⇧↓', 'Shift+Ctrl+↓'),
        icon: <Icon name="send-to-back" />,
        onClick: () => useStore.getState().sendToBack(),
    },
    {
        id: 'sendbackward',
        label: 'Send backward',
        shortcut: shortcut('⌘↓', 'Ctrl+↓'),
        icon: <Icon name="angle-down" />,
        onClick: () => useStore.getState().sendBackward(),
    },
    {
        id: 'bringforward',
        label: 'Bring forward',
        shortcut: shortcut('⌘↑', 'Ctrl+↑'),
        icon: <Icon name="angle-up" />,
        onClick: () => useStore.getState().bringForward(),
    },
    {
        id: 'bringtofront',
        label: 'Bring to front',
        shortcut: shortcut('⌘⇧↑', 'Shift+Ctrl+↑'),
        icon: <Icon name="bring-to-front" />,
        onClick: () => useStore.getState().bringToFront(),
    },
];
