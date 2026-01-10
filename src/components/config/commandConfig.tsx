import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

export const FileBarConfig = [
    {
        id: 'newfile',
        label: 'Create New Board',
        name: 'Create New Board',
        description: 'New File',
        shortcut: shortcut('⌘N', 'Ctrl+n'),
        icon: <i className="fa-solid fa-file" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().clearBoard(),
        handler: ({ get, set }) => {
            const { clearBoard } = get();
            clearBoard();
        },
    },
    {
        id: 'open',
        label: 'Open Board',
        name: 'Open Board',
        description: 'Open Board',
        shortcut: shortcut('⌘O', 'Ctrl+o'),
        icon: <i className="fa-regular fa-folder-open" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => {},
        handler: ({ get, set }) => {
            const { clearBoard } = get();
            clearBoard();
        },
    },
    {
        id: 'save',
        label: 'Save Board',
        name: 'Save Board',
        description: 'Save Board',
        shortcut: shortcut('⌘S', 'Ctrl+s'),
        icon: <i className="fa-regular fa-floppy-disk" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().saveBoard(),
        handler: ({ get, set }) => {
            const { clearBoard } = get();
            clearBoard();
        },
    },
];

export const EditBarConfig = [
    {
        id: 'copy',
        label: 'Copy',
        name: 'Copy selected object',
        description: 'Copy selected object',
        shortcut: shortcut('⌘C', 'Ctrl+c'),
        icon: <i className="fa-regular fa-copy" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().copy(),
        handler: ({ get, set }) => {
            const { copy } = get();
            copy();
        },
    },
    {
        id: 'cut',
        label: 'Cut',
        name: 'Cut selected object',
        description: 'Cut selected object',
        shortcut: shortcut('⌘X', 'Ctrl+x'),
        icon: <i className="fa-solid fa-scissors -rotate-90"></i>,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().cut(),
        handler: ({ get, set }) => {
            const { cut } = get();
            cut();
        },
    },
    {
        id: 'paste',
        label: 'Paste',
        name: 'Paste object',
        description: 'Paste object',
        shortcut: shortcut('⌘V', 'Ctrl+v'),
        icon: <i className="fa-regular fa-paste" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().paste(),
        handler: ({ get, set }) => {
            const { paste } = get();
            paste();
        },
    },
    {
        id: 'duplicate',
        label: 'Duplicate',
        name: 'Duplicate object',
        description: 'Duplicate object',
        shortcut: shortcut('⌘D', 'Ctrl+D'),
        icon: <i className="fa-regular fa-clone" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().duplicate(),
        handler: ({ get, set }) => {
            const { duplicate } = get();
            duplicate();
        },
    },
    {
        id: 'clone',
        label: 'Clone',
        name: 'Clone selected object',
        description: 'Clone selected object',
        shortcut: shortcut('⌥D', 'Alt+D'),
        icon: <i className="fa-solid fa-layer-group" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().clone(),
        handler: ({ get, set }) => {
            const { clone } = get();
            clone();
        },
    },
    {
        id: 'delete',
        label: 'Delete',
        name: 'Delete selected object',
        description: 'Delete selected object',
        shortcut: shortcut('⌫', 'Backspace'),
        icon: <i className="fa-solid fa-trash" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().removeLayer(),
        handler: ({ get, set }) => {
            const { removeLayer } = get();
            removeLayer();
        },
    },
];

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

// { id: 1, name: 'New File', mac: '⌘N', win: 'Ctrl+N' },

export const GroupBarConfig = [
    {
        id: 'group',
        label: 'Group',
        name: 'Group selected object',
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
        name: 'Ungroup selected object',
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

export const UndoRedoBarConfig = [
    {
        id: 'undo',
        name: 'Undo',
        description: 'Undo',
        shortcut: shortcut('⌘Z', 'Ctrl+Z'),
        handler: ({ get, set }) => {
            const { undo } = get();
            undo();
        },
    },
    {
        id: 'redo',
        name: 'Redo',
        description: 'Redo',
        shortcut: shortcut('⌘⇧Z', 'Ctrl+Y'),
        handler: ({ get, set }) => {
            const { redo } = get();
            redo();
        },
    },
];

export const contextMenuRegistry = [
    // [
    // {
    //     label: 'Copy',
    //     icon: <i className="fa-solid fa-copy" />,
    //     shortcut: shortcut('⌘C', 'Ctrl+C'),
    //     when: () => eventLists.hasSelection,
    //     onClick: () => eventLists.copy(),
    // },
    // {
    //     label: 'Paste',
    //     icon: <i className="fa-solid fa-paste" />,
    //     shortcut: shortcut('⌘V', 'Ctrl+V'),
    //     when: () => eventLists.canPaste(),
    //     onClick: () => eventLists.paste(),
    // },
    // {
    //     label: 'Duplicate',
    //     icon: <i className="fa-solid fa-clone" />,
    //     shortcut: shortcut('⌘D', 'Ctrl+D'),
    //     when: () => eventLists.hasSelection,
    //     onClick: () => eventLists.duplicate(),
    // },
    // {
    //     label: 'Clone',
    //     icon: <i className="fa-solid fa-layer-group" />,
    //     shortcut: shortcut('⌘', 'Ctrl+D'),
    //     when: () => eventLists.hasSelection,
    //     onClick: () => eventLists.clone(),
    // },

    ...EditBarConfig,

    { type: 'divider' },

    ...GroupBarConfig,

    // {
    //     label: 'Group',
    //     icon: <i className="fa-solid fa-object-group" />,
    //     shortcut: shortcut('⌘G', 'Ctrl+G'),
    //     when: () => eventLists.hasMultipleSelection(),
    //     onClick: () => eventLists.groupLayers(),
    // },
    // {
    //     label: 'Ungroup',
    //     icon: <i className="fa-solid fa-object-ungroup" />,
    //     shortcut: shortcut('⌘⇧G', 'Ctrl+Shift+G'),
    //     when: () => eventLists.isGroupSelected(),
    //     onClick: () => eventLists.ungroupSelected(),
    // },

    { type: 'divider' },

    ...LockBarConfig,
    // {
    //     label: 'Delete',
    //     icon: <i className="fa-solid fa-trash" />,
    //     shortcut: shortcut('⌫', 'Del'),
    //     when: () => eventLists.hasSelection,
    //     onClick: () => eventLists.removeLayer(),
    // },
    // ]
];

// commands.js
export const commandRegistry = [
    ...FileBarConfig,
    ...EditBarConfig,
    ...GroupBarConfig,
    ...LockBarConfig,
    ...ZoomBarConfig,
    ...UndoRedoBarConfig,
];
