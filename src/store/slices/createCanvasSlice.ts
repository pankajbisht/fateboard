import * as fabric from 'fabric';

import { fateboardCanvasConfig } from '@/components/config/fateboard.config';
import { MultiStopGradientTool } from '@/lib/utils/GradientTool';
// import { enterTextEdit } from '@/lib/utils/enterTextEdit';
import { DEFAULT_CANVAS_PRESET } from '@/components/organisms/board/board.config';
import type { CanvasPreset } from '@/components/organisms/board/board.type';
import { CUSTOM_PROPS, serializeCanvas } from '@/lib/serialization';
import { projectStorage } from '@/lib/storage/projectStorage';
import { emptyAnimation } from '@/animation/engine';

/**
 * Custom properties saved with every object.
 * Import this same list in createUndoRedoSlice so undo/redo keeps connectors and
 * text shapes intact.
 */
export const SERIALIZE_PROPS: string[] = [...CUSTOM_PROPS];

// Autosave goes through `projectStorage` (IndexedDB, whole project: BUG-004 / Q5).
const PERSIST_DELAY_MS = 300;

type CanvasTool = 'select' | 'pan' | 'draw' | 'node';

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

export const createCanvasSlice = (set: SliceSet, get: SliceGet, _store?: unknown) => {
    // Private lifecycle state: these values are not part of Zustand.
    let panCanvas: CanvasInstance | null = null;
    let persistTimer: ReturnType<typeof setTimeout> | undefined;
    let eventHandlers: Record<string, EventHandler> | null = null;
    let filteringSelection = false;

    // While > 0, persist() does nothing. Used during restore / import / clear so a
    // half-loaded or empty canvas can never overwrite the saved data.
    let persistLock = 0;
    let unloadHandler: (() => void) | null = null;

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
        try {
            const doc = get().captureProject?.({ thumbnail: false });

            if (!doc) return;

            projectStorage.save(doc).catch((error) => {
                console.error('[canvas] failed to save the project:', error);
            });
        } catch (error) {
            console.error('[canvas] failed to serialize the project:', error);
        }
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

    const removeNodes = () => {
        const canvas = get().canvas;

        if (!canvas) {
            set({ nodes: [] });
            return;
        }

        const nodes = get().nodes ?? [];

        nodes.forEach((node: CanvasObject) => {
            if (node.connectorLine) {
                canvas.remove(node.connectorLine);
            }

            canvas.remove(node);
        });

        set({ nodes: [] });
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
        wheel: (opt: CanvasEvent) => {
            const canvas = get().canvas;
            const event = opt?.e;

            if (!canvas || !event) return;

            const factor = Math.pow(0.999, event.deltaY);

            // ONE zoom path (BUG-025): the page slice's setZoom keeps `zoom` and the view in step.
            // Design: zoom state only (CanvasBoard re-draws); whiteboard: around the pointer.
            if (get().boardMode === 'design') {
                get().setZoom(get().zoom * factor);
            } else {
                // offsetX/Y are CSS pixels; Fabric expects canvas pixels
                const k = getCssToCanvasScale(canvas);
                get().setZoom(canvas.getZoom() * factor, {
                    x: event.offsetX * k,
                    y: event.offsetY * k,
                });
            }

            event.preventDefault();
            event.stopPropagation();
        },

        down: (opt: CanvasEvent) => {
            const canvas = get().canvas;

            if (!canvas || get().activeTool !== 'pan') return;

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

            const mx = Number(event.movementX) || 0;
            const my = Number(event.movementY) || 0;

            // Design: the viewport stays identity (CanvasBoard owns it, BUG-007); pan = scroll the board.
            if (get().boardMode === 'design') {
                const scroller = canvas.wrapperEl?.closest?.('[data-board-scroll]') as
                    HTMLElement | null | undefined;
                scroller?.scrollBy(-mx, -my);
                return;
            }

            const k = getCssToCanvasScale(canvas);
            canvas.relativePan(new fabric.Point(mx * k, my * k));
            canvas.requestRenderAll();
        },

        up: () => {
            const canvas = get().canvas;

            if (!get().isPanning) return;

            set({ isPanning: false });

            if (canvas) {
                canvas.setCursor(get().activeTool === 'pan' ? 'grab' : 'default');

                canvas.requestRenderAll();
            }
        },
    };

    const detachPanHandlers = (canvas: CanvasInstance | null = panCanvas) => {
        if (!canvas) return;

        canvas.off('mouse:wheel', panHandlers.wheel);
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

            set({
                activeTool: tool,
                isDrawingMode: tool === 'draw',
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
                    removeNodes();
                    break;
                }

                case 'draw': {
                    if (!canvas.freeDrawingBrush) {
                        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                    }

                    canvas.isDrawingMode = true;
                    canvas.freeDrawingBrush.color = get().color || '#000000';

                    canvas.freeDrawingBrush.width = Math.max(1, Number(get().width) || 1);

                    canvas.selection = false;

                    removeNodes();
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

            canvas.on('mouse:wheel', panHandlers.wheel);
            canvas.on('mouse:down', panHandlers.down);
            canvas.on('mouse:move', panHandlers.move);
            canvas.on('mouse:up', panHandlers.up);
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
            removeNodes();

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

            // New board = new project: one empty page, and no saved copy.
            projectStorage.clear().catch((error) => {
                console.error('[canvas] failed to clear the saved project:', error);
            });

            get().loadAnimationData?.(emptyAnimation());
            set({ pages: [], currentPageId: null }, false, 'canvas/clearBoard:pages');
            get().initPages?.();

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
        importJSON: async (json: unknown, options: { persist?: boolean } = {}) => {
            const { persist: shouldPersist = true } = options;
            const canvas = get().canvas;

            if (!canvas || !json || typeof json !== 'object') {
                return;
            }

            cancelPersist();
            cleanupEditingSession(false);

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

            get().initHistory?.();

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

            try {
                const saved = await projectStorage.load();

                if (!saved) return false;

                // Canvas was disposed/replaced while we were reading.
                if (get().canvas !== canvas) return false;

                // The user already started drawing; don't clobber it.
                if (canvas.getObjects().length > 0) return false;

                if (saved.kind === 'project') {
                    // every page + the page that was open (BUG-004)
                    return (await get().importProject?.(saved.project)) === true;
                }

                // Saved before projects were autosaved: becomes Page 1 (initPages adopts it).
                await get().importJSON(saved.canvasJSON, { persist: false });

                return true;
            } catch (error) {
                console.error('Failed to restore canvas from storage:', error);
                return false;
            } finally {
                persistLock--;
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

                const blob = new Blob([json], {
                    type: 'application/json',
                });

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                link.href = url;
                link.download = 'drawing.fateboard';

                document.body.appendChild(link);
                link.click();
                link.remove();

                // Give the browser time to start the download.
                setTimeout(() => URL.revokeObjectURL(url), 1000);
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
            const { format, orientation } = get().settings;

            get().setPageFormat(format, orientation);
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
                        if (get().canvas === canvas) get().initPages();
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
            if (persistLock > 0) return;

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
         * Persist on content changes that selection/modify events don't cover:
         * object:added, object:removed, path:created, text:changed.
         */
        handlePersistEvent: (e: CanvasEvent) => {
            const obj = e?.target ?? e?.path;

            // Skip helper objects (node handles, guides, connector handles, etc.).
            if (obj?.excludeFromExport) return;

            if (obj && (get().nodes ?? []).includes(obj)) return;

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

            get().saveState();

            // Selecting does not change the document, so no persist() here anymore.
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
