import type { Character } from '@/character/schema/types';

/**
 * Scene data contract (docs/CHARACTER_STUDIO.md §9). A scene is self-contained: every actor embeds its full
 * Character JSON. A change to these types bumps SCENE_SCHEMA_VERSION and adds a migration step.
 *
 * World space = the character rig's space: cm, y up, ground at y = 0, +x = right of the default view, +z toward
 * the default camera.
 */
export const SCENE_SCHEMA_VERSION = 2;

export type V3 = [number, number, number];

/** Group pictures: 2–5 characters (crowds of simple extras come in phase 10). */
export const MAX_ACTORS = 5;

/** Catalogue props standing in a scene (schema v2): enough for a set, few enough to stay fast. */
export const MAX_SCENE_PROPS = 40;
/** A scene prop's height range in cm (a cup to a skyscraper). */
export const SCENE_PROP_HEIGHT = { min: 5, max: 6000 } as const;

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
    /** wind on every actor's hair and hanging cloth, 0..1 (character schema/effects.ts); absent = none */
    wind?: number;
    /** where it blows to in the world, degrees round the vertical: 0 = +x, 90 = +z (toward the default camera) */
    windDir?: number;
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

/**
 * A Scene Objects prop (src/props, docs/PROPS.md §9) standing in the world: a card that always faces the camera,
 * its base on the ground at (x, 0, z), `height` cm tall (its width follows the drawing). Schema v2.
 */
export interface SceneProp {
    id: string;
    /** catalogue id; an unknown one is kept and not drawn (a newer catalogue may know it) */
    propId: string;
    variant: number;
    x: number;
    z: number;
    height: number;
}

/** Fight effects on a placed exchange (docs/COMBAT_PACK.md): optional, additive (no schema bump). */
export const FIGHT_FX_KEYS = [
    'flash',
    'speedLines',
    'smear',
    'shockwave',
    'sweat',
    // clips only (they play in time): camera shake and the freeze on impact
    'shake',
    'hitStop',
] as const;
export type FightFxKey = (typeof FIGHT_FX_KEYS)[number];
export interface SceneFight {
    attacker: string;
    defender: string;
    exchange: string;
    contact: 'hit' | 'block' | 'miss';
    key: 'start' | 'peak' | 'recover';
    intensity: 'off' | 'subtle' | 'normal' | 'dramatic';
    effects: Record<FightFxKey, boolean>;
    /** where the strike lands and the limb's path to it, in the attacker's own frame (cm): it follows a drag */
    impact: V3;
    trail: V3[];
}

export interface Scene {
    schemaVersion: number;
    id: string;
    name: string;
    actors: SceneActor[];
    /** props in the place, drawn far to near with the actors (v1 scenes read as none) */
    props: SceneProp[];
    set: SceneSet;
    camera: SceneCamera;
    frame: SceneFrame;
    /** one art style for everyone: new actors and edited characters follow the scene's style */
    styleLock: boolean;
    /** the last fight exchange placed, for its effects (drawn while the attacker keeps that pose) */
    fight?: SceneFight;
}
