import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { ZoomBarConfig } from '@/components/config/toolbars';

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
