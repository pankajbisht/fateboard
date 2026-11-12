import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../atoms/Icon';
import { FOCUS_RING } from '../atoms/control.styles';

/**
 * A toolbar button that opens a small panel of options under it (portalled to <body>: toolbars
 * clip their overflow). Closes on a click outside and on Escape, which gives focus back to the
 * button; opening moves focus to the first checked option. Same behaviour as the grid menu.
 */
export function ToolbarPopover({
    label,
    trigger,
    children,
    className,
}: {
    /** Accessible name of the button and the panel; also its tooltip. */
    label: string;
    /** Visible button content (a preview, text...). A chevron is added. */
    trigger: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const r = buttonRef.current?.getBoundingClientRect();
            if (r) setPos({ top: r.bottom + 6, left: Math.max(8, r.left) });
        };
        place();
        window.addEventListener('resize', place);
        return () => window.removeEventListener('resize', place);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        panelRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
        const onDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (!buttonRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            e.preventDefault();
            setOpen(false);
            buttonRef.current?.focus();
        };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                aria-label={label}
                title={label}
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => setOpen((v) => !v)}
                className={clsx(
                    'flex h-[var(--ui-btn)] items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 text-xs text-ink hover:bg-surface-muted',
                    open && 'bg-surface-strong',
                    FOCUS_RING,
                )}
            >
                {trigger}
                <Icon name="chevron-down" className="text-ink-subtle" />
            </button>
            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="dialog"
                        aria-label={label}
                        style={pos}
                        className={clsx(
                            'fixed z-[9999] flex flex-col gap-3 rounded-lg border border-line-strong bg-surface-raised p-3 text-ink shadow-lg',
                            className,
                        )}
                    >
                        {children}
                    </div>,
                    document.body,
                )}
        </>
    );
}

export default ToolbarPopover;
