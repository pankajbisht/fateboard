import * as fabric from "fabric";
export const createShapeStyleSlice = (set, get) => ({
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 2,
    strokeStyle: "solid",
    opacity: 1,
    strokeStyleList: [
        { value: "solid", label: "Solid" },
        { value: "dashed", label: "Dashed" },
        { value: "dotted", label: "Dotted" },
        { value: "double", label: "Double" },
        { value: "groove", label: "Groove" },
        { value: "ridge", label: "Ridge" },
        { value: "inset", label: "Inset" },
        { value: "outset", label: "Outset" },
    ],

    strokeStyleMap: {
        solid:  { dashArray: null, lineCap: "butt" },
        dashed: { dashArray: [10, 5], lineCap: "butt" },
        dotted: { dashArray: [2, 5], lineCap: "round" },
        double: { dashArray: [1, 3, 1, 3], lineCap: "butt" },
        groove: { dashArray: [4, 2, 1, 2], lineCap: "butt" },
        ridge:  { dashArray: [1, 2, 4, 2], lineCap: "butt" },
        inset:  { dashArray: [1, 1], lineCap: "butt" },
        outset:  { dashArray: [2, 1], lineCap: "butt" },
    },

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

    setStrokeStyle: (styleValue) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const activeObjects = canvas.getActiveObjects();
        const styleConfig = get().strokeStyleMap[styleValue] || strokeStyleMap.solid;

        activeObjects.forEach((obj) => {
          obj.set({
            strokeDashArray: styleConfig.dashArray,
            strokeLineCap: styleConfig.lineCap,
          });
        });

        canvas.requestRenderAll();
        set({ strokeStyle: styleValue });
    }
});


