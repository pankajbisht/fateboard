declare module 'fabric' {
    // Minimal types used in the codebase to improve type-safety for Fabric APIs
    export class Point {
        x: number;
        y: number;
        constructor(x: number, y: number);
    }

    export namespace util {
        function invertTransform(matrix: unknown): unknown;
        function transformPoint(p: Point, transform: unknown): Point;
    }

    export class Object {
        left?: number | undefined;
        top?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        scaleX?: number | undefined;
        scaleY?: number | undefined;
        angle?: number | undefined;
        fill?: unknown;
        originX?: string | number;
        originY?: string | number;
        selectable?: boolean;
        hasControls?: boolean;
        hasBorders?: boolean;
        excludeFromExport?: boolean;
        calcTransformMatrix(): unknown;
        set(prop: string | object, value?: unknown): this;
        on(event: string, handler: (...args: unknown[]) => void): this;
        off(event: string, handler?: (...args: unknown[]) => void): this;
        getScaledWidth?(): number;
        getScaledHeight?(): number;
    }

    export class Circle extends Object {
        radius?: number;
        fill?: string;
        constructor(options?: unknown);
    }

    export class Line extends Object {
        constructor(points: number[] | unknown[], options?: unknown);
    }

    export class ActiveSelection extends Object {
        constructor(objects?: unknown[], options?: unknown);
        canvas?: Canvas;
        forEachObject?(handler: (obj: Object) => void): void;
        setCoords?(): void;
    }

    export class Group extends Object {
        constructor(objects?: any[], options?: any);
        removeAll?(): any[];
    }

    export class Text extends Object {
        constructor(text: string, options?: unknown);
    }

    export class IText extends Text {}

    export class Textbox extends Text {}

    export class Canvas {
        constructor(el: HTMLElement | string, options?: unknown);
        width?: number;
        height?: number;
        freeDrawingBrush: unknown;
        freeDrawingCursor: unknown;
        add(...objs: unknown[]): void;
        remove(...objs: unknown[]): void;
        on(event: string, handler: (...args: unknown[]) => void): void;
        off(event: string, handler?: (...args: unknown[]) => void): void;
        requestRenderAll(): void;
        renderAll(): void;
        dispose(): void;
        findTarget?(e: any, skipGroup?: boolean): any;
        getPointer?(e: any): { x: number; y: number };
        toJSON?(props?: string[]): unknown;
        clear?(): void;
    }

    export class Gradient {
        constructor(opts: unknown);
        type?: string;
    }

    export class Pattern {
        constructor(opts: unknown);
    }

    export class PencilBrush {
        constructor(canvas: Canvas);
        color?: string;
        width?: number;
    }

    export class CircleBrush {
        constructor(canvas: Canvas);
    }
    export class SprayBrush {
        constructor(canvas: Canvas);
    }
    export class PatternBrush {
        constructor(canvas: Canvas);
    }
    export class EraserBrush {
        constructor(canvas: Canvas);
    }

    const fabric: {
        Point: typeof Point;
        util: typeof util;
        Canvas: typeof Canvas;
        Object: typeof Object;
        Circle: typeof Circle;
        Line: typeof Line;
        Gradient: typeof Gradient;
        Pattern: typeof Pattern;
        PencilBrush: typeof PencilBrush;
        CircleBrush: typeof CircleBrush;
        SprayBrush: typeof SprayBrush;
        PatternBrush: typeof PatternBrush;
        EraserBrush: typeof EraserBrush;
    };

    export default fabric;
}
