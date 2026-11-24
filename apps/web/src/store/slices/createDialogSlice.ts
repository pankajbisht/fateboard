import type { SliceCreator } from '@/store/types';

/**
 * App-wide confirm / alert dialogs (replaces window.confirm / window.alert).
 *
 * Any code can ask for a dialog and await the answer:
 *     if (!(await useStore.getState().confirmDialog({ title, message, tone: 'danger' }))) return;
 *     get().alertDialog({ title, message });   // inside a slice
 *
 * Requests are queued and `DialogHost` (mounted once in RootLayout) shows the first one.
 * Only plain data lives in the store; the promise resolvers are kept in this slice's closure.
 */

export type DialogTone = 'default' | 'danger';

export interface ConfirmDialogOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** 'danger' paints the confirm button red and focuses Cancel first. */
    tone?: DialogTone;
}

export interface AlertDialogOptions {
    title: string;
    message?: string;
    okLabel?: string;
}

export interface DialogRequest {
    id: number;
    kind: 'confirm' | 'alert';
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    tone: DialogTone;
}

export interface ToastOptions {
    message: string;
    /** Button text, e.g. 'Undo'. Shown only together with `onAction`. */
    actionLabel?: string;
    onAction?: () => unknown;
    /** ms before it hides itself (default 6000). */
    duration?: number;
}

/** Plain data for `ToastHost`; the action callback stays in the slice closure. */
export interface ToastRequest {
    id: number;
    message: string;
    actionLabel: string | null;
    duration: number;
}

const TOAST_DURATION_MS = 6000;

export interface DialogSlice {
    /** Pending dialogs; `dialogQueue[0]` is the one on screen. */
    dialogQueue: DialogRequest[];
    /** Resolves true when confirmed, false on Cancel / Escape / backdrop. */
    confirmDialog: (options: ConfirmDialogOptions) => Promise<boolean>;
    /** Resolves when the user dismisses it. */
    alertDialog: (options: AlertDialogOptions) => Promise<void>;
    /** Answers the dialog on screen and shows the next one. No-op when the queue is empty. */
    resolveDialog: (result: boolean) => void;

    /** The one toast on screen (a new toast replaces the old one), or null. */
    toast: ToastRequest | null;
    /** Shows a short non-blocking message, optionally with one action (e.g. Undo, Q11). */
    showToast: (options: ToastOptions) => void;
    dismissToast: () => void;
    /** Runs the toast's action once and hides the toast. */
    runToastAction: () => Promise<void>;
}

export const createDialogSlice: SliceCreator<DialogSlice> = (set, get) => {
    let nextId = 1;
    const resolvers = new Map<number, (result: boolean) => void>();
    let toastAction: (() => unknown) | null = null;

    const enqueue = (request: Omit<DialogRequest, 'id'>) =>
        new Promise<boolean>((resolve) => {
            const id = nextId++;
            resolvers.set(id, resolve);
            set({ dialogQueue: [...get().dialogQueue, { ...request, id }] }, false, 'dialog/open');
        });

    return {
        dialogQueue: [],

        confirmDialog: (options) =>
            enqueue({
                kind: 'confirm',
                title: options.title,
                message: options.message ?? '',
                confirmLabel: options.confirmLabel ?? 'Confirm',
                cancelLabel: options.cancelLabel ?? 'Cancel',
                tone: options.tone ?? 'default',
            }),

        alertDialog: async (options) => {
            await enqueue({
                kind: 'alert',
                title: options.title,
                message: options.message ?? '',
                confirmLabel: options.okLabel ?? 'OK',
                cancelLabel: '',
                tone: 'default',
            });
        },

        resolveDialog: (result) => {
            const [current, ...rest] = get().dialogQueue;
            if (!current) return;
            set({ dialogQueue: rest }, false, 'dialog/close');
            const resolve = resolvers.get(current.id);
            resolvers.delete(current.id);
            resolve?.(result);
        },

        toast: null,

        showToast: ({ message, actionLabel, onAction, duration = TOAST_DURATION_MS }) => {
            toastAction = onAction ?? null;
            set(
                {
                    toast: {
                        id: nextId++,
                        message,
                        actionLabel: onAction && actionLabel ? actionLabel : null,
                        duration,
                    },
                },
                false,
                'toast/show',
            );
        },

        dismissToast: () => {
            toastAction = null;
            if (get().toast) set({ toast: null }, false, 'toast/dismiss');
        },

        runToastAction: async () => {
            const action = toastAction;
            get().dismissToast();
            if (!action) return;
            try {
                await action();
            } catch (error) {
                console.error('[dialog] toast action failed', error);
            }
        },
    };
};
