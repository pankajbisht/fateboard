import { Icon } from '@/components/atoms/Icon';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from 'opendb-store';
import { useStore } from '@/store';
import { shortcut } from '@/lib/utils/isMac';
import Toast from '@/components/atoms/Toast';
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

interface ToastState {
    id: number;
    message: string;
}

const createBoardId = (): string =>
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const isTypingTarget = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const ExtraBar = () => {
    const navigate = useNavigate();

    const canvas = useStore((s) => s.canvas);
    const gridEnabled = useStore((s) => s.gridEnabled);
    const snapEnabled = useStore((s) => s.snapEnabled);
    const toggleGrid = useStore((s) => s.toggleGrid);
    const toggleSnap = useStore((s) => s.toggleSnap);

    // Lazy init: created once per mount (the old useRef(crypto.randomUUID()) ran on every render).
    const [boardId] = useState(createBoardId);
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = useCallback((message: string) => {
        // New id => Toast remounts, so the same message can show twice in a row.
        setToast({ id: Date.now(), message });
    }, []);

    /* ------------------------------- Shortcuts ------------------------------- */
    // Ctrl/⌘ + '  → grid      Ctrl/⌘ + ;  → snap
    // (The old Ctrl+L label had no handler, and Ctrl+L is the browser's address-bar key.)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
            if (isTypingTarget(e.target)) return;

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

    /* --------------------------------- Share --------------------------------- */

    const handleShare = useCallback(async () => {
        if (!canvas) {
            showToast('Canvas is not ready yet');
            return;
        }

        const link = `${window.location.origin}/share/${boardId}?mode=view`;

        let saved: Promise<boolean>;
        try {
            const payload = {
                id: boardId,
                version: 1,
                canvasJSON: canvas.toJSON(),
                updatedAt: Date.now(),
            };
            saved = Promise.resolve(db.local.set(`board:${boardId}`, JSON.stringify(payload))).then(
                () => true,
                () => false,
            );
        } catch (error) {
            console.error('[ExtraBar] Failed to prepare preview', error);
            showToast('Could not create preview');
            return;
        }

        // Start the clipboard write and open the tab synchronously, so both stay inside the click gesture.
        const copied = navigator.clipboard?.writeText
            ? navigator.clipboard.writeText(link).then(
                  () => true,
                  () => false,
              )
            : Promise.resolve(false);

        window.open(link, '_blank', 'noopener,noreferrer');

        const [didSave, didCopy] = await Promise.all([saved, copied]);

        if (!didSave) {
            showToast('Preview data could not be saved. Storage may be full.');
        } else if (didCopy) {
            showToast('Preview opened in new tab & link copied!');
        } else {
            showToast('Preview opened in new tab');
        }
    }, [canvas, boardId, showToast]);

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
            {
                id: 'preview',
                label: 'Preview',
                icon: <Icon name="share-from-square" />,
                onClick: () => void handleShare(),
            },
            {
                id: 'help',
                label: 'Help',
                icon: <Icon name="circle-question" />,
                onClick: () => navigate('/help'),
            },
        ],
        [gridEnabled, snapEnabled, toggleGrid, toggleSnap, navigate, handleShare],
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

            {toast && (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    onClose={() => setToast(null)}
                    duration={2000}
                />
            )}
        </>
    );
};

export { ExtraBar };
