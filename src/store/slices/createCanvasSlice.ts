import * as fabric from 'fabric';
import db from 'opendb-store';
import { A4, FREEHAND } from '@lib/const/editor.ts';
import { DEFAULT, LANDSCAPE, PAGE_SIZES, PORTRAIT } from '../../lib/const/editor';
import { fateboardCanvasConfig } from '../../components/config/fateboard.config';
import { MultiStopGradientTool } from '../../lib/utils/GradientTool';
import { logger } from '@/lib/utils/logger';
import type { FabricObjectWithMaster } from './createShapeSlice';
import { useStore } from '..';
// import { addPathNodes } from './createNodeEditorSlice';

function enterTextEdit(group, text) {
    const canvas = group.canvas;
    const center = group.getCenterPoint();

    // Normalize text scale
    text.scaleX *= group.scaleX;
    text.scaleY *= group.scaleY;

    // Reset group scale temporarily
    group.scaleX = 1;
    group.scaleY = 1;

    // Remove text from group
    group.remove(text);

    text.set({
        left: center.x,
        top: center.y,
        angle: group.angle,
        flipX: group.flipX,
        flipY: group.flipY,
        originX: 'center',
        originY: 'center',
    });

    canvas.remove(group);
    canvas.add(text);
    canvas.setActiveObject(text);

    text.enterEditing();
    text.selectAll();
    text.setCoords();
    canvas.requestRenderAll();
}

function updateMaster(master: fabric.Object & { __instances?: fabric.Object[] }) {
    if (!master.__instances || master.__instances.length === 0) return;

    const props = {
        // 🎨 Visual
        fill: master.fill,
        stroke: master.stroke,
        strokeWidth: master.strokeWidth,
        strokeDashArray: master.strokeDashArray,
        strokeLineCap: master.strokeLineCap,
        strokeLineJoin: master.strokeLineJoin,
        strokeMiterLimit: master.strokeMiterLimit,
        opacity: master.opacity,
        shadow: master.shadow,
        strokeUniform: master.strokeUniform,

        // 🔄 Transform
        scaleX: master.scaleX,
        scaleY: master.scaleY,
        angle: master.angle,
        skewX: master.skewX,
        skewY: master.skewY,
        flipX: master.flipX,
        flipY: master.flipY,

        // 🧱 Shape specific
        rx: (master as any).rx,
        ry: (master as any).ry,
        radius: (master as any).radius,
        path: (master as any).path,
    };

    master.__instances.forEach((instance) => {
        instance.set(props);
        instance.setCoords();
    });

    master.canvas?.requestRenderAll();
}

// function switchCanvasMode(canvas: fabric.Canvas, mode: 'select' | 'node', activePath?: fabric.Path) {
//     switch (mode) {
//         case 'node':
//             canvas.isDrawingMode = false;
//             canvas.selection = false;       // disable group selection
//             canvas.skipTargetFind = false;  // allow pointer events on nodes

//             // Disable all objects
//             // canvas.getObjects().forEach(obj => {
//             //     obj.selectable = false;
//             //     obj.evented = false;
//             //     if (obj.type === 'path') {
//             //         obj.lockMovementX = true;
//             //         obj.lockMovementY = true;
//             //     }
//             // });

//             canvas.getObjects().forEach(obj => {
//                     if (obj.type === 'path') {
//                         obj.selectable = false;
//                         obj.evented = false;
//                         obj.lockMovementX = true;
//                         obj.lockMovementY = true;
//                     }
//                 });

//             if (activePath) {
//                 // Lock the path so it cannot move
//                 activePath.selectable = false;
//                 activePath.evented = false;
//                 activePath.lockMovementX = true;
//                 activePath.lockMovementY = true;

//                 // Enter node editing: add connectors on top
//                 useStore.getState().enterNodeMode(activePath);
//             }
//             break;

//         case 'select':
//         default:
//             canvas.isDrawingMode = false;
//             canvas.selection = true;
//             canvas.skipTargetFind = false;

//             // Enable all objects
//             canvas.getObjects().forEach(obj => {
//                 obj.selectable = true;
//                 obj.evented = true;
//                 if (obj.type === 'path') {
//                     obj.lockMovementX = false;
//                     obj.lockMovementY = false;
//                 }
//             });

//             // Remove node connectors
//             canvas.getObjects().forEach(obj => {
//                 if (obj.type === 'circle' && obj.hoverCursor === 'pointer') {
//                     canvas.remove(obj);
//                 }
//             });
//             useStore.getState().exitNodeMode(canvas, activePath)

//             break;
//     }

//     canvas.requestRenderAll();
// }

function switchCanvasMode(
    canvas: fabric.Canvas,
    mode: 'select' | 'node',
    activePath?: fabric.Path,
) {
    const store = useStore.getState();

    switch (mode) {
        case 'node':
            canvas.isDrawingMode = false;
            canvas.selection = false; // disable group selection
            canvas.skipTargetFind = false; // allow pointer events on nodes

            // Disable all paths
            canvas.getObjects().forEach((obj) => {
                if (obj.type === 'path') {
                    obj.selectable = false;
                    obj.evented = false;
                    obj.lockMovementX = true;
                    obj.lockMovementY = true;
                }
            });

            if (activePath) {
                // Ensure the active path itself is locked
                activePath.selectable = false;
                activePath.evented = false;
                activePath.lockMovementX = true;
                activePath.lockMovementY = true;

                // Use store to enter node mode
                store.enterNodeMode?.();
            }
            break;

        case 'select':
        default:
            canvas.isDrawingMode = false;
            canvas.selection = true;
            canvas.skipTargetFind = false;

            // Enable all paths
            canvas.getObjects().forEach((obj) => {
                if (obj.type === 'path') {
                    obj.selectable = true;
                    obj.evented = true;
                    obj.lockMovementX = false;
                    obj.lockMovementY = false;
                }
            });

            // Remove all node connectors (circles)
            canvas.getObjects().forEach((obj) => {
                if (obj.type === 'circle' && obj.hoverCursor === 'pointer') {
                    canvas.remove(obj);
                }
            });

            // Exit node mode in store
            // store.exitNodeMode?.(canvas);

            break;
    }

    canvas.requestRenderAll();
}

function normalizePathAfterEdit(path: fabric.Path) {
    if (!path) return;

    // 1️⃣ Recalculate raw path bounding box
    path._setPathDimensions?.();

    // 2️⃣ Include strokeWidth in bounds
    const strokeOffset = path.strokeWidth ? path.strokeWidth / 2 : 0;
    path.width += strokeOffset;
    path.height += strokeOffset;

    // 3️⃣ Update Fabric coords (selection box)
    path.setCoords();
}

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

    init: async (el, container) => {
        if (!el) return;
        if (get().canvas) return;

        const canvas = new fabric.Canvas(el, {
            backgroundColor: fateboardCanvasConfig.bg,
            preserveObjectStacking: true,
            stopContextMenu: true,
            fireRightClick: true,
            // width: container.clientWidth,
            // height: container.clientHeight
        });

        if (get().settings.freehand) {
            set({
                cw: container.clientWidth,
                ch: container.clientHeight,
            });
        }

        canvas.backgroundColor = fateboardCanvasConfig.bg;

        // get().load();
        get().saveState(); // undo/redo
        set({ canvas });
        console.log(get().settings.format, get().settings.orientation);
        get().setPageFormat(get().settings.format, get().settings.orientation);
        get().setBrush();
        // get().toggleGrid();

        console.log('Mode', get().mode);

        const persist = () => db.local.set('drawJson', canvas.toJSON());

        const editor = new MultiStopGradientTool(canvas, () => get().fill);
        set({ geditor: editor });

        const onChangeSelection = (e) => {
            const obj = e.target;

            // console.log('Don', e);

            set({ hasActiveShape: !!obj });
            get().setToolbar(e);
            get().updateFromFabric(obj);
            // get().saveState();
            // persist();
            get().filterUnlockedSelection(e);
            // get().setInputFromFabric(obj)
            // get().syncTransformFromSelection();
            // if (obj) editor.attach(obj);
            // get().setBackgroundColor()
        };

        canvas.on('selection:created', (e) => onChangeSelection(e));
        canvas.on('selection:updated', (e) => onChangeSelection(e));
        canvas.on('selection:cleared', () => {
            get().clearToolbar();
        });

        canvas.on('mouse:down', (e) => onChangeSelection(e));

        // canvas.on("mouse:dblclick", e => {
        //     console.log(e.target.type)
        //   if (e.target?.type === "textbox") {
        //     e.target.enterEditing();
        //     e.target.selectAll();
        //   }
        // });
        //
        canvas.on('mouse:dblclick', (e) => {
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
        });

        // canvas.on('object:modified', (e) => onChangeSelection(e));
        //
        // canvas.on("object:modified", (e) => {
        //     const obj = e.target as FabricObjectWithMaster;
        //     if (!obj) return;

        //     // Only propagate if this object is a master
        //     if (obj.__instances && obj.__instances.length > 0) {
        //         // Sync relevant properties to clones
        //         updateMaster(obj, {
        //             fill: obj.fill,
        //             stroke: obj.stroke,
        //             scaleX: obj.scaleX,
        //             scaleY: obj.scaleY,
        //             angle: obj.angle,
        //             flipX: obj.flipX,
        //             flipY: obj.flipY,
        //         });
        //     }
        // });
        //
        canvas.on('object:modified', (e) => {
            const obj = e.target as any;
            if (!obj) return;

            // Only propagate from master
            if (obj.__instances && obj.__instances.length > 0) {
                updateMaster(obj);
            }
        });
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
                // canvas.isDrawingMode = false;
                // canvas.selection = false;        // disable group selection
                // canvas.skipTargetFind = false;   // enable pointer events on nodes
                // if (activeObject) get().enterNodeMode(activeObject);
                // break;
                //
                console.log(get().setActiveTool);
                switchCanvasMode(canvas, 'node', activeObject);
                break;
            case 'select':
            default:
                // canvas.isDrawingMode = false;
                // canvas.defaultCursor = 'default';
                // canvas.selection = true;        // enable object selection
                // canvas.skipTargetFind = false;  // allow objects to be clicked

                switchCanvasMode(canvas, 'select');

                // Remove nodes if switching from node mode
                // get().nodes.forEach((n) => {
                //     if (n.connectorLine) canvas.remove(n.connectorLine);
                //     canvas.remove(n);
                // });
                // set({ nodes: [] });
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
        set({
            selectedObject: null,
            showTextToolbar: false,
            isEditingText: false,
            hasActiveShape: false,
        });
    },

    setToolbar: (e, isEditing = false) => {
        const obj = e.target;

        if (obj?.type === 'textbox') {
            set({
                selectedObject: obj,
                showTextToolbar: true,
                isEditingText: isEditing,
            });
            get().syncFromObject(obj);
        } else if (
            obj?.customType === 'shape' ||
            e?.selected?.length > 0 ||
            obj?.type == 'group' ||
            obj?.type == 'activeselection' ||
            obj?.type == 'image'
        ) {
            set({
                selectedObject: 'shape',
            });
        } else {
            set({
                selectedObject: null,
            });
        }
    },
});
