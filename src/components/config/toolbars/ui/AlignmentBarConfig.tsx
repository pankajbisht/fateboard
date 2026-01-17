import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const AlignmentBarConfig = [
    {
        id: 'align-left',
        label: 'Align Left',
        name: 'Align Left',
        description: 'Align Left',
        shortcut: shortcut('⌘+c', 'Ctrl+c'),
        icon: <i className="fa-solid fa-align-left" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().alignObjects('align-left'),
        handler: ({ get, set }) => {
            const { copy } = get();
            copy();
        },
    },
    {
        id: 'align-center',
        label: 'Align Center',
        name: 'Align Center',
        description: 'Align Center',
        shortcut: shortcut('⌘+x', 'Ctrl+x'),
        icon: <i className="fa-solid fa-align-center" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().alignObjects('align-hcenter'),
        handler: ({ get, set }) => {
            const { cut } = get();
            cut();
        },
    },
    {
        id: 'align-right',
        label: 'Align Right',
        name: 'Align Right',
        description: 'Align Right',
        shortcut: shortcut('⌘+v', 'Ctrl+v'),
        icon: <i className="fa-solid fa-align-right" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().alignObjects('align-right'),
        handler: ({ get, set }) => {
            const { paste } = get();
            paste();
        },
    },
    {
        id: 'align-top',
        label: 'Align Top',
        name: 'Align Top',
        description: 'Align Top',
        shortcut: shortcut('⌘+D', 'Ctrl+D'),
        icon: <i className="fa-solid fa-align-left rotate-90" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().alignObjects('align-top'),
        handler: ({ get, set }) => {
            const { duplicate } = get();
            duplicate();
        },
    },
    {
        id: 'align-middle',
        label: 'Align Middle',
        name: 'Align Middle',
        description: 'Align Middle',
        shortcut: shortcut('⌥+D', 'Alt+D'),
        icon: <i className="fa-solid fa-align-center -rotate-90" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().alignObjects('align-vcenter'),
        handler: ({ get, set }) => {
            const { clone } = get();
            clone();
        },
    },
    {
        id: 'align-bottom',
        label: 'Align Bottom',
        name: 'Align Bottom',
        description: 'Align Bottom',
        shortcut: shortcut('⌫', 'Backspace'),
        icon: <i className="fa-solid fa-align-right rotate-90" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().alignObjects('align-bottom'),
        handler: ({ get, set }) => {
            const { removeLayer } = get();
            removeLayer();
        },
    },
    {
        id: 'distribute-horizontal',
        label: 'Distribute Horizontally',
        name: 'Distribute Horizontally',
        description: 'Distribute Horizontally',
        shortcut: shortcut('⌫', 'Backspace'),
        icon: <i className="fa-solid fa-grip-lines-vertical" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().alignObjects('distribute-h'),
        handler: ({ get, set }) => {
            const { removeLayer } = get();
            removeLayer();
        },
    },
    {
        id: 'distribute-vertical',
        label: 'Distribute Vertically',
        name: 'Distribute Vertically',
        description: 'Distribute Vertically',
        shortcut: shortcut('⌫', 'Backspace'),
        icon: <i className="fa-solid fa-grip-lines" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().alignObjects('distribute-v'),
        handler: ({ get, set }) => {
            const { removeLayer } = get();
            removeLayer();
        },
    },
];
