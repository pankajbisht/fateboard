import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const LAYERCONTROL_ACTIONS = [
    {
        id: 'sendtoback',
        label: 'Send to Back',
        shortcut: shortcut('⌘⇧↓', 'Shift+Ctrl+↓'),
        icon: <i className="fa-solid fa-angles-down" />,
        onClick: () => useStore.getState().sendToBack(),
    },
    {
        id: 'sendbackward',
        label: 'Send backward',
        shortcut: shortcut('⌘↓', 'Ctrl+↓'),
        icon: <i className="fa-solid fa-angle-down" />,
        onClick: () => useStore.getState().sendBackward(),
    },
    {
        id: 'bringforward',
        label: 'Bring forward',
        shortcut: shortcut('⌘↑', 'Ctrl+↑'),
        icon: <i className="fa-solid fa-angle-up" />,
        onClick: () => useStore.getState().bringForward(),
    },
    {
        id: 'bringtofront',
        label: 'Bring to front',
        shortcut: shortcut('⌘⇧↑', 'Shift+Ctrl+↑'),
        icon: <i className="fa-solid fa-angles-up" />,
        onClick: () => useStore.getState().bringToFront(),
    },
];
