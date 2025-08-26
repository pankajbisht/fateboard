import * as fabric from "fabric";

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
  selectedObject: null,

  init: (el) => {
    if (get().canvas) return;

    const canvas = new fabric.Canvas(el, {
      width: 800,
      height: 500,
      backgroundColor: "#fff",
      preserveObjectStacking: false,
    });

    set({ canvas });
    get().enablePan();
    get().setPageFormat("Freehand", "landscape");
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

  setActiveTool1: (tool) => {
    const canvas = get().canvas;
    if (!canvas) return;
    alert('her')

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

    // ✅ Quarter position instead of fixed 100,100
    const { pageWidth, pageHeight, scale } = get();
    // quarter position relative to scaled page
    const x = (pageWidth / 4) * scale;
    const y = (pageHeight / 2) * scale;

    const defaultPosition = {
      left: x,
      top: y,
      originX: "center",   // keep center so shape aligns properly
      originY: "center",
      selection: true,
      hasControls: true,
    };

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
  addText: (textObj) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const {
      text = "Enter text",             // placeholder text
      fontSize = 36,
      bold = false,
      italic = false,
      underline = false,
      fontFamily = "Bubblegum Sans",
      width = 300,
      textColor = "#000000",           // ✅ normal text color
      placeholderColor = "#9ca3af"     // ✅ lighter gray for placeholder
    } = textObj;

    const { pageWidth, pageHeight, scale } = get();
    // quarter position relative to scaled page
    const x = (pageWidth / 4) * scale;
    const y = (pageHeight / 2) * scale;


    const fabricText = new fabric.Textbox(text, {
      left: x,
      top: y,
      originX: "center",
      originY: "center",
      fontSize,
      fontWeight: bold ? "bold" : "normal",
      fontStyle: italic ? "italic" : "normal",
      underline,
      fill: placeholderColor,          // ✅ start with placeholder color
      fontFamily,
      width,
      editable: true,
      objectCaching: false,
      padding: 6,
      splitByGrapheme: true,
    });

    let isPlaceholder = true;

    // ✅ When user enters editing mode
    fabricText.on("editing:entered", () => {
      if (isPlaceholder) {
        fabricText.selectAll();        // highlight placeholder text
        fabricText.set("fill", textColor); // ✅ use normal text color
        canvas.renderAll();
      }
    });

    // ✅ When user exits editing mode
    fabricText.on("editing:exited", () => {
      if (!fabricText.text.trim()) {
        fabricText.text = text;             // restore placeholder
        fabricText.set("fill", placeholderColor); // ✅ reset to placeholder color
        isPlaceholder = true;
      } else {
        isPlaceholder = false;
        fabricText.set("fill", textColor);  // ✅ keep normal text color
      }
      canvas.renderAll();
    });

    canvas.add(fabricText);
    canvas.setActiveObject(fabricText);

    // ✅ Enter editing immediately
    fabricText.enterEditing();
    fabricText.hiddenTextarea?.focus();
    fabricText.selectAll();

    get().pushState();
    canvas.renderAll();
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
