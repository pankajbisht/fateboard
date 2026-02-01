import * as fabric from 'fabric';
import db from 'opendb-store';
import { fateboardCanvasConfig } from '@/components/config/fateboard.config';
import { MultiStopGradientTool } from '@/lib/utils/GradientTool';
import { enterTextEdit } from '@/lib/utils/enterTextEdit';
import { updateMaster } from '@/lib/utils/updateMaster';
import { switchCanvasMode } from '@/lib/utils/switchCanvasMode';

export const createCanvasSlice = (set, get, store) => ({
    canvas: null,
    activeTool: 'select', // "select", "pan", "draw"
    isPanning: false,
    isDrawingMode: false,
    freeDrawingBrush: null,
    activePanel: null,
    selectedObject: 'textbox',
    showTextToolbar: true,
    hasActiveShape: false,
    geditor: null,
    cw: 0,
    ch: 0,

    hasMultipleSelection: () => {
        const canvas = get().canvas;
        if (!canvas) return false;
        return canvas.getActiveObjects().length > 1;
    },

    filterUnlockedSelection: (e) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const selection = canvas.getActiveObject();
        if (!selection || selection.type !== 'activeselection') return;

        // guard against infinite loop
        if (selection._filtered) return;

        const objects = selection.getObjects();
        const unlocked = objects.filter((o) => !o._locked);

        // nothing to filter
        if (unlocked.length === objects.length) return;

        // all locked → cancel selection
        if (unlocked.length === 0) {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            return;
        }

        const activeSelection = new fabric.ActiveSelection(unlocked, {
            canvas,
        });

        activeSelection._filtered = true;

        canvas.setActiveObject(activeSelection);
        canvas.requestRenderAll();
    },

    setSelectedObject: () => {
        set({ selectedObject: false });
    },

    setActiveTool: (tool) => {
        const canvas = get().canvas;
        if (!canvas) return;
        set({ activeTool: tool });

        const activeObject = canvas.getActiveObject();

        switch (tool) {
            case 'pan':
                canvas.isDrawingMode = false;
                canvas.defaultCursor = 'grab';
                canvas.selection = false;
                canvas.skipTargetFind = true;
                get().enablePan();

                // Remove nodes if any
                get().nodes.forEach((n) => {
                    if (n.connectorLine) canvas.remove(n.connectorLine);
                    canvas.remove(n);
                });
                set({ nodes: [] });
                break;

            case 'draw':
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush.color = '#000';
                canvas.selection = false;
                canvas.skipTargetFind = false;
                // remove nodes
                get().nodes.forEach((n) => {
                    if (n.connectorLine) canvas.remove(n.connectorLine);
                    canvas.remove(n);
                });
                set({ nodes: [] });
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
        if (!canvas) return;

        console.log('Pan tool enabled');
        // Wheel zoom to pointer
        canvas.on('mouse:wheel', (opt) => {
            const e = opt.e;
            let zoom = canvas.getZoom();
            const zoomFactor = Math.pow(0.999, e.deltaY);
            zoom *= zoomFactor;
            zoom = Math.min(Math.max(zoom, 0.1), 5);
            const pt = new fabric.Point(e.offsetX, e.offsetY);
            canvas.zoomToPoint(pt, zoom);
            e.preventDefault();
            e.stopPropagation();
        });

        // Pan handlers (active only when tool === 'pan')
        canvas.on('mouse:down', () => {
            if (get().activeTool === 'pan') {
                set({ isPanning: true });
                canvas.setCursor('grabbing');
                canvas.requestRenderAll();
            }
        });

        canvas.on('mouse:move', (opt) => {
            if (!get().isPanning) return;
            const e = opt.e;
            canvas.relativePan(new fabric.Point(e.movementX, e.movementY));
            canvas.requestRenderAll();
        });

        canvas.on('mouse:up', () => {
            if (!get().isPanning) return;
            set({ isPanning: false });
            canvas.setCursor('grab');
            canvas.requestRenderAll();
        });
    },

    syncFromObject: (obj) => {
        if (!obj) return;
        set({
            fill: obj.fill || '#ffffff',
            stroke: obj.stroke || '#111827',
            strokeWidth: obj.strokeWidth || 2,
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

        db.local.clear();
        canvas.clear();
        canvas.backgroundColor = '#FFF';
        canvas.requestRenderAll();
    },

    saveBoard: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const json = JSON.stringify(canvas.toJSON(['backgroundColor', 'customId']));
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'drawing.fateboard'; // <-- changed extension here
        link.click();
        URL.revokeObjectURL(link.href);
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
        const obj = e.target;

        if (obj?.type === 'textbox') {
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
            obj?.type == 'group' ||
            obj?.type == 'activeselection' ||
            obj?.type == 'image'
        ) {
            set(
                {
                    selectedObject: 'shape',
                },
                false,
                'create/select',
            );
        } else {
            set(
                {
                    selectedObject: null,
                },
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

        if (get().settings.freehand) {
            set(
                {
                    cw: container.clientWidth,
                    ch: container.clientHeight,
                },
                false,
                'create/clientHW',
            );
        }

        canvas.backgroundColor = fateboardCanvasConfig.bg;

        return canvas;
    },

    init: async (el, container) => {
        if (!el || get().canvas) return;

        const canvas = get().create(el, container);
        get().mount(canvas);
        get().defaultSettings();
        get().loadLib(canvas);
        get().registerCanvasEvents(canvas);
    },

    handleSelectionChange: (e) => {
        const { canvas } = get();
        const obj = e.target;
        const count = canvas.getActiveObjects().length;

        const persist = () => db.local.set('drawJson', canvas.toJSON());

        set({ hasActiveShape: count > 0 }, false, 'create/isActive');
        get().setToolbar(e);
        get().updateFromFabric(obj);
        get().saveState();
        persist();
        get().filterUnlockedSelection(e);
    },

    handleSelectionClear: (e) => {
        get().clearToolbar();
    },

    handleObjectChange: (e) => {
        const obj = e.target as any;
        if (!obj) return;

        // Only propagate from master
        if (obj.__instances && obj.__instances.length > 0) {
            updateMaster(obj);
        }
    },

    handleDBLClick: (e) => {
        const group = e.target;
        if (!group || group.type !== 'group' || !group.__text) return;

        console.log(group.__text);

        enterTextEdit(group, group.__text);

        group.__text.on('changed', function () {
            const group = this.__group;
            if (!group) return;

            const box = group.__box;
            if (!box) return;

            const padding = 20; // optional padding around text

            // Resize background width
            box.width = Math.max(this.width + padding, box.width);

            // Resize background height
            box.height = Math.max(this.height + padding, box.height);

            (window as any).gradientEditor = editor;
            group.setCoords();
            canvas.requestRenderAll();
        });

        group.__text.on('editing:exited', function () {
            const canvas = this.canvas;
            const group = this.__group;
            if (!group) return;

            const center = this.getCenterPoint();

            // Reset text scale
            this.scaleX /= group.scaleX || 1;
            this.scaleY /= group.scaleY || 1;

            // Add text back
            group.add(this);

            // Restore transform
            group.set({
                left: center.x,
                top: center.y,
                angle: this.angle,
                flipX: this.flipX,
                flipY: this.flipY,
                scaleX: 1,
                scaleY: 1,
            });

            canvas.remove(this);
            canvas.add(group);
            canvas.setActiveObject(group);

            group.setCoords();
            canvas.requestRenderAll();
        });
    },

    registerCanvasEvents: (canvas) => {
        canvas.on('selection:created', get().handleSelectionChange);
        canvas.on('selection:updated', get().handleSelectionChange);
        canvas.on('selection:cleared', get().handleSelectionClear);
        canvas.on('mouse:down', get().handleSelectionChange);
        canvas.on('mouse:dblclick', get().handleDBLClick);
        canvas.on('object:modified', get().handleObjectChange);
    },
});
