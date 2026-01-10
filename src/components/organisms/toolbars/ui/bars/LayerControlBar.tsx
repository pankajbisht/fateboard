import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { shortcut } from '@/lib/utils/isMac';

const LAYERCONTROL_ACTIONS = [
    {
        id: 'sendtoback',
        label: 'Send to Back',
        shortcut: shortcut('⌘⇧↓', 'Shift+Ctrl+↓'),
        icon: <i className="fa-solid fa-angles-down" />,
        onClick: () => useStore.getState().sendToBack(),
    },
    {
        id: 'sendbackward',
        label: 'Send backward',
        shortcut: shortcut('⌘↓', 'Ctrl+↓'),
        icon: <i className="fa-solid fa-angle-down" />,
        onClick: () => useStore.getState().sendBackward(),
    },
    {
        id: 'bringforward',
        label: 'Bring forward',
        shortcut: shortcut('⌘↑', 'Ctrl+↑'),
        icon: <i className="fa-solid fa-angle-up" />,
        onClick: () => useStore.getState().bringForward(),
    },
    {
        id: 'bringtofront',
        label: 'Bring to front',
        shortcut: shortcut('⌘⇧↑', 'Shift+Ctrl+↑'),
        icon: <i className="fa-solid fa-angles-up" />,
        onClick: () => useStore.getState().bringToFront(),
    },
];

const LayerControlBar = () => {
    const iconSize = useStore((state) => state.iconSize);

    return (
        <ul className="flex items-center gap-1 px-1">
            {LAYERCONTROL_ACTIONS.map((action) => (
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

export { LayerControlBar };
