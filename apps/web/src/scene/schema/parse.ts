import { angle, color, num, obj, pick, str } from '@/character/schema/coerce';
import { newId, parseCharacter } from '@/character/schema/parse';
import {
    ASPECTS,
    FRAME_SHAPES,
    MAX_ACTORS,
    MAX_SCENE_PROPS,
    SCENE_PROP_HEIGHT,
    SCENE_SCHEMA_VERSION,
    SEASONS,
    TIMES,
    WEATHERS,
    FIGHT_FX_KEYS,
    type Lens,
    type SceneFight,
    type Scene,
    type SceneActor,
    type SceneCamera,
    type SceneFrame,
    type SceneProp,
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
        // wind (2026-11-27): only when it blows, so scenes without it keep the same JSON
        ...(num(o.wind, 0, 0, 1) > 0
            ? {
                  wind: num(o.wind, 0, 0, 1),
                  windDir: ((num(o.windDir, 0, -720, 720) % 360) + 360) % 360,
              }
            : {}),
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

const PROP_ID = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** A scene prop; null when it names no prop id at all (whether the catalogue knows it is the renderer's call). */
export function parseSceneProp(raw: unknown): SceneProp | null {
    const o = obj(raw);
    if (typeof o.propId !== 'string' || !PROP_ID.test(o.propId)) return null;
    return {
        id: str(o.id, newId(), 60),
        propId: o.propId,
        variant: Math.round(num(o.variant, 0, 0, 20)),
        x: num(o.x, 0, -WORLD, WORLD),
        z: num(o.z, 0, -WORLD, WORLD),
        height: num(o.height, 100, SCENE_PROP_HEIGHT.min, SCENE_PROP_HEIGHT.max),
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
    // v1 had no props (migration: none); ids stay unique across actors and props (one selection)
    const props: SceneProp[] = [];
    for (const p of Array.isArray(o.props) ? o.props : []) {
        const prop = parseSceneProp(p);
        if (!prop || props.length >= MAX_SCENE_PROPS) continue;
        if (seen.has(prop.id)) prop.id = newId();
        seen.add(prop.id);
        props.push(prop);
    }
    // a look-at target that is gone (or the actor itself) means "look ahead"
    const actorIds = new Set(actors.map((a) => a.id));
    for (const a of actors) if (a.lookAt === a.id || !actorIds.has(a.lookAt ?? '')) a.lookAt = null;
    return {
        schemaVersion: SCENE_SCHEMA_VERSION,
        id: str(o.id, newId(), 60),
        name: str(o.name, 'Scene'),
        actors,
        props,
        set: parseSceneSet(o.set),
        camera: parseSceneCamera(o.camera),
        frame: parseSceneFrame(o.frame),
        styleLock: o.styleLock === true,
        ...withFight(o.fight, actorIds),
    };
}

const point = (v: unknown): V3 | null =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every((n) => typeof n === 'number' && Number.isFinite(n))
        ? [num(v[0], 0, -1e4, 1e4), num(v[1], 0, -1e4, 1e4), num(v[2], 0, -1e4, 1e4)]
        : null;

/** The optional fight effects: dropped when an actor is gone or the points are not numbers. */
function withFight(raw: unknown, actors: Set<string>): { fight?: SceneFight } {
    if (!raw || typeof raw !== 'object') return {};
    const f = obj(raw);
    const attacker = str(f.attacker, '');
    const defender = str(f.defender, '');
    const impact = point(f.impact);
    if (!actors.has(attacker) || !actors.has(defender) || attacker === defender || !impact)
        return {};
    const fx = obj(f.effects);
    const effects = Object.fromEntries(
        FIGHT_FX_KEYS.map((k) => [k, fx[k] !== false]),
    ) as SceneFight['effects'];
    const trail = (Array.isArray(f.trail) ? f.trail : [])
        .slice(0, 6)
        .map(point)
        .filter((p): p is V3 => p !== null);
    return {
        fight: {
            attacker,
            defender,
            exchange: str(f.exchange, '', 40),
            contact: pick(f.contact, ['hit', 'block', 'miss'] as const, 'hit'),
            key: pick(f.key, ['start', 'peak', 'recover'] as const, 'peak'),
            intensity: pick(
                f.intensity,
                ['off', 'subtle', 'normal', 'dramatic'] as const,
                'normal',
            ),
            effects,
            impact,
            trail,
        },
    };
}

export const newScene = (name = 'Scene'): Scene => ({
    schemaVersion: SCENE_SCHEMA_VERSION,
    id: newId(),
    name,
    actors: [],
    props: [],
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
