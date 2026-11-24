import { angle, color, num, obj, pick, str } from '@/character/schema/coerce';
import { newId, parseCharacter } from '@/character/schema/parse';
import {
    ASPECTS,
    FRAME_SHAPES,
    MAX_ACTORS,
    SCENE_SCHEMA_VERSION,
    SEASONS,
    TIMES,
    WEATHERS,
    type Lens,
    type Scene,
    type SceneActor,
    type SceneCamera,
    type SceneFrame,
    type SceneSet,
    type V3,
} from './types';

/**
 * Scene JSON from anything: missing, wrong or out-of-range values become defaults, actors that are not
 * characters are dropped, ids are made unique. Null only for something that is not a scene at all, or one from
 * a newer schema this app cannot read.
 */
export const DEFAULT_SCENE_CAMERA: SceneCamera = {
    position: [0, 150, 760],
    yaw: 0,
    pitch: 4,
    roll: 0,
    lens: { kind: 'perspective', focalMm: 35 },
};

export const DEFAULT_SET: SceneSet = {
    environment: 'studio',
    variant: '',
    seed: 1,
    crowd: 0,
    time: 'day',
    weather: 'clear',
    season: 'summer',
};

export const DEFAULT_FRAME: SceneFrame = {
    aspect: '16:9',
    shape: 'rect',
    border: 0,
    borderColor: '#1f1f1f',
};

/** Far enough for a city street, small enough to keep numbers sane. */
const WORLD = 100_000;

export function parseLens(raw: unknown): Lens {
    const o = obj(raw);
    return o.kind === 'orthographic'
        ? { kind: 'orthographic', heightCm: num(o.heightCm, 400, 50, 20_000) }
        : { kind: 'perspective', focalMm: num(o.focalMm, 35, 10, 300) };
}

export function parseSceneCamera(raw: unknown): SceneCamera {
    const o = obj(raw);
    const p = Array.isArray(o.position) ? o.position : [];
    const d = DEFAULT_SCENE_CAMERA.position;
    const position: V3 = [
        num(p[0], d[0], -WORLD, WORLD),
        num(p[1], d[1], 1, WORLD),
        num(p[2], d[2], -WORLD, WORLD),
    ];
    return {
        position,
        yaw: angle(o.yaw, 0),
        pitch: num(o.pitch, DEFAULT_SCENE_CAMERA.pitch, -89, 89),
        roll: num(o.roll, 0, -45, 45),
        lens: parseLens(o.lens),
    };
}

export function parseSceneSet(raw: unknown): SceneSet {
    const o = obj(raw);
    return {
        environment: str(o.environment, DEFAULT_SET.environment, 40),
        variant: typeof o.variant === 'string' ? o.variant.slice(0, 40) : '',
        seed: Math.round(num(o.seed, 1, 0, 2 ** 31 - 1)),
        crowd: Math.round(num(o.crowd, 0, 0, 80)),
        time: pick(o.time, TIMES, DEFAULT_SET.time),
        weather: pick(o.weather, WEATHERS, DEFAULT_SET.weather),
        season: pick(o.season, SEASONS, DEFAULT_SET.season),
    };
}

export function parseSceneFrame(raw: unknown): SceneFrame {
    const o = obj(raw);
    return {
        aspect: pick(o.aspect, ASPECTS, DEFAULT_FRAME.aspect),
        shape: pick(o.shape, FRAME_SHAPES, DEFAULT_FRAME.shape),
        border: num(o.border, 0, 0, 60),
        borderColor: color(o.borderColor, DEFAULT_FRAME.borderColor),
    };
}

function parseActor(raw: unknown): SceneActor | null {
    const o = obj(raw);
    const character = parseCharacter(o.character);
    if (!character) return null;
    return {
        id: str(o.id, newId(), 60),
        character,
        x: num(o.x, 0, -WORLD, WORLD),
        z: num(o.z, 0, -WORLD, WORLD),
        facing: angle(o.facing, 0),
        lookAt: typeof o.lookAt === 'string' && o.lookAt ? o.lookAt.slice(0, 60) : null,
    };
}

export function parseScene(raw: unknown): Scene | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const o = obj(raw);
    const version = num(o.schemaVersion, SCENE_SCHEMA_VERSION);
    if (version > SCENE_SCHEMA_VERSION) return null;
    const seen = new Set<string>();
    const actors: SceneActor[] = [];
    for (const a of Array.isArray(o.actors) ? o.actors : []) {
        const actor = parseActor(a);
        if (!actor || actors.length >= MAX_ACTORS) continue;
        if (seen.has(actor.id)) actor.id = newId();
        seen.add(actor.id);
        actors.push(actor);
    }
    // a look-at target that is gone (or the actor itself) means "look ahead"
    for (const a of actors) if (a.lookAt === a.id || !seen.has(a.lookAt ?? '')) a.lookAt = null;
    return {
        schemaVersion: SCENE_SCHEMA_VERSION,
        id: str(o.id, newId(), 60),
        name: str(o.name, 'Scene'),
        actors,
        set: parseSceneSet(o.set),
        camera: parseSceneCamera(o.camera),
        frame: parseSceneFrame(o.frame),
        styleLock: o.styleLock === true,
    };
}

export const newScene = (name = 'Scene'): Scene => ({
    schemaVersion: SCENE_SCHEMA_VERSION,
    id: newId(),
    name,
    actors: [],
    set: { ...DEFAULT_SET },
    camera: structuredClone(DEFAULT_SCENE_CAMERA),
    frame: { ...DEFAULT_FRAME },
    // a group picture usually shares one style
    styleLock: true,
});

/** The scene as it is kept (draft, page): the name tidied (typing keeps spaces and may empty it). */
export const cleanScene = (s: Scene): Scene => {
    const name = s.name.trim().slice(0, 80) || 'Scene';
    return name === s.name ? s : { ...s, name };
};
