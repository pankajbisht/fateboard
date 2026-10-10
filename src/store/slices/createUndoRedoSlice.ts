import type { SliceCreator } from '../types';

// Shared with createCanvasSlice (import it there instead of redefining)
export const SERIALIZE_PROPS = ['backgroundColor', 'customId', 'customType', '_locked'];

export interface UndoRedoSlice {
    MAX_HISTORY: number;
    _isRestoring: boolean;
    _historyPaused: number;
    undoStack: string[]; // was `[]` (empty tuple type)
    redoStack: string[];
    canUndo: boolean;
    canRedo: boolean;

    saveState: (immediate?: boolean) => void;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    clearHistory: () => void;
    initHistory: () => void;
    pauseHistory: () => void;
    resumeHistory: () => void;
    registerHistoryEvents: (canvas: any) => void;
    unregisterHistoryEvents: (canvas: any) => void;
}

/**
 * Model: undoStack's LAST item is always the CURRENT canvas state.
 *   undo -> move current to redoStack, restore the item before it
 *   redo -> move first redo item to undoStack, restore it
 */
export const createUndoRedoSlice: SliceCreator<UndoRedoSlice> = (set, get) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let handlers: Record<string, (e?: any) => void> | null = null;

    const cancelTimer = () => {
        if (timer) clearTimeout(timer);
        timer = null;
    };

    // Takes the snapshot and pushes it on the stack
    const commit = () => {
        cancelTimer();
        const { canvas, _isRestoring, _historyPaused, undoStack, MAX_HISTORY } = get() as any;
        if (!canvas || _isRestoring || _historyPaused > 0) return;

        const state = JSON.stringify(canvas.toObject(SERIALIZE_PROPS));
        if (undoStack[undoStack.length - 1] === state) return; // nothing actually changed

        const next = [...undoStack, state].slice(-(MAX_HISTORY + 1)); // enforce limit
        set({
            undoStack: next,
            redoStack: [], // new change invalidates redo
            canUndo: next.length > 1,
            canRedo: false,
        } as any);
    };

    // loadFromJSON is Promise-based in Fabric v6 (the callback form is v5 only)
    const restore = async (state: string) => {
        const { canvas } = get() as any;
        set({ _isRestoring: true } as any);
        try {
            await canvas.loadFromJSON(state);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            (get() as any).clearToolbar?.();
            (get() as any).rebuildLinks?.(canvas); // optional hook: re-link __text/__box/__instances
            (get() as any).persist?.();
        } finally {
            set({ _isRestoring: false } as any);
        }
    };

    return {
        MAX_HISTORY: 20,
        _isRestoring: false,
        _historyPaused: 0,
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,

        // Debounced so one user action (e.g. a repeat tool adding 30 objects) = one history entry
        saveState: (immediate = false) => {
            const { canvas, _isRestoring, _historyPaused } = get() as any;
            if (!canvas || _isRestoring || _historyPaused > 0) return;
            if (immediate) return commit();
            cancelTimer();
            timer = setTimeout(commit, 150);
        },

        undo: async () => {
            const { canvas, _isRestoring } = get() as any;
            if (!canvas || _isRestoring) return;

            commit(); // flush any pending change so it can be undone too

            const { undoStack, redoStack } = get() as any;
            if (undoStack.length <= 1) return;

            const current = undoStack[undoStack.length - 1];
            const newUndo = undoStack.slice(0, -1);
            const target = newUndo[newUndo.length - 1];

            set({
                undoStack: newUndo,
                redoStack: [current, ...redoStack],
                canUndo: newUndo.length > 1,
                canRedo: true,
            } as any);

            await restore(target);
        },

        redo: async () => {
            const { canvas, _isRestoring } = get() as any;
            if (!canvas || _isRestoring) return;

            cancelTimer();
            const { undoStack, redoStack } = get() as any;
            if (redoStack.length === 0) return;

            const [next, ...rest] = redoStack;
            const newUndo = [...undoStack, next];

            set({
                undoStack: newUndo,
                redoStack: rest,
                canUndo: true,
                canRedo: rest.length > 0,
            } as any);

            await restore(next);
        },

        clearHistory: () => {
            cancelTimer();
            set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false } as any);
        },

        // Call once after the canvas is ready AND after any saved JSON has been loaded.
        // Without a base snapshot the first change can never be undone.
        initHistory: () => {
            get().clearHistory();
            commit();
        },

        // Use around multi-step internal operations (e.g. text editing swaps objects in/out)
        pauseHistory: () => set({ _historyPaused: (get() as any)._historyPaused + 1 } as any),
        resumeHistory: () =>
            set({ _historyPaused: Math.max(0, (get() as any)._historyPaused - 1) } as any),

        registerHistoryEvents: (canvas) => {
            const onChange = (e: any) => {
                const o = e?.target;
                // ignore UI helpers (node anchors, connector lines, guides...)
                if (!o || o.excludeFromExport || o._isHelper) return;
                get().saveState();
            };
            handlers = {
                'object:added': onChange,
                'object:removed': onChange,
                'object:modified': onChange,
                'text:editing:exited': () => get().saveState(),
            };
            Object.entries(handlers).forEach(([name, fn]) => canvas.on(name, fn));
        },

        unregisterHistoryEvents: (canvas) => {
            if (!handlers) return;
            Object.entries(handlers).forEach(([name, fn]) => canvas.off(name, fn));
            handlers = null;
            cancelTimer();
        },
    };
};
