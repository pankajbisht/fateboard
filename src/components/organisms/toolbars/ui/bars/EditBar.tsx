import { shortcut } from '@/lib/utils/isMac';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { useStore } from '@/store';
import { EditBarConfig } from '../../../../config/commandConfig';

// const EDIT_ACTIONS = [
//     {
//         id: 'copy',
//         label: 'Copy',
//         shortcut: shortcut('⌘C', 'Ctrl+C'),
//         icon: <i className="fa-regular fa-copy" />,
//         onClick: () => useStore.getState().copy(),
//     },
//     {
//         id: 'cut',
//         label: 'Cut',
//         shortcut: shortcut('⌘X', 'Ctrl+X'),
//         icon: <i className="fa-solid fa-scissors -rotate-90"></i>,
//         onClick: () => useStore.getState().cut(),
//     },
//     {
//         id: 'paste',
//         label: 'Paste',
//         shortcut: shortcut('⌘V', 'Ctrl+V'),
//         icon: <i className="fa-regular fa-paste" />,
//         onClick: () => useStore.getState().paste(),
//     },
//     {
//         id: 'duplicate',
//         label: 'Duplicate',
//         shortcut: shortcut('⌘D', 'Ctrl+D'),
//         icon: <i className="fa-regular fa-clone" />,
//         onClick: () => useStore.getState().duplicate(),
//     },
//     {
//         id: 'clone',
//         label: 'Clone',
//         shortcut: shortcut('⌥D', 'Alt+D'),
//         icon: <i className="fa-solid fa-layer-group" />,
//         onClick: () => useStore.getState().clone(),
//     },
//     {
//         id: 'delete',
//         label: 'Delete',
//         shortcut: shortcut('delete', 'backscape'),
//         icon: <i className="fa-solid fa-trash" />,
//         onClick: () => useStore.getState().removeLayer(),
//     },
// ];

const EditBar = () => {
    const iconSize = useStore((state) => state.iconSize);

    return (
        <ul className="flex items-center gap-2 px-1">
            {EditBarConfig.map((action) => (
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

export { EditBar };
