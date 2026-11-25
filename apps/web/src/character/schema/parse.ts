import { resolveDress } from '../data/dressRules';
import { EMOTION_IDS, VISEME_IDS } from '../data/emotions';
import { color, num, obj, pick, str, unit, type Raw } from './coerce';
import { migrateCharacter } from './migrate';
import { BODY_STYLES, MANGA_VARIANTS } from './bodyStyles';
import { MANGA_IDLE_POSE } from '../data/posesManga';
import { PROP_KINDS, type Held } from './propKinds';
import {
    BOTTOM_KINDS,
    BROW_STYLES,
    CHARACTER_SCHEMA_VERSION,
    EYE_STYLES,
    HAIR_STYLES,
    HAND_SHAPES,
    JOINTS,
    MOUTH_STYLES,
    NOSE_STYLES,
    SHOE_KINDS,
    SHOTS,
    STYLE_IDS,
    TOP_KINDS,
    ACCESSORY_KINDS,
    MAX_ACCESSORIES,
    type Body,
    type Character,
    type CharacterCamera,
    type Euler,
    type Dress,
    type Ground,
    type JointId,
    type Pose,
} from './types';

/**
 * Validation with defaults (`./coerce`): a saved, imported or older character always renders. Returns null only
 * for input that is not a character at all (or from a newer, unknown schema version).
 */

export const newId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const STAND_POSE: Pose = {
    id: 'stand',
    name: 'Stand',
    tags: ['standing', 'neutral'],
    category: 'standing',
    rootOffset: { x: 0, y: 0, z: 0 },
    rootRotation: { yaw: 0, pitch: 0, roll: 0 },
    joints: {
        upperArmL: { x: 0, y: 0, z: 8 },
        upperArmR: { x: 0, y: 0, z: -8 },
        lowerArmL: { x: -8, y: 0, z: 0 },
        lowerArmR: { x: -8, y: 0, z: 0 },
    },
    handShapeL: 'relaxed',
    handShapeR: 'relaxed',
    headLook: { yaw: 0, pitch: 0 },
    ground: 'both',
    mirrorable: true,
};

const euler = (v: unknown): Euler => {
    const o = obj(v);
    return { x: num(o.x, 0, -360, 360), y: num(o.y, 0, -360, 360), z: num(o.z, 0, -360, 360) };
};

export function parsePose(raw: unknown): Pose {
    const o = obj(raw);
    const joints: Partial<Record<JointId, Euler>> = {};
    const js = obj(o.joints);
    for (const j of JOINTS) if (js[j] !== undefined) joints[j] = euler(js[j]);
    const root = obj(o.rootOffset);
    const rot = obj(o.rootRotation);
    const look = obj(o.headLook);
    return {
        id: str(o.id, 'pose'),
        name: str(o.name, 'Pose'),
        tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
        category: str(o.category, 'custom'),
        rootOffset: {
            x: num(root.x, 0, -500, 500),
            y: num(root.y, 0, -500, 500),
            z: num(root.z, 0, -500, 500),
        },
        rootRotation: {
            yaw: num(rot.yaw, 0, -360, 360),
            pitch: num(rot.pitch, 0, -180, 180),
            roll: num(rot.roll, 0, -180, 180),
        },
        joints,
        handShapeL: pick(o.handShapeL, HAND_SHAPES, 'relaxed'),
        handShapeR: pick(o.handShapeR, HAND_SHAPES, 'relaxed'),
        headLook: { yaw: num(look.yaw, 0, -90, 90), pitch: num(look.pitch, 0, -60, 60) },
        ground: pick<Ground>(o.ground, ['both', 'left', 'right', 'air', 'floor'], 'both'),
        mirrorable: o.mirrorable !== false,
    };
}

export const DEFAULT_BODY: Body = {
    height: 0.5,
    fat: 0.3,
    muscle: 0.3,
    shoulderWidth: 0.5,
    hipWidth: 0.5,
    armLength: 0.5,
    legLength: 0.5,
    neckLength: 0.5,
    age: 25,
    gender: 0,
    bust: 0,
    skinTone: '#d9a77c',
    bodyStyle: 'classic',
    mangaVariant: 'shonen',
    overridden: [],
};

/** Worn extras from anything: known kinds and colours only, one per kind, at most MAX_ACCESSORIES. */
function parseAccessories(raw: unknown): Dress['accessories'] {
    const out: Dress['accessories'] = [];
    for (const a of Array.isArray(raw) ? raw : []) {
        const o = obj(a);
        const kind = pick(o.kind, ACCESSORY_KINDS, 'glasses');
        if (!ACCESSORY_KINDS.includes(o.kind as never) || out.some((x) => x.kind === kind))
            continue;
        out.push({ kind, color: color(o.color, '#2b2b2b') });
        if (out.length >= MAX_ACCESSORIES) break;
    }
    return out;
}

/** Held items from anything: known kinds and hands only (data/props.ts then keeps one per hand). */
function parseHeld(raw: unknown): Dress['held'] {
    const out: Dress['held'] = [];
    for (const h of Array.isArray(raw) ? raw : []) {
        const o = obj(h);
        if (!PROP_KINDS.includes(o.kind as never)) continue;
        out.push({
            kind: o.kind as Held['kind'],
            hand: pick(o.hand, ['L', 'R', 'both'] as const, 'R'),
        });
    }
    return out.slice(0, 2);
}

function parseBody(raw: unknown): Body {
    const o = obj(raw);
    const d = DEFAULT_BODY;
    return {
        height: unit(o.height, d.height),
        fat: unit(o.fat, d.fat),
        muscle: unit(o.muscle, d.muscle),
        shoulderWidth: unit(o.shoulderWidth, d.shoulderWidth),
        hipWidth: unit(o.hipWidth, d.hipWidth),
        armLength: unit(o.armLength, d.armLength),
        legLength: unit(o.legLength, d.legLength),
        neckLength: unit(o.neckLength, d.neckLength),
        age: num(o.age, d.age, 5, 80),
        gender: unit(o.gender, d.gender),
        // a body saved before the bust was its own setting: it follows the frame
        bust: unit(o.bust, unit(o.gender, d.gender)),
        skinTone: color(o.skinTone, d.skinTone),
        bodyStyle: pick(o.bodyStyle, BODY_STYLES, d.bodyStyle),
        mangaVariant: pick(o.mangaVariant, MANGA_VARIANTS, d.mangaVariant),
        overridden: Array.isArray(o.overridden)
            ? [...new Set(o.overridden.filter((t): t is string => typeof t === 'string'))]
            : [],
    };
}

/** A complete character from anything that looks like one, or null. */
export function parseCharacter(raw: unknown): Character | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const migrated = migrateCharacter(raw as Raw);
    if (!migrated) return null;
    const o = migrated;
    const face = obj(o.face);
    const hair = obj(o.hair);
    const dress = obj(o.dress);
    const top = obj(dress.top);
    const bottom = obj(dress.bottom);
    const shoes = obj(dress.shoes);
    const emotion = obj(o.emotion);
    const rig = obj(o.rig);
    const source = pick(o.source, ['recipe', 'custom', 'imported'] as const, 'custom');
    return {
        schemaVersion: CHARACTER_SCHEMA_VERSION,
        id: str(o.id, newId(), 64),
        name: str(o.name, 'Character'),
        source,
        ...(typeof o.recipeRef === 'string' ? { recipeRef: o.recipeRef.slice(0, 64) } : {}),
        body: parseBody(o.body),
        face: {
            eyeStyle: pick(face.eyeStyle, EYE_STYLES, 'round'),
            eyeColor: color(face.eyeColor, '#3b2a1f'),
            browStyle: pick(face.browStyle, BROW_STYLES, 'soft'),
            mouthStyle: pick(face.mouthStyle, MOUTH_STYLES, 'smile'),
            noseStyle: pick(face.noseStyle, NOSE_STYLES, 'button'),
            gaze: {
                x: num(obj(face.gaze).x, 0, -1, 1),
                y: num(obj(face.gaze).y, 0, -1, 1),
            },
            blink: unit(face.blink, 0),
            viseme: pick(face.viseme, VISEME_IDS, 'rest'),
            lashes: face.lashes === true,
        },
        hair: {
            style: pick(hair.style, HAIR_STYLES, 'short'),
            color: color(hair.color, '#2b1d14'),
            tip: color(hair.tip, '') || null,
            ahoge: hair.ahoge === true,
        },
        dress: resolveDress({
            top: { kind: pick(top.kind, TOP_KINDS, 'tshirt'), color: color(top.color, '#3b82f6') },
            bottom: {
                kind: pick(bottom.kind, BOTTOM_KINDS, 'pants'),
                color: color(bottom.color, '#1f2937'),
            },
            shoes: {
                kind: pick(shoes.kind, SHOE_KINDS, 'sneakers'),
                color: color(shoes.color, '#374151'),
            },
            accessories: parseAccessories(dress.accessories),
            held: parseHeld(dress.held),
        }).dress,
        emotion: {
            id: pick(emotion.id, EMOTION_IDS, 'neutral'),
            intensity: unit(emotion.intensity, 0),
        },
        rig: { pose: rig.pose ? parsePose(rig.pose) : STAND_POSE },
        style: pick(o.style, STYLE_IDS, 'cartoon'),
    };
}

/** A new character with every default (the studio's blank start): manga body, anime style, relaxed manga idle. */
export const defaultCharacter = (name = 'New character'): Character =>
    parseCharacter({
        id: newId(),
        name,
        source: 'custom',
        body: { bodyStyle: 'manga' },
        rig: { pose: MANGA_IDLE_POSE },
        style: 'anime',
    })!;

export const DEFAULT_CAMERA: CharacterCamera = { yaw: 0, pitch: 0, roll: 0, shot: 'full' };

/** A studio camera from anything (yaw wrapped to 0..360, pitch -70..70, roll -45..45). */
export function parseCamera(raw: unknown): CharacterCamera {
    const o = obj(raw);
    return {
        yaw: ((num(o.yaw, 0) % 360) + 360) % 360,
        pitch: num(o.pitch, 0, -70, 70),
        roll: num(o.roll, 0, -45, 45),
        shot: pick(o.shot, SHOTS, 'full'),
    };
}
