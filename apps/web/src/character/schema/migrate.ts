import { CHARACTER_SCHEMA_VERSION } from './types';

/**
 * Brings an older character JSON up to CHARACTER_SCHEMA_VERSION, one step per version. A JSON without a
 * version is a draft from before versioning: treated as version 1. A newer, unknown version is refused (null):
 * reading it as ours would drop fields the newer app relies on.
 *
 * To change the schema: bump the version, add `STEPS[old] = (json) => newJson`, add a test.
 */
type Json = Record<string, unknown>;

export const STEPS: Record<number, (json: Json) => Json> = {
    // 9 (2026-11-27, combat-sport gear): boxing gloves are worn (an accessory), not held. Held gloves move to the
    // accessories (unless six are worn already: then they are dropped, the dress rules allow at most six).
    8: (json) => {
        const dress = (json.dress && typeof json.dress === 'object' ? json.dress : {}) as Json;
        const held = Array.isArray(dress.held) ? (dress.held as Json[]) : [];
        const acc = Array.isArray(dress.accessories) ? (dress.accessories as Json[]) : [];
        const gloves = held.some((h) => h && h.kind === 'boxing-gloves');
        return {
            ...json,
            schemaVersion: 9,
            dress: {
                ...dress,
                held: held.filter((h) => !h || h.kind !== 'boxing-gloves'),
                accessories:
                    gloves && acc.length < 6
                        ? [...acc, { kind: 'boxing-gloves', color: '#dc2626' }]
                        : acc,
            },
        };
    },
    // 2 (2026-11-18, face system): the face gains gaze, blink and viseme. Older faces have none, so they get
    // the defaults (looking ahead, eyes open, resting mouth); `parseCharacter` also defaults anything missing.
    // 8 (2026-11-24, gender pass): the body gains `bust`, separate from the frame. Older bodies follow their frame.
    7: (json) => {
        const body = (json.body && typeof json.body === 'object' ? json.body : {}) as Json;
        const gender = typeof body.gender === 'number' ? body.gender : 0;
        return { ...json, schemaVersion: 8, body: { bust: gender, ...body } };
    },
    // 7 (2026-11-23, manga look): the face gains `lashes` and the hair `ahoge`. Older characters have neither.
    6: (json) => {
        const face = (json.face && typeof json.face === 'object' ? json.face : {}) as Json;
        const hair = (json.hair && typeof json.hair === 'object' ? json.hair : {}) as Json;
        return {
            ...json,
            schemaVersion: 7,
            face: { lashes: false, ...face },
            hair: { ahoge: false, ...hair },
        };
    },
    // 6 (2026-11-19, manga body): the body gains `bodyStyle` (classic, the original body) and `mangaVariant`.
    5: (json) => {
        const body = (json.body && typeof json.body === 'object' ? json.body : {}) as Json;
        return {
            ...json,
            schemaVersion: 6,
            body: { bodyStyle: 'classic', mangaVariant: 'shonen', ...body },
        };
    },
    // 5 (2026-11-18, held objects): the dress gains `held` (nothing in the hands).
    4: (json) => {
        const dress = (json.dress && typeof json.dress === 'object' ? json.dress : {}) as Json;
        return { ...json, schemaVersion: 5, dress: { held: [], ...dress } };
    },
    // 4 (2026-11-18, wardrobe): shoes gain a kind and the dress gains accessories. Older characters wear sneakers and
    // nothing extra.
    3: (json) => {
        const dress = (json.dress && typeof json.dress === 'object' ? json.dress : {}) as Json;
        const shoes = (dress.shoes && typeof dress.shoes === 'object' ? dress.shoes : {}) as Json;
        return {
            ...json,
            schemaVersion: 4,
            dress: { accessories: [], ...dress, shoes: { kind: 'sneakers', ...shoes } },
        };
    },
    // 3 (2026-11-18, hairstyles): hair gains a tip colour (two-tone). Older hair is one colour: tip null.
    2: (json) => ({
        ...json,
        schemaVersion: 3,
        hair: {
            tip: null,
            ...((json.hair && typeof json.hair === 'object' ? json.hair : {}) as Json),
        },
    }),
    1: (json) => {
        const face = (json.face && typeof json.face === 'object' ? json.face : {}) as Json;
        return {
            ...json,
            schemaVersion: 2,
            face: { gaze: { x: 0, y: 0 }, blink: 0, viseme: 'rest', ...face },
        };
    },
};

export function migrateCharacter(raw: Json): Json | null {
    let json: Json = { ...raw };
    let version = typeof json.schemaVersion === 'number' ? json.schemaVersion : 1;
    if (!Number.isInteger(version) || version < 1) version = 1;
    if (version > CHARACTER_SCHEMA_VERSION) return null;
    while (version < CHARACTER_SCHEMA_VERSION) {
        const step = STEPS[version];
        if (!step) return null;
        json = step(json);
        version++;
    }
    return { ...json, schemaVersion: CHARACTER_SCHEMA_VERSION };
}
