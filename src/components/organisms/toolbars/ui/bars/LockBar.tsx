import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { shortcut } from '@/lib/utils/isMac';
import { LockBarConfig } from '../../../../config/commandConfig';

// const LOCK_ACTIONS = [
//     {
//         id: 'lock',
//         label: 'Lock',
//         shortcut: shortcut('⌘L', 'Ctrl+L'),
//         icon: <i className="fa-solid fa-lock" />,
//         onClick: () => useStore.getState().lock(),
//     },
//     {
//         id: 'unlock',
//         label: 'Unlock',
//         shortcut: shortcut('⌘⇧L', 'Shift+Ctrl+L'),
//         icon: <i className="fa-solid fa-lock-open" />,
//         onClick: () => useStore.getState().unlock(),
//     },
// ];

const LockBar = () => {
    const iconSize = useStore((state) => state.settings.iconSize);

    return (
        <ul className="flex items-center gap-1 px-1">
            {LockBarConfig.map((action) => (
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
    );
};

export { LockBar };
