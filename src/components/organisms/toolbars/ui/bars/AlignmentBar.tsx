import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { AlignmentBarConfig } from '@/components/config/toolbars';

const AlignmentBar = () => {
    return (
        <ul className="flex items-center gap-0.5">
            {AlignmentBarConfig.map((action) => (
                <li key={action.id}>
                    <Tooltip position="bottom" content={action.label}>
                        <IconButton
                            icon={action.icon}
                            title={action.label}
                            aria-label={action.label}
                            onClick={action.onClick}
                            size="chrome"
                        />
                    </Tooltip>
                </li>
            ))}
        </ul>
    );
};

export { AlignmentBar };
