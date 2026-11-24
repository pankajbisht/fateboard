import type { ReactNode } from 'react';
import IconButton from '../../../../atoms/IconButton';
import { Tooltip } from '../../../../molecules/Tooltip';
import { ARRANGE_RULES, type SelectionState } from '@/lib/canvas/arrange';
import type { ArrangeRule } from '@/components/config/toolbars/ui/arrangeWhen';

export interface ArrangeAction {
    id: string;
    label: string;
    shortcut?: string;
    icon: ReactNode;
    rule: ArrangeRule;
    onClick: () => void;
}

/** A header arrange tool: disabled when its rule says it cannot act on the selection (BUG-192). */
export function ArrangeButton({ action, state }: { action: ArrangeAction; state: SelectionState }) {
    return (
        <Tooltip
            position="bottom"
            content={
                action.shortcut ? (
                    <div className="flex flex-col">
                        <span>{action.label}</span>
                        <span className="text-xs text-ink-muted">{action.shortcut}</span>
                    </div>
                ) : (
                    action.label
                )
            }
        >
            <IconButton
                icon={action.icon}
                title={action.label}
                aria-label={action.label}
                onClick={action.onClick}
                disabled={!ARRANGE_RULES[action.rule](state)}
                size="chrome"
            />
        </Tooltip>
    );
}
