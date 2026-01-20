import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { shortcut } from '@/lib/utils/isMac';
import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import Toast from '@/components/atoms/Toast';
import db from 'opendb-store';

const ExtraBar = () => {
    const canvas = useStore((state) => state.canvas);
    const iconSize = useStore((state) => state.settings.iconSize);
    const navigate = useNavigate();
    const boardIdRef = useRef<string>(crypto.randomUUID());

    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg: string) => {
        setToastMessage(msg);
    };

    // Fixed handleShareClick to use showToast callback
    // const handleShareClick = (canvas: fabric.Canvas) => {
    //     if (!canvas) return;

    //     const docId = crypto.randomUUID();

    //     const payload = {
    //         id: docId,
    //         version: 1,
    //         canvasJSON: canvas.toJSON(),
    //         createdAt: Date.now(),
    //     };

    //     db.local.set(`board:${docId}`, JSON.stringify(payload));

    //     //const link = `${window.location.origin}/share/${docId}?mode=view`;
    //     const link = `${window.location.origin}/#/share/${docId}?mode=view`;

    //     navigator.clipboard.writeText(link);

    //     showToast('Share link copied!'); // Use the callback
    // };
    //
    const handleShareClick = (canvas: fabric.Canvas) => {
        if (!canvas) return;

        const docId = boardIdRef.current;

        const payload = {
            id: docId,
            version: 1,
            canvasJSON: canvas.toJSON(),
            updatedAt: Date.now(),
        };

        db.local.set(`board:${docId}`, JSON.stringify(payload));

        const link = `${window.location.origin}/#/share/${docId}?mode=view`;

        // 🔐 copy link (safe)
        navigator.clipboard?.writeText(link).catch(() => {});

        // 🆕 open immediately (avoids popup block)
        window.open(link, '_blank', 'noopener,noreferrer');

        showToast('Preview opened in new tab & link copied!');
    };

    const LOCK_ACTIONS = [
        {
            id: 'grid',
            label: 'Grid',
            shortcut: shortcut('⌘L', 'Ctrl+L'),
            icon: <i className="fa-solid fa-table-cells-large" />,
            onClick: () => useStore.getState().toggleGrid(),
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: <i className="fa-solid fa-gear"></i>,
            onClick: () => {
                navigate('/setting', true);
            },
        },
        {
            id: 'preview',
            label: 'preview',
            icon: <i className="fa-solid fa-share-from-square"></i>,
            onClick: () => {
                handleShareClick(canvas);
            },
        },
    ];

    return (
        <>
            <ul className="flex items-center gap-1 px-1">
                {LOCK_ACTIONS.map((action) => (
                    <li key={action.id}>
                        <Tooltip
                            position="bottom"
                            content={
                                <div className="flex flex-col">
                                    <span>{action.label}</span>
                                    <span className="text-xs opacity-60">{action.shortcut}</span>
                                </div>
                            }
                        >
                            <IconButton
                                icon={action.icon}
                                title={action.label}
                                aria-label={action.label}
                                onClick={action.onClick}
                                size={iconSize}
                            />
                        </Tooltip>
                    </li>
                ))}
            </ul>

            {/* Only one toast, outside the list */}
            {toastMessage && (
                <Toast message={toastMessage} onClose={() => setToastMessage('')} duration={2000} />
            )}
        </>
    );
};

export { ExtraBar };
