import * as fabric from "fabric";
import db from 'opendb-store';
import { A4, LANDSCAPE, DEFAULT } from "@lib/const/editor.ts";

export const createCanvasSlice = (set, get) => ({
  // =========================
  // Canvas
  // =========================
  canvas: null,
  activeTool: "select", // "select", "pan", "draw"
  isPanning: false,
  isDrawingMode: false,
  freeDrawingBrush: null,
  activePanel: null,
  selectedObject: "textbox",
  showTextToolbar: true,

  init: (el) => {
    if (get().canvas) return;

    const canvas = new fabric.Canvas(el, {
      backgroundColor: "#fff",
      preserveObjectStacking: false,
    });

    get().saveState();
    set({ canvas });
    get().setPageFormat(A4, LANDSCAPE);
    get().enablePan();
    get().setBrush();

    canvas.on("selection:created", (e) => get().setToolbar(e.target));
    canvas.on("selection:updated", (e) => get().setToolbar(e.target));
    canvas.on("mouse:down", (e) => get().setToolbar(e.target));
  },

  init1: async (el) => {
    if (get().canvas) return;

    const canvas = new fabric.Canvas(el, {
      backgroundColor: "#fff",
      preserveObjectStacking: false,
    });

    // --- Load persisted state ---
//    const saved = db.local.get("drawJson");
//    if (saved) {
//      set({ _isRestoring: true });
//      canvas.loadFromJSON(saved, () => {
//        canvas.getObjects().forEach(obj => obj.setCoords());
//        canvas.renderAll();
//        set({ _isRestoring: false });
//      });
//    } else {
      get().saveState(); // only if nothing is saved
//    }

    set({ canvas });
    get().enablePan();
    get().setPageFormat(A4, LANDSCAPE);
    get().setBrush();

    // --- Utilities ---
    const persist = () => db.local.set("drawJson", canvas.toJSON());

    const updateObjectState = (obj) => {
      if (!obj || get()._isRestoring) return; // 🚫 skip if undo/redo in progress
      get().updateFromFabric(obj);
      get().saveState();
      // persist();
    };

    const setToolbar = (obj, isEditing = false) => {
      if (obj?.type === "textbox") {
        set({
          selectedObject: obj,
          showTextToolbar: true,
          isEditingText: isEditing,
        });
        get().syncFromObject(obj);
      } else {
        set({
          selectedObject: "shape",
        })
      }
    };

    const clearToolbar = () => {
      set({
        selectedObject: null,
        showTextToolbar: false,
        isEditingText: false,
      });
    };

    // --- Handlers ---
    const handlers = {
//      "object:added": (e) => updateObjectState(e.target),
//      "object:modified": (e) => updateObjectState(e.target),
      "object:removed": (e) => updateObjectState(e.target),

      "selection:created": (e) => setToolbar(e.target),
      "selection:updated": (e) => setToolbar(e.target),
      "selection:cleared": () => clearToolbar(),

      "mouse:down": (e) => setToolbar(e.target),

//      "text:editing:entered": (e) => setToolbar(e.target, true),
//      "text:editing:exited": () => set({ isEditingText: false }),

      // ✅ hide toolbar during move/scale
//      "before:transform": (e) => {
//        if (e.target?.type === "textbox") clearToolbar();
//      },
//      "object:moving": (e) => {
//        if (e.target?.type === "textbox") clearToolbar();
//      },
//      "object:scaling": (e) => {
//        if (e.target?.type === "textbox") clearToolbar();
//      },
//
//      // ✅ restore toolbar & save after move/scale
//      "after:transform": (e) => {
//        if (e.target?.type === "textbox") setToolbar(e.target);
//        e.target?.setCoords(); // 🔑 recalc
//        updateObjectState(e.target);
//      },
        "path:created": (e) => {
          const path = e.path; // the drawn stroke
          console.log("New path created:", path);


          // Save to history stack
          get().updateFromFabric(path);
          get().saveState();
        }
    };

    // --- Attach Events Dynamically ---
    Object.entries(handlers).forEach(([event, handler]) => {
      canvas.on(event, handler);
    });


  },


  setCanvas: (canvas) => {
    set({ canvas });
    if (!canvas) return;

    // Freehand setup
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = "#000";
    canvas.freeDrawingBrush.width = 2;

    get().enablePan();
    get().setPageFormat("Freehand", "landscape");

    // Freehand push state
    canvas.on("path:created", () => get().pushState());

    // Object added
    canvas.on("object:added", (e) => {
      const obj = e.target || null;
      if (obj) {
        set({ selectedObject: obj });
        get().syncFromObject(obj);
      }
    });

    // Selection events
    canvas.on("selection:created", (e) => {
      const obj = e.selected?.[0] || null;
      set({ selectedObject: obj });
      get().syncFromObject(obj);
    });

    canvas.on("selection:updated", (e) => {
      const obj = e.selected?.[0] || null;
      set({ selectedObject: obj });
      get().syncFromObject(obj);
    });

    canvas.on("selection:cleared", () => {
      set({ selectedObject: null });
      get().syncFromObject(null);
    });

    // Modified
    canvas.on("object:modified", (e) => {
      const obj = e.target || null;
      set({ selectedObject: obj });
      get().syncFromObject(obj);
    });

    // Transform lifecycle
    canvas.on("before:transform", (e) => {
      if (e.target?.type === "textbox") set({ showTextToolbar: false });
    });

    canvas.on("object:scaling", (e) => {
      console.log("Scaling:", e.target?.type);
    });

    canvas.on("after:transform", (e) => {
      const obj = e.target || null;
      if (obj?.type === "textbox") {
        set({ showTextToolbar: true, selectedObject: obj });
        get().syncFromObject(obj);
      }
    });
  },


  setSelectedObject: () => {
    set({ selectedObject: false });
  },
  setActiveTool: (tool) => {
    const canvas = get().canvas;
    if (!canvas) return;
    set({ activeTool: tool });

    switch (tool) {
      case "pan":
        canvas.isDrawingMode = false;
        canvas.defaultCursor = "grab";
        canvas.selection = false;
        canvas.skipTargetFind = true;
        break;
      case "draw":
        console.log('here');
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = "#000"; // optional
        break;
      case "select":
      default:
        canvas.isDrawingMode = false;
        canvas.defaultCursor = "default";
        canvas.selection = true;
        canvas.skipTargetFind = false;
        break;
    }

    canvas.requestRenderAll();
  },

  enablePan: () => {
    const canvas = get().canvas;
    if (!canvas) return;

    console.log("Pan tool enabled");
    // Wheel zoom to pointer
    canvas.on("mouse:wheel", (opt) => {
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
    canvas.on("mouse:down", () => {
      if (get().activeTool === "pan") {
        set({ isPanning: true });
        canvas.setCursor("grabbing");
        canvas.requestRenderAll();
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!get().isPanning) return;
      const e = opt.e;
      canvas.relativePan(new fabric.Point(e.movementX, e.movementY));
      canvas.requestRenderAll();
    });

    canvas.on("mouse:up", () => {
      if (!get().isPanning) return;
      set({ isPanning: false });
      canvas.setCursor("grab");
      canvas.requestRenderAll();
    });
  },

  syncFromObject: (obj) => {
    if (!obj) return;
    set({
      fill: obj.fill || "#ffffff",
      stroke: obj.stroke || "#111827",
      strokeWidth: obj.strokeWidth || 2,
      strokeStyle: obj.strokeDashArray
        ? obj.strokeDashArray[0] === 10
          ? "dashed"
          : "dotted"
        : "solid",
    });
  },


  updateTextStyle: (styles) => {
    const canvas = get().canvas;
    const obj = get().selectedObject;
    if (!canvas || !obj || obj.type !== "textbox") return;

    if (styles.fontSize) obj.set("fontSize", styles.fontSize);
    if (styles.fill) obj.set("fill", styles.fill);
    if (styles.bold !== undefined)
      obj.set("fontWeight", styles.bold ? "bold" : "normal");
    if (styles.italic !== undefined)
      obj.set("fontStyle", styles.italic ? "italic" : "normal");
    if (styles.underline !== undefined) obj.set("underline", styles.underline);

    canvas.renderAll();
    get().pushState();
  },

  clearBoard: () => {
    const canvas = get().canvas;
    if (!canvas) return;

    db.local.clear();
    canvas.clear();
    canvas.backgroundColor = "#FFF";
    canvas.requestRenderAll();
  },
  clearToolbar: () => {
    set({
      selectedObject: null,
      showTextToolbar: false,
      isEditingText: false,
    });
  },
  setToolbar: (obj, isEditing = false) => {
    if (obj?.type === "textbox") {
      set({
        selectedObject: obj,
        showTextToolbar: true,
        isEditingText: isEditing,
      });
      get().syncFromObject(obj);
    } else {
      set({
        selectedObject: "shape",
      })
    }
  }
});
