import * as fabric from 'fabric';
import db from 'opendb-store';
import { fateboardCanvasConfig } from '@/components/config/fateboard.config';
import { MultiStopGradientTool } from '@/lib/utils/GradientTool';
import { enterTextEdit } from '@/lib/utils/enterTextEdit';
import { updateMaster } from '@/lib/utils/updateMaster';
import { switchCanvasMode } from '@/lib/utils/switchCanvasMode';

// Custom props that must survive save / reload (otherwise customId, locks, shapes are lost)
const SERIALIZE_PROPS = ['backgroundColor', 'customId', 'customType', '_locked'];

// Fabric v6 reports types capitalised ('Textbox', 'ActiveSelection'), v5 lowercase.
const typeOf = (o) => (o?.type || '').toLowerCase();

export const createCanvasSlice = (set, get, store) => {
    // ---- private (non-store) state ----
    let panBound = false;
    let persistTimer = null;
    let eventHandlers = null;

    const removeNodes = () => {
        const canvas = get().canvas;
        if (!canvas) return;
        (get().nodes || []).forEach((n) => {
            if (n.connectorLine) canvas.remove(n.connectorLine);
            canvas.remove(n);
        });
        set({ nodes: [] });
    };

    // Pan / zoom handlers kept as named refs so they can be removed (no duplicate listeners)
    const panHandlers = {
        wheel: (opt) => {
            const canvas = get().canvas;
            const e = opt.e;
            let zoom = canvas.getZoom() * Math.pow(0.999, e.deltaY);
            zoom = Math.min(Math.max(zoom, 0.1), 5);
            canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
            e.preventDefault();
            e.stopPropagation();
        },
        down: () => {
            const canvas = get().canvas;
            set({ isPanning: true });
            canvas.setCursor('grabbing');
            canvas.requestRenderAll();
        },
        move: (opt) => {
            if (!get().isPanning) return;
            const canvas = get().canvas;
            const e = opt.e;
            const dx = e.movementX ?? 0;
            const dy = e.movementY ?? 0;
            canvas.relativePan(new fabric.Point(dx, dy));
            canvas.requestRenderAll();
        },
        up: () => {
            if (!get().isPanning) return;
            const canvas = get().canvas;
            set({ isPanning: false });
            canvas.setCursor('grab');
            canvas.requestRenderAll();
        },
    };

    return {
        canvas: null,
        activeTool: 'select', // "select", "pan", "draw", "node"
        isPanning: false,
        isDrawingMode: false,
        freeDrawingBrush: null,
        activePanel: null,
        selectedObject: 'textbox',
        showTextToolbar: true,
        isEditingText: false,
        hasActiveShape: false,
        geditor: null,
        cw: 0,
        ch: 0,

        hasMultipleSelection: () => {
            const canvas = get().canvas;
            if (!canvas) return false;
            return canvas.getActiveObjects().length > 1;
        },

        // Returns true if it changed the selection (caller should stop and wait for the new event)
        filterUnlockedSelection: () => {
            const canvas = get().canvas;
            if (!canvas) return false;

            const selection = canvas.getActiveObject();
            if (!selection || typeOf(selection) !== 'activeselection') return false;

            // guard against infinite loop
            if (selection._filtered) return false;

            const objects = selection.getObjects();
            const unlocked = objects.filter((o) => !o._locked);

            // nothing to filter
            if (unlocked.length === objects.length) return false;

            // all locked -> cancel selection
            if (unlocked.length === 0) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
                return true;
            }

            const activeSelection = new fabric.ActiveSelection(unlocked, { canvas });
            activeSelection._filtered = true;

            canvas.setActiveObject(activeSelection);
            canvas.requestRenderAll();
            return true;
        },

        // Was hard-coded to `false`; now accepts a value
        setSelectedObject: (value = null) => {
            set({ selectedObject: value });
        },

        setActiveTool: (tool) => {
            const canvas = get().canvas;
            if (!canvas) return;
            set({ activeTool: tool, isDrawingMode: tool === 'draw' });

            const activeObject = canvas.getActiveObject();

            // Reset to a clean baseline so leaving pan/draw never leaves the canvas stuck
            get().disablePan();
            canvas.isDrawingMode = false;
            canvas.selection = true;
            canvas.skipTargetFind = false;
            canvas.defaultCursor = 'default';

            switch (tool) {
                case 'pan':
                    canvas.defaultCursor = 'grab';
                    canvas.selection = false;
                    canvas.skipTargetFind = true;
                    canvas.discardActiveObject();
                    get().enablePan();
                    removeNodes();
                    break;

                case 'draw':
                    if (!canvas.freeDrawingBrush) {
                        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                    }
                    canvas.isDrawingMode = true;
                    canvas.freeDrawingBrush.color = '#000';
                    canvas.selection = false;
                    removeNodes();
                    break;

                case 'node':
                    switchCanvasMode(canvas, 'node', activeObject);
                    break;

                case 'select':
                default:
                    switchCanvasMode(canvas, 'select');
                    break;
            }

            canvas.requestRenderAll();
        },

        enablePan: () => {
            const canvas = get().canvas;
            if (!canvas || panBound) return; // never bind twice
            panBound = true;
            canvas.on('mouse:wheel', panHandlers.wheel);
            canvas.on('mouse:down', panHandlers.down);
            canvas.on('mouse:move', panHandlers.move);
            canvas.on('mouse:up', panHandlers.up);
        },

        disablePan: () => {
            const canvas = get().canvas;
            if (!canvas || !panBound) return;
            panBound = false;
            canvas.off('mouse:wheel', panHandlers.wheel);
            canvas.off('mouse:down', panHandlers.down);
            canvas.off('mouse:move', panHandlers.move);
            canvas.off('mouse:up', panHandlers.up);
            set({ isPanning: false });
        },

        syncFromObject: (obj) => {
            if (!obj) return;
            set({
                // gradients/patterns are objects, not colours: keep the previous store colour for them
                fill:
                    obj.fill instanceof fabric.Gradient
                        ? get().fill
                        : (typeof obj.fill === 'string' && obj.fill) || '#ffffff',
                stroke: obj.stroke || '#111827',
                strokeWidth: obj.strokeWidth ?? 2, // `||` turned a 0 width into 2
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

            removeNodes();
            db.local.clear();
            canvas.clear();
            canvas.backgroundColor = fateboardCanvasConfig.bg; // was '#FFF', inconsistent with create()
            get().clearToolbar();
            canvas.requestRenderAll();
        },

        saveBoard: () => {
            const canvas = get().canvas;
            if (!canvas) return;

            const json = JSON.stringify(canvas.toObject(SERIALIZE_PROPS));
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'drawing.fateboard';
            document.body.appendChild(link); // required by Firefox
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking instantly can cancel the download
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

        setToolbar: (e, isEditing = false) => {
            const canvas = get().canvas;
            // Fabric v6 selection events have no `target`; fall back to the active object
            const obj = e?.target ?? e?.selected?.[0] ?? canvas?.getActiveObject();
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
            } else if (
                obj?.customType === 'shape' ||
                e?.selected?.length > 0 ||
                type === 'group' ||
                type === 'activeselection' ||
                type === 'image'
            ) {
                set(
                    { selectedObject: 'shape', showTextToolbar: false, isEditingText: false },
                    false,
                    'create/select',
                );
            } else {
                set(
                    { selectedObject: null, showTextToolbar: false, isEditingText: false },
                    false,
                    'create/select',
                );
            }
        },

        loadLib: (canvas) => {
            const editor = new MultiStopGradientTool(canvas, () => get().fill);
            set({ geditor: editor }, false, 'create/gradient');
        },

        defaultSettings: () => {
            const { format, orientation } = get().settings;
            get().setPageFormat(format, orientation);
            get().setBrush();
        },

        mount: (canvas) => {
            set({ canvas }, false, 'create/mount');
        },

        create: (el, container) => {
            const canvas = new fabric.Canvas(el, {
                backgroundColor: fateboardCanvasConfig.bg,
                preserveObjectStacking: true,
            });

            if (get().settings.freehand && container) {
                set(
                    { cw: container.clientWidth, ch: container.clientHeight },
                    false,
                    'create/clientHW',
                );
            }

            return canvas;
        },

        init: (el, container) => {
            if (!el || get().canvas) return;

            const canvas = get().create(el, container);
            get().mount(canvas);
            get().defaultSettings();
            get().loadLib(canvas);
            get().registerCanvasEvents(canvas);
        },

        // NEW: proper teardown (React StrictMode / route change / hot reload)
        dispose: () => {
            const canvas = get().canvas;
            if (!canvas) return;
            clearTimeout(persistTimer);
            get().disablePan();
            get().unregisterCanvasEvents(canvas);
            removeNodes();
            canvas.dispose();
            set({ canvas: null, geditor: null }, false, 'create/dispose');
        },

        persist: () => {
            // debounced; selection/mouse events fire constantly
            clearTimeout(persistTimer);
            persistTimer = setTimeout(() => {
                const canvas = get().canvas;
                if (!canvas) return;
                db.local.set('drawJson', canvas.toObject(SERIALIZE_PROPS));
            }, 300);
        },

        handleSelectionChange: (e) => {
            const canvas = get().canvas;
            if (!canvas) return;

            // Filtering replaces the selection and re-fires this event; wait for that one
            if (get().filterUnlockedSelection()) return;

            const obj = e?.target ?? canvas.getActiveObject();
            const count = canvas.getActiveObjects().length;

            set({ hasActiveShape: count > 0 }, false, 'create/isActive');

            // Selecting a real object ends any gradient-stop editing session and tells the UI
            // whether this object's fill is solid or gradient. Helper handles are ignored.
            if (obj && !obj.excludeFromExport) {
                get().clearGradientSession?.();
                set({ fillMode: obj.fill instanceof fabric.Gradient ? 'gradient' : 'solid' });
            }
            get().setToolbar(e);
            if (obj) get().updateFromFabric(obj);
            get().saveState();
            get().persist();
        },

        handleMouseDown: (e) => {
            // Previously ran full selection handling (save + persist) on every click, even on empty canvas
            if (get().activeTool !== 'select' || !e?.target) return;
            get().handleSelectionChange(e);
        },

        handleSelectionClear: () => {
            get().clearToolbar();
        },

        handleObjectChange: (e) => {
            const obj = e.target;
            if (!obj) return;

            // Only propagate from master
            if (obj.__instances && obj.__instances.length > 0) {
                updateMaster(obj);
            }
            get().persist();
        },

        handleDBLClick: (e) => {
            const group = e.target;
            if (!group || typeOf(group) !== 'group' || !group.__text) return;

            const text = group.__text;
            enterTextEdit(group, text);

            // Named handlers so they are removed on exit (previously stacked on every double-click)
            const onChanged = () => {
                const canvas = get().canvas;
                const box = group.__box;
                if (!canvas || !box) return;

                const padding = 20;
                box.set({
                    width: Math.max(text.width + padding, box.width),
                    height: Math.max(text.height + padding, box.height),
                    dirty: true,
                });
                group.set('dirty', true);
                group.setCoords();
                canvas.requestRenderAll();
            };

            const onExit = () => {
                text.off('changed', onChanged);
                text.off('editing:exited', onExit);

                const canvas = get().canvas;
                if (!canvas) return;

                const center = text.getCenterPoint();

                // Reset text scale
                text.scaleX /= group.scaleX || 1;
                text.scaleY /= group.scaleY || 1;

                // Add text back
                group.add(text);

                // Restore transform
                group.set({
                    left: center.x,
                    top: center.y,
                    angle: text.angle,
                    flipX: text.flipX,
                    flipY: text.flipY,
                    scaleX: 1,
                    scaleY: 1,
                });

                canvas.remove(text);
                canvas.add(group);
                canvas.setActiveObject(group);

                group.setCoords();
                canvas.requestRenderAll();
            };

            text.on('changed', onChanged);
            text.on('editing:exited', onExit);
        },

        registerCanvasEvents: (canvas) => {
            eventHandlers = {
                'selection:created': get().handleSelectionChange,
                'selection:updated': get().handleSelectionChange,
                'selection:cleared': get().handleSelectionClear,
                'mouse:down': get().handleMouseDown,
                'mouse:dblclick': get().handleDBLClick,
                'object:modified': get().handleObjectChange,
            };
            Object.entries(eventHandlers).forEach(([name, fn]) => canvas.on(name, fn));
        },

        unregisterCanvasEvents: (canvas) => {
            if (!eventHandlers) return;
            Object.entries(eventHandlers).forEach(([name, fn]) => canvas.off(name, fn));
            eventHandlers = null;
        },
    };
};
