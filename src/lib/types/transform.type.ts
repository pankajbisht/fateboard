export type Transform = {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
    originX: string;
    originY: string;
    id: string;
    /** corner radius, only meaningful for Rect */
    rx: number;
    ry: number;
};
