import * as fabric from "fabric";
import tailwindcolors from "tailwindcss/colors";
import paper from "paper";

function tailwindBgToHex(bgClass) {
  const [, color, shade] = bgClass.split("-");
  return tailwindcolors[color]?.[shade];
}

export function cssColorToHex(color: string): string | null {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#000"; // reset
  ctx.fillStyle = color; // browser parses it

  return ctx.fillStyle || null; // always hex
}

let previewOpacity: number | null = null;

const SHADOW_PRESETS = {
  soft: { blur: 12, offsetX: 0, offsetY: 6, color: "rgba(0,0,0,0.2)" },
  medium: { blur: 20, offsetX: 0, offsetY: 10, color: "rgba(0,0,0,0.25)" },
  strong: { blur: 40, offsetX: 0, offsetY: 20, color: "rgba(0,0,0,0.3)" },
};

const BOOLEAN_OP = {
  union: "unite",
  subtract: "subtract",
  intersect: "intersect",
  exclude: "exclude",
};

export type GradientStop = {
  offset: number; // 0 → 1
  color: string;
  opacity?: number;
};

export type GradientConfig = {
  type: "linear" | "radial";
  angle: number;
  stops: GradientStop[];
};

export function angleToCoords(angle: number) {
  const rad = (angle * Math.PI) / 180;

  return {
    x1: 0.5 - Math.cos(rad) / 2,
    y1: 0.5 - Math.sin(rad) / 2,
    x2: 0.5 + Math.cos(rad) / 2,
    y2: 0.5 + Math.sin(rad) / 2,
  };
}

export function createFabricGradient(gradient: GradientConfig) {
  if (gradient.type === "linear") {
    const { x1, y1, x2, y2 } = angleToCoords(gradient.angle);

    return new fabric.Gradient({
      type: "linear",
      gradientUnits: "objectBoundingBox",
      coords: { x1, y1, x2, y2 },
      colorStops: gradient.stops,
    });
  }

  return new fabric.Gradient({
    type: "radial",
    gradientUnits: "objectBoundingBox",
    coords: {
      x1: 0.5,
      y1: 0.5,
      r1: 0,
      x2: 0.5,
      y2: 0.5,
      r2: 0.5,
    },
    colorStops: gradient.stops,
  });
}

/* -------------------------------------------------
   Fabric v6 helper:
   canvas point -> object local point
-------------------------------------------------- */
function canvasPointToObjectLocal(obj: fabric.Object, point: fabric.Point) {
  const inverted = fabric.util.invertTransform(obj.calcTransformMatrix());
  return fabric.util.transformPoint(point, inverted);
}

/* -------------------------------------------------
   Types
-------------------------------------------------- */
type StopHandle = {
  stop: fabric.Circle;
  offset: number;
};

/* -------------------------------------------------
   Gradient Editor
-------------------------------------------------- */
export class GradientEditor {
  canvas: fabric.Canvas;
  target: fabric.Object | null = null;

  mode: "linear" | "radial" = "linear";

  line!: fabric.Line;
  start!: fabric.Circle;
  end!: fabric.Circle;

  center!: fabric.Circle;
  radius!: fabric.Circle;

  stops: StopHandle[] = [];

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /* ---------- ATTACH ---------- */
  attach(obj: fabric.Object) {
    this.detach();
    this.target = obj;

    this.mode === "linear"
      ? this.createLinearHandles()
      : this.createRadialHandles();

    this.addColorStop(0, "#ff0000");
    this.addColorStop(1, "#0000ff");

    this.bindEvents();
    this.updateGradient();
  }

  /* ---------- HANDLE CREATORS ---------- */
  createHandle(x: number, y: number, color: string) {
    return new fabric.Circle({
      left: x,
      top: y,
      radius: 6,
      fill: color,
      originX: "center",
      originY: "center",
      hasControls: false,
      hasBorders: false,
      excludeFromExport: true,
    });
  }

  createLinearHandles() {
    if (!this.target) return;

    const b = this.target.getBoundingRect(true, true);

    this.start = this.createHandle(b.left, b.top + b.height / 2, "#2563eb");
    this.end = this.createHandle(
      b.left + b.width,
      b.top + b.height / 2,
      "#dc2626"
    );

    this.line = new fabric.Line(
      [this.start.left!, this.start.top!, this.end.left!, this.end.top!],
      {
        stroke: "#6366f1",
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      }
    );

    this.canvas.add(this.line, this.start, this.end);
  }

  createRadialHandles() {
    if (!this.target) return;

    const b = this.target.getBoundingRect(true, true);

    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;

    this.center = this.createHandle(cx, cy, "#16a34a");
    this.radius = this.createHandle(cx + b.width / 4, cy, "#9333ea");

    this.canvas.add(this.center, this.radius);
  }

  /* ---------- COLOR STOPS ---------- */
  addColorStop(offset: number, color: string) {
    const p = this.interpolate(offset);

    const stop = new fabric.Circle({
      left: p.x,
      top: p.y,
      radius: 5,
      fill: color,
      originX: "center",
      originY: "center",
      hasControls: false,
      hasBorders: false,
      excludeFromExport: true,
    });

    stop.on("moving", () => {
      this.updateStopOffset(stop);
      this.updateGradient();
    });

    this.stops.push({ stop, offset });
    this.canvas.add(stop);
  }

  interpolate(t: number) {
    if (this.mode === "radial") {
      return {
        x: this.center.left!,
        y: this.center.top!,
      };
    }

    return {
      x: this.start.left! + (this.end.left! - this.start.left!) * t,
      y: this.start.top! + (this.end.top! - this.start.top!) * t,
    };
  }

  updateStopOffset(stop: fabric.Circle) {
    if (this.mode !== "linear") return;

    const dx = this.end.left! - this.start.left!;
    const dy = this.end.top! - this.start.top!;
    const len = dx * dx + dy * dy;

    const t =
      ((stop.left! - this.start.left!) * dx +
        (stop.top! - this.start.top!) * dy) /
      len;

    const s = this.stops.find((x) => x.stop === stop);
    if (s) s.offset = Math.min(1, Math.max(0, t));
  }

  /* ---------- EVENTS ---------- */
  bindEvents() {
    if (this.mode === "linear") {
      this.start.on("moving", () => {
        this.snapAngle();
        this.updateGradient();
      });
      this.end.on("moving", () => {
        this.snapAngle();
        this.updateGradient();
      });
    } else {
      this.center.on("moving", () => this.updateGradient());
      this.radius.on("moving", () => this.updateGradient());
    }

    this.target?.on("moving", () => this.syncHelpers());
    this.target?.on("scaling", () => this.syncHelpers());
    this.target?.on("rotating", () => this.syncHelpers());
  }

  /* ---------- SNAP ---------- */
  snapAngle() {
    const dx = this.end.left! - this.start.left!;
    const dy = this.end.top! - this.start.top!;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const snaps = [0, 45, 90, 135, 180, -45, -90, -135];
    const snap = snaps.find((a) => Math.abs(a - angle) < 6);
    if (snap === undefined) return;

    const len = Math.hypot(dx, dy);
    const rad = (snap * Math.PI) / 180;

    this.end.set({
      left: this.start.left! + Math.cos(rad) * len,
      top: this.start.top! + Math.sin(rad) * len,
    });
  }

  /* ---------- GRADIENT UPDATE ---------- */
  updateGradient() {
    if (!this.target) return;
    const obj = this.target;

    let gradient: fabric.Gradient;

    if (this.mode === "linear") {
      const p1 = canvasPointToObjectLocal(
        obj,
        new fabric.Point(this.start.left!, this.start.top!)
      );
      const p2 = canvasPointToObjectLocal(
        obj,
        new fabric.Point(this.end.left!, this.end.top!)
      );

      const w = obj.width! * obj.scaleX!;
      const h = obj.height! * obj.scaleY!;

      gradient = new fabric.Gradient({
        type: "linear",
        gradientUnits: "objectBoundingBox",
        coords: {
          x1: (p1.x + w / 2) / w,
          y1: (p1.y + h / 2) / h,
          x2: (p2.x + w / 2) / w,
          y2: (p2.y + h / 2) / h,
        },
        colorStops: this.stops.map((s) => ({
          offset: s.offset,
          color: s.stop.fill as string,
        })),
      });

      this.line.set({
        x1: this.start.left!,
        y1: this.start.top!,
        x2: this.end.left!,
        y2: this.end.top!,
      });
    } else {
      const c = canvasPointToObjectLocal(
        obj,
        new fabric.Point(this.center.left!, this.center.top!)
      );

      const r = Math.hypot(
        this.radius.left! - this.center.left!,
        this.radius.top! - this.center.top!
      );

      const w = obj.width! * obj.scaleX!;
      const h = obj.height! * obj.scaleY!;

      gradient = new fabric.Gradient({
        type: "radial",
        gradientUnits: "objectBoundingBox",
        coords: {
          x1: (c.x + w / 2) / w,
          y1: (c.y + h / 2) / h,
          r1: 0,
          x2: (c.x + w / 2) / w,
          y2: (c.y + h / 2) / h,
          r2: r / Math.max(w, h),
        },
        colorStops: this.stops.map((s) => ({
          offset: s.offset,
          color: s.stop.fill as string,
        })),
      });
    }

    obj.set("fill", gradient);
    this.canvas.requestRenderAll();
  }

  /* ---------- SYNC ---------- */
  syncHelpers() {
    if (!this.target) return;
    this.attach(this.target);
  }

  /* ---------- MODE ---------- */
  setMode(mode: "linear" | "radial") {
    this.mode = mode;
    if (this.target) this.attach(this.target);
  }

  /* ---------- DETACH ---------- */
  detach() {
    this.canvas.remove(
      this.line,
      this.start,
      this.end,
      this.center,
      this.radius
    );

    this.stops.forEach((s) => this.canvas.remove(s.stop));
    this.stops = [];
    this.target = null;
  }
}

export const createShapeStyleSlice = (set, get) => ({
  activePaint: "fill",
  fill: "#FFFFFF",
  stroke: "#000000",
  strokeWidth: 1,
  strokeStyle: "solid",
  opacity: 1,

  gradient: {
    type: "linear",
    angle: 90,
    stops: [
      { offset: 0, color: "#ff0000" },
      { offset: 1, color: "#0000ff" },
    ],
  },

  setGradient: (g) => {
    set((state) => ({
      gradient: { ...state.gradient, ...g },
    }));
  },

  applyFillGradient: () => {
    const canvas = get().canvas;
    const obj = canvas?.getActiveObject();

    if (!canvas || !obj) return;

    const gradient = createFabricGradient(get().gradient);

    obj.set("fill", gradient);

    canvas.requestRenderAll();
  },

  // strokeStyleList: [
  //     { value: "solid", label: "Solid" },
  //     { value: "dashed", label: "Dashed" },
  //     { value: "dotted", label: "Dotted" },
  //     { value: "double", label: "Double" },
  //     { value: "groove", label: "Groove" },
  //     { value: "ridge", label: "Ridge" },
  //     { value: "inset", label: "Inset" },
  //     { value: "outset", label: "Outset" },
  // ],
  //
  strokeStyleList: [
    { value: "solid", label: "Solid", dash: null, supported: true },
    { value: "dashed", label: "Dashed", dash: [6, 4], supported: true },
    { value: "dotted", label: "Dotted", dash: [2, 2], supported: true },

    // CSS-style effects — not renderable in Fabric.js
    { value: "double", label: "Double", dash: null, supported: false },
    { value: "groove", label: "Groove", dash: null, supported: false },
    { value: "ridge", label: "Ridge", dash: null, supported: false },
    { value: "inset", label: "Inset", dash: null, supported: false },
    { value: "outset", label: "Outset", dash: null, supported: false },
  ],

  strokeStyleMap: {
    solid: { dashArray: null, lineCap: "butt" },
    dashed: { dashArray: [10, 5], lineCap: "butt" },
    dotted: { dashArray: [2, 5], lineCap: "round" },
    double: { dashArray: [1, 3, 1, 3], lineCap: "butt" },
    groove: { dashArray: [4, 2, 1, 2], lineCap: "butt" },
    ridge: { dashArray: [1, 2, 4, 2], lineCap: "butt" },
    inset: { dashArray: [1, 1], lineCap: "butt" },
    outset: { dashArray: [2, 1], lineCap: "butt" },
  },

  setActivePaint: (paint) => set({ activePaint: paint }),

  setFill: (bgColor) => {
    const canvas = get().canvas;
    if (!canvas) return;

    if (typeof bgColor === "string" && bgColor.startsWith("bg-")) {
      bgColor = tailwindBgToHex(bgColor);
      if (!bgColor) return;
    }

    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => obj.set({ fill: bgColor }));
    canvas.requestRenderAll();
    set({ fill: bgColor });
  },

  setStroke: (color) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => obj.set({ stroke: color }));
    canvas.requestRenderAll();
    set({ stroke: color });
  },

  setStrokeWidthN: (width) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach((obj) => obj.set({ strokeWidth: width }));
    canvas.requestRenderAll();
    set({ strokeWidth: width });
  },

  setStrokeStyle: (styleValue) => {
    const canvas = get().canvas;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    const styleConfig =
      get().strokeStyleMap[styleValue] || strokeStyleMap.solid;

    activeObjects.forEach((obj) => {
      obj.set({
        strokeDashArray: styleConfig.dashArray,
        strokeLineCap: styleConfig.lineCap,
      });
    });

    canvas.requestRenderAll();
    set({ strokeStyle: styleValue });
  },
  setOpacity1: (value: number) => {
    const canvas = get().canvas;
    const obj = canvas?.getActiveObject();
    if (!obj) return;

    const normalized = value / 100;

    obj.set("opacity", normalized);
    canvas.requestRenderAll();

    set({ opacity: value });
  },

  // setOpacity: (value: number) => {
  //   const canvas = get().canvas;
  //   const obj = canvas?.getActiveObject();
  //   if (!obj) return;

  //   obj.set("opacity", value / 100);
  //   canvas.requestRenderAll();

  //   set({ opacity: value });
  // },
  //
  setOpacity: (opacity: number) => {
    const canvas = get().canvas;
    const obj = canvas?.getActiveObject();
    if (!obj) return;

    const safe = Math.min(1, Math.max(0.05, opacity));

    obj.set("opacity", safe);
    canvas.requestRenderAll();

    set({ opacity: safe });
  },

  previewOpacity: (value: number) => {
    const obj = get().canvas?.getActiveObject();
    if (!obj) return;

    if (previewOpacity === null) {
      previewOpacity = obj.opacity ?? 1;
    }

    obj.set("opacity", value / 100);
    get().canvas?.requestRenderAll();
  },

  endOpacityPreview: () => {
    const obj = get().canvas?.getActiveObject();
    if (!obj || previewOpacity === null) return;

    obj.set("opacity", previewOpacity);
    previewOpacity = null;

    get().canvas?.requestRenderAll();
  },

  handleColorChange: (color: string) => {
    const canvas = get().canvas;
    const geditor = get().geditor;
    if (!canvas) return;

    // Normalize Tailwind bg-* colors
    if (color.startsWith("bg-")) {
      const hex = tailwindBgToHex(color);
      if (!hex) return;
      color = hex;
    }

    const normalized = cssColorToHex(color);
    if (!normalized) return;

    const activeObjects = canvas.getActiveObjects();

    /* ---------------------------------------
         🟣 GRADIENT MODE (highest priority)
      --------------------------------------- */
    if (
      geditor &&
      geditor.activeStop && // 🔑 stop selected
      get().activePaint === "fill" // fill mode
    ) {
      // Update gradient stop ONLY
      geditor.updateActiveColor(normalized);

      // Still update store (for UI consistency)
      set({ fill: normalized });

      canvas.requestRenderAll();
      return; // ⛔ VERY IMPORTANT
    }

    /* ---------------------------------------
         🟢 NORMAL MODE (solid color)
      --------------------------------------- */

    if (activeObjects.length === 0) {
      // No selection → update store only
      if (get().activePaint === "stroke") {
        set({ stroke: normalized });
      } else {
        set({ fill: normalized });
      }
      return;
    }

    activeObjects.forEach((obj) => {
      if (get().activePaint === "stroke") {
        obj.set({ stroke: normalized });
      } else {
        // 🛑 prevent gradient overwrite
        if (obj.fill instanceof fabric.Gradient) return;

        obj.set({ fill: normalized });
      }
    });

    if (get().activePaint === "stroke") {
      set({ stroke: normalized });
    } else {
      set({ fill: normalized });
    }

    canvas.requestRenderAll();
  },

  addShadow: (shadow) => {
    const canvas = get().canvas;
    const obj = canvas?.getActiveObject();
    if (!obj) return;

    obj.set("shadow", new fabric.Shadow(shadow));
    canvas.requestRenderAll();
  },
  applyShadowPreset: (key) => {
    const canvas = get().canvas;
    const obj = canvas?.getActiveObject();
    if (!obj) return;

    const preset = SHADOW_PRESETS[key];
    if (!preset) return;

    const shadow = new fabric.Shadow({ ...preset });
    obj.set("shadow", shadow);
    canvas.requestRenderAll();

    set({ activeObjectShadow: shadow }); // update store
  },

  removeShadow: () => {
    const canvas = get().canvas;
    const obj = canvas?.getActiveObject();
    if (!obj) return;

    obj.set("shadow", null);
    canvas.requestRenderAll();

    set({ activeObjectShadow: null }); // update store
  },

  /* -------------------------------------------------
          Convert Fabric object → Fabric.Path safely
       --------------------------------------------------*/
  toFabricPath(obj) {
    if (obj.type === "path") return obj;

    const svg = obj.toSVG();
    const match = svg.match(/d="([^"]+)"/);
    if (!match) return null;

    return new fabric.Path(match[1], {
      fill: obj.fill,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
    });
  },

  async boolMe(props) {
    const canvas = get().canvas;
    const active = canvas.getActiveObject();

    if (!active || active.type !== "activeselection") {
      alert("Select at least 2 objects");
      return;
    }

    const objects = active.getObjects();

    // ✅ STORE SELECTION CENTER
    const bounds = active.getBoundingRect(true);
    const center = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };

    // ✅ STORE STYLE
    const styleSource = objects[0];
    const style = {
      fill: styleSource.fill,
      stroke: styleSource.stroke,
      strokeWidth: styleSource.strokeWidth,
    };

    canvas.discardActiveObject();

    // --- PAPER BOOLEAN ---
    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(5000, 5000));

    let result = null;

    objects.forEach((obj, i) => {
      const item = scope.project.importSVG(obj.toSVG(), {
        expandShapes: true,
        insert: false,
      });

      const path = item.children?.[0] ?? item;

      path.fillColor = "black";
      path.strokeColor = null;

      result = i === 0 ? path : result.unite(path);
    });

    const rawSVG = result.exportSVG({
      asString: true,
      bounds: "content",
      precision: 3,
    });

    const svg = `
               <svg xmlns="http://www.w3.org/2000/svg">
                 ${rawSVG}
               </svg>
             `;

    // --- FABRIC IMPORT (v6) ---
    fabric.loadSVGFromString(svg).then(({ objects: parsed }) => {
      const path = parsed[0];

      path.set({
        ...style,
        originX: "center",
        originY: "center",
        scaleX: 1,
        scaleY: 1,
        angle: 0,
      });

      // ✅ RESTORE ORIGINAL POSITION
      path.setPositionByOrigin(
        new fabric.Point(center.x, center.y),
        "center",
        "center"
      );

      path.setCoords();

      // cleanup
      canvas.remove(...objects);
      canvas.add(path);
      canvas.setActiveObject(path);
      canvas.requestRenderAll();
    });

    // const objects = active.getObjects();
    //   const bounds = active.getBoundingRect(true);

    //   canvas.discardActiveObject();

    //   const scope = new paper.PaperScope();
    //   scope.setup(new scope.Size(5000, 5000));

    //   let result = null;

    //   objects.forEach((obj, i) => {
    //     const svg = obj.toSVG();

    //     const item = scope.project.importSVG(svg, {
    //       expandShapes: true,
    //       insert: false
    //     });

    //     let path =
    //       item instanceof scope.Group
    //         ? item.children[0]
    //         : item;

    //     path.fillColor = "black";
    //     path.strokeColor = null;

    //     result = i === 0 ? path : result.unite(path);
    //   });

    //   // 🔥 THIS IS THE MISSING PIECE
    //   result = normalizePaperPath(result, scope);

    //   console.log({ result })

    //   const svgResult1 = result.exportSVG({
    //       asString: true,
    //         bounds: "content",
    //         precision: 3
    //   });

    //   console.log(svgResult1)

    //   const svgResult = wrapSVG(svgResult1);

    //                console.log(svgResult)

    //                fabric.loadSVGFromString(svgResult).then(({ objects }) => {
    //                  if (!objects || objects.length === 0) {
    //                    console.error("No SVG objects parsed");
    //                    return;
    //                  }

    //                  const path = objects[0]; // union result = single path

    //                  path.set({
    //                    originX: "center",
    //                    originY: "center",
    //                    scaleX: 1,
    //                    scaleY: 1,
    //                    angle: 0
    //                  });

    //                  canvas.add(path);

    //                  // ✅ FABRIC v6 WAY
    //                  canvas.centerObject(path);
    //                  path.setCoords();

    //                  canvas.setActiveObject(path);
    //                  canvas.requestRenderAll();
    //                });

    //   // fabric.loadSVGFromString(svgResult, (objects, options) => {
    //   //   console.log("SVG objects:", objects);

    //   //   let merged;

    //   //   // ✅ SAFETY CHECKS (CRITICAL)
    //   //   if (!Array.isArray(objects) || objects.length === 0) {
    //   //     console.error("No SVG objects parsed");
    //   //     return;
    //   //   }

    //   //   if (objects.length === 1) {
    //   //     // ✅ MOST UNION RESULTS
    //   //     merged = objects[0];
    //   //   } else {
    //   //     // ✅ ONLY when multiple paths
    //   //     merged = new fabric.Group(objects, {
    //   //       ...options
    //   //     });
    //   //   }

    //   //   // 🔴 RESET TRANSFORMS (IMPORTANT)
    //   //   merged.set({
    //   //     scaleX: 1,
    //   //     scaleY: 1,
    //   //     angle: 0,
    //   //     skewX: 0,
    //   //     skewY: 0,
    //   //     originX: "center",
    //   //     originY: "center"
    //   //   });

    //   //   merged.center();
    //   //   merged.setCoords();

    //   //   canvas.add(merged);
    //   //   canvas.setActiveObject(merged);
    //   //   canvas.requestRenderAll();
    //   // });
  },

  _booleanSelected(operation, options = {}) {
    // const canvas = get().canvas;
    // const objects = canvas.getActiveObjects();
    // if (objects.length < 2) return;
    // return booleanOperation({
    //   canvas,
    //   objects,
    //   operation,
    //   fill: options.fill,
    //   afterAdd: (shape) => {
    //     get().setToolbar({ target: shape });
    //     get().updateFromFabric(shape);
    //     get().saveState();
    //     get().addLayer(shape, "path");
    //   }
    // });
  },

  booleanOperation: async (operation = "union") => {
    const canvas = get().canvas;
    const active = canvas.getActiveObject();

    if (!active || active.type !== "activeselection") {
      alert("Select at least 2 objects");
      return;
    }

    if (!BOOLEAN_OP[operation]) {
      console.error("Invalid boolean operation:", operation);
      return;
    }

    const objects = active.getObjects();

    if (objects.length < 2) return;

    // --- SAVE CENTER POSITION ---
    const bounds = active.getBoundingRect(true);
    const center = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };

    // --- SAVE STYLE ---
    const styleSource = objects[0];
    // const style = {
    //   fill: styleSource.fill,
    //   stroke: styleSource.stroke,
    //   strokeWidth: styleSource.strokeWidth,
    // };
    const style = extractStyle(styleSource);


    canvas.discardActiveObject();

    // --- PAPER BOOLEAN ---
    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(5000, 5000));

    let result = null;

    objects.forEach((obj, i) => {
      const item = scope.project.importSVG(obj.toSVG(), {
        expandShapes: true,
        insert: false,
      });

      // const path = item.children?.[0] ?? item;

      // path.fillColor = "black";
      // path.strokeColor = null;

      const path = convertStrokeToPath(item.children?.[0] ?? item);

      if (i === 0) {
        result = path;
      } else {
        result = result[BOOLEAN_OP[operation]](path);
      }
    });

    if (!result || result.area <= 0) return;

    // --- PAPER → SVG ---
    const rawSVG = result.exportSVG({
      asString: true,
      bounds: "content",
      precision: 3,
    });

    const svg = `
           <svg xmlns="http://www.w3.org/2000/svg">
             ${rawSVG}
           </svg>
         `;

    // --- SVG → FABRIC (v6) ---
    const { objects: parsed } = await fabric.loadSVGFromString(svg);

    if (!parsed || parsed.length === 0) return;

    const finalPath = parsed[0];

    // activeObj.set({ stroke: null });

    finalPath.set({
      ...style,
      strokeUniform: true,
      originX: "center",
      originY: "center",
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
    });


    // --- RESTORE POSITION ---
    finalPath.setPositionByOrigin(
      new fabric.Point(center.x, center.y),
      "center",
      "center"
    );

    finalPath.setCoords();

    const insertIndex = getTopmostIndex(canvas, objects);

    // --- CLEANUP ---
    canvas.remove(...objects);
    canvas.add(finalPath);
    // insertAtPreservedZIndex(canvas, finalPath, objects);
    //
    // canvas.insertAt(finalPath, insertIndex);

    canvas.setActiveObject(finalPath);
    canvas.requestRenderAll();
  },



  unionSelected(opts) {
    return get().booleanOperation("union", opts);
  },
  intersectSelected(opts) {
    return get().booleanOperation("intersect", opts);
  },
  subtractSelected(opts) {
    return get().booleanOperation("subtract", opts);
  },
  excludeSelected(opts) {
    return get().booleanOperation("exclude", opts);
  },
});

function extractStyle(obj) {
  return {
    fill: obj.fill,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    strokeDashArray: obj.strokeDashArray,
    strokeLineCap: obj.strokeLineCap,
    strokeLineJoin: obj.strokeLineJoin,
    opacity: obj.opacity,
  };
}

function getTopmostIndex(canvas, objects) {
  const stack = canvas.getObjects();
  return Math.max(
    ...objects.map(obj => stack.indexOf(obj))
  );
}


function insertAtPreservedZIndex(canvas, newObject, oldObjects) {
  if (!newObject || typeof newObject._set !== "function") {
    console.error("Not a Fabric object:", newObject);
    return;
  }

  const stack = canvas.getObjects();
  const index = Math.max(
    ...oldObjects.map(o => stack.indexOf(o))
  );

  // remove originals first
  canvas.remove(...oldObjects);

  // Fabric v6 API
  canvas.insertAt(newObject, index);
}



function convertStrokeToPath(path) {
  if (!path.strokeWidth) return path;
  path.strokeColor = null;
  path.strokeWidth = 0;
  path.fillColor = "black";
  path.closed = true;

  return path;
}

function wrapSVG(svgContent) {
  if (svgContent.includes("<svg")) return svgContent;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5000 5000">
      ${svgContent}
    </svg>
  `;
}

function normalizePaperPath(path, scope) {
  // Flatten compound paths
  if (path instanceof scope.CompoundPath) {
    const merged = new scope.Path();
    path.children.forEach((p) => merged.addSegments(p.segments));
    path = merged;
  }

  path.fillColor = "black";
  path.strokeColor = null;
  path.closed = true;

  return path;
}

function fabricToPaperPath(obj, scope) {
  const svg = obj.toSVG();

  const item = scope.project.importSVG(svg, {
    expandShapes: true,
    insert: false,
  });

  // 🔥 Flatten groups
  let path = null;

  if (item instanceof scope.Group) {
    path = item.children[0];
  } else {
    path = item;
  }

  path.fillColor = "black"; // REQUIRED
  path.strokeColor = null;

  return path;
}

// function fabricObjectToSVG(obj) {
//   return obj.toSVG();
// }

// function fabricObjectToSVGPath(obj) {
//   return new Promise((resolve) => {
//     obj.clone((cloned) => {
//       cloned.set({ left: 0, top: 0 });
//       resolve(cloned.toSVG());
//     });
//   });
// }

function booleanOperation({
  canvas,
  objects,
  operation,
  fill = "purple",
  afterAdd,
}) {
  if (!canvas || objects.length < 2) return;

  const paperCanvas = document.createElement("canvas");
  paper.setup(paperCanvas);

  const paths = objects.map((obj) => {
    const svg = obj.toSVG();
    const imported = paper.project.importSVG(svg);

    const path = toPathItem(imported);

    // Fabric → Paper positioning
    path.position = new paper.Point(
      obj.left + obj.getScaledWidth() / 2,
      obj.top + obj.getScaledHeight() / 2
    );

    return path;
  });

  let result = paths[0];

  for (let i = 1; i < paths.length; i++) {
    switch (operation) {
      case "union":
        result = result.unite(paths[i]);
        break;
      case "intersect":
        result = result.intersect(paths[i]);
        break;
      case "subtract":
        result = result.subtract(paths[i]);
        break;
      case "exclude":
        result = result.exclude(paths[i]);
        break;
    }
  }

  if (!result || result.isEmpty()) return;

  // Normalize to top-left
  const bounds = result.bounds;
  result.translate(-bounds.x, -bounds.y);

  // Export SVG path
  const svg = result.exportSVG({ asString: true });
  const d = svg.match(/d="([^"]+)"/)?.[1];
  if (!d) return;

  const shape = new fabric.Path(d, {
    left: bounds.x,
    top: bounds.y,
    fill,
  });

  // Remove originals
  objects.forEach((o) => canvas.remove(o));

  canvas.add(shape);
  canvas.setActiveObject(shape);
  canvas.renderAll();

  afterAdd?.(shape);

  return shape;
}
