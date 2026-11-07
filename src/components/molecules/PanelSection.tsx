import clsx from 'clsx';
import { useId, useState, type ReactNode } from 'react';
import { Icon } from '../atoms/Icon';
import { FOCUS_RING } from '../atoms/control.styles';

export type PanelSectionProps = {
    title?: ReactNode;
    /** Muted line under the title. */
    description?: ReactNode;
    /** Right side of the header (small icon buttons, badges). */
    actions?: ReactNode;
    /** Shows a "Reset" link in the header. */
    onReset?: () => void;
    collapsible?: boolean;
    defaultOpen?: boolean;
    className?: string;
    children: ReactNode;
};

/**
 * A titled group of settings inside a panel. Sections are separated by a hairline; the first one
 * has none. Use one per topic ("Size", "Color", "Effects").
 */
export function PanelSection({
    title,
    description,
    actions,
    onReset,
    collapsible = false,
    defaultOpen = true,
    className,
    children,
}: PanelSectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    const bodyId = useId();
    const showBody = !collapsible || open;

    const heading = <span className="text-label uppercase text-ink-subtle">{title}</span>;

    return (
        <section
            className={clsx(
                'flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0',
                className,
            )}
        >
            {(title || actions || onReset) && (
                <header className="flex min-h-5 items-center justify-between gap-2">
                    {collapsible ? (
                        <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={bodyId}
                            onClick={() => setOpen((o) => !o)}
                            className={clsx(
                                '-ml-1 flex items-center gap-1 rounded px-1',
                                FOCUS_RING,
                            )}
                        >
                            <Icon
                                name="chevron-down"
                                className={clsx(
                                    'text-ink-subtle transition-transform',
                                    !open && '-rotate-90',
                                )}
                            />
                            {heading}
                        </button>
                    ) : (
                        heading
                    )}
                    <div className="flex items-center gap-1">
                        {actions}
                        {onReset && (
                            <button
                                type="button"
                                onClick={onReset}
                                className={clsx(
                                    'rounded px-1 text-xs text-ink-muted hover:text-primary-ink',
                                    FOCUS_RING,
                                )}
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </header>
            )}
            {description && showBody && (
                <p className="-mt-1.5 text-caption text-ink-subtle">{description}</p>
            )}
            {showBody && (
                <div id={bodyId} className="flex flex-col gap-3">
                    {children}
                </div>
            )}
        </section>
    );
}

export default PanelSection;
