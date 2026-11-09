import React from 'react';
import clsx from 'clsx';
import { SIDE_PANEL_WIDTH, sidePanelFrame } from './sidebar/sidebar.const';

/**
 * The right dock's panel frame (opens to the left of the dock rail). Collapsing is done from the
 * rail; the old drag-to-resize handle was removed, so the width is fixed.
 */
export const DockPanel = ({
    open,
    width = SIDE_PANEL_WIDTH,
    children,
}: {
    open: boolean;
    width?: number;
    children: React.ReactNode;
}) => (
    <div className="relative flex h-full">
        <div
            data-testid="dock-panel"
            aria-hidden={!open}
            inert={!open}
            className={clsx(sidePanelFrame, open && 'border-l')}
            style={{ width: open ? width : 0, minWidth: 0 }}
        >
            <div
                style={{ width }} // fixed inner width -> no reflow while animating
                className="h-full"
            >
                {children}
            </div>
        </div>
    </div>
);
