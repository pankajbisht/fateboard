import { shortcut } from '@/lib/utils/isMac';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { useStore } from '@/store';
import { EditBarConfig } from '@/components/config/toolbars';

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
