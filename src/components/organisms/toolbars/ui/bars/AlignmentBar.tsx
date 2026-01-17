import { useStore } from '@/store';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { AlignmentBarConfig } from '@/components/config/toolbars';

const AlignmentBar = () => {
    const iconSize = useStore((state) => state.settings.iconSize);

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
