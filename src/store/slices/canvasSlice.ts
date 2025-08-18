import * as fabric from "fabric";

export const createCanvasSlice = (set, get) => ({
  // =========================
  // Canvas
  // =========================
  canvas: null,
  selectedObject: null,
  setCanvas: (canvasInstance) => {
    set({ canvas: canvasInstance });
    if (!canvasInstance) return;

    // Set default background
    if (!canvasInstance.backgroundColor) {
      canvasInstance.backgroundColor = "#fff";
      canvasInstance.requestRenderAll();
    }

    // Enable freehand drawing (off by default)
    canvasInstance.isDrawingMode = false;
    canvasInstance.freeDrawingBrush = new fabric.PencilBrush(canvasInstance);
    canvasInstance.freeDrawingBrush.color = "#000";
    canvasInstance.freeDrawingBrush.width = 2;

    // Push state after each freehand stroke
    canvasInstance.on("path:created", () => {
      get().pushState();
    });

    canvasInstance.on("selection:created", (e) => {
        const obj = e.selected?.[0] || null;
        console.log("Selection created:", obj?.type);
        set({ selectedObject: obj });
        get().syncFromObject(obj);

      });

      canvasInstance.on("selection:updated", (e) => {
        const obj = e.selected?.[0] || null;
        console.log("Selection updated:", obj?.type);
        set({ selectedObject: obj });
        get().syncFromObject(obj);

      });

      canvasInstance.on("selection:cleared", () => {
        console.log("Selection cleared");
        set({ selectedObject: null });
        get().syncFromObject(null);

      });

      // ✅ NEW: also listen to object:modified (when text edited, resized, moved)
      canvasInstance.on("object:modified", (e) => {
        const obj = e.target || null;
        console.log("Object modified:", obj?.type);
        set({ selectedObject: obj });
        get().syncFromObject(obj);
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

  // Default styles
  fill: "#ffffff",
  stroke: "#111827",
  strokeWidth: 2,
  strokeStyle: "solid",

  styleOptions: [
    { value: "solid", label: "Solid" },
    { value: "dashed", label: "Dashed" },
    { value: "dotted", label: "Dotted" },
    { value: "double", label: "Double" },
    { value: "groove", label: "Groove" },
  ],

  // Actions (apply to active objects + update store)
  setFill: (color) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => obj.set({ fill: color }));
    canvas.requestRenderAll();
    set({ fill: color });
  },

  setStroke: (color) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => obj.set({ stroke: color }));
    canvas.requestRenderAll();
    set({ stroke: color });
  },

  setStrokeWidth: (width) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => obj.set({ strokeWidth: width }));
    canvas.requestRenderAll();
    set({ strokeWidth: width });
  },

  setStrokeStyle: (style) => {
    const canvas = get().canvas;
    if (!canvas) return;


    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => {
      if (style === "dashed") obj.set({ strokeDashArray: [10, 5] });
      else if (style === "dotted") obj.set({ strokeDashArray: [2, 5] });
      else obj.set({ strokeDashArray: null }); // solid, double, groove (you can customize)
    });
    canvas.requestRenderAll();
    set({ strokeStyle: style });
  },
  // =========================
  // Freehand draw settings
  // =========================
  isDrawing: false,
  brushColor: "#000000",
  brushWidth: 2,
  brushType: "Pencil",

  setDrawingMode: (enabled) => {
    const canvas = get().canvas;
    if (!canvas) return;
    canvas.isDrawingMode = enabled;
    set({ isDrawing: enabled });
  },

  setBrushColor: (color) => {
    const canvas = get().canvas;
    if (!canvas || !canvas.freeDrawingBrush) return;
    canvas.freeDrawingBrush.color = color;
    set({ brushColor: color });
  },

  setBrushWidth: (width) => {
    const canvas = get().canvas;
    if (!canvas || !canvas.freeDrawingBrush) return;
    canvas.freeDrawingBrush.width = width;
    set({ brushWidth: width });
  },

  setBrushType: (type) => {
    const canvas = get().canvas;
    if (!canvas) return;

    let brush;
    switch (type) {
      case "Circle":
        brush = new fabric.CircleBrush(canvas);
        break;
      case "Spray":
        brush = new fabric.SprayBrush(canvas);
        break;
      default:
        brush = new fabric.PencilBrush(canvas);
    }

    brush.color = get().brushColor;
    brush.width = get().brushWidth;
    canvas.freeDrawingBrush = brush;
    set({ brushType: type });
  },

  setBrush: (color, width, type = "Pencil") => {
    const canvas = get().canvas;
    if (!canvas) return;

    let brush;
    switch (type) {
      case "Circle":
        brush = new fabric.CircleBrush(canvas);
        break;
      case "Spray":
        brush = new fabric.SprayBrush(canvas);
        break;
      default:
        brush = new fabric.PencilBrush(canvas);
    }

    brush.color = color;
    brush.width = width;
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;

    set({ brushColor: color, brushWidth: width, brushType: type, isDrawing: true });
  },

  // =========================
  // Undo / redo
  // =========================
  undoStack: [],
  redoStack: [],

  setActiveTool: (tool) => {
    const canvas = get().canvas;
    if (!canvas) return;

    // clear old listeners
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");

    if (tool === "line") {
      let line;

      canvas.on("mouse:down", (opt) => {
        const pointer = canvas.getPointer(opt.e);
        line = new fabric.Line(
          [pointer.x, pointer.y, pointer.x, pointer.y],
          {
            stroke: "black",
            strokeWidth: 2,
            selectable: true,
            hasBorders: false,   // no rectangle around line
            hasControls: true,   // allow resize handles
          }
        );
        canvas.add(line);
      });

      canvas.on("mouse:move", (opt) => {
        if (!line) return;
        const pointer = canvas.getPointer(opt.e);
        line.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
      });

      canvas.on("mouse:up", () => {
        if (line) {
          get().pushState();
          line = null;
        }
      });
    }

    set({ activeTool: tool });
  },

  // =========================
  // Shapes
  // =========================
  addShape: (shapeType, options = {}) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const defaultPosition = { top: 50, left: 50, selection: true };
    options = { ...defaultPosition, ...options };

    let shape;
    switch (shapeType) {
      case "rect":
        shape = new fabric.Rect({
          width: 80,
          height: 80,
          fill: "transparent",
          stroke: "black",
          ...options,
        });
        break;

      case "circle":
        shape = new fabric.Circle({
          radius: 48,
          fill: "transparent",
          stroke: "black",
          ...options,
        });
        break;

      case "ellipse":
        shape = new fabric.Ellipse({
          rx: 70,
          ry: 45,
          fill: "transparent",
          stroke: "black",
          ...options,
        });
        break;

      case "triangle":
        shape = new fabric.Triangle({
          width: 100,
          height: 100,
          fill: "transparent",
          stroke: "black",
          ...options,
        });
        break;

      case "line":
        shape = new fabric.Line([50, 50, 200, 50], {
          stroke: "black",
          strokeWidth: 2,
          selectable: true,
          hasControls: true,
          hasBorders: false,
          ...options,
        });
        break;

      default:
        console.warn("Shape not supported:", shapeType);
        return;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    get().pushState();
    get().addLayer(shape, shapeType);

    // Add layer to your layers slice
//      const layers = get().layers || [];
//      set({
//        layers: [
//          ...layers,
//          {
//              id: shape.toObject().id || Date.now(),
//              type: shapeType,
//              object: shape,
//              name: shapeType,
//              visible: true,
//              locked: false
//            },
//          ],
//        });
  },

  pushState: () => {
    const canvas = get().canvas;
    if (!canvas) return;
    const json = canvas.toJSON();
    set((state) => ({
      history: [...(state.history || []), json],
      redoStack: [],
    }));
  },

  saveState: () => {
      const { canvas, undoStack } = get();
      if (!canvas) return;

      const json = canvas.toJSON();
      set({
        undoStack: [...undoStack, json],
        redoStack: [], // clear redo when new state is created
      });
    },

  undo: () => {
    const { undoStack, canvas } = get();
    if (!canvas || undoStack.length === 0) return;

    const last = undoStack[undoStack.length - 1];

    canvas.loadFromJSON(last, () => {
      canvas.backgroundColor = last.background || "#fff";
      canvas.requestRenderAll();
    });

    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
    }));
  },

  redo: () => {
      const { redoStack, undoStack, canvas } = get();
      if (!canvas || redoStack.length === 0) return;

      const last = redoStack[redoStack.length - 1];

      // Save current state back into undoStack
      const current = canvas.toJSON();

      canvas.loadFromJSON(last, () => {
        canvas.backgroundColor = last.background || "#fff";
        canvas.requestRenderAll();
      });

      set((state) => ({
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, current],
      }));
  },

  // =========================
  // Text
  // =========================
//  addText: (textObj) => {
//    const canvas = get().canvas;
//    if (!canvas) return;
//
//    const {
//      text,
//      fontSize = 16,
//      bold = false,
//      italic = false,
//      underline = false,
//      fill = "black",
//    } = textObj;
//
//    const fabricText = new fabric.Textbox(text, {
//      left: 100,
//      top: 100,
//      fontSize,
//      fontWeight: bold ? "bold" : "normal",
//      fontStyle: italic ? "italic" : "normal",
//      underline,
//      fill,
//      selection: true,
//    });
//
//    canvas.add(fabricText);
//    canvas.setActiveObject(fabricText);
//    canvas.renderAll();
//    get().pushState();
//  },
addText: (textObj) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const {
      text = "Enter text", // default placeholder
      fontSize = 16,
      bold = false,
      italic = false,
      underline = false,
      fill = "black",
    } = textObj;

    const fabricText = new fabric.Textbox(text, {
      left: 100,
      top: 100,
      fontSize,
      fontWeight: bold ? "bold" : "normal",
      fontStyle: italic ? "italic" : "normal",
      underline,
      fill,
      editable: true,       // ✅ allow typing
      objectCaching: false, // ✅ smoother text editing
    });

    canvas.add(fabricText);
    canvas.setActiveObject(fabricText);

    // ✅ Enter editing mode immediately so user can type
    fabricText.enterEditing();
    fabricText.hiddenTextarea?.focus();

    canvas.renderAll();
    get().pushState();
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
});
