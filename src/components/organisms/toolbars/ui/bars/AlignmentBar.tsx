import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { AlignmentBarConfig } from '../../../../config/commandConfig';

// const ALIGN_ACTIONS = [
//     {
//         id: 'align-left',
//         label: 'Align Left',
//         icon: <i className="fa-solid fa-align-left" />,
//         onClick: () => useStore.getState().alignObjects('align-left'),
//     },
//     {
//         id: 'align-center',
//         label: 'Align Center',
//         icon: <i className="fa-solid fa-align-center" />,
//         onClick: () => useStore.getState().alignObjects('align-hcenter'),
//     },
//     {
//         id: 'align-right',
//         label: 'Align Right',
//         icon: <i className="fa-solid fa-align-right" />,
//         onClick: () => useStore.getState().alignObjects('align-right'),
//     },
//     {
//         id: 'align-top',
//         label: 'Align Top',
//         icon: <i className="fa-solid fa-align-left rotate-90" />,
//         onClick: () => useStore.getState().alignObjects('align-top'),
//     },
//     {
//         id: 'align-middle',
//         label: 'Align Middle',
//         icon: <i className="fa-solid fa-align-center -rotate-90" />,
//         onClick: () => useStore.getState().alignObjects('align-vcenter'),
//     },
//     {
//         id: 'align-bottom',
//         label: 'Align Bottom',
//         icon: <i className="fa-solid fa-align-right rotate-90" />,
//         onClick: () => useStore.getState().alignObjects('align-bottom'),
//     },
//     {
//         id: 'distribute-horizontal',
//         label: 'Distribute Horizontally',
//         icon: <i className="fa-solid fa-grip-lines-vertical" />,
//         onClick: () => useStore.getState().alignObjects('distribute-h'),
//     },
//     {
//         id: 'distribute-vertical',
//         label: 'Distribute Vertically',
//         icon: <i className="fa-solid fa-grip-lines" />,
//         onClick: () => useStore.getState().alignObjects('distribute-v'),
//     },
// ];

const AlignmentBar = () => {
    const iconSize = useStore((state) => state.iconSize);

    return (
        <ul className="flex items-center gap-2 px-1">
            {AlignmentBarConfig.map((action) => (
                <li key={action.id}>
                    <Tooltip position="bottom" content={action.label}>
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

export { AlignmentBar };
