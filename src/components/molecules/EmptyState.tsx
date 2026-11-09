import type { ReactNode } from 'react';
import { Icon, type IconName } from '../atoms/Icon';

/** Centered "nothing here yet" message with an optional action. */
export function EmptyState({
    icon = 'circle-info',
    title,
    description,
    action,
}: {
    icon?: IconName;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-strong text-ink-subtle">
                <Icon name={icon} className="text-base" />
            </div>
            <p className="text-xs font-semibold text-ink">{title}</p>
            {description && <p className="max-w-56 text-caption text-ink-muted">{description}</p>}
            {action && <div className="mt-1">{action}</div>}
        </div>
    );
}

export default EmptyState;
