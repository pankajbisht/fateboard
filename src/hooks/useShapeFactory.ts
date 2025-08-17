import * as fabric from "fabric";
import { useStore } from "../store/store";

export const shapesList = [
  {
    type: "rect",
    icon: "fa-regular fa-square",
    defaultProps: {
      width: 120,
      height: 80,
      rx: 0, // rounded corners (x-radius)
      ry: 0,
      fill: "transparent",
      stroke: "black",
    },
  },
  {
    type: "circle",
    icon: "fa-regular fa-circle",
    defaultProps: {
      radius: 48,
      fill: "transparent",
      stroke: "black",
    },
  },
  {
    type: "triangle",
    icon: "fas fa-play rotate-270", // fontawesome doesn’t have "regular" triangle
    defaultProps: {
      width: 100,
      height: 100,
      fill: "transparent",
      stroke: "black",
    },
  },
  {
    type: "ellipse",
    icon: "fa-regular fa-circle transform scale-x-120", // closest FA icon (no ellipse in regular set)
    defaultProps: {
      rx: 70,
      ry: 45,
      fill: "transparent",
      stroke: "black",
    },
  },
  {
    type: "line",
    icon: "fa-solid fa-slash", // "circle" doesn’t make sense for line
    defaultProps: {
      strokeWidth: 2,
      stroke: "black",
    },
  },
];


export const useShapeFactory = () => {
  const canvas = useStore((state) => state.canvas);
  const addShape = useStore((state) => state.addShape);

  /** Add predefined shape */
  const add = (type, options = {}) => {
    if (!canvas) return;
    const shapeConfig = shapesList.find((s) => s.type === type);
    if (!shapeConfig) return;
    addShape(type, { ...shapeConfig.defaultProps, ...options });
  };

  /** ---------------- LINE DRAWING ---------------- */
  let line = null;
  let isDrawing = false;
  let listenersAttached = false;

  const startLine = (opt) => {
    // ignore clicks on existing objects
    if (opt.target) return;

    isDrawing = true;
    const pointer = canvas.getPointer(opt.e);
    const points = [pointer.x, pointer.y, pointer.x, pointer.y];

    line = new fabric.Line(points, {
      strokeWidth: 2,
      stroke: "black",
      selectable: true,
      evented: true,
    });

    canvas.add(line);
  };

  const drawLine = (opt) => {
    if (!isDrawing || !line) return;
    const pointer = canvas.getPointer(opt.e);
    line.set({ x2: pointer.x, y2: pointer.y });
    canvas.renderAll();
  };

  const finishLine = () => {
    if (!isDrawing) return;
    isDrawing = false;
    line = null;
  };

  /** Enable line drawing mode */
  const enableLineDrawing = () => {
    if (!canvas || listenersAttached) return;

    canvas.on("mouse:down", startLine);
    canvas.on("mouse:move", drawLine);
    canvas.on("mouse:up", finishLine);

    listenersAttached = true;
    canvas.isDrawingMode = false; // prevent fabric pencil
  };

  /** Disable line drawing mode */
  const disableLineDrawing = () => {
    if (!canvas || !listenersAttached) return;

    canvas.off("mouse:down", startLine);
    canvas.off("mouse:move", drawLine);
    canvas.off("mouse:up", finishLine);

    listenersAttached = false;
  };

  return { shapesList, add, enableLineDrawing, disableLineDrawing };
};

