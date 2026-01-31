import React, { useEffect, useRef, useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { TabsLayout } from './tabs';
import { TABS_CONFIG } from '../config/tabs.config';
import { DockPanel } from './DockPanel';

const SNAP_POINTS = [160, 240, 320, 400];

type PanelState = {
    scrollTop: number;
};

type PanelMemory = Record<string, PanelState>;

export const DockRoot = () => {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState<string>('props');

    const panelMemory = useRef<PanelMemory>({
        props: { scrollTop: 0 },
        layers: { scrollTop: 0 },
        assets: { scrollTop: 0 },
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    // restore scroll when panel changes
    useEffect(() => {
        if (!open) return;
        const mem = panelMemory.current[active];
        if (scrollRef.current && mem) {
            scrollRef.current.scrollTop = mem.scrollTop;
        }
    }, [active, open]);

    return (
        <aside className="flex h-full">
            <DockPanel
                open={open}
                onToggle={() => setOpen((o) => !o)}
                scrollRef={scrollRef}
                onScrollSave={(scrollTop) => {
                    panelMemory.current[active].scrollTop = scrollTop;
                }}
            >
                <TabsLayout tabs={TABS_CONFIG} defaultTab="effects" />
            </DockPanel>

            <ColorPicker />
        </aside>
    );
};
