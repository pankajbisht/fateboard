import { useEffect, type ReactNode } from 'react';
import { Icon } from '@components/atoms/Icon';
import { IconButton } from '@components/atoms/IconButton';

export const PHONE_SHEET_ID = 'editor-phone-sheet';

/**
 * Upright phones: the "More" bottom sheet over the board, above the tool bar. It holds the dock
 * (panel tabs + colors) and the footer (style + view), each under its own heading. It stays mounted
 * while closed (`hidden`): the footer's groups keep their keyboard shortcuts. A dock panel opened
 * from it covers the sheet (DockPanel), and its close button comes back here.
 */
export function PhoneMoreSheet({
    open,
    onClose,
    dock,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    dock: ReactNode;
    footer: ReactNode;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    return (
        <section
            id={PHONE_SHEET_ID}
            aria-label="More"
            hidden={!open}
            className="absolute inset-x-0 bottom-full z-10 flex flex-col rounded-t-2xl border-t border-line bg-surface pb-1 shadow-[0_-8px_24px_rgb(0_0_0/0.12)]"
        >
            <div className="relative flex items-center justify-between px-4 pb-1 pt-3">
                <span
                    aria-hidden
                    className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-line"
                />
                <h2 className="text-sm font-semibold text-ink">More</h2>
                <IconButton
                    size="lg"
                    icon={<Icon name="xmark" />}
                    aria-label="Close More"
                    title="Close"
                    onClick={onClose}
                />
            </div>
            {/* DockRoot adds its own "Panels" / "Colors" headings on phones */}
            <aside aria-label="Panels and colors" className="flex min-w-0 flex-col">
                {dock}
            </aside>
            <footer className="mt-1 min-w-0 border-t border-line pt-1">
                <p className="px-4 pt-1 text-xs font-medium text-ink-muted">Style &amp; view</p>
                {footer}
            </footer>
        </section>
    );
}
