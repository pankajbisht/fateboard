import * as fabric from 'fabric';

/*
 * This slice interacts heavily with fabric's runtime types and the zustand
 * store; narrow obvious parameter shapes but allow local `any` use where
 * necessary. Keep changes minimal and safe.
 */
type FateBoardBrush = 'pencil' | 'circle' | 'spray' | 'pattern';

export const createBrushSlice = (set: any, get: any, _store: any) => ({
    brush: 'pencil',
    width: 4,
    color: '#000',
    cursor: 'crosshair',

    // keep external API generic; internal runtime casting is allowed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBrush: (options: any = {}) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const brushFactory = {
            pencil: () => new fabric.PencilBrush(canvas),
            circle: () => new fabric.CircleBrush(canvas),
            spray: () => new fabric.SprayBrush(canvas),
            pattern: () => new fabric.PatternBrush(canvas),
            eraser: () => new (fabric as any).EraserBrush(canvas),
        };

        const type = options?.brush ?? (get() as any).brush;
        const brush = brushFactory[type] ? brushFactory[type]() : brushFactory['pencil']();
        const color = options?.color ?? (get() as any).color;
        const width = options?.width ?? (get() as any).width;
        const cursor = options.cursor ?? "url('/pencil.svg') 0 32, crosshair";

        brush.color = color;
        brush.width = width;

        canvas.freeDrawingBrush = brush;
        canvas.freeDrawingCursor = cursor;
        set({ brush: type, color, width, cursor });
        canvas.renderAll();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBrushWidth: (options: any = {}) => {
        const canvas = get().canvas;
        if (!canvas) return;
        console.log(options);

        const width = options?.width ?? (get() as any).width;
        (canvas.freeDrawingBrush as any).width = width;

        set({ width });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBrushColor: (options: any = {}) => {
        const canvas = get().canvas;
        if (!canvas) return;
        console.log(options);

        const color = options?.color ?? (get() as any).color;
        (canvas.freeDrawingBrush as any).color = color;

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
});
