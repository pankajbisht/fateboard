import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { EditBarConfig } from '@/components/config/toolbars';

const EditBar = () => {
    return (
        <ul className="flex items-center gap-0.5">
            {EditBarConfig.map((action) => (
                <li key={action.id}>
                    <Tooltip
                        position="bottom"
                        content={
                            <div className="flex flex-col">
                                <span>{action.label}</span>
                                <span className="text-xs text-ink-muted">{action.shortcut}</span>
                            </div>
                        }
                    >
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

export { EditBar };
