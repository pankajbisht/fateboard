import { MANGA_IDLE_POSE } from '../data/posesManga';
import type { BodyStyle } from '../schema/bodyStyles';
import { STAND_POSE, parseCharacter } from '../schema/parse';
import type {
    Body,
    Character,
    Dress,
    Emotion,
    Face,
    Hair,
    PartGroup,
    Pose,
    StyleId,
} from '../schema/types';

/** One change in the studio (any combination of fields). */
export interface StudioEdit {
    name?: string;
    body?: Partial<Omit<Body, 'overridden'>>;
    face?: Partial<Face>;
    emotion?: Partial<Emotion>;
    hair?: Partial<Hair>;
    top?: Partial<Dress['top']>;
    bottom?: Partial<Dress['bottom']>;
    shoes?: Partial<Dress['shoes']>;
    /** the whole accessory list (the dress rules run on it) */
    accessories?: Dress['accessories'];
    /** what the hands hold (data/props.ts rules apply) */
    held?: Dress['held'];
    pose?: Pose;
    style?: StyleId;
    /** false = stand upright at any age (true = elders stoop a little, the default) */
    posture?: boolean;
    /** the bust follows the frame again (choosing a body type) */
    resetBust?: boolean;
}

export type StudioPart = PartGroup | 'hair';

/**
 * The character with the edit applied, validated. A hand-picked hair colour stops age from greying it;
 * `posture: false` stops age from stooping it.
 */
export function applyEdit(c: Character, e: StudioEdit): Character {
    const overridden = new Set(c.body.overridden);
    if (e.hair?.color) overridden.add('hairColor');
    if (e.posture === false) overridden.add('posture');
    if (e.posture === true) overridden.delete('posture');
    // the bust follows the frame (gender) until it is set by hand
    if (e.body?.bust !== undefined && !e.resetBust) overridden.add('bust');
    if (e.resetBust) overridden.delete('bust');
    const body = { ...c.body, ...e.body, overridden: [...overridden] };
    if (!overridden.has('bust')) body.bust = body.gender;
    const next = parseCharacter({
        ...c,
        ...(e.name !== undefined ? { name: e.name } : {}),
        body,
        face: { ...c.face, ...e.face },
        emotion: { ...c.emotion, ...e.emotion },
        hair: { ...c.hair, ...e.hair },
        dress: {
            top: { ...c.dress.top, ...e.top },
            bottom: { ...c.dress.bottom, ...e.bottom },
            shoes: { ...c.dress.shoes, ...e.shoes },
            accessories: e.accessories ?? c.dress.accessories,
            held: e.held ?? c.dress.held,
        },
        rig: e.pose ? { pose: e.pose } : c.rig,
        style: e.style ?? c.style,
    })!;
    // the name as typed (spaces, empty while editing); it is cleaned when placed or saved
    next.name = (e.name ?? c.name).slice(0, 80);
    return next;
}

/**
 * The edit that switches the body style (studio Body tab, scene actors). The plain stand becomes the relaxed manga
 * idle (and back), so the manga body is not stiff and symmetric; any other pose is kept.
 */
export function bodyStyleEdit(c: Character, bodyStyle: BodyStyle): StudioEdit {
    const id = c.rig.pose.id;
    if (bodyStyle === 'manga' && id === STAND_POSE.id)
        return { body: { bodyStyle }, pose: MANGA_IDLE_POSE };
    if (bodyStyle === 'classic' && id === MANGA_IDLE_POSE.id)
        return { body: { bodyStyle }, pose: STAND_POSE };
    return { body: { bodyStyle } };
}

/** The name to show on the page / in the library. */
export const cleanName = (c: Character): Character => ({
    ...c,
    name: c.name.trim() || 'Character',
});

export type Material = 'skin' | 'top' | 'bottom' | 'shoes' | 'hair';

/** Which colour a selected part shows (sleeves and trouser legs depend on the clothes). */
export function materialOf(c: Character, part: StudioPart): Material {
    const top = c.dress.top.kind;
    const bottom = c.dress.bottom.kind;
    if (part === 'hair') return 'hair';
    if (part === 'torso') return 'top';
    if (part.startsWith('upperArm')) return top === 'tank' ? 'skin' : 'top';
    if (part.startsWith('lowerArm')) return top === 'longsleeve' ? 'top' : 'skin';
    if (part.startsWith('upperLeg')) return bottom === 'skirt' ? 'skin' : 'bottom';
    if (part.startsWith('lowerLeg')) return bottom === 'pants' ? 'bottom' : 'skin';
    if (part.startsWith('foot')) return 'shoes';
    return 'skin';
}

export function colorOf(c: Character, m: Material): string {
    if (m === 'skin') return c.body.skinTone;
    if (m === 'hair') return c.hair.color;
    if (m === 'shoes') return c.dress.shoes.color;
    return c.dress[m].color;
}

/** The edit that paints a part's material. */
export function recolorEdit(c: Character, part: StudioPart, color: string): StudioEdit {
    const m = materialOf(c, part);
    if (m === 'skin') return { body: { skinTone: color } };
    if (m === 'hair') return { hair: { color } };
    if (m === 'shoes') return { shoes: { color } };
    return m === 'top' ? { top: { color } } : { bottom: { color } };
}
