import { useCallback, useEffect, useMemo, useState } from 'react';
import { SidebarPanel, SidebarRail } from '../../sidebar';
import type { EditorSidebarProps, SidebarItem } from '../editorsidebar.type';

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
            }

            if (sameItem && expanded) {
                setExpanded(false);
                return;
            }

            setExpanded(true);
        },
        [activeId, expanded, notifyActiveChange, onToolChange],
    );

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
                'relative z-20 flex h-full min-h-0 min-w-0 shrink-0 bg-surface max-sm:h-auto max-sm:w-full',
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
                              item.kind === 'action'
                                  ? item.id === activeTool
                                  : (item.id === activeId && expanded) ||
                                    (!!item.activateTool &&
                                        item.activateTool === activeTool &&
                                        // Brush and Draw share the Draw tool: only the one in use lights up
                                        (activePanel?.activateTool !== activeTool ||
                                            item.id === activeId))
                }
                expanded={expanded && activePanel !== null}
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
