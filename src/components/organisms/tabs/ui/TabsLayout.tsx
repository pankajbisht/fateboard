import { useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Tooltip } from '@/components/molecules/Tooltip';
// import { MoreHorizontal, X } from "lucide-react";

type TabConfig = {
    id: string;
    label: string;
    // icon?: React.ComponentType<{ size?: number }>;
    icon?: string;
    closable?: boolean;
    content: () => JSX.Element;
};

function Dropdown({
    tabs,
    onSelect,
    onRemove,
}: {
    tabs: TabConfig[];
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    return (
        <details className="relative ml-auto group">
            {/* Trigger */}
            <summary
                className="
          list-none cursor-pointer
          flex items-center justify-center
          h-9 w-9
          rounded-md
          hover:bg-neutral-100
          active:bg-neutral-200
          focus:outline-none
        "
            >
                <i className="fa-solid fa-caret-down text-sm text-neutral-700" />
            </summary>

            {/* Dropdown panel */}
            <div
                className="
          absolute right-0 mt-2
          w-48
          rounded-md
          border border-neutral-200
          bg-white
          shadow-lg
          z-50
          overflow-hidden
        "
            >
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className="
              group/item
              flex items-center justify-between
              px-3 py-2
              text-sm
              hover:bg-neutral-100
            "
                    >
                        {/* Select tab */}
                        <button
                            onClick={() => onSelect(tab.id)}
                            className="
                flex-1 text-left
                truncate
                text-neutral-800
              "
                        >
                            {tab.label}
                        </button>

                        {/* Remove tab */}
                        {tab.closable && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(tab.id);
                                }}
                                className="
                  ml-2
                  h-6 w-6
                  flex items-center justify-center
                  rounded
                  text-neutral-400
                  opacity-0
                  group-hover/item:opacity-100
                  hover:bg-neutral-200
                  hover:text-neutral-700
                "
                                aria-label="Remove tab"
                            >
                                <i className="fa-solid fa-xmark text-xs" />
                            </button>
                        )}
                    </div>
                ))}

                {tabs.length === 0 && (
                    <div className="px-3 py-2 text-sm text-neutral-400">No hidden tabs</div>
                )}
            </div>
        </details>
    );
}

export function TabsLayout({
    tabs: initialTabs,
    defaultTab,
}: {
    tabs: readonly TabConfig[];
    defaultTab?: string;
}) {
    const [tabs, setTabs] = useState<TabConfig[]>([...initialTabs]);
    const [activeTab, setActiveTab] = useState(defaultTab ?? initialTabs[0].id);

    // console.log('activeTab', activeTab);

    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);

    const [visible, setVisible] = useState<TabConfig[]>([]);
    const [hidden, setHidden] = useState<TabConfig[]>([]);

    // 🔥 Remove tab safely
    const removeTab = (id: string) => {
        setTabs((prev) => {
            const index = prev.findIndex((t) => t.id === id);
            const next = prev.filter((t) => t.id !== id);

            if (id === activeTab) {
                const fallback = next[index] ?? next[index - 1] ?? next[0];

                if (fallback) setActiveTab(fallback.id);
            }

            return next;
        });
    };

    useLayoutEffect(() => {
        if (!containerRef.current || !measureRef.current) return;

        const containerWidth = containerRef.current.offsetWidth;
        const nodes = Array.from(measureRef.current.children) as HTMLDivElement[];

        const MIN_VISIBLE = 4; // minimum tabs to always show
        const v: TabConfig[] = [];
        const h: TabConfig[] = [];

        let used = 0;

        tabs.forEach((tab, i) => {
            const w = nodes[i].offsetWidth;
            const dropdownWidth = h.length > 0 ? 40 : 0;

            if (used + w + dropdownWidth <= containerWidth || v.length < MIN_VISIBLE) {
                // always allow at least MIN_VISIBLE tabs
                v.push(tab);
                used += w;
            } else {
                h.push(tab);
            }
        });

        // ensure active tab visible
        if (h.some((t) => t.id === activeTab)) {
            const active = h.find((t) => t.id === activeTab)!;
            h.splice(h.indexOf(active), 1);

            // move last visible tab to hidden to make space
            if (v.length > 0) {
                h.unshift(v.pop()!);
            }

            v.push(active);
        }

        setVisible(v);
        setHidden(h);
    }, [tabs, activeTab]);

    const active = tabs.find((t) => t.id === activeTab);

    return (
        <div className="flex flex-col w-full">
            {/* TAB BAR */}
            <div ref={containerRef} className="flex items-center border-b px-2">
                {visible.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.id === activeTab;

                    // console.log('here....', tab.id, activeTab);

                    return (
                        <div
                            key={tab.id}
                            className={clsx(
                                'group flex items-center gap-2 px-3 py-1',
                                isActive
                                    ? 'text-blue-600 bg-stone-200'
                                    : 'text-neutral-500 hover:text-neutral-700',
                            )}
                        >
                            <Tooltip content={tab.label} position="bottom">
                                <button onClick={() => setActiveTab(tab.id)}>
                                    <i className={clsx(Icon)}></i>
                                </button>
                            </Tooltip>

                            {tab.closable && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeTab(tab.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>
                    );
                })}

                {hidden.length > 0 && (
                    <Dropdown tabs={hidden} onSelect={setActiveTab} onRemove={removeTab} />
                )}
            </div>

            {/* CONTENT */}
            <div className="flex-1 px-2 py-1">{active && <active.content />}</div>

            {/* MEASURE */}
            <div ref={measureRef} className="absolute invisible whitespace-nowrap">
                {tabs.map((tab) => (
                    <div key={tab.id} className="px-3 py-2 text-sm">
                        {tab.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
