import type { IconName } from '@/components/atoms/Icon';
import type { ReactNode } from 'react';

export type EditorTool = 'select' | 'pan' | 'draw' | 'node' | 'text';

export type SidebarActionItem = {
    id: EditorTool;
    label: string;
    icon: IconName;
    kind: 'action';
    /** Keyboard shortcut shown in the tooltip, e.g. 'V'. */
    shortcut?: string;
    disabled?: boolean;
};

export type SidebarPanelItem = {
    id: string;
    label: string;
    icon: IconName;
    kind: 'panel';
    panel: ReactNode;
    activateTool?: EditorTool;
    shortcut?: string;
    fullSize?: boolean;
    disabled?: boolean;
};

export type SidebarItem = SidebarActionItem | SidebarPanelItem;

export interface EditorSidebarProps {
    items: SidebarItem[];
    initialActiveId?: string;
    railWidth?: number;
    panelWidth?: number;
    defaultExpanded?: boolean;
    className?: string;
    onActiveChange?: (id: string | null) => void;
    onToolChange?: (tool: EditorTool) => void;
    /**
     * The canvas tool from the store. When given, tool buttons light up from it (it also changes
     * through Escape, shortcuts and double-click), and panel buttons only while their panel is open.
     */
    activeTool?: string;
}
