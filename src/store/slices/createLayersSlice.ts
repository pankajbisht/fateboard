import type { SliceCreator } from '../types';
import * as fabric from 'fabric';
import { Group } from 'fabric';

export interface LayerSlice {
    layers: any[];
    clipboard: any | null;
    setLayers: (layers: any[]) => void;
    addLayer: (shape: any, shapeType: string) => void;
    renameLayer: (id: number, name: string) => void;
    removeLayer: () => void;
    toggleVisibility: (id: number) => void;
    duplicateLayer: (id: number) => void;
    toggleLayerLock: () => void;
    isActiveObjectLocked: () => boolean;
    toggleActiveObjectLock: () => void;
    bringForward: () => void;
    sendBackward: () => void;
    bringToFront: () => void;
    sendToBack: () => void;
    deleteObject: () => void;
    groupLayers: (ids: number[]) => void;
    ungroupSelected: () => void;
    groupLayers1: (ids: number[]) => void;
    ungroupLayers1: (ids: number[]) => void;
    alignLayers: (type: string, ids: number[]) => void;
    distributeLayers: (direction: string, ids: number[]) => void;
    copy: () => void;
    paste: () => void;
    duplicate: () => void;
    alignObjects: (key: string) => void;
    distributeObjects: (direction: string) => void;
    canPaste: () => boolean;
    isGroupSelected: () => boolean;
}

export const createLayersSlice: SliceCreator<LayerSlice> = (set, get, _store) => ({
    layers: [],
    clipboard: null,

    setLayers: (layers) => set({ layers }),

    addLayer: (shape: any, shapeType: string) => {
        const layers = get().layers || [];
        const id = shape.toObject().id || Date.now();
        set({
            layers: [
                ...layers,
                {
                    id,
                    type: shapeType,
                    object: shape,
                    name: shapeType,
                    visible: true,
                    locked: false,
                },
            ],
        });
        get().canvas?.requestRenderAll();
    },

    renameLayer: (id, name) => {
        const layers = get().layers.map((layer) => {
            if (layer.id === id) layer.name = name;
            return layer;
        });
        set({ layers });
    },

    removeLayer: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        // Get selected objects (multi or single)
        const activeObjects = canvas.getActiveObjects(); // always returns array
        if (!activeObjects || activeObjects.length === 0) return;

        // Remove selected objects from layers
        const layers = get().layers.filter((layer) => !activeObjects.includes(layer.object));
        set({ layers });

        // Remove from canvas
        activeObjects.forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject(); // clear selection
        canvas.requestRenderAll();
    },

    toggleVisibility: (id) => {
        const layers = get().layers.map((layer) => {
            if (layer.id === id) {
                layer.visible = !layer.visible;
                if (layer.object) layer.object.visible = layer.visible;
            }
            return layer;
        });
        set({ layers });
        get().canvas?.requestRenderAll();
    },

    duplicateLayer: (id) => {
        const layer = get().layers.find((l) => l.id === id);
        if (!layer?.object) return;

        layer.object.clone((clone) => {
            // Position the duplicate slightly offset so it’s visible
            clone.set({
                left: layer.object.left + 10,
                top: layer.object.top + 10,
                id: Date.now(), // assign new id
            });

            // Add clone to canvas
            get().canvas.add(clone);
            get().canvas.setActiveObject(clone);
            get().canvas.requestRenderAll();

            // Add duplicate to layers slice
            const layers = get().layers;
            set({
                layers: [
                    ...layers,
                    {
                        id: clone.id,
                        type: layer.type,
                        name: layer.name + '_copy',
                        object: clone,
                    },
                ],
            });
        });
    },

    toggleLayerLock: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        const layers = get().layers.map((layer) => {
            if (layer.object === activeObject) {
                const locked = !layer.locked;

                // Update fabric object directly
                activeObject.selectable = !locked;
                activeObject.evented = !locked;

                return { ...layer, locked };
            }
            return layer;
        });

        console.log(get().layers);

        set({ layers });
    },

    isActiveObjectLocked: () => {
        const obj = get().selectedObject;
        return obj?._locked === true;
    },

    toggleActiveObjectLock: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        const locked = !activeObject._locked;

        if (locked) {
            activeObject.set({
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                hasControls: false,
                _locked: true,
            });

            applyLockStyle(activeObject);
            addLockIcon(canvas, activeObject);
        } else {
            activeObject.set({
                lockMovementX: false,
                lockMovementY: false,
                lockScalingX: false,
                lockScalingY: false,
                lockRotation: false,
                hasControls: true,
                _locked: false,
            });

            removeLockStyle(activeObject);
            removeLockIcon(canvas, activeObject);
        }

        canvas.requestRenderAll();
    },

    toggleActiveObjectLock1: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        const locked = !activeObject._locked;

        if (locked) {
            // Lock but keep selectable
            activeObject.lockMovementX = true;
            activeObject.lockMovementY = true;
            activeObject.lockScalingX = true;
            activeObject.lockScalingY = true;
            activeObject.lockRotation = true;
            activeObject.hasControls = false; // hide resize/rotate handles
            activeObject._locked = true;
        } else {
            // Unlock
            activeObject.lockMovementX = false;
            activeObject.lockMovementY = false;
            activeObject.lockScalingX = false;
            activeObject.lockScalingY = false;
            activeObject.lockRotation = false;
            activeObject.hasControls = true;
            activeObject._locked = false;
        }

        canvas.renderAll();
    },

    lock: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        // 🔑 Normalize to array
        const objects = active.type === 'activeselection' ? active.getObjects() : [active];

        objects.forEach((obj) => {
            if (obj._locked) return;

            obj.set({
                selectable: true,
                evented: true,

                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                hasControls: false,
                _locked: true,
            });

            applyLockStyle(obj);
            addLockIcon(canvas, obj);
        });

        canvas.discardActiveObject();
        canvas.requestRenderAll();
    },

    unlock: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        const objects = active.type === 'activeselection' ? active.getObjects() : [active];

        objects.forEach((obj) => {
            if (!obj._locked) return;

            obj.set({
                lockMovementX: false,
                lockMovementY: false,
                lockScalingX: false,
                lockScalingY: false,
                lockRotation: false,
                hasControls: true,

                _locked: false,
            });

            removeLockStyle(obj);
            removeLockIcon(canvas, obj);
        });

        canvas.requestRenderAll();
    },

    bringForward: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObjects = canvas.getActiveObjects();
        if (!activeObjects.length) return;

        activeObjects.forEach((obj) => {
            if (obj.type !== 'activeselection') {
                const i = canvas.getObjects().indexOf(obj);
                canvas.moveObjectTo(obj, i + 1);
            }
        });

        canvas.requestRenderAll();
    },

    sendBackward: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObjects = canvas.getActiveObjects();
        if (!activeObjects.length) return;

        activeObjects.forEach((obj) => {
            if (obj.type !== 'activeselection') {
                const i = canvas.getObjects().indexOf(obj);
                canvas.moveObjectTo(obj, Math.max(0, i - 1));
            }
        });

        canvas.requestRenderAll();
    },

    bringToFront: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObjects = canvas.getActiveObjects();
        if (!activeObjects.length) return;

        activeObjects.forEach((obj) => {
            if (obj.type !== 'activeselection') {
                canvas.moveObjectTo(obj, canvas.getObjects().length - 1);
            }
        });

        canvas.requestRenderAll();
    },

    sendToBack: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObjects = [...canvas.getActiveObjects()];
        if (!activeObjects.length) return;

        canvas.getActiveObjects().forEach((obj) => {
            if (obj.type !== 'activeselection') {
                canvas.moveObjectTo(obj, 0);
            }
        });

        canvas.requestRenderAll();
    },

    deleteObject: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        const activeObjects = canvas.getActiveObjects();
        if (!activeObjects) return;

        activeObjects.forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    },

    groupLayers: (ids) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const objects = canvas.getActiveObjects();
        get().deleteObject();
        const group = new Group(objects);
        canvas.add(group);
        canvas.requestRenderAll();
    },

    ungroupSelected: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const object = canvas.getActiveObject() as Group;
        if (!object) return;
        canvas.remove(object);
        canvas.add(...object.removeAll());
        canvas.requestRenderAll();
    },

    // Group selected layers
    groupLayers1: (ids) => {
        const state = get();
        const newGroupId = 'group-' + Date.now();
        const groupLayer = {
            id: newGroupId,
            name: 'Group',
            visible: true,
            locked: false,
            parentId: null,
        };

        const updatedLayers = state.layers.map((l) => {
            if (ids.includes(l.id)) return { ...l, parentId: newGroupId };
            return l;
        });

        set({ layers: [...updatedLayers, groupLayer] });
    },

    // Ungroup selected group layers
    ungroupLayers1: (ids) => {
        const state = get();
        const updatedLayers = state.layers
            .map((l) => {
                if (ids.includes(l.id) && l.children?.length) return null; // remove group
                if (ids.includes(l.parentId)) return { ...l, parentId: null }; // lift children
                return l;
            })
            .filter(Boolean);
        set({ layers: updatedLayers });
    },

    // Align selected layers
    alignLayers: (type, ids) => {
        const state = get();
        if (!ids.length) return;
        const selected = state.layers.filter((l) => ids.includes(l.id));
        let reference;
        switch (type) {
            case 'left':
                reference = Math.min(...selected.map((l) => l.x || 0));
                break;
            case 'center':
                reference = Math.round(
                    selected.reduce((sum, l) => sum + (l.x || 0), 0) / selected.length,
                );
                break;
            case 'right':
                reference = Math.max(...selected.map((l) => (l.x || 0) + (l.width || 0)));
                break;
            default:
                return;
        }

        const aligned = state.layers.map((l) =>
            ids.includes(l.id)
                ? { ...l, x: type === 'right' ? reference - (l.width || 0) : reference }
                : l,
        );
        set({ layers: aligned });
    },

    // Distribute selected layers
    distributeLayers: (direction, ids) => {
        const state = get();
        const selected = state.layers.filter((l) => ids.includes(l.id));
        if (selected.length < 3) return; // nothing to distribute

        if (direction === 'horizontal') {
            const sorted = selected.sort((a, b) => (a.x || 0) - (b.x || 0));
            const minX = sorted[0].x || 0;
            const maxX = sorted[sorted.length - 1].x || 0;
            const gap = (maxX - minX) / (sorted.length - 1);
            const updated = state.layers.map((l) => {
                const idx = sorted.findIndex((s) => s.id === l.id);
                if (idx >= 0) return { ...l, x: minX + gap * idx };
                return l;
            });
            set({ layers: updated });
        }

        if (direction === 'vertical') {
            const sorted = selected.sort((a, b) => (a.y || 0) - (b.y || 0));
            const minY = sorted[0].y || 0;
            const maxY = sorted[sorted.length - 1].y || 0;
            const gap = (maxY - minY) / (sorted.length - 1);
            const updated = state.layers.map((l) => {
                const idx = sorted.findIndex((s) => s.id === l.id);
                if (idx >= 0) return { ...l, y: minY + gap * idx };
                return l;
            });
            set({ layers: updated });
        }
    },

    copy: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        activeObject.clone().then((cloned) => {
            set({ clipboard: cloned });
        });
    },

    cut: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        activeObject.clone().then((cloned) => {
            set({ clipboard: cloned });
            canvas.remove(activeObject);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        });
    },

    paste: async () => {
        const canvas = get().canvas;
        const clipboard = get().clipboard;
        if (!canvas || !clipboard) return;

        const clonedObj = await clipboard.clone();
        canvas.discardActiveObject();

        clonedObj.set({
            left: clonedObj.left + 10,
            top: clonedObj.top + 10,
            evented: true,
            customType: 'shape',
        });

        if (clonedObj.type === 'activeselection') {
            clonedObj.canvas = canvas;
            clonedObj.forEachObject((obj) => canvas.add(obj));
            clonedObj.setCoords();
        } else {
            canvas.add(clonedObj);
        }

        set({ clipboard: clonedObj }); // update offset for next paste

        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
    },

    duplicate: async () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        const clonedObj = await activeObject.clone();
        canvas.discardActiveObject();

        clonedObj.set({
            left: clonedObj.left + 10,
            top: clonedObj.top + 10,
            evented: true,
        });

        console.log(clonedObj.type);

        if (clonedObj.type === 'activeselection') {
            clonedObj.canvas = canvas;
            clonedObj.forEachObject((obj) => canvas.add(obj));
            clonedObj.setCoords();
        } else {
            canvas.add(clonedObj);
        }

        set({ clipboard: clonedObj }); // update offset for next paste

        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
    },

    cloneer: async (offset = 20) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        // Clone geometry
        const clone = await active.clone();

        // Offset
        clone.left = (active.left ?? 0) + offset;
        clone.top = (active.top ?? 0) + offset;

        // Link to master
        (clone as FabricObjectWithMaster).__master = active;
        (active as FabricObjectWithMaster).__instances?.push(clone);

        // Add to canvas and select
        canvas.add(clone);
        canvas.setActiveObject(clone);
        canvas.requestRenderAll();
    },

    clone: async (offset = 20) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObject() as any;
        if (!active) return;

        const clone = await active.clone();

        clone.set({
            left: (active.left ?? 0) + offset,
            top: (active.top ?? 0) + offset,
        });

        // Link
        active.__instances ??= [];
        clone.__master = active;
        active.__instances.push(clone);

        canvas.add(clone);
        canvas.setActiveObject(clone);
        canvas.requestRenderAll();
    },

    clone1: async (offset = 20) => {
        const canvas = get().canvas;
        if (!canvas) return;

        let active = canvas.getActiveObject();
        if (!active) return;

        // 1️⃣ Convert ActiveSelection → Group
        if (active.type === 'activeselection') {
            active = (active as fabric.ActiveSelection).toGroup();
            canvas.discardActiveObject();
            canvas.add(active);
        }

        try {
            // 2️⃣ Clone parent (async)
            let clonedParent = await active.clone();

            // 3️⃣ If cloned parent has children but is not a Group, wrap it in a Group
            if ((clonedParent as any)._objects && clonedParent.type !== 'group') {
                console.log('her....');
                const objects = (clonedParent as any)._objects;
                clonedParent = new fabric.Group(objects, {
                    left: (active.left ?? 0) + offset,
                    top: (active.top ?? 0) + offset,
                    scale: active.scale,
                });
            } else {
                console.log('123her....');

                // Offset if already a Group
                clonedParent.set({
                    left: (active.left ?? 0) + offset,
                    top: (active.top ?? 0) + offset,
                    scale: active.scale,
                });
            }

            // 4️⃣ Add cloned object/group to canvas
            canvas.add(clonedParent);
            canvas.setActiveObject(clonedParent);
            canvas.requestRenderAll();
        } catch (err) {
            console.error('Clone failed:', err);
        }
    },

    // clone: async (offset = 20) => {
    //   const canvas = get().canvas;
    //   if (!canvas) return;

    //   let active = canvas.getActiveObject();
    //   if (!active) return;

    //   // Convert ActiveSelection → Group
    //   if (active.type === 'activeselection') {
    //     active = (active as fabric.ActiveSelection).toGroup();
    //     canvas.discardActiveObject();
    //     canvas.add(active);
    //   }

    //   try {
    //     // ✅ Use cloneAsync for native await support
    //     const clonedParent = await active.clone();

    //     // Offset the clone
    //     clonedParent.set({
    //       left: (active.left ?? 0) + offset,
    //       top: (active.top ?? 0) + offset,
    //       evented: true,
    //     });

    //     // Add to canvas
    //     canvas.add(clonedParent);
    //     canvas.setActiveObject(clonedParent);
    //     canvas.requestRenderAll();
    //   } catch (err) {
    //     console.error('Clone failed:', err);
    //   }
    // },

    alignObjects: (key) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObjects();
        if (!active || active.length < 2) return;

        // compute bounding rect for each object (includes scale/rotation/stroke)
        const rects = active.map((o) => ({
            o,
            box: (o as any).getBoundingRect(true, true), // { left, top, width, height }
        }));

        const boundsLeft = Math.min(...rects.map((r) => r.box.left));
        const boundsRight = Math.max(...rects.map((r) => r.box.left + r.box.width));
        const boundsTop = Math.min(...rects.map((r) => r.box.top));
        const boundsBottom = Math.max(...rects.map((r) => r.box.top + r.box.height));

        const widthTotal = boundsRight - boundsLeft;
        const heightTotal = boundsBottom - boundsTop;

        const applyHorizontal = (desiredBoxLeft, r) => {
            // move object's origin so its bounding box left becomes desiredBoxLeft
            const delta = desiredBoxLeft - r.box.left;
            r.o.set({ left: r.o.left + delta });
        };

        const applyVertical = (desiredBoxTop, r) => {
            const delta = desiredBoxTop - r.box.top;
            r.o.set({ top: r.o.top + delta });
        };

        console.log('key..', key);

        switch (key) {
            // HORIZONTAL
            case 'align-left':
                rects.forEach((r) => applyHorizontal(boundsLeft, r));
                break;

            case 'align-hcenter': {
                const centerX = boundsLeft + widthTotal / 2;
                rects.forEach((r) => {
                    const desiredBoxLeft = centerX - r.box.width / 2;
                    applyHorizontal(desiredBoxLeft, r);
                });
                break;
            }

            case 'align-right':
                rects.forEach((r) => {
                    const desiredBoxLeft = boundsRight - r.box.width;
                    applyHorizontal(desiredBoxLeft, r);
                });
                break;

            // VERTICAL
            case 'align-top':
                rects.forEach((r) => applyVertical(boundsTop, r));
                break;

            case 'align-vcenter': {
                const centerY = boundsTop + heightTotal / 2;
                rects.forEach((r) => {
                    const desiredBoxTop = centerY - r.box.height / 2;
                    applyVertical(desiredBoxTop, r);
                });
                break;
            }

            case 'align-bottom':
                rects.forEach((r) => {
                    const desiredBoxTop = boundsBottom - r.box.height;
                    applyVertical(desiredBoxTop, r);
                });
                break;

            // DISTRIBUTE (by centers)
            case 'distribute-h': {
                const sorted = [...rects].sort((a, b) => a.box.left - b.box.left);
                if (sorted.length < 3) break; // need at least 3 to distribute evenly
                const firstCenter = sorted[0].box.left + sorted[0].box.width / 2;
                const lastCenter =
                    sorted[sorted.length - 1].box.left + sorted[sorted.length - 1].box.width / 2;
                const step = (lastCenter - firstCenter) / (sorted.length - 1);

                sorted.forEach((r, i) => {
                    const targetCenter = firstCenter + step * i;
                    const desiredBoxLeft = targetCenter - r.box.width / 2;
                    applyHorizontal(desiredBoxLeft, r);
                });
                break;
            }

            case 'distribute-v': {
                const sorted = [...rects].sort((a, b) => a.box.top - b.box.top);
                if (sorted.length < 3) break;
                const firstCenter = sorted[0].box.top + sorted[0].box.height / 2;
                const lastCenter =
                    sorted[sorted.length - 1].box.top + sorted[sorted.length - 1].box.height / 2;
                const step = (lastCenter - firstCenter) / (sorted.length - 1);

                sorted.forEach((r, i) => {
                    const targetCenter = firstCenter + step * i;
                    const desiredBoxTop = targetCenter - r.box.height / 2;
                    applyVertical(desiredBoxTop, r);
                });
                break;
            }

            default:
                break;
        }

        // finalize
        active.forEach((o) => o.setCoords());
        canvas.requestRenderAll();
    },

    // ✅ Distribute selected objects evenly (horizontal or vertical)
    distributeObjects: (direction) => {
        const { canvas } = get();
        if (!canvas) return;
        const objects = canvas.getActiveObjects();
        if (objects.length < 3) return; // need at least 3 to distribute

        // sort objects by position
        if (direction === 'horizontal') {
            objects.sort((a, b) => a.left - b.left);
        } else {
            objects.sort((a, b) => a.top - b.top);
        }

        const first = objects[0];
        const last = objects[objects.length - 1];

        if (direction === 'horizontal') {
            const totalSpace =
                last.left - first.left - (first.getScaledWidth() + last.getScaledWidth()) / 2;
            const gap = totalSpace / (objects.length - 1);

            objects.forEach((obj, i) => {
                if (i !== 0 && i !== objects.length - 1) {
                    obj.set({
                        left: first.left + i * gap,
                    });
                    obj.setCoords();
                }
            });
        } else {
            const totalSpace =
                last.top - first.top - (first.getScaledHeight() + last.getScaledHeight()) / 2;
            const gap = totalSpace / (objects.length - 1);

            objects.forEach((obj, i) => {
                if (i !== 0 && i !== objects.length - 1) {
                    obj.set({
                        top: first.top + i * gap,
                    });
                    obj.setCoords();
                }
            });
        }

        canvas.requestRenderAll();
    },

    canPaste() {
        return !!this.clipboard;
    },

    isGroupSelected() {
        const obj = get().canvas?.getActiveObject();
        if (!obj) return false;

        return obj.type === 'group' || Array.isArray(obj._objects);
    },
});

function applyLockStyle(obj) {
    obj.set({
        opacity: 0.6,
        hoverCursor: 'not-allowed',
    });
}

function removeLockStyle(obj) {
    obj.set({
        opacity: 1,
        hoverCursor: 'move',
    });
}

function addLockIcon(canvas, obj) {
    const icon = new fabric.Text('\uf023', {
        fontFamily: 'Font Awesome 5 Free',
        fontWeight: '900', // solid style
        fontSize: 12, // smaller size
        fill: 'red', // locked color
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
        padding: 2, // adds spacing inside the text box (optional)
        opacity: 0.6,
    });

    obj._lockIcon = icon;
    canvas.add(icon);
    updateLockIconPosition(obj);

    obj.on('moving', () => updateLockIconPosition(obj));
    obj.on('scaling', () => updateLockIconPosition(obj));
    obj.on('rotating', () => updateLockIconPosition(obj));
}

function updateLockIconPosition(obj) {
    if (!obj._lockIcon) return;

    const rect = obj.getBoundingRect(true, true);

    const padding = 4; // space from top-right edges

    obj._lockIcon.set({
        left: rect.left + rect.width - obj._lockIcon.width / 2 - padding,
        top: rect.top + obj._lockIcon.height / 2 + padding,
    });

    obj._lockIcon.setCoords();
}

// function updateLockIconPosition(obj) {
//     if (!obj._lockIcon) return;

//     obj._lockIcon.set({
//         left: obj.left + obj.getScaledWidth() / 2 - 10,
//         top: obj.top - obj.getScaledHeight() / 2 + 10,
//     });
// }

function removeLockIcon(canvas, obj) {
    if (obj._lockIcon) {
        canvas.remove(obj._lockIcon);
        obj._lockIcon = null;
    }
}
