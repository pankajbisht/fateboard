import * as fabric from 'fabric';

import { fateboardCanvasConfig } from '@/components/config/fateboard.config';
import { MultiStopGradientTool } from '@/lib/utils/GradientTool';
// import { enterTextEdit } from '@/lib/utils/enterTextEdit';
import { DEFAULT_CANVAS_PRESET } from '@/components/organisms/board/board.config';
import type { CanvasPreset } from '@/components/organisms/board/board.type';
import { CUSTOM_PROPS, serializeCanvas } from '@/lib/serialization';
import { projectStorage, type StoredBoard } from '@/lib/storage';
import { emptyAnimation } from '@/animation/engine';
import { getDefaultCanvasPreset } from './createSettingSlice';

/**
 * Custom properties saved with every object.
 * Import this same list in createUndoRedoSlice so undo/redo keeps connectors and
 * text shapes intact.
 */
export const SERIALIZE_PROPS: string[] = [...CUSTOM_PROPS];

// Autosave goes through `projectStorage` (IndexedDB, whole project: BUG-004 / Q5).
const PERSIST_DELAY_MS = 300;

/** Firefox reports some wheels in lines (`deltaMode` 1). */
const WHEEL_LINE_PX = 16;
/**
 * Zoom per wheel pixel. A mouse notch (~100 px) zooms ~14 %; a trackpad pinch sends many small
 * deltas, so it gets a stronger rate to feel the same.
 */
const WHEEL_ZOOM_RATE = 0.0015;
const PINCH_ZOOM_RATE = 0.01;
const PINCH_DELTA_MAX = 50;

/** Pen (P), Pencil (Shift + P) and Laser (K) work with `createDrawingToolsSlice` / the brush slice. */
type CanvasTool = 'select' | 'pan' | 'draw' | 'node' | 'pen' | 'pencil' | 'laser';

type CanvasObject = any;
type CanvasInstance = fabric.Canvas;
type CanvasEvent = any;
type SliceSet = (partial: any, replace?: boolean, action?: string) => void;
type SliceGet = () => any;

type EventHandler = (...args: any[]) => void;

// interface EditingSession {
//     canvas: CanvasInstance;
//     group: CanvasObject;
//     text: CanvasObject;
//     onChanged: EventHandler;
//     onExit: EventHandler;
//     finished: boolean;
// }

const typeOf = (object: CanvasObject): string => String(object?.type ?? '').toLowerCase();

const isGradient = (fill: unknown): boolean => fill instanceof fabric.Gradient;

/** Hands `json` to the browser as a download. */
const downloadText = (json: string, fileName: string) => {
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

export const createCanvasSlice = (set: SliceSet, get: SliceGet, _store?: unknown) => {
    // Private lifecycle state: these values are not part of Zustand.
    let panCanvas: CanvasInstance | null = null;
    /** What a held Space replaced, to hand back on release. Null when not held. */
    let temporaryPan: {
        canvas: CanvasInstance;
        isDrawingMode: boolean;
        selection: boolean;
        skipTargetFind: boolean;
        defaultCursor: string;
        objects: CanvasObject[];
    } | null = null;
    let persistTimer: ReturnType<typeof setTimeout> | undefined;
    let eventHandlers: Record<string, EventHandler> | null = null;
    let filteringSelection = false;

    // While > 0, persist() does nothing. Used during restore / import / clear so a
    // half-loaded or empty canvas can never overwrite the saved data.
    let persistLock = 0;
    let persistDropped = false; // persist() was called while locked (BUG-186)
    let unloadHandler: (() => void) | null = null;
    // tab hidden (switching away, closing on mobile): save NOW; pagehide can be too late for the
    // async IndexedDB write (BUG-138)
    let visibilityHandler: (() => void) | null = null;
    // The saved project could not be read (BUG-173): nothing writes over it or deletes it until a
    // later read works, because the editor shows an empty board, not the user's project.
    let savedProjectUnread = false;
    // A failed autosave was shown; shown again only after a save works in between (BUG-162).
    let saveFailureShown = false;

    const cancelPersist = () => {
        if (persistTimer !== undefined) {
            clearTimeout(persistTimer);
            persistTimer = undefined;
        }
    };

    /**
     * Save the whole project (every page; the live canvas goes into the current page).
     * Nothing is written before pages exist (restore still running) or while a page is loading,
     * so a half-loaded canvas never lands in the wrong page.
     */
    const writeProjectToStorage = () => {
        if (savedProjectUnread) return;
        try {
            const doc = get().captureProject?.({ thumbnail: false });

            if (!doc) return;

            projectStorage
                .save(doc)
                .then(() => {
                    saveFailureShown = false;
                })
                .catch((error) => {
                    console.error('[canvas] failed to save the project:', error);
                    reportSaveFailure();
                });
        } catch (error) {
            console.error('[canvas] failed to serialize the project:', error);
        }
    };

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

    /** Write any pending debounced save immediately (dispose, tab close). */
    const flushPersist = () => {
        if (persistTimer === undefined) return;

        cancelPersist();

        if (persistLock > 0 || get().isPageSwitching) return;

        if (!get().canvas) return;

        writeProjectToStorage();
    };

    const attachUnloadHandler = () => {
        if (typeof window === 'undefined' || unloadHandler) return;

        unloadHandler = () => flushPersist();

        window.addEventListener('beforeunload', unloadHandler);
        window.addEventListener('pagehide', unloadHandler);
    };

    const detachUnloadHandler = () => {
        if (typeof window === 'undefined' || !unloadHandler) return;

        window.removeEventListener('beforeunload', unloadHandler);
        window.removeEventListener('pagehide', unloadHandler);

        unloadHandler = null;
    };

    /**
     * A new board starts at Settings > Canvas size. Plain state, not `setSelectedPreset`:
     * it is the base of the new board, not an edit (no undo step, no autosave of its own).
     */
    const applyDefaultPreset = () => {
        const settings = get().settings;
        if (!settings) return;
        const preset = getDefaultCanvasPreset(settings);
        set(
            { selectedPreset: preset, pageWidth: preset.width, pageHeight: preset.height },
            false,
            'canvas/defaultPreset',
        );
    };

    const cleanupEditingSession = (commit = false) => {
        get().closeShapeTextEditor?.(commit);
    };

    /**
     * On-screen pixels -> canvas pixels. In design mode the canvas is shown scaled down
     * (CSS size < document size), so a 1px mouse move is more than 1 document pixel.
     */
    const getCssToCanvasScale = (canvas: CanvasInstance): number => {
        const rect = canvas.upperCanvasEl?.getBoundingClientRect();
        if (!rect || !rect.width) return 1;
        return canvas.getWidth() / rect.width || 1;
    };

    const panHandlers = {
        down: (opt: CanvasEvent) => {
            const canvas = get().canvas;

            if (!canvas || (get().activeTool !== 'pan' && !temporaryPan)) return;

            // Do not begin panning with a non-primary mouse button.
            if (opt?.e?.button !== undefined && opt.e.button !== 0) {
                return;
            }

            set({ isPanning: true });

            canvas.setCursor('grabbing');
            canvas.requestRenderAll();
        },

        move: (opt: CanvasEvent) => {
            if (!get().isPanning) return;

            const canvas = get().canvas;
            const event = opt?.e;

            if (!canvas || !event) return;

            // Page `panBy`: design scrolls the board (the viewport stays identity, BUG-007),
            // whiteboard pans the viewport. Touch pans there too (lib/canvas/touchGestures).
            get().panBy(Number(event.movementX) || 0, Number(event.movementY) || 0);
        },

        up: () => {
            const canvas = get().canvas;

            if (!get().isPanning) return;

            set({ isPanning: false });

            if (canvas) {
                canvas.setCursor(get().activeTool === 'pan' || temporaryPan ? 'grab' : 'default');

                canvas.requestRenderAll();
            }
        },
    };

    /** Wheel delta in px (Firefox may report lines or pages). */
    const wheelPx = (e: WheelEvent, canvas: CanvasInstance) => {
        const unit =
            e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? canvas.getHeight() || 800 : 1;
        return { dx: (e.deltaX || 0) * unit, dy: (e.deltaY || 0) * unit };
    };

    const detachPanHandlers = (canvas: CanvasInstance | null = panCanvas) => {
        if (!canvas) return;

        canvas.off('mouse:down', panHandlers.down);
        canvas.off('mouse:move', panHandlers.move);
        canvas.off('mouse:up', panHandlers.up);

        if (panCanvas === canvas) {
            panCanvas = null;
        }
    };

    return {
        canvas: null as CanvasInstance | null,

        activeTool: 'select' as CanvasTool,
        isPanning: false,
        isDrawingMode: false,
        freeDrawingBrush: null,

        activePanel: null,
        selectedObject: null as unknown,
        showTextToolbar: false,
        isEditingText: false,
        hasActiveShape: false,

        geditor: null,
        /** bumps when the gradient tool edits a fill on the canvas (panels re-read the object) */
        fillRevision: 0,
        cw: 0,
        ch: 0,

        selectedPreset: DEFAULT_CANVAS_PRESET as CanvasPreset,

        /**
         * THE page size (one source, BUG-007). A document change: one undo step, autosaved, and
         * stored with the page (BUG-109). CanvasBoard re-sizes the canvas from it.
         */
        setSelectedPreset: (preset: CanvasPreset) => {
            if (!preset) return;
            const prev: CanvasPreset | undefined = get().selectedPreset;
            set(
                { selectedPreset: preset, pageWidth: preset.width, pageHeight: preset.height },
                false,
                'create/preset',
            );
            const changed =
                !prev ||
                prev.id !== preset.id ||
                prev.width !== preset.width ||
                prev.height !== preset.height;
            if (!changed) return;
            get().saveState?.();
            get().persist?.();
        },

        hasMultipleSelection: () => {
            const canvas = get().canvas;

            return !!canvas && canvas.getActiveObjects().length > 1;
        },

        filterUnlockedSelection: () => {
            const canvas = get().canvas;

            if (!canvas || filteringSelection) return false;

            const selection = canvas.getActiveObject();

            if (!selection || typeOf(selection) !== 'activeselection') {
                return false;
            }

            const objects = selection.getObjects();
            const unlocked = objects.filter((object: CanvasObject) => !object._locked);

            if (unlocked.length === objects.length) return false;

            filteringSelection = true;

            try {
                if (unlocked.length === 0) {
                    canvas.discardActiveObject();
                    canvas.requestRenderAll();
                    return true;
                }

                // Release the old selection before creating the replacement.
                canvas.discardActiveObject();

                const activeSelection = new fabric.ActiveSelection(unlocked, {
                    canvas,
                });

                canvas.setActiveObject(activeSelection);
                canvas.requestRenderAll();

                return true;
            } finally {
                filteringSelection = false;
            }
        },

        setSelectedObject: (value: unknown = null) => {
            set({ selectedObject: value });
        },

        setActiveTool: (tool: CanvasTool) => {
            const canvas = get().canvas;

            if (!canvas) return;

            cleanupEditingSession(true);
            temporaryPan = null; // a real tool change replaces whatever a held Space would restore

            set({
                activeTool: tool,
                isDrawingMode: tool === 'draw' || tool === 'pencil',
                isPanning: false,
            });

            const activeObject = canvas.getActiveObject();

            get().disablePan();

            canvas.isDrawingMode = false;
            canvas.selection = true;
            canvas.skipTargetFind = false;
            canvas.defaultCursor = 'default';

            switch (tool) {
                case 'pan': {
                    canvas.defaultCursor = 'grab';
                    canvas.selection = false;
                    canvas.skipTargetFind = true;

                    canvas.discardActiveObject();

                    get().enablePan();
                    break;
                }

                case 'draw': {
                    canvas.isDrawingMode = true;
                    // the brush slice is the only writer of freeDrawingBrush (BUG-021): rebuild it
                    // from the brush settings instead of overwriting colour / width here
                    get().initBrush?.();

                    canvas.selection = false;
                    break;
                }

                case 'pencil': {
                    // freehand like Draw, with the pencil's own style (brush slice, BUG-021)
                    canvas.isDrawingMode = true;
                    get().initBrush?.();
                    canvas.selection = false;
                    break;
                }

                case 'pen':
                case 'laser': {
                    // the drawing-tools slice takes the clicks; nothing on the board is picked
                    canvas.discardActiveObject();
                    canvas.selection = false;
                    canvas.skipTargetFind = true;
                    canvas.defaultCursor = 'crosshair';
                    break;
                }

                case 'node': {
                    // Fabric selection / moving off: the node editor slice handles clicks
                    // (click a shape to edit its nodes). Objects themselves are not touched.
                    canvas.selection = false;
                    canvas.skipTargetFind = true;
                    canvas.defaultCursor = 'crosshair';
                    if (activeObject) get().enterNodeMode?.();
                    break;
                }

                case 'select':
                default: {
                    break;
                }
            }

            canvas.requestRenderAll();
        },

        enablePan: () => {
            const canvas = get().canvas;

            if (!canvas) return;

            // Prevent handlers from remaining attached to an old instance.
            if (panCanvas === canvas) return;

            detachPanHandlers();

            panCanvas = canvas;

            canvas.on('mouse:down', panHandlers.down);
            canvas.on('mouse:move', panHandlers.move);
            canvas.on('mouse:up', panHandlers.up);
        },

        /**
         * Mouse wheel / trackpad on the board, like FigJam / Excalidraw / Figma. Whiteboard: scroll
         * moves the board (Shift + wheel sideways), Ctrl / ⌘ + wheel or a trackpad pinch zooms at
         * the pointer. Design page: Ctrl / ⌘ + wheel zooms the page (through `setZoom`, the one zoom
         * path); a plain wheel is left to the browser, which scrolls the board. Returns true when
         * the wheel was used: the caller cancels the browser's own scroll / page zoom.
         */
        wheelNavigate: (e: WheelEvent): boolean => {
            const canvas = get().canvas;
            if (!canvas || !e) return false;

            const { dx, dy } = wheelPx(e, canvas);
            const zoomGesture = e.ctrlKey || e.metaKey; // a pinch arrives as Ctrl + wheel
            const rate = Math.abs(dy) < PINCH_DELTA_MAX ? PINCH_ZOOM_RATE : WHEEL_ZOOM_RATE;
            const factor = Math.exp(-dy * rate);

            if (get().boardMode !== 'whiteboard') {
                if (!zoomGesture) return false;
                get().setZoom(get().zoom * factor);
                return true;
            }

            // offsetX/Y are CSS pixels; Fabric expects canvas pixels
            const k = getCssToCanvasScale(canvas);
            if (zoomGesture) {
                get().setZoom(canvas.getZoom() * factor, {
                    x: (e.offsetX ?? 0) * k,
                    y: (e.offsetY ?? 0) * k,
                });
            } else {
                // a mouse has one wheel: Shift turns it into a sideways scroll
                const [panX, panY] = e.shiftKey && !dx ? [dy, 0] : [dx, dy];
                get().panBy(-panX, -panY);
            }
            return true;
        },

        handleWheel: (opt: CanvasEvent) => {
            const e = opt?.e as WheelEvent | undefined;
            if (!e || !get().wheelNavigate(e)) return;
            e.preventDefault();
            e.stopPropagation(); // the board's own listener (grey area, CanvasBoard) must not repeat it
        },

        /**
         * Hold Space: the Hand tool for a moment, without leaving the current tool. A real tool
         * change would drop the selection and end the drawing session.
         */
        beginTemporaryPan: () => {
            const { canvas, activeTool } = get();
            if (!canvas || temporaryPan) return false;
            if (activeTool !== 'select' && activeTool !== 'draw' && activeTool !== 'pencil')
                return false;
            // something else owns the pointer (line drawing, gradient handles)
            if (activeTool === 'select' && !canvas.selection) return false;

            temporaryPan = {
                canvas,
                isDrawingMode: canvas.isDrawingMode,
                selection: canvas.selection,
                skipTargetFind: canvas.skipTargetFind,
                defaultCursor: canvas.defaultCursor,
                objects: canvas.getActiveObjects(),
            };
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.skipTargetFind = true;
            canvas.defaultCursor = 'grab';
            canvas.setCursor('grab');
            get().enablePan();
            return true;
        },

        endTemporaryPan: () => {
            const saved = temporaryPan;
            temporaryPan = null;
            const canvas = get().canvas;
            if (!saved || canvas !== saved.canvas) return;

            get().disablePan();
            canvas.isDrawingMode = saved.isDrawingMode;
            canvas.selection = saved.selection;
            canvas.skipTargetFind = saved.skipTargetFind;
            canvas.defaultCursor = saved.defaultCursor;
            canvas.setCursor(saved.defaultCursor);

            // with target finding off, Fabric treats the drag's mouse-down as a click on nothing
            if (canvas.getActiveObject()) return;
            const onBoard = canvas.getObjects();
            const objects = saved.objects.filter((o) => onBoard.includes(o));
            if (objects.length === 1) canvas.setActiveObject(objects[0]);
            else if (objects.length > 1)
                canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
            canvas.requestRenderAll();
        },

        disablePan: () => {
            detachPanHandlers();

            set({ isPanning: false });

            const canvas = get().canvas;

            if (canvas && get().activeTool !== 'pan') {
                canvas.setCursor('default');
            }
        },

        syncFromObject: (obj: CanvasObject) => {
            if (!obj) return;

            const fill = obj.fill;

            set({
                fill: isGradient(fill)
                    ? get().fill
                    : typeof fill === 'string' && fill
                      ? fill
                      : '#ffffff',

                stroke: obj.stroke || '#111827',

                // Zero is a valid stroke width.
                strokeWidth: obj.strokeWidth ?? 2,

                strokeStyle: obj.strokeDashArray
                    ? obj.strokeDashArray[0] === 10
                        ? 'dashed'
                        : 'dotted'
                    : 'solid',
            });
        },

        clearBoard: () => {
            const canvas = get().canvas;

            if (!canvas) return;

            cancelPersist();
            cleanupEditingSession(false);

            get().clearGradientSession?.();

            canvas.discardActiveObject();

            // canvas.clear() fires object:removed for every object. Lock persistence so
            // those events can't schedule a save of the empty canvas.
            persistLock++;

            try {
                canvas.clear();
                canvas.backgroundColor = fateboardCanvasConfig.bg;
            } finally {
                persistLock--;
            }

            cancelPersist();

            // New board = new project: one empty page, and no saved copy. A project that could not
            // be read is kept: the user never saw it (BUG-173).
            if (!savedProjectUnread) {
                projectStorage.clear().catch((error) => {
                    console.error('[canvas] failed to clear the saved project:', error);
                });
            }

            get().loadAnimationData?.(emptyAnimation());
            applyDefaultPreset();
            set({ pages: [], currentPageId: null }, false, 'canvas/clearBoard:pages');
            get().initPages?.();
            // a new board is a new history: without a base snapshot the first change could
            // not be undone (BUG-156)
            get().initHistory?.();

            set({
                selectedObject: null,
                showTextToolbar: false,
                isEditingText: false,
                hasActiveShape: false,
                isPanning: false,
                fillMode: 'solid',
            });

            get().clearToolbar();
            canvas.requestRenderAll();
        },

        exportJSON: () => {
            const canvas = get().canvas;

            return canvas ? serializeCanvas(canvas, SERIALIZE_PROPS) : null;
        },

        /**
         * Load a canvas JSON document.
         * `persist: false` is used when restoring from storage (no point writing back
         * the data we just read).
         */
        importJSON: async (
            json: unknown,
            options: { persist?: boolean; undoable?: boolean } = {},
        ) => {
            // undoable: replacing the page is ONE undo step (opening a file, Q11); else history restarts
            const { persist: shouldPersist = true, undoable = false } = options;
            const canvas = get().canvas;

            if (!canvas || !json || typeof json !== 'object') {
                return;
            }

            cancelPersist();
            cleanupEditingSession(false);

            if (undoable) get().saveState?.(true); // the page as it was = the step to go back to
            get().pauseHistory?.();

            // Loading fires object:added for every object; don't save mid-load.
            persistLock++;

            try {
                canvas.discardActiveObject();

                await canvas.loadFromJSON(json);

                // Restore dependent UI state after deserialization.
                set({
                    selectedObject: null,
                    showTextToolbar: false,
                    isEditingText: false,
                    hasActiveShape: false,
                });

                get().clearGradientSession?.();

                canvas.requestRenderAll();
            } catch (error) {
                console.error('Failed to import canvas JSON:', error);
                throw error;
            } finally {
                persistLock--;
                get().resumeHistory?.();
            }

            if (undoable) get().saveState?.(true);
            else get().initHistory?.();

            if (shouldPersist) {
                get().persist();
            }
        },

        /**
         * Load the last saved board from storage into the current canvas.
         * Safe to call right after init(): persistence is locked synchronously, so
         * nothing can overwrite the saved data before it has been read.
         */
        restoreFromStorage: async (): Promise<boolean> => {
            const canvas = get().canvas;

            if (!canvas) return false;

            persistLock++;
            persistDropped = false;
            let saveEditsAfter = false; // edited during the read: saved once unlocked (BUG-186)

            try {
                let saved: StoredBoard | null;
                try {
                    saved = await projectStorage.load();
                    savedProjectUnread = false;
                } catch (error) {
                    // Not "nothing saved": the project may be there. Never write over it (BUG-173).
                    console.error('[canvas] the saved board could not be read:', error);
                    savedProjectUnread = true;
                    void Promise.resolve(
                        get().alertDialog?.({
                            title: "Your saved board couldn't be read",
                            message:
                                'This browser did not let fateboard read its saved board (for example in a private window). It is kept as it is, and changes are not saved automatically until you reload. Use Save to keep a file of your work.',
                        }),
                    );
                    return false;
                }

                // Canvas was disposed/replaced while we were reading.
                if (get().canvas !== canvas) return false;

                // nothing saved: the first board starts at the default size
                if (!saved) {
                    if (canvas.getObjects().length === 0) applyDefaultPreset();
                    saveEditsAfter = persistDropped;
                    return false;
                }

                // The user already started drawing; don't clobber it.
                if (canvas.getObjects().length > 0) return false;

                let opened = false;
                try {
                    if (saved.kind === 'project') {
                        // every page + the page that was open (BUG-004)
                        opened = (await get().importProject?.(saved.project)) === true;
                    } else {
                        // Saved before projects were autosaved: becomes Page 1 (initPages adopts it).
                        await get().importJSON(saved.canvasJSON, { persist: false });
                        opened = true;
                    }
                } catch (error) {
                    console.error('[canvas] the saved board could not be loaded:', error);
                }
                if (!opened) {
                    applyDefaultPreset(); // an empty new board replaces it
                    await keepUnreadableBoard(saved);
                }

                return opened;
            } catch (error) {
                console.error('Failed to restore canvas from storage:', error);
                return false;
            } finally {
                persistLock--;
                if (saveEditsAfter && get().canvas === canvas) get().persist();
            }
        },

        saveBoard: () => {
            const canvas = get().canvas;

            if (!canvas) return;

            try {
                // the whole project (all pages, pages slice); a single board if pages are absent
                const json =
                    get().exportProject?.() ??
                    JSON.stringify(serializeCanvas(canvas, SERIALIZE_PROPS));

                downloadText(json, 'drawing.fateboard');
            } catch (error) {
                console.error('Failed to export canvas:', error);
            }
        },

        clearToolbar: () => {
            set(
                {
                    selectedObject: null,
                    showTextToolbar: false,
                    isEditingText: false,
                    hasActiveShape: false,
                },
                false,
                'create/clear',
            );
        },

        setToolbar: (e: CanvasEvent, isEditing = false) => {
            const canvas = get().canvas;

            const obj = canvas?.getActiveObject() ?? e?.target ?? e?.selected?.[0];

            const type = typeOf(obj);

            if (type === 'textbox') {
                set(
                    {
                        selectedObject: obj,
                        showTextToolbar: true,
                        isEditingText: isEditing,
                    },
                    false,
                    'create/select',
                );

                get().syncFromObject(obj);
                return;
            }

            // text shapes / sticky notes: hand over the object so the one text float
            // (CanvasBoard + FloatingTextToolbar) can anchor to it; header text tools stay off
            if ((obj as { isTextShape?: boolean } | undefined)?.isTextShape) {
                set(
                    { selectedObject: obj, showTextToolbar: false, isEditingText: false },
                    false,
                    'create/select',
                );
                return;
            }

            if (
                obj?.customType === 'shape' ||
                obj?.customType === 'textbox' ||
                type === 'group' ||
                type === 'activeselection' ||
                type === 'image' ||
                (e?.selected?.length ?? 0) > 0
            ) {
                set(
                    {
                        selectedObject: 'shape',
                        showTextToolbar: false,
                        isEditingText: false,
                    },
                    false,
                    'create/select',
                );

                return;
            }

            set(
                {
                    selectedObject: null,
                    showTextToolbar: false,
                    isEditingText: false,
                },
                false,
                'create/select',
            );
        },

        loadLib: (canvas: CanvasInstance) => {
            const editor = new MultiStopGradientTool(canvas, () => get().fill, {
                // on-canvas handle drags: refresh the Fill panel + record history (saveState is
                // debounced, so one drag = one undo step). Before, gradient edits were never saved.
                onChange: () => {
                    set((s: { fillRevision?: number }) => ({
                        fillRevision: (s.fillRevision ?? 0) + 1,
                    }));
                    get().saveState?.();
                },
            });

            set({ geditor: editor }, false, 'create/gradient');
        },

        defaultSettings: () => {
            // the page size comes from `selectedPreset` (BUG-007); the format only tells a
            // whiteboard from a page (export scale)
            get().setPageFormat(get().settings.freehand ? 'Freehand' : 'A4', 'landscape');
            get().setBrush();
        },

        mount: (canvas: CanvasInstance) => {
            set({ canvas }, false, 'create/mount');
        },

        create: (el: HTMLCanvasElement, container?: HTMLElement) => {
            const canvas = new fabric.Canvas(el, {
                backgroundColor: fateboardCanvasConfig.bg,
                preserveObjectStacking: true,
                stopContextMenu: true,
            });

            if (get().settings.freehand && container) {
                set(
                    {
                        cw: container.clientWidth,
                        ch: container.clientHeight,
                    },
                    false,
                    'create/clientHW',
                );
            }

            return canvas;
        },

        init: (el: HTMLCanvasElement, container?: HTMLElement) => {
            // No `disposingCanvas` guard: dispose() nulls the store synchronously, so a
            // new surface can init immediately after a mode switch.
            if (!el || get().canvas) return;

            const canvas = get().create(el, container);

            try {
                get().mount(canvas);
                get().defaultSettings();
                get().loadLib(canvas);
                get().registerCanvasEvents(canvas);

                attachUnloadHandler();

                // The synchronous part of this call locks persistence before any event
                // can schedule a save, then loads the saved board asynchronously.
                // Pages are initialised only AFTER the restore finishes, so "Page 1"
                // captures the restored board instead of an empty canvas.
                void Promise.resolve(get().restoreFromStorage())
                    .catch((err) => console.error('[init] restore failed', err))
                    .finally(() => {
                        // The surface may have been disposed (mode switch) while restoring.
                        if (get().canvas !== canvas) return;
                        get().initPages();
                        get().applyCanvasSizeSetting();
                    });
            } catch (error) {
                get().unregisterCanvasEvents(canvas);
                detachPanHandlers(canvas);
                detachUnloadHandler();

                void canvas.dispose();

                set({ canvas: null, geditor: null }, false, 'create/init-error');

                throw error;
            }
        },

        dispose: async () => {
            const canvas = get().canvas;

            if (!canvas) return;

            // Save anything still waiting on the debounce BEFORE the store is nulled.
            cleanupEditingSession(true);
            flushPersist();
            detachPanHandlers(canvas);
            detachUnloadHandler();

            get().unregisterCanvasEvents(canvas);

            // Null the store BEFORE awaiting Fabric. The code up to the first `await`
            // runs synchronously, so by the time the caller continues, store.canvas is
            // already null.
            set(
                {
                    canvas: null,
                    geditor: null,
                    isPanning: false,
                    isDrawingMode: false,
                    activeConnector: null,
                },
                false,
                'create/dispose',
            );

            try {
                // Fabric v6 disposal is asynchronous; it only touches the old canvas/element.
                await canvas.dispose();
            } catch (error) {
                console.error('Failed to dispose canvas:', error);
            }
        },

        /** Debounced save of the whole canvas. */
        persist: () => {
            if (persistLock > 0) {
                persistDropped = true;
                return;
            }

            cancelPersist();

            persistTimer = setTimeout(() => {
                persistTimer = undefined;

                if (persistLock > 0) return;

                if (!get().canvas) return;

                // A page is loading: save once it is done (showPage persists at the end too).
                if (get().isPageSwitching) {
                    get().persist();
                    return;
                }

                writeProjectToStorage();
            }, PERSIST_DELAY_MS);
        },

        flushPersist: () => {
            flushPersist();
        },

        /**
         * Settings > Canvas size / Orientation changed since the editor was last open: the open
         * page takes that size, as one undo step (owner, 2026-11-11). A whiteboard has no page
         * size, so the change waits for the next design board.
         */
        applyCanvasSizeSetting: () => {
            const { canvas, settings } = get();
            if (!canvas || !settings || settings.freehand) return;
            if (!get().takePendingCanvasSize?.()) return;
            get().setSelectedPreset(getDefaultCanvasPreset(settings));
        },

        /**
         * Persist on content changes that selection/modify events don't cover:
         * object:added, object:removed, path:created, text:changed.
         */
        handlePersistEvent: (e: CanvasEvent) => {
            const obj = e?.target ?? e?.path;

            // Skip helper objects (node handles, guides, connector handles, etc.).
            if (obj?.excludeFromExport) return;

            get().persist();
        },

        handleSelectionChange: (e: CanvasEvent) => {
            const canvas = get().canvas;

            if (!canvas) return;

            // Connector handles are helper objects: selecting one must not touch the
            // toolbar, the transform panel or the undo history.
            if (canvas.getActiveObject()?.customType === 'connector-handle') return;

            if (get().filterUnlockedSelection()) return;

            const obj = canvas.getActiveObject();
            const count = canvas.getActiveObjects().length;

            set({ hasActiveShape: count > 0 }, false, 'create/isActive');

            if (obj && !obj.excludeFromExport) {
                get().clearGradientSession?.();

                set({
                    fillMode: isGradient(obj.fill) ? 'gradient' : 'solid',
                });
            }

            get().setToolbar(e);

            // X Y W H R + anchor work on a single object AND on a multi-selection (as one box)
            if (obj) get().updateFromFabric(obj);

            // Selecting does not change the document: no undo snapshot (BUG-034: this serialised the
            // whole canvas on every selection) and no persist(). Content changes are recorded by
            // the history events and handlePersistEvent / handleObjectChange.
            // Content changes are saved by handlePersistEvent / handleObjectChange.
        },

        handleMouseDown: (e: CanvasEvent) => {
            // Selection events are the source of truth for selection changes.
            if (get().activeTool !== 'select' || !e?.target) return;
        },

        /**
         * Keep the transform panel (X Y W H R) in step with mouse moves / scales / rotations.
         * Before, it only synced on selection change, so the next panel edit or flip used stale
         * values and snapped the object back.
         */
        handleTransformSync: (e: CanvasEvent) => {
            const active = get().canvas?.getActiveObject();
            if (!active || active.excludeFromExport) return;
            if (e?.target && e.target !== active) return;
            get().updateFromFabric(active);
        },

        handleSelectionClear: () => {
            get().updateFromFabric(undefined); // panel: nothing selected
            set(
                {
                    hasActiveShape: false,
                    fillMode: 'solid',
                },
                false,
                'create/selection-clear',
            );

            get().clearGradientSession?.();
            get().clearToolbar();
        },

        handleObjectChange: (e: CanvasEvent) => {
            const obj = e?.target;

            if (!obj) return;

            get().handleTransformSync(e);
            // linked clones follow through the history listener (lib/linkedClones)

            get().persist();
        },

        handleDBLClick: (e: CanvasEvent) => {
            const canvas = get().canvas;
            const group = e?.target;

            if (!canvas || !group?.isTextShape) return;

            get().editShapeText(group);
        },

        registerCanvasEvents: (canvas: CanvasInstance) => {
            // Avoid stacking handlers if registration is called again.
            if (eventHandlers) {
                get().unregisterCanvasEvents(canvas);
            }

            eventHandlers = {
                'selection:created': get().handleSelectionChange,
                'selection:updated': get().handleSelectionChange,
                'selection:cleared': get().handleSelectionClear,
                'mouse:down': get().handleMouseDown,
                'mouse:dblclick': get().handleDBLClick,
                // wheel / trackpad: scroll and zoom in every tool (not only the Hand)
                'mouse:wheel': get().handleWheel,
                'object:modified': get().handleObjectChange,
                // live transform panel while dragging handles
                'object:moving': get().handleTransformSync,
                'object:scaling': get().handleTransformSync,
                'object:rotating': get().handleTransformSync,
                'object:skewing': get().handleTransformSync,
                'object:resizing': get().handleTransformSync,

                // Content changes that were previously never saved.
                'object:added': get().handlePersistEvent,
                'object:removed': get().handlePersistEvent,
                'path:created': get().handlePersistEvent,
                'text:changed': get().handlePersistEvent,
            };

            Object.entries(eventHandlers).forEach(([name, handler]) => {
                canvas.on(name as any, handler as any);
            });

            if (typeof document !== 'undefined' && !visibilityHandler) {
                visibilityHandler = () => {
                    if (document.visibilityState === 'hidden') flushPersist();
                };
                document.addEventListener('visibilitychange', visibilityHandler);
            }

            // every content change becomes an undo step (BUG-006)
            get().registerHistoryEvents?.(canvas);

            // edits keep animation rest states current (BUG-011)
            get().registerAnimationEvents?.(canvas);

            // Text-in-shape resizing, connectors, hover outline. Idempotent per canvas,
            // and installed BEFORE restoreFromStorage() loads the saved board so
            // reloaded text shapes / connectors are rebuilt correctly.
            get().installShapeBehavior?.(canvas);
        },

        unregisterCanvasEvents: (canvas: CanvasInstance) => {
            if (visibilityHandler && typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', visibilityHandler);
                visibilityHandler = null;
            }
            get().unregisterHistoryEvents?.(canvas);
            get().unregisterAnimationEvents?.(canvas);
            if (!eventHandlers) return;

            Object.entries(eventHandlers).forEach(([name, handler]) => {
                canvas.off(name as any, handler as any);
            });

            eventHandlers = null;
        },
    };
};
