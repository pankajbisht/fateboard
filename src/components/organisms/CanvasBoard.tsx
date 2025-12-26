import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import db from 'opendb-store';

import { useStore } from '@store';
import { useKeyboardShortcuts } from '../../hooks';
import { FloatingTextToolbar } from './FloatingTextToolbar.tsx';
import { logger } from '../../lib/utils/logger.ts';
import { MultiStopGradientTool } from '../../lib/utils/GradientTool.ts';

export const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

export const shortcut = (mac: string, win: string) => (isMac ? mac : win);

export function CanvasBoard() {
    const canvasRef = useRef(null);
    const geditorRef = useRef<MultiStopGradientTool | null>(null);
    const { init, selectedObject, canvas, openMenu, fill } = useStore();
    const eventLists = useStore();
    useKeyboardShortcuts();

    useEffect(() => {
        if (canvasRef.current) {
            init(canvasRef.current);
            geditorRef.current = new MultiStopGradientTool(canvas, () => fill);
        }

        return () => {
            if (canvas) {
                canvas.dispose();
                geditorRef.current?.disable();
                geditorRef.current = null;
            }
        };
    }, [init]);

    const onRightClick = (e) => {
        e.preventDefault();

        openMenu(e.clientX, e.clientY, [
            {
                label: 'Copy',
                icon: <i className="fa-solid fa-copy" />,
                shortcut: shortcut('⌘C', 'Ctrl+C'),
                when: () => eventLists.hasSelection,
                onClick: () => eventLists.copy(),
            },
            {
                label: 'Paste',
                icon: <i className="fa-solid fa-paste" />,
                shortcut: shortcut('⌘V', 'Ctrl+V'),
                when: () => eventLists.canPaste(),
                onClick: () => eventLists.paste(),
            },
            {
                label: 'Duplicate',
                icon: <i className="fa-solid fa-clone" />,
                shortcut: shortcut('⌘D', 'Ctrl+D'),
                when: () => eventLists.hasSelection,
                onClick: () => eventLists.duplicate(),
            },

            { type: 'divider' },

            {
                label: 'Group',
                icon: <i className="fa-solid fa-object-group" />,
                shortcut: shortcut('⌘G', 'Ctrl+G'),
                when: () => eventLists.hasMultipleSelection(),
                onClick: () => eventLists.groupLayers(),
            },
            {
                label: 'Ungroup',
                icon: <i className="fa-solid fa-object-ungroup" />,
                shortcut: shortcut('⌘⇧G', 'Ctrl+Shift+G'),
                when: () => eventLists.isGroupSelected(),
                onClick: () => eventLists.ungroupSelected(),
            },

            { type: 'divider' },

            {
                label: 'Delete',
                icon: <i className="fa-solid fa-trash" />,
                shortcut: shortcut('⌫', 'Del'),
                when: () => eventLists.hasSelection,
                onClick: () => eventLists.removeLayer(),
            },
        ]);
    };

    return (
        <main className="bg-red-500 shadow-lg relative" onContextMenu={onRightClick}>
            <canvas ref={canvasRef} />

            {selectedObject?.type === 'textbox' && canvas && (
                <FloatingTextToolbar
                    target={selectedObject}
                    canvas={canvas}
                    onChange={(style) => {
                        if (selectedObject) {
                            selectedObject.set(style);
                            canvas.requestRenderAll();
                        }
                    }}
                />
            )}
        </main>
    );
}
