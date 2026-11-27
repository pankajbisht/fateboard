import {
    createLatestWriter,
    projectStorage,
    type ProjectDoc,
    type StoredBoard,
} from '@/lib/storage';
import { timed } from '@/lib/perf/perfMarks';
import type { ConfirmDialogOptions } from '../createDialogSlice';

/**
 * Autosave of the canvas slice (BUG-004 / Q5), moved out of `createCanvasSlice` (P2,
 * docs/PERFORMANCE_AUDIT.md): the whole project goes to `projectStorage` (IndexedDB).
 *
 * - Debounced to 1 s of quiet (longer than the pause between two strokes), but never more than 5 s after
 *   the first unsaved change, so a long drag or a stream of edits is still saved.
 * - The project is captured synchronously when the timer fires (the page is complete then); only the
 *   write waits its turn, one at a time, and only the newest waiting capture is written.
 */
export const PERSIST_DELAY_MS = 1000;
export const PERSIST_MAX_WAIT_MS = 5000;

/** What the persistence code reads from the store (other slices). */
export interface PersistPeers {
    canvas: unknown;
    isPageSwitching?: boolean;
    captureProject?: (options?: { thumbnail?: boolean }) => ProjectDoc | null;
    confirmDialog?: (options: ConfirmDialogOptions) => Promise<boolean>;
    saveBoard: () => void;
}

/** Hands `json` to the browser as a download. */
export const downloadText = (json: string, fileName: string) => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Give the browser time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function createPersistence(get: () => PersistPeers) {
    /**
     * `lock` > 0: `schedule()` does nothing (restore / import / clear, so a half-loaded or empty canvas
     * never overwrites the saved data). `dropped`: a save was asked while locked (BUG-186). `unread`: the
     * saved project could not be read (BUG-173); nothing writes over it until a later read works.
     */
    const state = { lock: 0, dropped: false, unread: false };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let firstChangeAt = 0;
    // A failed autosave was shown; shown again only after a save works in between (BUG-162).
    let saveFailureShown = false;
    let unloadHandler: (() => void) | null = null;

    /** The autosave failed (storage full, blocked, private mode): say so once (BUG-162). */
    const reportSaveFailure = () => {
        if (saveFailureShown) return;
        saveFailureShown = true;
        void Promise.resolve(
            get().confirmDialog?.({
                title: "Your board isn't being saved",
                message:
                    'This browser refused to save your board (its storage may be full or blocked). Save a copy so you keep your work. Saving is retried with every change.',
                confirmLabel: 'Save a copy',
                cancelLabel: 'Not now',
            }),
        ).then((saveCopy) => {
            if (saveCopy) get().saveBoard();
        });
    };

    const writer = createLatestWriter((doc: ProjectDoc) => projectStorage.save(doc), {
        onSaved: () => {
            saveFailureShown = false;
        },
        onError: (error) => {
            console.error('[canvas] failed to save the project:', error);
            reportSaveFailure();
        },
    });

    const cancel = () => {
        if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
        }
    };

    /**
     * Save the whole project (every page; the live canvas goes into the current page). Captured NOW;
     * `now` skips the queue (tab closing: a waiting write may never start).
     */
    const writeProject = (now = false) => {
        if (state.unread) return;
        try {
            const doc = timed('autosave:capture', () =>
                get().captureProject?.({ thumbnail: false }),
            );
            if (!doc) return;
            if (now) writer.flush(doc);
            else writer.write(doc);
        } catch (error) {
            console.error('[canvas] failed to serialize the project:', error);
        }
    };

    /** Debounced save of the whole project. */
    const schedule = () => {
        if (state.lock > 0) {
            state.dropped = true;
            return;
        }
        if (timer === undefined) firstChangeAt = Date.now();
        cancel();
        const left = firstChangeAt + PERSIST_MAX_WAIT_MS - Date.now();
        timer = setTimeout(
            () => {
                timer = undefined;
                if (state.lock > 0) return;
                if (!get().canvas) return;
                // A page is loading: save once it is done (showPage persists at the end too).
                if (get().isPageSwitching) {
                    schedule();
                    return;
                }
                writeProject();
            },
            Math.max(0, Math.min(PERSIST_DELAY_MS, left)),
        );
    };

    /** Write any pending debounced save immediately (dispose, tab close). */
    const flush = () => {
        if (timer === undefined) return;
        cancel();
        if (state.lock > 0 || get().isPageSwitching) return;
        if (!get().canvas) return;
        writeProject(true);
    };

    /**
     * The saved board could not be opened (BUG-154). The editor starts empty and the next
     * autosave would replace the only copy, so it is kept under its own key first and the user
     * is offered the file.
     */
    const keepUnreadableBoard = async (saved: StoredBoard) => {
        const raw = saved.kind === 'project' ? saved.project : saved.canvasJSON;
        try {
            await projectStorage.keepUnreadable(raw);
        } catch (error) {
            console.error('[canvas] failed to keep the unreadable board:', error);
        }
        void Promise.resolve(
            get().confirmDialog?.({
                title: "Your saved board couldn't be opened",
                message:
                    'A new empty board was started. Your saved board was kept: download it now so you have the file.',
                confirmLabel: 'Download saved board',
                cancelLabel: 'Not now',
            }),
        ).then((download) => {
            if (download) downloadText(JSON.stringify(raw), 'unreadable-board.fateboard');
        });
    };

    const attachUnload = () => {
        if (typeof window === 'undefined' || unloadHandler) return;
        unloadHandler = () => flush();
        window.addEventListener('beforeunload', unloadHandler);
        window.addEventListener('pagehide', unloadHandler);
    };

    const detachUnload = () => {
        if (typeof window === 'undefined' || !unloadHandler) return;
        window.removeEventListener('beforeunload', unloadHandler);
        window.removeEventListener('pagehide', unloadHandler);
        unloadHandler = null;
    };

    return { state, cancel, schedule, flush, keepUnreadableBoard, attachUnload, detachUnload };
}
