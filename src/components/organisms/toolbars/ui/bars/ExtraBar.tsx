// <Tooltip position="bottom" content="Grid View">
//     <IconButton
//         active={show}
//         icon={<i className="fa-solid fa-table-cells-large"></i>}
//         onClick={() => {
//             setShow(!show);
//             toggleGrid();
//         }}
//         title="Grid View"
//     />
// </Tooltip>

import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { shortcut } from '@/lib/utils/isMac';

const LOCK_ACTIONS = [
    {
        id: 'grid',
        label: 'Grid',
        shortcut: shortcut('⌘L', 'Ctrl+L'),
        icon: <i className="fa-solid fa-table-cells-large" />,
        onClick: () => useStore.getState().toggleGrid(),
    },
];

const ExtraBar = () => {
    const iconSize = useStore((state) => state.iconSize);

    return (
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
    );
};

export { ExtraBar };
