import React from 'react';
import clsx from 'clsx';
import {
    SIDE_PANEL_WIDTH,
    dockPanelSize,
    panelInner,
    sidePanelFrame,
    phoneSheet,
    phoneSheetClosed,
} from './sidebar/sidebar.const';

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
    // below lg the panel overlays the canvas, positioned against the whole dock (DockRoot `relative`)
    <div className="flex h-full lg:relative">
        <div
            data-testid="dock-panel"
            aria-hidden={!open}
            inert={!open}
            className={clsx(
                sidePanelFrame,
                dockPanelSize,
                phoneSheet,
                open ? 'border-l max-lg:shadow-xl' : phoneSheetClosed,
            )}
            style={
                {
                    '--panel-w': `${open ? width : 0}px`,
                    '--panel-full': `${width}px`,
                    minWidth: 0,
                } as React.CSSProperties
            }
        >
            <div className={panelInner}>{children}</div>
        </div>
    </div>
);
