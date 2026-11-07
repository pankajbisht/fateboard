import { Icon } from '@/components/atoms/Icon';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const ZoomBarConfig = [
    {
        id: 'zoom-in',
        label: 'Zoom In',
        title: 'Zoom In',
        description: 'Zoom In',
        shortcut: shortcut('⌘+equal', 'Ctrl+Equal'),
        icon: <Icon name="magnifying-glass-plus" />,
        onClick: () => useStore.getState().zoomIn(),
        handler: ({ get, set }) => {
            const { zoomIn } = get();
            zoomIn();
        },
    },
    {
        id: 'zoom-out',
        label: 'Zoom Out',
        title: 'Zoom Out',
        description: 'Zoom Out',
        shortcut: shortcut('⌘+minus', 'Ctrl+Minus'),
        icon: <Icon name="magnifying-glass-minus" />,
        onClick: () => useStore.getState().zoomOut(),
        handler: ({ get, set }) => {
            const { zoomOut } = get();
            zoomOut();
        },
    },
    {
        id: 'fit-to-screen',
        label: 'Fit to Screen',
        title: 'Fit to Screen',
        description: 'Fit to Screen',
        shortcut: shortcut('⌘+Digit0', 'Ctrl+Digit0'),
        icon: <Icon name="expand" />,
        onClick: () => useStore.getState().zoomFit(),
        handler: ({ get, set }) => {
            const { zoomFit } = get();
            zoomFit();
        },
    },
    {
        id: 'actual-size',
        label: 'Actual Size',
        title: 'Actual Size',
        description: 'Actual Size',
        shortcut: shortcut('⌘+Digit1', 'Ctrl+Digit1'),
        icon: <Icon name="arrows-left-right" />,
        onClick: () => useStore.getState().actualSize(),
        handler: ({ get, set }) => {
            const { actualSize } = get();
            actualSize();
        },
    },
];
