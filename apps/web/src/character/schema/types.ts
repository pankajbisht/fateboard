/**
 * Character Studio data contract (docs/CHARACTER_STUDIO.md §4). One Character JSON renders in every style and
 * from every camera angle; a change to these types bumps CHARACTER_SCHEMA_VERSION and adds a migration step.
 *
 * Rig space: y up, z toward the viewer, +x = the character's LEFT, units ≈ cm, ground at y = 0.
 * Joint rotations are Euler degrees applied as R = Ry(y) · Rx(x) · Rz(z) in the parent's frame.
 */
export const CHARACTER_SCHEMA_VERSION = 8;

/** Parents always come before their children (FK walks this order). */
export const JOINTS = [
    'pelvis',
    'spine1',
    'spine2',
    'chest',
    'neck',
    'head',
    'shoulderL',
    'upperArmL',
    'lowerArmL',
    'handL',
    'shoulderR',
    'upperArmR',
    'lowerArmR',
    'handR',
    'hipL',
    'upperLegL',
    'lowerLegL',
    'footL',
    'toeL',
    'hipR',
    'upperLegR',
    'lowerLegR',
    'footR',
    'toeR',
] as const;
export type JointId = (typeof JOINTS)[number];

export interface Euler {
    x: number;
    y: number;
    z: number;
}

export const HAND_SHAPES = [
    'relaxed',
    'fist',
    'open',
    'point',
    'peace',
    'grip',
    'pinch',
    'ok',
    'thumbsUp',
    'wave',
    'claw',
    'holdBat',
    'holdSword',
    'holdPhone',
    'holdCup',
] as const;
export type HandShape = (typeof HAND_SHAPES)[number];

/** Which feet touch the floor: grounding keeps them there on every body (foot-contact IK). */
export type Ground = 'both' | 'left' | 'right' | 'air' | 'floor';

export interface Pose {
    id: string;
    name: string;
    tags: string[];
    category: string;
    rootOffset: { x: number; y: number; z: number };
    rootRotation: { yaw: number; pitch: number; roll: number };
    /** Missing joints are at rest (0, 0, 0). */
    joints: Partial<Record<JointId, Euler>>;
    handShapeL: HandShape;
    handShapeR: HandShape;
    headLook: { yaw: number; pitch: number };
    ground: Ground;
    mirrorable: boolean;
}

/** Sliders are 0..1 (the UI shows 0..100). */
export interface Body {
    height: number;
    fat: number;
    muscle: number;
    shoulderWidth: number;
    hipWidth: number;
    armLength: number;
    legLength: number;
    neckLength: number;
    /** years, 5..80 */
    age: number;
    /** the frame: 0 = male … 1 = female (a blend in between): shoulders, chest, waist, hips, limbs, height */
    gender: number;
    /**
     * bust size 0..1, separate from the frame so any body can be made (a trans or nonbinary person with any mix); it
     * follows `gender` until set by hand ('bust' in `overridden`)
     */
    bust: number;
    skinTone: string;
    /** the proportions the skeleton is built with (schema/bodyStyles.ts); classic is the original doll body */
    bodyStyle: BodyStyle;
    /** manga sub-variant, used when bodyStyle is manga */
    mangaVariant: MangaVariant;
    /** fields the user set by hand: age changes no longer adjust them */
    overridden: string[];
}

/** The last three are the manga shapes: sharp (upturned, tsurime), droopy (tareme), sparkle (big shojo eyes). */
export const EYE_STYLES = ['round', 'almond', 'sleepy', 'sharp', 'droopy', 'sparkle'] as const;
/** angry (shonen) and thin (shojo arch) are the manga brows; cat (ω), small and fang the manga mouths. */
export const BROW_STYLES = ['soft', 'straight', 'thick', 'angry', 'thin'] as const;
export const MOUTH_STYLES = ['smile', 'neutral', 'grin', 'cat', 'small', 'fang'] as const;
export const NOSE_STYLES = ['dot', 'button', 'line'] as const;
export type EyeStyle = (typeof EYE_STYLES)[number];
export type BrowStyle = (typeof BROW_STYLES)[number];
export type MouthStyle = (typeof MOUTH_STYLES)[number];
export type NoseStyle = (typeof NOSE_STYLES)[number];

export interface Face {
    eyeStyle: EyeStyle;
    eyeColor: string;
    browStyle: BrowStyle;
    mouthStyle: MouthStyle;
    noseStyle: NoseStyle;
    /** where the eyes look: x + = the character's left, y + = up; -1..1 (0, 0 = straight ahead) */
    gaze: { x: number; y: number };
    /** how shut the eyes are, 0 open … 1 closed (a held blink; the animation engine drives it) */
    blink: number;
    /** mouth shape for lip sync (a VISEMES id); 'rest' = the emotion's mouth */
    viseme: string;
    /** a heavy upper lash line with flicks at the outer corners */
    lashes: boolean;
}

export const HAIR_STYLES = [
    'bald',
    'buzz',
    'crew',
    'short',
    'side-part',
    'quiff',
    'pompadour',
    'undercut',
    'spiky',
    'mohawk',
    'faux-hawk',
    'bowl',
    'messy',
    'curtains',
    'bob',
    'long-bob',
    'pixie',
    'shag',
    'mullet',
    'wavy-medium',
    'shoulder',
    'center-part',
    'long',
    'long-straight',
    'very-long',
    'layered',
    'side-bangs',
    'wavy-long',
    'ponytail-high',
    'ponytail-low',
    'side-ponytail',
    'pigtails',
    'space-buns',
    'bun',
    'bun-low',
    'topknot',
    'braid',
    'double-braids',
    'afro',
    'curly-short',
    'curly-long',
    'dreadlocks',
    'receding',
    'balding',
    // manga styles (after the others: the cast generator draws only from the styles above, so the cast stays the same)
    'hime',
    'spiky-long',
] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export interface Hair {
    style: HairStyle;
    color: string;
    /** two-tone: the colour of the tips (the lower part of long hair, tails, buns); null = one colour */
    tip: string | null;
    /** a single strand standing up from the top of the head (manga) */
    ahoge: boolean;
}

import type { BodyStyle, MangaVariant } from './bodyStyles';
import type { Held } from './propKinds';
import { MORE_BOTTOM_KINDS, MORE_TOP_KINDS } from './garmentKinds';
export { MORE_BOTTOM_KINDS, MORE_TOP_KINDS };

const CORE_TOP_KINDS = [
    'tshirt',
    'longsleeve',
    'tank',
    'polo',
    'shirt',
    'blouse',
    'sweater',
    'hoodie',
    'jacket',
    'vest',
    'kurta',
    'oversized-tee',
    'henley',
    'turtleneck',
    'cardigan',
    'blazer',
    'lab-coat',
    'raincoat',
    'long-kurta',
    'kurti',
    'sherwani',
    'tunic',
    'sleeveless-hoodie',
    'long-tee',
    'jersey',
    'school-shirt',
    'kimono-top',
    'poncho',
] as const;
export const TOP_KINDS = [...CORE_TOP_KINDS, ...MORE_TOP_KINDS] as const;
const CORE_BOTTOM_KINDS = [
    'pants',
    'shorts',
    'skirt',
    'capri',
    'bermuda',
    'leggings',
    'wide-pants',
    'track-pants',
    'mini-skirt',
    'long-skirt',
    'jeans',
    'cargo',
    'churidar',
    'dhoti',
    'palazzo',
    'bike-shorts',
    'pleated-skirt',
    'pencil-skirt',
    'maxi-skirt',
    'lehenga',
] as const;
export const BOTTOM_KINDS = [...CORE_BOTTOM_KINDS, ...MORE_BOTTOM_KINDS] as const;
export const SHOE_KINDS = [
    'sneakers',
    'sports-shoes',
    'school-shoes',
    'loafers',
    'boots',
    'ankle-boots',
    'wellies',
    'sandals',
    'flip-flops',
    'heels',
    'slippers',
    'barefoot',
    'combat-boots',
] as const;
export const ACCESSORY_KINDS = [
    'glasses',
    'sunglasses',
    'cap',
    'hat',
    'beanie',
    'headband',
    'turban',
    'headscarf',
    'helmet',
    'scarf',
    'tie',
    'necklace',
    'earrings',
    'bindi',
    'watch',
    'bracelet',
    'belt',
    'backpack',
    'bag',
    'apron',
    'beret',
    'army-helmet',
] as const;
export const MAX_ACCESSORIES = 6;
export type TopKind = (typeof TOP_KINDS)[number];
export type BottomKind = (typeof BOTTOM_KINDS)[number];
export type ShoeKind = (typeof SHOE_KINDS)[number];
export type AccessoryKind = (typeof ACCESSORY_KINDS)[number];

export interface Dress {
    top: { kind: TopKind; color: string };
    bottom: { kind: BottomKind; color: string };
    shoes: { kind: ShoeKind; color: string };
    /** worn extras (glasses, hats, bags …): at most MAX_ACCESSORIES, one per kind, conflicts removed (dressRules.ts) */
    accessories: { kind: AccessoryKind; color: string }[];
    /** what the hands hold: at most one item per hand (data/props.ts `normalizeHeld`) */
    held: Held[];
}

export interface Emotion {
    id: string;
    intensity: number;
}

export const STYLE_IDS = [
    'cartoon',
    'indian-tv',
    'anime',
    'anime-90s',
    'manga',
    'webtoon',
    'chibi',
    'doodle',
    'sketch',
    'comic-western',
    'flat',
    'realistic',
    'watercolor',
    'cel-3d',
    'pixel',
    'picture-book',
    'noir',
    'paper-cut',
    'cyberpunk',
    'stick',
    // clean line art like the owner's reference sheets (reference pass, 2026-11-24)
    'lineart',
] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export interface Character {
    schemaVersion: number;
    id: string;
    name: string;
    source: 'recipe' | 'custom' | 'imported';
    recipeRef?: string;
    body: Body;
    face: Face;
    hair: Hair;
    dress: Dress;
    emotion: Emotion;
    rig: { pose: Pose };
    style: StyleId;
}

export const SHOTS = ['full', 'knee', 'waist', 'bust', 'closeup'] as const;
export type ShotId = (typeof SHOTS)[number];

/** Orbiting camera: yaw 0 = sees the front, 90 = sees the character's left side; pitch + = from above. */
export interface CharacterCamera {
    yaw: number;
    pitch: number;
    roll: number;
    shot: ShotId;
}

/** The 15 selectable body parts (each one a group of drawn shapes). */
export const PART_GROUPS = [
    'head',
    'neck',
    'torso',
    'upperArmL',
    'lowerArmL',
    'handL',
    'upperArmR',
    'lowerArmR',
    'handR',
    'upperLegL',
    'lowerLegL',
    'footL',
    'upperLegR',
    'lowerLegR',
    'footR',
] as const;
export type PartGroup = (typeof PART_GROUPS)[number];
