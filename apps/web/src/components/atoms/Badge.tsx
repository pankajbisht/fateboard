import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'danger';

const TONE: Record<BadgeTone, string> = {
    neutral: 'bg-surface-strong text-ink-muted',
    primary: 'bg-primary-100 text-primary-ink',
    accent: 'bg-accent-100 text-accent-700',
    success: 'bg-success/15 text-success',
    danger: 'bg-danger/10 text-danger',
};

/** Small status / count / tag pill. */
export function Badge({
    tone = 'neutral',
    icon,
    children,
    className,
}: {
    tone?: BadgeTone;
    icon?: IconName;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={clsx(
                'inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-semibold whitespace-nowrap',
                TONE[tone],
                className,
            )}
        >
            {icon && <Icon name={icon} />}
            {children}
        </span>
    );
}

export default Badge;
