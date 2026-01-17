import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const ZoomBarConfig = [
    {
        id: 'zoom-in',
        name: 'Zoom In',
        description: 'Zoom In',
        shortcut: shortcut('⌘+equal', 'Ctrl++'),
        icon: <i className="fa-solid fa-magnifying-glass-plus" />,
        onClick: () => useStore.getState().zoomIn(),
        handler: ({ get, set }) => {
            const { zoomIn } = get();
            zoomIn();
        },
    },
    {
        id: 'zoom-out',
        description: 'Zoom Out',
        shortcut: shortcut('⌘+minus', 'Ctrl+-'),
        icon: <i className="fa-solid fa-magnifying-glass-minus" />,
        onClick: () => useStore.getState().zoomOut(),
        handler: ({ get, set }) => {
            const { zoomOut } = get();
            zoomOut();
        },
    },
    {
        id: 'fit-to-screen',
        description: 'Fit to Screen',
        shortcut: shortcut('⌘+Digit0', 'Ctrl+0'),
        icon: <i className="fa-solid fa-expand" />,
        onClick: () => useStore.getState().zoomFit(),
        handler: ({ get, set }) => {
            const { zoomFit } = get();
            zoomFit();
        },
    },
    {
        id: 'actual-size',
        description: 'Actual Size',
        shortcut: shortcut('⌘+Digit1', 'Ctrl+1'),
        icon: <i className="fa-solid fa-arrows-left-right" />,
        onClick: () => useStore.getState().actualSize(),
        handler: ({ get, set }) => {
            const { actualSize } = get();
            actualSize();
        },
    },
];
