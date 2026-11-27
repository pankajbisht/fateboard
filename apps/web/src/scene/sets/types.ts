import type { SceneCamera, V3 } from '../schema/types';
import type { WorldLook } from '../world/look';
import type { Rand } from '../world/random';

/**
 * Set dressing (docs/CHARACTER_STUDIO.md §9): an environment is a generator that places primitives in the
 * actors' world (cm, y up). The same camera draws set and actors, so every view works without per-view art.
 *
 * Layers: `ground` (in the order given, before everything), `back` (a room's shell: always behind actors),
 * `mid` (sorted with the actors far → near), `front` (over everything: foreground leaves, a window frame).
 */
export type SetLayer = 'ground' | 'back' | 'mid' | 'front';

interface Base {
    layer?: SetLayer;
}

/** A flat polygon (floor, wall, road, river, blackboard, window). */
export interface QuadPiece extends Base {
    kind: 'quad';
    points: V3[];
    color: string;
    /** darker when it faces away from the sun (walls); floors stay flat */
    shade?: boolean;
    /** outline colour, or none */
    line?: string | null;
    /**
     * Drawn only from the side its winding faces (a room's walls face inward): a camera outside the room sees
     * into it through the near walls, like a dollhouse.
     */
    cull?: boolean;
}

/** A box standing on `at` (bottom centre), turned by `rotY` degrees (desks, buildings, steps, stalls). */
export interface BoxPiece extends Base {
    kind: 'box';
    at: V3;
    /** width (x), height (y), depth (z) in cm */
    size: V3;
    rotY?: number;
    color: string;
    /** top face colour (default: the box colour, a little lighter) */
    top?: string;
    line?: string | null;
}

/** A flat cut-out that always faces the camera (trees, lamps, pillars, extras, clouds). */
export interface CardPiece extends Base {
    kind: 'card';
    /** bottom centre */
    at: V3;
    width: number;
    height: number;
    /** a CARD_SHAPES id */
    shape: string;
    colors?: string[];
    flip?: boolean;
}

/** A line in the world (wires, rails, lane marks); width in cm. */
export interface LinePiece extends Base {
    kind: 'line';
    points: V3[];
    color: string;
    width: number;
}

export type SetPiece = QuadPiece | BoxPiece | CardPiece | LinePiece;

export interface BuildCtx {
    rand: Rand;
    look: WorldLook;
    variant: string;
}

export interface EnvironmentDef {
    id: string;
    name: string;
    category: 'studio' | 'indoor' | 'city' | 'nature' | 'landmark';
    tags: readonly string[];
    /** looks of the same place ('' = the first) */
    variants: readonly { id: string; name: string }[];
    /** where the actors stand: centre and how far apart rows / slots may spread (cm) */
    stage: { x: number; z: number; spread: number };
    /**
     * Where the scene's crowd of extras may stand (cm; default: behind the stage by category). Arenas put it on
     * their stands so nobody stands inside the ring.
     */
    crowdArea?: { x0: number; z0: number; x1: number; z1: number };
    /** the camera this place opens with (inside the room, at eye level, …) */
    camera: Pick<SceneCamera, 'position' | 'yaw' | 'pitch'>;
    /** false: no sky above (a closed room) */
    sky: boolean;
    build(ctx: BuildCtx): SetPiece[];
}
