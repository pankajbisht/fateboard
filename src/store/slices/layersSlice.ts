import { Group } from "fabric";

export const createLayersSlice = (set, get) => ({
  layers: [],
  setLayers: (layers) => set({ layers }),
//  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),

  addLayer: (shape, shapeType) => {
    const layers = get().layers || [];
    const id = shape.toObject().id || Date.now();
    set({
      layers: [
        ...layers,
        { id, type: shapeType, object: shape, name: shapeType, visible: true, locked: false }
      ]
    });
    get().canvas?.requestRenderAll();
  },


  renameLayer: (id, name) => {
    const layers = get().layers.map(layer => {
      if (layer.id === id) layer.name = name;
      return layer;
    });
    set({ layers });
  },

//  removeLayer: (id) => {
//    const layers = get().layers.filter(layer => {
//      if (layer.id === id && layer.object) {
//        get().canvas.remove(layer.object);
//      }
//      return layer.id !== id;
//    });
//    set({ layers });
//    get().canvas?.requestRenderAll();
//  },

//removeLayer: () => {
//  const activeObject = get().canvas.getActiveObject();
//  if (!activeObject) return;
//
//  const layers = get().layers.filter(layer => layer.object !== activeObject);
//  set({ layers });
//
//  get().canvas.remove(activeObject);
//  get().canvas.requestRenderAll();
//},

removeLayer: () => {
  const canvas = get().canvas;
  if (!canvas) return;

  // Get selected objects (multi or single)
  const activeObjects = canvas.getActiveObjects(); // always returns array
  if (!activeObjects || activeObjects.length === 0) return;

  // Remove selected objects from layers
  const layers = get().layers.filter(layer => !activeObjects.includes(layer.object));
  set({ layers });

  // Remove from canvas
  activeObjects.forEach(obj => canvas.remove(obj));
  canvas.discardActiveObject(); // clear selection
  canvas.requestRenderAll();
},

  toggleVisibility: (id) => {
    const layers = get().layers.map(layer => {
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
    const layer = get().layers.find(l => l.id === id);
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
            name: layer.name + "_copy",
            object: clone,
          },
        ],
      });
    });
  },  

  toggleLayerLock: (id) => {
    const layers = get().layers.map(layer => {
      if (layer.id === id) {
        layer.locked = !layer.locked;
        if (layer.object) {
          layer.object.selectable = !layer.locked;
          layer.object.evented = !layer.locked;
        }
      }
      return layer;
    });
    set({ layers });
  },


//  bringLayersToFront: () => {
//    const canvas = get().canvas;
//    if (!canvas) return;
//
//    const activeObjects = canvas.getActiveObjects();
//    if (!activeObjects.length) return;
//
//    // Sort objects by their current position in the stack (lowest index first)
//    const sortedObjects = activeObjects.sort((a, b) =>
//      canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b)
//    );
//
//    // Move each object one step forward
//    sortedObjects.forEach(obj => {
//      canvas.bringObjectForward(obj);
//    });
//
//    // Re-render the canvas
//    canvas.renderAll();
//  },
//
//
//  sendLayersToBack: () => {
//    const canvas = get().canvas;
//    if (!canvas) return;
//
//    const activeObjects = canvas.getActiveObjects();
//    if (!activeObjects.length) return;
//
//    // Sort objects by their current position in the stack (highest index first)
//    // This preserves relative order when moving backward
//    const sortedObjects = activeObjects.sort((a, b) =>
//      canvas.getObjects().indexOf(b) - canvas.getObjects().indexOf(a)
//    );
//
//    sortedObjects.forEach(obj => {
//      canvas.sendObjectBackwards(obj);
//    });
//
//    // Re-render the canvas
////    canvas.requestRenderAll();
//    canvas.renderAll();
//  },

  bringForward: () => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (!activeObjects.length) return;

    const sortedObjects = activeObjects.sort(
      (a, b) => canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b)
    );

    sortedObjects.forEach(obj => canvas.bringObjectForward(obj));
    canvas.requestRenderAll();
  },

  sendBackward: () => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (!activeObjects.length) return;

    const sortedObjects = activeObjects.sort(
      (a, b) => canvas.getObjects().indexOf(b) - canvas.getObjects().indexOf(a)
    );

    sortedObjects.forEach(obj => canvas.sendObjectBackwards(obj));
    canvas.requestRenderAll();
  },

  bringToFront: () => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (!activeObjects.length) return;

    const sortedObjects = activeObjects.sort(
      (a, b) => canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b)
    );

    sortedObjects.forEach(obj => canvas.bringToFront(obj));
    canvas.requestRenderAll();
  },

  sendToBack: () => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (!activeObjects.length) return;

    const sortedObjects = activeObjects.sort(
      (a, b) => canvas.getObjects().indexOf(b) - canvas.getObjects().indexOf(a)
    );

    sortedObjects.forEach(obj => canvas.sendToBack(obj));
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
    const newGroupId = "group-" + Date.now();
    const groupLayer = {
      id: newGroupId,
      name: "Group",
      visible: true,
      locked: false,
      parentId: null,
    };

    const updatedLayers = state.layers.map(l => {
      if (ids.includes(l.id)) return { ...l, parentId: newGroupId };
      return l;
    });

    set({ layers: [...updatedLayers, groupLayer] });
  },

  // Ungroup selected group layers
  ungroupLayers1: (ids) => {
    const state = get();
    const updatedLayers = state.layers.map(l => {
      if (ids.includes(l.id) && l.children?.length) return null; // remove group
      if (ids.includes(l.parentId)) return { ...l, parentId: null }; // lift children
      return l;
    }).filter(Boolean);
    set({ layers: updatedLayers });
  },

  // Align selected layers
  alignLayers: (type, ids) => {
    const state = get();
    if (!ids.length) return;
    const selected = state.layers.filter(l => ids.includes(l.id));
    let reference;
    switch (type) {
      case "left":
        reference = Math.min(...selected.map(l => l.x || 0));
        break;
      case "center":
        reference = Math.round(
          selected.reduce((sum, l) => sum + (l.x || 0), 0) / selected.length
        );
        break;
      case "right":
        reference = Math.max(...selected.map(l => (l.x || 0) + (l.width || 0)));
        break;
      default:
        return;
    }

    const aligned = state.layers.map(l =>
      ids.includes(l.id)
        ? { ...l, x: type === "right" ? reference - (l.width || 0) : reference }
        : l
    );
    set({ layers: aligned });
  },

  // Distribute selected layers
  distributeLayers: (direction, ids) => {
    const state = get();
    const selected = state.layers.filter(l => ids.includes(l.id));
    if (selected.length < 3) return; // nothing to distribute

    if (direction === "horizontal") {
      const sorted = selected.sort((a, b) => (a.x || 0) - (b.x || 0));
      const minX = sorted[0].x || 0;
      const maxX = sorted[sorted.length - 1].x || 0;
      const gap = (maxX - minX) / (sorted.length - 1);
      const updated = state.layers.map(l => {
        const idx = sorted.findIndex(s => s.id === l.id);
        if (idx >= 0) return { ...l, x: minX + gap * idx };
        return l;
      });
      set({ layers: updated });
    }

    if (direction === "vertical") {
      const sorted = selected.sort((a, b) => (a.y || 0) - (b.y || 0));
      const minY = sorted[0].y || 0;
      const maxY = sorted[sorted.length - 1].y || 0;
      const gap = (maxY - minY) / (sorted.length - 1);
      const updated = state.layers.map(l => {
        const idx = sorted.findIndex(s => s.id === l.id);
        if (idx >= 0) return { ...l, y: minY + gap * idx };
        return l;
      });
      set({ layers: updated });
    }
  },
});
