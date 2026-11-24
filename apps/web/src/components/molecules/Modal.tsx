import { Icon } from '@/components/atoms/Icon';
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button, type ButtonProps, type ButtonVariant } from '../atoms/Button';

/**
 * The app's one modal shell (fateboard theme: dark blurred backdrop, white rounded-lg card,
 * brand primary-600 buttons, rounded-lg corners, primary focus ring; see docs/DESIGN.md). Use it for every modal; for simple yes/no or notice
 * dialogs call `confirmDialog` / `alertDialog` from the store instead (rendered by DialogHost).
 *
 * Behaviour: portal to <body>, focus moves inside and is trapped (Tab / Shift+Tab), Escape and a
 * backdrop click call `onClose`, body scroll is locked, focus returns to the opener on close, and
 * key events never leak to the editor's window shortcuts (Delete, Ctrl+Z, ...).
 */

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZE = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const;

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    /** Short text under the title; also used as the accessible description. */
    description?: ReactNode;
    children?: ReactNode;
    /** Buttons row, right-aligned. Use `ModalButton`. */
    footer?: ReactNode;
    size?: keyof typeof SIZE;
    /** 'alertdialog' for confirmations / notices that need an answer. */
    role?: 'dialog' | 'alertdialog';
    /** Element to focus on open; defaults to the first focusable element. */
    initialFocusRef?: RefObject<HTMLElement | null>;
    closeOnBackdrop?: boolean;
    /** Show the ✕ button in the header. */
    showClose?: boolean;
    /** Optional icon tile left of the title. */
    icon?: ReactNode;
    tone?: 'default' | 'danger';
}

export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'sm',
    role = 'dialog',
    initialFocusRef,
    closeOnBackdrop = true,
    showClose = false,
    icon,
    tone = 'default',
}: ModalProps) {
    const titleId = useId();
    const descId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // focus in / out + scroll lock
    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const target =
            initialFocusRef?.current ??
            panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
            panelRef.current;
        target?.focus();

        return () => {
            document.body.style.overflow = overflow;
            opener?.focus?.();
        };
    }, [open, initialFocusRef]);

    // keyboard: Escape, focus trap, and no leaks to window-level shortcuts
    useEffect(() => {
        const root = rootRef.current;
        if (!open || !root) return;

        const onKeyDown = (e: KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab') return;
            const items = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
            if (!items?.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        const stop = (e: KeyboardEvent) => e.stopPropagation();

        root.addEventListener('keydown', onKeyDown);
        root.addEventListener('keyup', stop);
        return () => {
            root.removeEventListener('keydown', onKeyDown);
            root.removeEventListener('keyup', stop);
        };
    }, [open]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div ref={rootRef} className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div
                data-testid="modal-backdrop"
                aria-hidden
                className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
                onMouseDown={() => closeOnBackdrop && onClose()}
            />
            <div
                ref={panelRef}
                role={role}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                className={`relative flex max-h-[90vh] w-full ${SIZE[size]} flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-xl outline-none`}
            >
                <div className="flex items-start gap-3 px-5 pt-5">
                    {icon && (
                        <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                                tone === 'danger'
                                    ? 'bg-danger/10 text-danger'
                                    : 'bg-primary-50 text-primary-ink'
                            }`}
                        >
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="text-title text-ink">
                            {title}
                        </h2>
                        {description && (
                            <p id={descId} className="mt-1 text-body text-ink-muted">
                                {description}
                            </p>
                        )}
                    </div>
                    {showClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-subtle transition hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400"
                        >
                            <Icon name="xmark" className="text-sm" />
                        </button>
                    )}
                </div>

                {children && <div className="min-h-0 overflow-y-auto px-5 pt-4">{children}</div>}

                {footer && (
                    <div className="mt-5 flex justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3">
                        {footer}
                    </div>
                )}
                {!footer && <div className="pb-5" />}
            </div>
        </div>,
        document.body,
    );
}

/** Button for `Modal` footers: the app `Button` (size md), so dialogs match every other button. */
export function ModalButton({
    variant = 'secondary',
    buttonRef,
    ...props
}: Omit<ButtonProps, 'size' | 'ref'> & {
    variant?: Extract<ButtonVariant, 'primary' | 'secondary' | 'danger'>;
    buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
    return <Button ref={buttonRef} variant={variant} size="md" {...props} />;
}
