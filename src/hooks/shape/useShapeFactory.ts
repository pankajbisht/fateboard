import * as fabric from "fabric";
import { useStore } from "@store";

export const shapesList = [
  {
    type: "rect",
    icon: "fa-regular fa-square",
    defaultProps: {
      width: 120,
      height: 80,
      rx: 0,
      ry: 0,
      fill: "transparent",
      stroke: "black",
    },
  },
  {
    type: "circle",
    icon: "fa-solid fa-circle",
    defaultProps: {
      radius: 48,
      fill: "transparent",
      stroke: "black",
    },
  },
  {
    type: "paper",
    icon: "fa-solid fa-square-pen",
    defaultProps: {
      with: 120,
      height: 80,
      fill: "transparent",
      strock: "black",
    },
  },
  {
    type: "triangle",
    icon: "fas fa-play rotate-270",
    defaultProps: {
      width: 100,
      height: 100,
      fill: "transparent",
      stroke: "black",
    },
  },
  {
    type: "ellipse",
    icon: "fa-solid fa-circle transform scale-x-120",
    defaultProps: {
      rx: 70,
      ry: 45,
      fill: "transparent",
      stroke: "black",
    },
  },
  {
    type: "line",
    icon: "fa-solid fa-slash",
    defaultProps: {
      strokeWidth: 2,
      stroke: "black",
    },
  },
  // New shapes
  {
    type: "polygon",
    icon: "fa-solid fa-caret-up", // example FA icon
    defaultProps: {
      points: [
        { x: 50, y: 0 },
        { x: 100, y: 50 },
        { x: 75, y: 100 },
        { x: 25, y: 100 },
        { x: 0, y: 50 },
      ],
      fill: "transparent",
      stroke: "black",
      strokeWidth: 2,
    },
  },
  {
    type: "star",
    icon: "fa-solid fa-star",
    defaultProps: {
      numPoints: 5,
      innerRadius: 20,
      outerRadius: 50,
      fill: "transparent",
      stroke: "black",
      strokeWidth: 2,
    },
  },
  {
    type: "arrow",
    icon: "fa-solid fa-arrow-up",
    defaultProps: {
      width: 120,
      height: 20,
      fill: "transparent",
      stroke: "black",
      strokeWidth: 3,
      headLength: 15, // optional for Fabric arrow plugin
    },
  },
  {
    type: "diamond",
    icon: "fa-solid fa-gem", // approximate FA icon
    defaultProps: {
      width: 80,
      height: 80,
      fill: "transparent",
      stroke: "black",
      strokeWidth: 2,
      angle: 45,
    },
  },
  {
    type: "pentagon",
    icon: "fa-solid fa-star-half-stroke", // closest FA icon
    defaultProps: {
      points: [
        { x: 50, y: 0 },
        { x: 95, y: 38 },
        { x: 78, y: 90 },
        { x: 22, y: 90 },
        { x: 5, y: 38 },
      ],
      fill: "transparent",
      stroke: "black",
      strokeWidth: 2,
    },
  },
];

export const useShapeFactory = () => {
  const canvas = useStore((state) => state.canvas);
  const addShape = useStore((state) => state.addShape);
  const setActiveTool = useStore((state) => state.setActiveTool);

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
    setActiveTool("select");
    disableLineDrawing();
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
