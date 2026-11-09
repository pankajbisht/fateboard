import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { UndoRedoBarConfig } from '@/components/config/toolbars';
import { useStore } from '@store';

/** Undo / Redo of the canvas history (per page); disabled when there is nothing to undo / redo. */
const UndoRedoBar = () => {
    const canUndo = useStore((s) => s.canUndo);
    const canRedo = useStore((s) => s.canRedo);
    const enabled: Record<string, boolean> = { undo: canUndo, redo: canRedo };

    return (
        <ul className="flex items-center gap-0.5">
            {UndoRedoBarConfig.map((action) => (
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
                            disabled={!enabled[action.id]}
                            size="chrome"
                        />
                    </Tooltip>
                </li>
            ))}
        </ul>
    );
};

export { UndoRedoBar };
