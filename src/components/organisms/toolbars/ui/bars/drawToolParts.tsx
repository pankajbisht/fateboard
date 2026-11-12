/** Shared pieces of the Pen / Pencil options bars (the header context row). */
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/atoms/Icon';

export function Bar({
    label,
    icon,
    children,
}: {
    label: string;
    icon: IconName;
    children: ReactNode;
}) {
    return (
        <div className="overflow-x-auto bg-surface px-2 py-1">
            <div
                role="toolbar"
                aria-label={`${label} options`}
                // a mouse click on the bar keeps focus where it was, so Enter still finishes the
                // path (keyboard users Tab here on purpose); inputs and sliders need the focus
                onMouseDown={(e) => {
                    if (!(e.target as HTMLElement).closest('input')) e.preventDefault();
                }}
                className="flex min-h-[var(--ui-btn)] items-center gap-3 whitespace-nowrap text-xs text-ink"
            >
                <span className="flex items-center gap-1.5 rounded-md bg-primary-100 px-2 py-1 font-semibold text-primary-ink">
                    <Icon name={icon} />
                    {label}
                </span>
                {children}
            </div>
        </div>
    );
}

export const Key = ({ children }: { children: ReactNode }) => (
    <kbd className="rounded-sm border border-line-strong bg-surface-muted px-1 font-sans text-[10px] font-semibold text-ink">
        {children}
    </kbd>
);

export function Hint({ children }: { children: ReactNode }) {
    return (
        <p className="ml-auto flex min-w-0 items-center gap-1 pl-3 text-caption text-ink-muted">
            <Icon name="circle-info" className="shrink-0 text-ink-subtle" />
            {children}
        </p>
    );
}
