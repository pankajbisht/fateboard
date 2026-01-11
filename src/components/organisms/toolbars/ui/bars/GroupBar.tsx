import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { shortcut } from '@/lib/utils/isMac';
import { GroupBarConfig } from '../../../../config/commandConfig';

// const GROUP_ACTIONS = [
//     {
//         id: 'group',
//         label: 'Group',
//         shortcut: shortcut('⌘G', 'Ctrl+G'),
//         icon: <i className="fa-solid fa-object-group" />,
//         onClick: () => useStore.getState().groupLayers(),
//     },
//     {
//         id: 'ungroup',
//         label: 'Ungroup',
//         shortcut: shortcut('⌘⇧G', 'Shift + Ctrl + G'),
//         icon: <i className="fa-solid fa-object-ungroup" />,
//         onClick: () => useStore.getState().ungroupSelected(),
//     },
// ];

const GroupBar = () => {
    const iconSize = useStore((state) => state.settings.iconSize);

    return (
        <ul className="flex items-center gap-1 px-1">
            {GroupBarConfig.map((action) => (
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

export { GroupBar };
