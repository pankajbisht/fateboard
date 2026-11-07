import { useEffect } from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';

/**
 * Renders the store's toast (`showToast`): a short message with an optional action such as
 * "Undo" (decision Q11: destructive actions are undoable and say so). Mounted once in RootLayout.
 * A new toast replaces the old one; it hides itself after `duration`.
 */
export function ToastHost() {
    const toast = useStore((s) => s.toast);
    const dismissToast = useStore((s) => s.dismissToast);
    const runToastAction = useStore((s) => s.runToastAction);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(dismissToast, toast.duration);
        return () => clearTimeout(timer);
    }, [toast, dismissToast]);

    if (!toast) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-16 left-1/2 z-[10001] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-md bg-ink py-1.5 pr-1.5 pl-4 text-sm text-surface shadow-lg"
        >
            <span className="min-w-0 truncate">{toast.message}</span>
            {toast.actionLabel && (
                <Button size="sm" variant="primary" onClick={() => void runToastAction()}>
                    {toast.actionLabel}
                </Button>
            )}
            <IconButton
                icon={<Icon name="xmark" />}
                aria-label="Dismiss"
                size="sm"
                onClick={dismissToast}
                className="text-surface hover:bg-surface/15 hover:text-surface"
            />
        </div>
    );
}
