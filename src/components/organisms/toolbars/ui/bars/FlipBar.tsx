import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { FlipBarConfig } from '@/components/config/toolbars/ui/FlipBarConfig';
import { useStore } from '@/store';

const FlipBar = () => {
    // show whether the selection is currently flipped
    const flipped = {
        flipx: useStore((s) => s.transform.flipX),
        flipy: useStore((s) => s.transform.flipY),
    };
    const hasSelection = useStore((s) => s.hasSelection);
    return (
        <ul className="flex items-center gap-0.5">
            {FlipBarConfig.map((action) => (
                <li key={action.id}>
                    <Tooltip
                        position="bottom"
                        content={
                            <div className="flex flex-col">
                                <span>{action.label}</span>
                                <span className="text-xs text-ink-muted">
                                    {(action as { shortcut?: string }).shortcut}
                                </span>
                            </div>
                        }
                    >
                        <IconButton
                            icon={action.icon}
                            title={action.label}
                            aria-label={action.label}
                            onClick={action.onClick}
                            active={
                                hasSelection ? !!flipped[action.id as 'flipx' | 'flipy'] : false
                            }
                            size="chrome"
                        />
                    </Tooltip>
                </li>
            ))}
        </ul>
    );
};

export { FlipBar };
