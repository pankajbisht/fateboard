import type { ReactNode, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { FOCUS_RING } from './control.styles';

/** sm / md / lg = fixed (panels); 'chrome' = follows Settings > Icon size (toolbars, footer). */
type IconButtonSize = 'sm' | 'md' | 'lg' | 'chrome';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    /** Pressed / selected state (toolbar toggles). Sets aria-pressed. */
    active?: boolean;
    size?: IconButtonSize;
    /** 'danger' turns red on hover (delete actions); 'primary' is a filled brand button (Play). */
    tone?: 'default' | 'danger' | 'primary';
    className?: string;
}

const SIZE: Record<IconButtonSize, string> = {
    sm: 'h-6 w-6 text-[11px] [&>svg:not(.lucide)]:h-3.5 [&>svg:not(.lucide)]:w-3.5 [&>img]:h-3.5 [&>img]:w-3.5',
    md: 'h-7 w-7 text-xs [&>svg:not(.lucide)]:h-4 [&>svg:not(.lucide)]:w-4 [&>img]:h-4 [&>img]:w-4',
    lg: 'h-8 w-8 text-sm [&>svg:not(.lucide)]:h-[18px] [&>svg:not(.lucide)]:w-[18px] [&>img]:h-[18px] [&>img]:w-[18px]',
    chrome: 'size-[var(--ui-btn)] [&_svg]:size-[var(--ui-icon)] [&>img]:size-[var(--ui-icon)]',
};

/** Square icon-only button (toolbars, panel headers, row actions). Give it an aria-label or title. */
export function IconButton({
    icon,
    active,
    size = 'md',
    tone = 'default',
    className,
    type = 'button',
    ...rest
}: IconButtonProps) {
    return (
        <button
            type={type}
            aria-pressed={active === undefined ? undefined : active}
            {...rest}
            className={clsx(
                'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors',
                'disabled:pointer-events-none disabled:opacity-40 dark:disabled:opacity-55 [[data-dimmed]_&]:disabled:opacity-100',
                FOCUS_RING,
                SIZE[size],
                active
                    ? 'bg-primary-100 text-primary-ink hover:bg-primary-200'
                    : tone === 'primary'
                      ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800'
                      : tone === 'danger'
                        ? 'text-ink-muted hover:bg-danger/10 hover:text-danger'
                        : 'text-ink-muted hover:bg-surface-strong hover:text-ink',
                className,
            )}
        >
            {icon}
        </button>
    );
}

export default IconButton;
