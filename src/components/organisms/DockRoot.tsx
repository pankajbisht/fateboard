import { useLayoutEffect, useRef, useState } from 'react';
import { ColorPicker, PaletteTools, RecentColors } from './ColorPicker';
import { TabsRail, type TabConfig } from './tabs';
import { TABS_CONFIG } from '../config/tabs.config';
import { DockPanel } from './DockPanel';
import { SIDE_PANEL_WIDTH } from './sidebar/sidebar.const';
import { PanelLayout } from '../templates/PanelLayout';

export const DockRoot = () => {
    const [tabs, setTabs] = useState<TabConfig[]>([...TABS_CONFIG]);
    // a link from Help can name the tab to open (/draw?tab=export): read once, when the dock mounts
    const [linkedTab] = useState(() => {
        const id = new URLSearchParams(window.location.search).get('tab');
        return TABS_CONFIG.find((t) => t.id === id)?.id;
    });
    const [active, setActive] = useState<string>(linkedTab ?? 'effects');
    const [open, setOpen] = useState(!!linkedTab);
    const width = SIDE_PANEL_WIDTH; // fixed: the resize handle was removed

    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollMemory = useRef<Record<string, number>>({});

    // restore scroll position per tab
    useLayoutEffect(() => {
        if (open && scrollRef.current) {
            scrollRef.current.scrollTop = scrollMemory.current[active] ?? 0;
        }
    }, [active, open]);

    const selectTab = (id: string) => {
        if (id === active && open) {
            setOpen(false); // clicking the active tab collapses the panel
        } else {
            setActive(id);
            setOpen(true);
        }
    };

    const removeTab = (id: string) => {
        const index = tabs.findIndex((t) => t.id === id);
        const next = tabs.filter((t) => t.id !== id);

        if (id === active) {
            const fallback = next[index] ?? next[index - 1] ?? next[0];
            if (fallback) setActive(fallback.id);
        }
        if (next.length === 0) setOpen(false);
        setTabs(next);
    };

    const activeTab = tabs.find((t) => t.id === active);

    return (
        // upright phones: tabs and colors are horizontal bars under the board (BUG-219)
        <aside className="relative flex h-full max-sm:h-auto max-sm:w-full max-sm:flex-col">
            <DockPanel open={open} width={width}>
                {activeTab && (
                    <PanelLayout
                        title={activeTab.label}
                        icon={activeTab.icon}
                        onClose={() => setOpen(false)}
                        fullSize={activeTab.fullSize}
                        scrollRef={scrollRef}
                        onScroll={(e) => {
                            scrollMemory.current[active] = e.currentTarget.scrollTop;
                        }}
                    >
                        <activeTab.content />
                    </PanelLayout>
                )}
            </DockPanel>

            <TabsRail
                tabs={tabs}
                activeTab={active}
                panelOpen={open}
                onSelect={selectTab}
                onRemove={removeTab}
                onTogglePanel={() => setOpen((o) => !o)}
            />

            {/* two columns; one row on an upright phone (`contents` keeps the desktop layout as is) */}
            <div className="contents max-sm:flex max-sm:min-w-0 max-sm:border-t max-sm:border-line">
                <div
                    data-testid="dock-tools"
                    className="flex min-h-0 flex-col items-center gap-[3px] overflow-y-auto border-l border-line bg-surface px-[3px] py-[3px] [scrollbar-width:none] max-sm:max-w-[40%] max-sm:shrink-0 max-sm:flex-row max-sm:overflow-x-auto max-sm:overflow-y-hidden max-sm:border-l-0 max-sm:border-r"
                >
                    <PaletteTools />

                    <RecentColors />
                </div>

                <div className="min-h-0 shrink-0 overflow-y-auto overflow-x-hidden bg-surface p-[3px] [scrollbar-width:thin] max-sm:min-w-0 max-sm:flex-1 max-sm:shrink max-sm:overflow-x-auto max-sm:overflow-y-hidden">
                    <ColorPicker />
                </div>
            </div>
        </aside>
    );
};
