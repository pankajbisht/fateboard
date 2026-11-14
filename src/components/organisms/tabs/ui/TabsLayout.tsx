import type { IconName } from '@/components/atoms/Icon';
import { Icon } from '@/components/atoms/Icon';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import clsx from 'clsx';
import { Tooltip } from '@/components/molecules/Tooltip';
import { useRailButtonPx } from '@hooks/useRailButtonPx';
import {
    railWidthCss,
    activeButton,
    buttonBase,
    inactiveButton,
    railButtonBase,
    sideRail,
    phoneActiveBar,
    phoneRailBar,
} from '../../sidebar/sidebar.const';

export type TabConfig = {
    id: string;
    label: string;
    icon?: IconName;
    closable?: boolean;
    /** The panel scrolls itself (galleries): PanelLayout adds no scroll or padding. */
    fullSize?: boolean;
    content: () => ReactElement;
};

// ── Size system (single source of truth) ─────────────────────────
// Rail width and button size follow Settings > Icon size (CSS vars, same as the left rail).
const ITEM_CSS = 'var(--ui-rail-btn)';
const GAP = 4; // gap-1
const MIN_VISIBLE = 3;

function MoreMenu({
    tabs,
    activeTab,
    onSelect,
    onRemove,
}: {
    tabs: TabConfig[];
    activeTab: string;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    const ref = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                ref.current.removeAttribute('open');
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <details ref={ref} className="relative">
            <summary
                style={{ width: ITEM_CSS, height: ITEM_CSS }}
                className="flex cursor-pointer list-none items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-strong/70 hover:text-ink focus:outline-none [&::-webkit-details-marker]:hidden"
                aria-label="More tabs"
            >
                <Icon name="ellipsis" className="text-[13px]" />
            </summary>

            <div className="absolute bottom-0 right-full z-50 mr-2 w-48 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl max-sm:bottom-full max-sm:right-0 max-sm:mb-2 max-sm:mr-0">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={clsx(
                            'group/item flex items-center justify-between rounded-lg px-2 py-1.5 text-xs',
                            tab.id === activeTab
                                ? 'bg-primary-50 text-primary-ink'
                                : 'text-ink hover:bg-surface-muted',
                        )}
                    >
                        <button
                            onClick={() => {
                                onSelect(tab.id);
                                ref.current?.removeAttribute('open');
                            }}
                            className="flex flex-1 items-center gap-2 truncate text-left"
                        >
                            {tab.icon && <Icon name={tab.icon} className="w-4 text-[12px]" />}
                            {tab.label}
                        </button>

                        {tab.closable && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(tab.id);
                                }}
                                className="ml-2 flex h-5 w-5 items-center justify-center rounded text-ink-subtle opacity-0 hover:bg-surface-strong hover:text-ink group-hover/item:opacity-100 [@media(hover:none)]:opacity-100"
                                aria-label={`Close ${tab.label}`}
                            >
                                <Icon name="xmark" className="text-[10px]" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </details>
    );
}

export function TabsRail({
    tabs,
    activeTab,
    panelOpen,
    onSelect,
    onRemove,
    onTogglePanel,
}: {
    tabs: TabConfig[];
    activeTab: string;
    panelOpen: boolean;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    /** Bottom chevron, same as the left rail's collapse button. */
    onTogglePanel?: () => void;
}) {
    const itemPx = useRailButtonPx();
    const [areaLength, setAreaLength] = useState(0);
    const areaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = areaRef.current;
        if (!el) return;
        // tabs run down the rail, or across it as a bar on an upright phone (BUG-219)
        const measure = () =>
            setAreaLength(
                getComputedStyle(el).flexDirection.startsWith('row')
                    ? el.clientWidth
                    : el.clientHeight,
            );
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        measure();
        return () => ro.disconnect();
    }, []);

    const { visible, hidden } = useMemo(() => {
        const fitsAll = Math.floor((areaLength + GAP) / (itemPx + GAP));

        if (areaLength === 0 || tabs.length <= fitsAll) {
            return { visible: tabs, hidden: [] as TabConfig[] };
        }

        const count = Math.max(MIN_VISIBLE, fitsAll - 1); // reserve a slot for "more"
        const v = tabs.slice(0, count);
        const h = tabs.slice(count);

        // keep the active tab visible
        const idx = h.findIndex((t) => t.id === activeTab);
        if (idx !== -1) {
            const [activeItem] = h.splice(idx, 1);
            const bumped = v.pop();
            if (bumped) h.unshift(bumped);
            v.push(activeItem);
        }

        return { visible: v, hidden: h };
    }, [tabs, activeTab, areaLength, itemPx]);

    return (
        // a toolbar of panel toggles (it also holds close / more / collapse buttons, which a
        // tablist may not contain: axe aria-required-children)
        <div
            role="toolbar"
            aria-label="Dock panels"
            aria-orientation="vertical"
            style={{ width: railWidthCss() }}
            className={`${sideRail} border-l ${phoneRailBar}`}
        >
            <div
                ref={areaRef}
                className="flex min-h-0 w-full flex-1 flex-col items-center max-sm:min-w-0 max-sm:flex-row"
                style={{ gap: GAP }}
            >
                {visible.map((tab) => {
                    // highlighted only while its panel is actually showing
                    const isActive = tab.id === activeTab && panelOpen;

                    return (
                        <div
                            key={tab.id}
                            className="group relative flex w-full justify-center"
                            style={{ height: ITEM_CSS }}
                        >
                            <Tooltip content={tab.label} position="left">
                                <button
                                    type="button"
                                    aria-pressed={isActive}
                                    aria-label={tab.label}
                                    onClick={() => onSelect(tab.id)}
                                    className={clsx(
                                        railButtonBase,
                                        isActive ? activeButton : inactiveButton,
                                    )}
                                >
                                    {/* same accent bar as the left rail, mirrored to the outer (right) edge */}
                                    {isActive && (
                                        <span
                                            aria-hidden="true"
                                            className={`absolute right-0 top-2 h-6 w-[3px] rounded-l bg-primary-600 ${phoneActiveBar}`}
                                        />
                                    )}
                                    <Icon name={tab.icon} />
                                </button>
                            </Tooltip>

                            {tab.closable && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(tab.id);
                                    }}
                                    className="absolute left-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-line-strong text-[7px] text-ink opacity-0 transition-opacity hover:bg-danger hover:text-white group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                                    aria-label={`Close ${tab.label}`}
                                >
                                    <Icon name="xmark" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {hidden.length > 0 && (
                    <div className="mt-auto">
                        <MoreMenu
                            tabs={hidden}
                            activeTab={activeTab}
                            onSelect={onSelect}
                            onRemove={onRemove}
                        />
                    </div>
                )}
            </div>

            {onTogglePanel && (
                <button
                    type="button"
                    title={panelOpen ? 'Collapse dock panel' : 'Expand dock panel'}
                    aria-label={panelOpen ? 'Collapse dock panel' : 'Expand dock panel'}
                    aria-expanded={panelOpen}
                    disabled={tabs.length === 0}
                    onClick={onTogglePanel}
                    className={`${buttonBase} mt-1 size-[var(--ui-btn)] shrink-0 text-ink-muted hover:bg-surface-muted hover:text-ink`}
                >
                    <Icon
                        name="chevron-right"
                        className={clsx(
                            'text-xs transition-transform duration-200 motion-reduce:transition-none',
                            !panelOpen && 'rotate-180',
                        )}
                    />
                </button>
            )}
        </div>
    );
}
