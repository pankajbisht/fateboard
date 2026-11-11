import type { SliceCreator } from '../types';
import { CUSTOM_PROPS, serializeCanvas } from '@/lib/serialization';
import { createSnapshotAssets } from '@/lib/snapshotAssets';

/** Snapshots keep every custom prop (BUG-003): text shapes, connectors, locks, filters, layers. */
export const SERIALIZE_PROPS: string[] = [...CUSTOM_PROPS];

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

type HistoryCanvas = Parameters<typeof serializeCanvas>[0] & {
    loadFromJSON: (json: string | Record<string, unknown>) => Promise<unknown>;
    discardActiveObject: () => void;
    requestRenderAll: () => void;
    getActiveObject?: () => { isEditing?: boolean; exitEditing?: () => void } | undefined;
};

/** What this slice reads from other slices (Canvas, Pages, NodeEditor, Shape); see STATE.md §10. */
type Peers = {
    canvas?: HistoryCanvas | null;
    isPageSwitching?: boolean;
    nodeEditor?: unknown;
    cancelNodeMode?: () => void;
    closeShapeTextEditor?: (commit: boolean) => void;
    clearToolbar?: () => void;
    rebuildLinks?: (canvas: HistoryCanvas) => void;
    persist?: () => void;
    /** Layers: linked clones follow the object that changed (lib/linkedClones). */
    syncLinkedClones?: (sources?: unknown[]) => void;
    /** Canvas: THE page size (BUG-007); part of every snapshot so undo restores it too. */
    selectedPreset?: { id: string; width: number; height: number } | null;
    setSelectedPreset?: (preset: never) => void;
    /** Animation: re-pose objects at the playhead after a restore (BUG-140). */
    tracks?: Record<string, unknown>;
    currentTime?: number;
    seek?: (ms: number) => void;
};

/** Snapshot key for the page size; removed again before Fabric loads the JSON. */
const PAGE_KEY = 'fateboardPage';

type PageState = {
    currentPageId?: string | null;
    isPageSwitching?: boolean;
    pages?: { id: string }[];
};

/**
 * Model: undoStack's LAST item is always the CURRENT canvas state.
 *   undo -> move current to redoStack, restore the item before it
 *   redo -> move first redo item to undoStack, restore it
 *
 * Every content change is recorded: the canvas slice calls `registerHistoryEvents` (object
 * added / removed / modified, text edits), store actions may also call `saveState()`.
 *
 * Per page (owner decision Q7): `undoStack` / `redoStack` always belong to the CURRENT page. When
 * `currentPageId` changes, the old page's stacks are parked in a closure map and the new page's
 * come back (a page seen for the first time starts with a fresh base snapshot once it has
 * loaded). Undo can therefore never load another page's content.
 */
export const createUndoRedoSlice: SliceCreator<UndoRedoSlice> = (set, get, store) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let handlers: Record<string, (e?: any) => void> | null = null;
    /** Parked history of the pages that are not shown. */
    const pageStacks = new Map<string, { undo: string[]; redo: string[] }>();
    const peers = () => get() as unknown as UndoRedoSlice & Peers;
    /** Embedded photos are kept once for every snapshot of every page (BUG-155). */
    const assets = createSnapshotAssets();

    /** Canvas content + page size, as one string (equal strings = nothing changed). */
    const snapshot = (canvas: HistoryCanvas): string => {
        const json = serializeCanvas(canvas, SERIALIZE_PROPS);
        const page = peers().selectedPreset;
        return assets.stringify(page ? { ...json, [PAGE_KEY]: page } : json);
    };

    /** Snapshots were dropped: let go of the photos only they used. */
    const pruneAssets = () => {
        if (!assets.size()) return;
        const { undoStack, redoStack } = peers();
        const live = [...undoStack, ...redoStack];
        for (const parked of pageStacks.values()) live.push(...parked.undo, ...parked.redo);
        assets.prune(live);
    };

    const cancelTimer = () => {
        if (timer) clearTimeout(timer);
        timer = null;
    };

    // Takes the snapshot and pushes it on the stack
    const commit = (force = false) => {
        cancelTimer();
        const {
            canvas,
            _isRestoring,
            _historyPaused,
            undoStack,
            redoStack,
            MAX_HISTORY,
            isPageSwitching,
        } = peers();
        if (!canvas || _isRestoring || _historyPaused > 0) return;
        if (isPageSwitching && !force) return; // loading a page is not an edit

        const state = snapshot(canvas);
        if (undoStack[undoStack.length - 1] === state) return; // nothing actually changed

        const next = [...undoStack, state].slice(-(MAX_HISTORY + 1)); // enforce limit
        set({
            undoStack: next,
            redoStack: [], // new change invalidates redo
            canUndo: next.length > 1,
            canRedo: false,
        });
        if (redoStack.length || next.length <= undoStack.length) pruneAssets();
    };

    /**
     * Before undo / redo: an open editing session must end first, or the restore would load the
     * canvas under it. Node editing is cancelled (that IS the undo of its unsaved changes) and
     * reports `true` so the caller stops there; the shape text editor is committed.
     */
    const endEditingSessions = (): boolean => {
        const s = peers();
        if (s.nodeEditor) {
            s.cancelNodeMode?.();
            return true;
        }
        s.closeShapeTextEditor?.(true);
        // typing in a canvas text box: finish it, so the text becomes one undo step
        const active = s.canvas?.getActiveObject?.();
        if (active?.isEditing) active.exitEditing?.();
        return false;
    };

    // loadFromJSON is Promise-based in Fabric v6 (the callback form is v5 only)
    const restore = async (state: string) => {
        const { canvas } = peers();
        set({ _isRestoring: true });
        try {
            const { [PAGE_KEY]: page, ...json } = assets.parse(state) as Record<string, unknown>;
            await canvas.loadFromJSON(json);
            const current = peers().selectedPreset;
            const saved = page as Peers['selectedPreset'];
            if (
                saved &&
                (saved.id !== current?.id ||
                    saved.width !== current?.width ||
                    saved.height !== current?.height)
            ) {
                peers().setSelectedPreset?.(saved as never); // no history while restoring
            }
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            peers().clearToolbar?.();
            peers().rebuildLinks?.(canvas); // optional hook: re-link __text/__box/__instances
            // snapshots hold rest values: show the animation at the playhead again (BUG-140)
            const anim = peers();
            if (anim.tracks && Object.keys(anim.tracks).length) anim.seek?.(anim.currentTime ?? 0);
            peers().persist?.();
        } finally {
            set({ _isRestoring: false });
        }
    };

    /**
     * A snapshot that cannot be loaded leaves the canvas as it was (Fabric replaces the objects
     * only after all of them are built), so the stacks go back too: history and canvas stay in
     * step, and the action never throws (BUG-154).
     */
    const restoreOrRevert = async (
        state: string,
        before: { undoStack: string[]; redoStack: string[] },
    ) => {
        try {
            await restore(state);
        } catch (error) {
            console.error('[history] could not restore a snapshot', error);
            set({
                undoStack: before.undoStack,
                redoStack: before.redoStack,
                canUndo: before.undoStack.length > 1,
                canRedo: before.redoStack.length > 0,
            });
        }
    };

    const runUndo = async () => {
        const { canvas, _isRestoring, isPageSwitching } = peers();
        if (!canvas || _isRestoring || isPageSwitching) return;
        if (endEditingSessions()) return;

        commit(); // flush any pending change so it can be undone too

        const { undoStack, redoStack } = peers();
        if (undoStack.length <= 1) return;

        const current = undoStack[undoStack.length - 1];
        const newUndo = undoStack.slice(0, -1);
        const target = newUndo[newUndo.length - 1];

        set({
            undoStack: newUndo,
            redoStack: [current, ...redoStack],
            canUndo: newUndo.length > 1,
            canRedo: true,
        });

        await restoreOrRevert(target, { undoStack, redoStack });
    };

    const runRedo = async () => {
        const { canvas, _isRestoring, isPageSwitching } = peers();
        if (!canvas || _isRestoring || isPageSwitching) return;
        if (endEditingSessions()) return;

        cancelTimer();
        const { undoStack, redoStack } = peers();
        if (redoStack.length === 0) return;

        const [next, ...rest] = redoStack;
        const newUndo = [...undoStack, next];

        set({
            undoStack: newUndo,
            redoStack: rest,
            canUndo: true,
            canRedo: rest.length > 0,
        });

        await restoreOrRevert(next, { undoStack, redoStack });
    };

    /**
     * Undo / redo run one after another: a press during a running restore waits its turn instead
     * of being dropped (fast ⌘Z ⌘Z ⌘Z used to undo only once).
     */
    let queue: Promise<void> = Promise.resolve();
    const enqueue = (job: () => Promise<void>) => (queue = queue.then(job, job));

    // Per-page stacks: park / restore on page change, seed a new page once it has loaded.
    store?.subscribe?.((nextState, previousState) => {
        const state = nextState as unknown as PageState;
        const prevState = previousState as unknown as PageState;
        if (state.currentPageId !== prevState.currentPageId) {
            const from = prevState.currentPageId as string | null;
            const to = state.currentPageId as string | null;
            // the canvas still shows the old page here (loading starts after this set):
            // flush its pending change into ITS history before parking it
            if (from && timer) commit(true);
            const live = peers();
            if (from) pageStacks.set(from, { undo: live.undoStack, redo: live.redoStack });
            // the first page adopts the history recorded before pages existed
            if (from === null) return;
            const next = to ? pageStacks.get(to) : undefined;
            if (to) pageStacks.delete(to);
            cancelTimer();
            set({
                undoStack: next?.undo ?? [],
                redoStack: next?.redo ?? [],
                canUndo: (next?.undo.length ?? 0) > 1,
                canRedo: (next?.redo.length ?? 0) > 0,
            });
        }
        // page finished loading: a page without history gets its base snapshot now; a page with
        // history re-bases its top on the page as loaded (same content, but e.g. the page
        // background is re-applied on load, so the old string would never match again and the
        // next undo / selection recorded a phantom step instead of undoing)
        if (prevState.isPageSwitching && !state.isPageSwitching) {
            const { undoStack, canvas } = peers();
            if (!undoStack.length) commit();
            else if (canvas) {
                const loaded = snapshot(canvas);
                set({ undoStack: [...undoStack.slice(0, -1), loaded] });
            }
        }
        // pages that no longer exist drop their history
        if (state.pages !== prevState.pages && pageStacks.size) {
            const ids = new Set((state.pages ?? []).map((p) => p.id));
            let dropped = false;
            for (const id of pageStacks.keys()) {
                if (ids.has(id)) continue;
                pageStacks.delete(id);
                dropped = true;
            }
            if (dropped) pruneAssets();
        }
    });

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
            const { canvas, _isRestoring, _historyPaused, isPageSwitching } = peers();
            if (!canvas || _isRestoring || _historyPaused > 0) return;
            // every recorded change: linked clones of the selection follow first, so the edit and
            // its copies are ONE undo step
            if (!isPageSwitching) peers().syncLinkedClones?.();
            if (immediate) return commit();
            cancelTimer();
            timer = setTimeout(commit, 150);
        },

        undo: () => enqueue(runUndo),
        redo: () => enqueue(runRedo),

        clearHistory: () => {
            cancelTimer();
            set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false });
            pruneAssets();
        },

        // Call once after the canvas is ready AND after any saved JSON has been loaded.
        // Without a base snapshot the first change can never be undone.
        initHistory: () => {
            get().clearHistory();
            commit();
        },

        // Use around multi-step internal operations (e.g. text editing swaps objects in/out)
        pauseHistory: () => set({ _historyPaused: peers()._historyPaused + 1 }),
        resumeHistory: () => set({ _historyPaused: Math.max(0, peers()._historyPaused - 1) }),

        registerHistoryEvents: (canvas) => {
            if (handlers) peers().unregisterHistoryEvents(canvas);
            const onChange = (e: any) => {
                const o = e?.target;
                // ignore UI helpers (node anchors, connector lines, guides...)
                if (!o || o.excludeFromExport || o._isHelper) return;
                get().saveState();
            };
            // a modified object may not be the selection (node tool commit, programmatic changes):
            // its linked clones follow it before the step is recorded
            const onModified = (e: any) => {
                const o = e?.target;
                const { _isRestoring, isPageSwitching } = peers();
                if (o && !o.excludeFromExport && !_isRestoring && !isPageSwitching)
                    peers().syncLinkedClones?.([o]);
                onChange(e);
            };
            handlers = {
                'object:added': onChange,
                'object:removed': onChange,
                'object:modified': onModified,
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
