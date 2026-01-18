import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { UndoRedoBarConfig } from '@/components/config/toolbars';

const UndoRedoBar = () => {
    const iconSize = useStore((state) => state.settings.iconSize);

    return (
        <ul className="flex items-center gap-1 px-1">
            {UndoRedoBarConfig.map((action) => (
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

export { UndoRedoBar };
