import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SidebarPanel, SidebarRail } from '../../sidebar';
import type {
    EditorSidebarProps,
    EditorTool,
    SidebarItem,
    SidebarPanelItem,
} from '../editorsidebar.type';

/**
 * The canvas tool a panel works with: its own (`activateTool`, e.g. Brush = draw) or Select, so objects a panel
 * inserts (shapes, notes, characters) can be moved. Text is a one-shot action that leaves Select on.
 */
const panelTool = (panel: SidebarPanelItem): EditorTool =>
    panel.activateTool && panel.activateTool !== 'text' ? panel.activateTool : 'select';

export function EditorSidebar({
    items,
    initialActiveId = 'select',
    railWidth = 52,
    panelWidth = 280,
    defaultExpanded = true,
    className = '',
    onActiveChange,
    onToolChange,
    activeTool,
}: EditorSidebarProps) {
    const initialItem = useMemo(
        () =>
            items.find((item) => item.id === initialActiveId && !item.disabled) ??
            items.find((item) => !item.disabled) ??
            null,
        [items, initialActiveId],
    );

    const [activeId, setActiveId] = useState<string | null>(() => initialItem?.id ?? null);

    const [expanded, setExpanded] = useState(
        () => defaultExpanded && initialItem?.kind === 'panel',
    );

    const activeItem = items.find((item) => item.id === activeId && !item.disabled) ?? null;

    const activePanel = activeItem?.kind === 'panel' ? activeItem : null;

    const notifyActiveChange = useCallback(
        (id: string | null) => onActiveChange?.(id),
        [onActiveChange],
    );

    // Recover if the active item is removed or becomes disabled.
    useEffect(() => {
        const currentIsValid =
            activeId !== null && items.some((item) => item.id === activeId && !item.disabled);

        if (currentIsValid) return;

        const fallback = items.find((item) => !item.disabled) ?? null;
        const nextId = fallback?.id ?? null;

        setActiveId(nextId);
        setExpanded(fallback?.kind === 'panel' && defaultExpanded);
        notifyActiveChange(nextId);
    }, [items, activeId, defaultExpanded, notifyActiveChange]);

    const handleSelect = useCallback(
        (item: SidebarItem) => {
            if (item.disabled) return;

            const sameItem = activeId === item.id;

            setActiveId(item.id);
            notifyActiveChange(item.id);

            if (item.kind === 'action') {
                setExpanded(false);
                onToolChange?.(item.id);
                return;
            }

            // Run the tool action every time the configured panel is clicked.
            // For Text, this creates a text object without requiring a canvas click.
            if (item.activateTool) {
                onToolChange?.(item.activateTool);
            } else if (activeTool !== undefined && activeTool !== 'select') {
                // one tool at a time: a panel never stays open beside Geometry, Pen, … (they would both light up)
                onToolChange?.('select');
            }

            if (sameItem && expanded) {
                setExpanded(false);
                return;
            }

            setExpanded(true);
        },
        [activeId, activeTool, expanded, notifyActiveChange, onToolChange],
    );

    // A tool picked elsewhere (shortcut, Escape, double-click) that the open panel does not use closes it.
    const lastTool = useRef(activeTool);
    useEffect(() => {
        if (lastTool.current === activeTool) return;
        lastTool.current = activeTool;
        if (activeTool !== undefined && activePanel && activeTool !== panelTool(activePanel)) {
            setExpanded(false);
        }
    }, [activeTool, activePanel]);

    const panelOpen = expanded && activePanel !== null;

    const handleClose = useCallback(() => {
        setExpanded(false);
    }, []);

    const handleToggle = useCallback(() => {
        if (!activePanel) return;
        setExpanded((value) => !value);
    }, [activePanel]);

    return (
        <aside
            aria-label="Editor sidebar"
            className={[
                'relative z-20 flex h-full min-h-0 min-w-0 shrink-0 bg-surface max-sm:static max-sm:h-auto max-sm:w-full',
                className,
            ].join(' ')}
        >
            <SidebarRail
                items={items}
                activeId={activeId}
                isPressed={
                    activeTool === undefined
                        ? undefined
                        : (item) =>
                              panelOpen
                                  ? // an open panel is the only lit button
                                    item.id === activePanel?.id
                                  : item.kind === 'action'
                                    ? item.id === activeTool ||
                                      // Copy is a mode of Spray (its own tool underneath)
                                      (item.id === 'spray' && activeTool === 'copySpray') ||
                                      // Laser is a mode of the Pencil (its own tool underneath)
                                      (item.id === 'pencil' && activeTool === 'laser')
                                    : !!item.activateTool &&
                                      item.activateTool === activeTool &&
                                      // panels sharing a tool: only the one in use lights up
                                      (activePanel?.activateTool !== activeTool ||
                                          item.id === activeId)
                }
                expanded={panelOpen}
                canExpand={activePanel !== null}
                width={Math.max(44, railWidth)}
                onSelect={handleSelect}
                onToggle={handleToggle}
            />

            <SidebarPanel
                item={activePanel}
                expanded={expanded}
                width={Math.max(220, panelWidth)}
                onClose={handleClose}
            />
        </aside>
    );
}
