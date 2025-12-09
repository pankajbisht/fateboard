import * as fabric from "fabric";

type FateBoardBrush = "pencil" | "circle" | "spray" | "pattern";

export const createBrushSlice = (set, get) => ({
    brush: "pencil",
    width: 4,
    color: "#000",
    cursor: "crosshair",

    setBrush: (options={}) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const brushFactory = {
            pencil: () => new fabric.PencilBrush(canvas),
            circle: () => new fabric.CircleBrush(canvas),
            spray: () => new fabric.SprayBrush(canvas),
            pattern: () => new fabric.PatternBrush(canvas),
            eraser: () => new fabric.PencilBrush(canvas)
        };

        const type = options?.brush ?? get().brush;
        const brush = brushFactory[type] ? brushFactory[type]() : brushFactory["pencil"]();
        const color = options?.color ?? get().color;
        const width = options?.width ?? get().width;
        const cursor = options.cursor ?? "url('/pencil.svg') 0 32, crosshair";

        brush.color = color;
        brush.width = width;

        canvas.freeDrawingBrush = brush;
        canvas.freeDrawingCursor = cursor;
        set({ brush: type, color, width, cursor});
        canvas.renderAll();
    },
    setBrushWidth: (options={}) => {
        const canvas = get().canvas;
        if (!canvas) return;
        console.log(options);


        const width = options?.width ?? get().width;
        canvas.freeDrawingBrush.width = width;

        set({ width });
    },
    setBrushColor: (options={}) => {
        const canvas = get().canvas;
        if (!canvas) return;
        console.log(options);


        const color = options?.color ?? get().color;
        canvas.freeDrawingBrush.color = color;

        set({ color });
    },
//    setBrushColor: (options={}) => {
//        const canvas = get().canvas;
//        if (!canvas) return;
//
//        const color = options?.color ?? get().color;
//        canvas.freeDrawingBrush.color = color;
//
//        set({ color });
//    }
})
