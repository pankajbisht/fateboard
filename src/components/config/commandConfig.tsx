// commands.js
export const commandRegistry = [
    {
        id: 'newfile',
        description: 'New File',
        shortcut: ['Meta+n', 'Ctrl+n'],
        handler: ({ get, set }) => {
            const { clearBoard } = get();
            clearBoard();
        },
    },
    {
        id: 'copy',
        description: 'Copy selected object',
        shortcut: ['Meta+c', 'Ctrl+c'],
        handler: ({ get, set }) => {
            const { copy } = get();
            copy();
        },
    },
    {
        id: 'paste',
        description: 'Paste object',
        shortcut: ['Meta+v', 'Ctrl+v'],
        handler: ({ get, set }) => {
            const { paste } = get();
            paste();
        },
    },
    {
        id: 'duplicate',
        description: 'Duplicate object',
        shortcut: ['Meta+D', 'Ctrl+D'],
        handler: ({ get, set }) => {
            const { duplicate } = get();
            duplicate();
        },
    },
    {
        id: 'delete',
        description: 'Delete selected object',
        shortcut: ['Delete', 'Backspace'],
        handler: ({ get, set }) => {
            const { removeLayer } = get();
            removeLayer();
        },
    },
    {
        id: 'group',
        description: 'Group selected object',
        shortcut: ['Meta+G', 'Ctrl+G'],
        handler: ({ get, set }) => {
            const { groupLayers } = get();
            groupLayers();
        },
    },
    {
        id: 'ungroup',
        description: 'Ungroup selected object',
        shortcut: ['Meta+Shift+U', 'Ctrl+Shift+U'],
        handler: ({ get, set }) => {
            const { ungroupSelected } = get();
            ungroupSelected();
        },
    },
    {
        id: 'undo',
        description: 'Undo',
        shortcut: ['Meta+Z', 'Ctrl+Z'],
        handler: ({ get, set }) => {
            const { undo } = get();
            undo();
        },
    },
    {
        id: 'redo',
        description: 'Redo',
        shortcut: ['Meta+Shift+Z', 'Ctrl+Y'],
        handler: ({ get, set }) => {
            const { redo } = get();
            redo();
        },
    },
];
