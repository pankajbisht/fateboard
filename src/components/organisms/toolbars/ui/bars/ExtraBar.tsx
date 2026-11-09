import { Icon } from '@/components/atoms/Icon';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import { shortcut } from '@/lib/utils/isMac';
import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';

interface ToolbarAction {
    id: string;
    label: string;
    shortcut?: string;
    icon: React.ReactNode;
    active?: boolean;
    onClick: () => void;
}

const isTypingTarget = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const ExtraBar = () => {
    const navigate = useNavigate();

    const gridEnabled = useStore((s) => s.gridEnabled);
    const snapEnabled = useStore((s) => s.snapEnabled);
    const toggleGrid = useStore((s) => s.toggleGrid);
    const toggleSnap = useStore((s) => s.toggleSnap);

    /* ------------------------------- Shortcuts ------------------------------- */
    // Ctrl/⌘ + '  → grid      Ctrl/⌘ + ;  → snap
    // (The old Ctrl+L label had no handler, and Ctrl+L is the browser's address-bar key.)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
            if (isTypingTarget(e.target) || canvasKeysBlocked()) return;

            if (e.key === "'") {
                e.preventDefault();
                toggleGrid();
            } else if (e.key === ';') {
                e.preventDefault();
                toggleSnap();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [toggleGrid, toggleSnap]);

    /* -------------------------------- Actions -------------------------------- */

    const actions = useMemo<ToolbarAction[]>(
        () => [
            {
                id: 'grid',
                label: gridEnabled ? 'Hide grid' : 'Show grid',
                shortcut: shortcut("⌘'", "Ctrl+'"),
                icon: <Icon name="table-cells-large" />,
                active: gridEnabled,
                onClick: toggleGrid,
            },
            {
                id: 'snap',
                label: snapEnabled ? 'Snap: on (hold Alt to bypass)' : 'Snap: off',
                shortcut: shortcut('⌘;', 'Ctrl+;'),
                icon: <Icon name="magnet" />,
                active: snapEnabled,
                onClick: toggleSnap,
            },
            {
                id: 'settings',
                label: 'Settings',
                icon: <Icon name="gear" />,
                onClick: () => navigate('/setting'),
            },
            // Share / Preview removed until there is a backend: the link only ever worked in this
            // browser (BUG-028, decision Q6)
            {
                id: 'help',
                label: 'Help',
                icon: <Icon name="circle-question" />,
                onClick: () => navigate('/help'),
            },
        ],
        [gridEnabled, snapEnabled, toggleGrid, toggleSnap, navigate],
    );

    return (
        <>
            <ul className="flex items-center gap-0.5">
                {actions.map((action) => (
                    <li
                        key={action.id}
                        data-active={action.active ? 'true' : undefined}
                        className="rounded-md data-[active=true]:bg-surface-strong"
                    >
                        <Tooltip
                            position="bottom"
                            content={
                                <div className="flex flex-col">
                                    <span>{action.label}</span>
                                    {action.shortcut && (
                                        <span className="text-xs text-ink-muted">
                                            {action.shortcut}
                                        </span>
                                    )}
                                </div>
                            }
                        >
                            <IconButton
                                icon={action.icon}
                                aria-label={action.label}
                                aria-pressed={action.active}
                                onClick={action.onClick}
                                size="chrome"
                            />
                        </Tooltip>
                    </li>
                ))}
            </ul>
        </>
    );
};

export { ExtraBar };
