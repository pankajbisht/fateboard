import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { shortcut } from '@/lib/utils/isMac';
import { ZoomBarConfig } from '../../../../config/commandConfig';

// const ZOOM_ACTIONS = [
//     {
//         id: 'zoom-in',
//         label: 'Zoom In',
//         shortcut: shortcut('⌘+', 'Ctrl+'),
//         icon: <i className="fa-solid fa-magnifying-glass-plus" />,
//         onClick: () => useStore.getState().zoomIn(),
//     },
//     {
//         id: 'zoom-out',
//         label: 'Zoom Out',
//         shortcut: shortcut('⌘-', 'Ctrl-'),
//         icon: <i className="fa-solid fa-magnifying-glass-minus" />,
//         onClick: () => useStore.getState().zoomOut(),
//     },
//     {
//         id: 'fit-to-screen',
//         label: 'Fit to Screen',
//         shortcut: shortcut('⌘0', 'Ctrl+0'),
//         icon: <i className="fa-solid fa-expand" />,
//         onClick: () => useStore.getState().zoomFit(),
//     },
//     {
//         id: 'actual-size',
//         label: 'Actual Size',
//         shortcut: shortcut('⌘1', 'Ctrl+1'),
//         icon: <i className="fa-solid fa-arrows-left-right" />,
//         onClick: () => useStore.getState().actualSize(),
//     },
// ];

const ZoomBar = () => {
    const iconSize = useStore((state) => state.settings.iconSize);

    return (
        <ul className="flex items-center gap-1 px-1">
            {ZoomBarConfig.map((action) => (
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

            {/* Optional: Zoom level input */}
            {/*<li>
        <input
          type="number"
          min={10}
          max={400}
          defaultValue={100}
          className="w-16 px-1 py-0.5 text-sm border rounded bg-panel text-white"
          onChange={(e) => console.log('Set Zoom to', e.target.value)}
        />
      </li>
      <li className="text-sm opacity-70">%</li>*/}
        </ul>
    );
};

export { ZoomBar };
