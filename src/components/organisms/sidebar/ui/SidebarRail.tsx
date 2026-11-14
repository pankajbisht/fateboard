import { Icon } from '@/components/atoms/Icon';
import {
    activeButton,
    buttonBase,
    inactiveButton,
    railButtonBase,
    phoneActiveBar,
    phoneRailBar,
    railWidthCss,
    sideRail,
} from '../sidebar.const';
import type { SidebarItem } from '../../editorsidebar/editorsidebar.type';

interface SidebarRailProps {
    items: SidebarItem[];
    activeId: string | null;
    /** Pressed state per item; default = the last clicked item (`activeId`). */
    isPressed?: (item: SidebarItem) => boolean;
    expanded: boolean;
    canExpand: boolean;
    width: number;
    onSelect: (item: SidebarItem) => void;
    onToggle: () => void;
}

export function SidebarRail({
    items,
    activeId,
    isPressed,
    expanded,
    canExpand,
    width,
    onSelect,
    onToggle,
}: SidebarRailProps) {
    return (
        <nav
            aria-label="Editor tools and panels"
            style={{ width: railWidthCss(width) }}
            // upright phones: a bar under the board that scrolls sideways
            className={`${sideRail} overflow-y-auto border-r ${phoneRailBar} max-sm:overflow-x-auto max-sm:overflow-y-hidden`}
        >
            {items.map((item) => {
                const active = isPressed ? isPressed(item) : activeId === item.id;

                return (
                    <button
                        key={item.id}
                        type="button"
                        title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
                        aria-label={item.label}
                        aria-pressed={active}
                        disabled={item.disabled}
                        onClick={() => onSelect(item)}
                        className={[railButtonBase, active ? activeButton : inactiveButton].join(
                            ' ',
                        )}
                    >
                        {active && (
                            <span
                                aria-hidden="true"
                                className={`absolute left-0 top-2 h-6 w-[3px] rounded-r bg-primary-600 ${phoneActiveBar}`}
                            />
                        )}

                        <Icon name={item.icon} />
                    </button>
                );
            })}

            <div className="flex-1" />

            <button
                type="button"
                title={expanded ? 'Collapse sidebar panel' : 'Expand sidebar panel'}
                aria-label={expanded ? 'Collapse sidebar panel' : 'Expand sidebar panel'}
                aria-expanded={expanded}
                disabled={!canExpand}
                onClick={onToggle}
                className={`${buttonBase} size-[var(--ui-btn)] shrink-0 text-ink-muted hover:bg-surface-muted hover:text-ink`}
            >
                <Icon
                    name="chevron-left"
                    className={[
                        'text-xs transition-transform duration-200',
                        'motion-reduce:transition-none',
                        expanded ? '' : 'rotate-180',
                    ].join(' ')}
                />
            </button>
        </nav>
    );
}
