import type { Character } from '@/character/schema/types';

/**
 * Scene data contract (docs/CHARACTER_STUDIO.md §9). A scene is self-contained: every actor embeds its full
 * Character JSON. A change to these types bumps SCENE_SCHEMA_VERSION and adds a migration step.
 *
 * World space = the character rig's space: cm, y up, ground at y = 0, +x = right of the default view, +z toward
 * the default camera.
 */
export const SCENE_SCHEMA_VERSION = 1;

export type V3 = [number, number, number];

/** Group pictures: 2–5 characters (crowds of simple extras come in phase 10). */
export const MAX_ACTORS = 5;

export type Lens =
    | { kind: 'perspective'; /** on a 36 mm wide sensor */ focalMm: number }
    | { kind: 'orthographic'; /** world height the frame shows */ heightCm: number };

/** Rotation as the studio orbit camera: yaw 0 looks toward -z, pitch + looks down, roll turns the frame. */
export interface SceneCamera {
    position: V3;
    yaw: number;
    pitch: number;
    roll: number;
    lens: Lens;
}

export const ASPECTS = ['16:9', '4:3', '3:2', '1:1', '4:5', '3:4', '9:16', '2.39:1'] as const;
export type AspectId = (typeof ASPECTS)[number];

export const FRAME_SHAPES = ['rect', 'rounded', 'circle'] as const;
export type FrameShape = (typeof FRAME_SHAPES)[number];

export interface SceneFrame {
    aspect: AspectId;
    shape: FrameShape;
    /** border width in frame units (frame = 1000 wide); 0 = none */
    border: number;
    borderColor: string;
}

export const TIMES = ['morning', 'day', 'golden', 'night'] as const;
export const WEATHERS = ['clear', 'cloudy', 'rain', 'snow', 'fog'] as const;
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type TimeOfDay = (typeof TIMES)[number];
export type Weather = (typeof WEATHERS)[number];
export type Season = (typeof SEASONS)[number];

export interface SceneSet {
    /** environment registry id (unknown ids draw as the plain studio set) */
    environment: string;
    /** one of the environment's variants ('' = its first) */
    variant: string;
    /** the generator's random seed: same seed, same set */
    seed: number;
    /** extras standing in the place behind the characters, 0–80 (sets/crowd.ts) */
    crowd: number;
    time: TimeOfDay;
    weather: Weather;
    season: Season;
}

export interface SceneActor {
    id: string;
    character: Character;
    /** feet on the ground at (x, 0, z) */
    x: number;
    z: number;
    /** the body's yaw in degrees: 0 faces +z (the default camera), 90 faces +x */
    facing: number;
    /** another actor's id: the head turns toward it */
    lookAt: string | null;
}

export interface Scene {
    schemaVersion: number;
    id: string;
    name: string;
    actors: SceneActor[];
    set: SceneSet;
    camera: SceneCamera;
    frame: SceneFrame;
    /** one art style for everyone: new actors and edited characters follow the scene's style */
    styleLock: boolean;
}
