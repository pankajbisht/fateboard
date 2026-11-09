import clsx from 'clsx';
import type { ReactNode, RefObject, UIEvent } from 'react';
import { Icon, type IconName } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { ControlSizeContext } from '../atoms/controlSize';

export type PanelLayoutProps = {
    title: string;
    icon?: IconName;
    /** Header buttons left of the close button (IconButton size "md"). */
    actions?: ReactNode;
    onClose?: () => void;
    /** Sticky bar at the bottom (main action of the panel). */
    footer?: ReactNode;
    /** false = body has no padding / gap (galleries that manage their own layout). */
    padded?: boolean;
    /** Body does not scroll; the child fills it and scrolls itself. */
    fullSize?: boolean;
    scrollRef?: RefObject<HTMLDivElement | null>;
    onScroll?: (e: UIEvent<HTMLDivElement>) => void;
    children: ReactNode;
};

/**
 * The shell of every editor panel (left sidebar and right dock): one header with icon, title,
 * actions and close; a scrolling body with standard padding and section spacing; optional footer.
 * Panels render only their content (PanelSection / Field / ...), never their own title bar.
 */
export function PanelLayout({
    title,
    icon,
    actions,
    onClose,
    footer,
    padded = true,
    fullSize = false,
    scrollRef,
    onScroll,
    children,
}: PanelLayoutProps) {
    return (
        // One control density for every panel: inputs, selects, buttons = h-7.
        <ControlSizeContext.Provider value="sm">
            <div className="flex h-full min-h-0 flex-col bg-surface text-ink">
                <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line pl-4 pr-2">
                    {icon && <Icon name={icon} className="text-sm text-ink-subtle" />}
                    <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                        {title}
                    </h2>
                    {actions}
                    {onClose && (
                        <IconButton
                            icon={<Icon name="xmark" />}
                            onClick={onClose}
                            title={`Close ${title} panel`}
                            aria-label={`Close ${title} panel`}
                        />
                    )}
                </header>

                <div
                    ref={scrollRef}
                    onScroll={onScroll}
                    className={clsx(
                        'min-h-0 flex-1',
                        fullSize ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain',
                    )}
                >
                    {padded && !fullSize ? (
                        <div className="flex flex-col gap-4 p-4">{children}</div>
                    ) : (
                        children
                    )}
                </div>

                {footer && (
                    <footer className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-4 py-3">
                        {footer}
                    </footer>
                )}
            </div>
        </ControlSizeContext.Provider>
    );
}

export default PanelLayout;
