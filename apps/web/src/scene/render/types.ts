import type { Paint } from '@/character/render/parts';
import type { P2 } from '../camera/projection';

/** One path of a rendered scene, in frame coordinates (what the studio view, the SVG and the page draw). */
export interface SceneDrawable {
    key: string;
    d: string;
    fill: Paint;
    stroke: string | null;
    strokeWidth: number;
    opacity?: number;
    /** manga screentone density 0..1 */
    tone?: number;
    /** holes: the frame's mat */
    evenOdd?: boolean;
    /** pressing it selects this actor */
    actor?: string;
    /** pressing it selects this scene prop */
    prop?: string;
}

/** Draw order: sky, ground, room shell, the sorted middle, front pieces, weather, the frame. */
export const LAYER = {
    sky: 0,
    ground: 1,
    back: 2,
    mid: 3,
    front: 4,
    weather: 5,
    frame: 6,
} as const;

/** A unit of depth sorting: everything one thing draws (a box's faces, an actor's parts). */
export interface SortItem {
    layer: number;
    /** distance from the camera (cm): far first inside a layer; ground keeps its order */
    distance: number;
    items: SceneDrawable[];
}

export interface ActorBox {
    id: string;
    name: string;
    /** feet, in the frame */
    anchor: P2;
    /** x0, y0, x1, y1 in the frame */
    bounds: [number, number, number, number];
    /** frame units per cm */
    scale: number;
}

export interface SceneModel {
    width: number;
    height: number;
    items: SceneDrawable[];
    actors: ActorBox[];
    /** scene props on screen (the same box shape: id, label, base, bounds, scale) */
    props: ActorBox[];
    horizon: [P2, P2] | null;
}
