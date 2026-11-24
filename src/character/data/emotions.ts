import type { Face, MouthStyle } from '../schema/types';

/**
 * The face system's data (docs/CHARACTER_STUDIO.md phase 2): 20 emotions as parameter vectors, 8 mouth shapes
 * (visemes), and `resolveFace`, which turns a character's face + emotion + gaze + blink into the numbers the
 * renderer draws. Pure; no drawing here.
 */
export interface FaceParams {
    /** eye height, 1 = normal, 0 = shut */
    eyeOpen: number;
    /** a shut eye drawn as a happy arch (laughing) instead of a sleeping curve */
    arch: boolean;
    /** -1 low … 1 raised */
    browRaise: number;
    /** + = inner ends down (angry), - = inner ends up (sad) */
    browTilt: number;
    /** -1 frown … 1 smile */
    mouthCurve: number;
    /** 0 closed … 1 wide open */
    mouthOpen: number;
    mouthWidth: number;
    /** 0 straight … 1 round (O, U) */
    mouthRound: number;
    teeth: boolean;
    /** pupil size, 1 = normal */
    pupil: number;
    blush: number;
    tears: number;
}

type Partial_ = Partial<FaceParams>;

export interface EmotionDef {
    id: string;
    name: string;
    params: Partial_;
}

export const EMOTIONS: readonly EmotionDef[] = [
    { id: 'neutral', name: 'Neutral', params: {} },
    { id: 'happy', name: 'Happy', params: { browRaise: 0.25, mouthCurve: 0.8, eyeOpen: 0.9 } },
    {
        id: 'laughing',
        name: 'Laughing',
        params: {
            eyeOpen: 0.12,
            arch: true,
            browRaise: 0.3,
            mouthCurve: 0.9,
            mouthOpen: 0.8,
            mouthWidth: 1.2,
            teeth: true,
        },
    },
    {
        id: 'sad',
        name: 'Sad',
        params: { browTilt: -0.8, browRaise: -0.1, mouthCurve: -0.7, eyeOpen: 0.8, pupil: 1.1 },
    },
    {
        id: 'crying',
        name: 'Crying',
        params: {
            browTilt: -0.9,
            eyeOpen: 0.55,
            mouthCurve: -0.8,
            mouthOpen: 0.5,
            mouthWidth: 1.1,
            tears: 1,
        },
    },
    {
        id: 'angry',
        name: 'Angry',
        params: { browTilt: 0.9, browRaise: -0.25, mouthCurve: -0.5, eyeOpen: 0.85, pupil: 0.8 },
    },
    {
        id: 'furious',
        name: 'Furious',
        params: {
            browTilt: 1,
            browRaise: -0.3,
            eyeOpen: 1.05,
            mouthCurve: -0.4,
            mouthOpen: 0.6,
            mouthWidth: 1.15,
            teeth: true,
            pupil: 0.65,
        },
    },
    {
        id: 'surprised',
        name: 'Surprised',
        params: {
            browRaise: 1,
            eyeOpen: 1.25,
            mouthOpen: 0.55,
            mouthWidth: 0.7,
            mouthRound: 1,
            mouthCurve: 0,
            pupil: 0.8,
        },
    },
    {
        id: 'shocked',
        name: 'Shocked',
        params: {
            browRaise: 1,
            eyeOpen: 1.3,
            mouthOpen: 0.9,
            mouthWidth: 0.8,
            mouthRound: 0.6,
            mouthCurve: 0,
            pupil: 0.55,
        },
    },
    {
        id: 'scared',
        name: 'Scared',
        params: {
            browRaise: 0.7,
            browTilt: -0.6,
            eyeOpen: 1.25,
            mouthCurve: -0.3,
            mouthOpen: 0.5,
            mouthWidth: 1.1,
            pupil: 0.6,
        },
    },
    {
        id: 'worried',
        name: 'Worried',
        params: { browTilt: -0.7, browRaise: 0.2, mouthCurve: -0.35, eyeOpen: 0.95 },
    },
    {
        id: 'disgusted',
        name: 'Disgusted',
        params: {
            browTilt: 0.5,
            browRaise: -0.2,
            eyeOpen: 0.7,
            mouthCurve: -0.6,
            mouthWidth: 0.9,
            mouthOpen: 0.15,
        },
    },
    {
        id: 'confused',
        name: 'Confused',
        params: { browTilt: 0.3, browRaise: 0.5, mouthCurve: -0.15, mouthWidth: 0.8 },
    },
    {
        id: 'embarrassed',
        name: 'Embarrassed',
        params: {
            browTilt: -0.4,
            browRaise: 0.1,
            eyeOpen: 0.85,
            mouthCurve: 0.2,
            mouthWidth: 0.7,
            blush: 1,
        },
    },
    {
        id: 'smug',
        name: 'Smug',
        params: { browTilt: 0.3, browRaise: 0.15, eyeOpen: 0.7, mouthCurve: 0.6, mouthWidth: 0.85 },
    },
    {
        id: 'bored',
        name: 'Bored',
        params: { eyeOpen: 0.55, browRaise: -0.1, mouthCurve: -0.15, mouthWidth: 0.8 },
    },
    {
        id: 'sleepy',
        name: 'Sleepy',
        params: { eyeOpen: 0.3, browRaise: -0.15, mouthCurve: 0, mouthOpen: 0.12, mouthWidth: 0.7 },
    },
    {
        id: 'determined',
        name: 'Determined',
        params: { browTilt: 0.6, browRaise: -0.1, mouthCurve: 0.1, mouthWidth: 0.95 },
    },
    {
        id: 'excited',
        name: 'Excited',
        params: {
            browRaise: 0.6,
            eyeOpen: 1.2,
            mouthCurve: 0.9,
            mouthOpen: 0.5,
            teeth: true,
            blush: 0.5,
            pupil: 1.2,
        },
    },
    {
        id: 'pain',
        name: 'In pain',
        params: {
            browTilt: -0.8,
            browRaise: 0.1,
            eyeOpen: 0.2,
            mouthCurve: -0.6,
            mouthOpen: 0.5,
            teeth: true,
        },
    },
];

export const EMOTION_IDS = EMOTIONS.map((e) => e.id);

/** Mouth shapes for lip sync: `rest` leaves the mouth to the emotion. */
export const VISEMES = [
    { id: 'rest', name: 'Rest', params: {} },
    {
        id: 'mbp',
        name: 'M, B, P (closed)',
        params: { mouthOpen: 0, mouthWidth: 0.9, mouthRound: 0 },
    },
    {
        id: 'aa',
        name: 'A (wide open)',
        params: { mouthOpen: 0.8, mouthWidth: 1.05, mouthRound: 0 },
    },
    {
        id: 'ee',
        name: 'E (wide, teeth)',
        params: { mouthOpen: 0.25, mouthWidth: 1.3, mouthRound: 0, teeth: true },
    },
    {
        id: 'ih',
        name: 'I (small open)',
        params: { mouthOpen: 0.3, mouthWidth: 1.1, mouthRound: 0 },
    },
    { id: 'oh', name: 'O (round)', params: { mouthOpen: 0.55, mouthWidth: 0.65, mouthRound: 1 } },
    {
        id: 'uu',
        name: 'U (small round)',
        params: { mouthOpen: 0.25, mouthWidth: 0.45, mouthRound: 1 },
    },
    {
        id: 'ff',
        name: 'F, V (teeth on lip)',
        params: { mouthOpen: 0.15, mouthWidth: 1, mouthRound: 0, teeth: true },
    },
    {
        id: 'th',
        name: 'TH, L',
        params: { mouthOpen: 0.2, mouthWidth: 1, mouthRound: 0, teeth: true },
    },
] as const;

export const VISEME_IDS = VISEMES.map((v) => v.id);

/** The mouth a mouth style rests in (when no emotion changes it). */
const REST_MOUTH: Record<MouthStyle, Partial_> = {
    smile: { mouthCurve: 0.5 },
    neutral: { mouthCurve: 0 },
    grin: { mouthCurve: 0.6, mouthOpen: 0.3, teeth: true },
    // manga mouths: a ω cat mouth, a small mouth, a smile with one fang (render/face.ts draws the shapes)
    cat: { mouthCurve: 0.3, mouthWidth: 0.8 },
    small: { mouthCurve: 0.2, mouthWidth: 0.55 },
    fang: { mouthCurve: 0.5 },
};

const NEUTRAL: FaceParams = {
    eyeOpen: 1,
    arch: false,
    browRaise: 0,
    browTilt: 0,
    mouthCurve: 0,
    mouthOpen: 0,
    mouthWidth: 1,
    mouthRound: 0,
    teeth: false,
    pupil: 1,
    blush: 0,
    tears: 0,
};

const NUMERIC = [
    'eyeOpen',
    'browRaise',
    'browTilt',
    'mouthCurve',
    'mouthOpen',
    'mouthWidth',
    'mouthRound',
    'pupil',
    'blush',
    'tears',
] as const;

const emotionOf = (id: string) => EMOTIONS.find((e) => e.id === id) ?? EMOTIONS[0];

/**
 * What to draw: the resting face (mouth style), blended toward the emotion by its intensity (0..1), then the
 * mouth shape and blink on top. Switches (an arched laugh, teeth) turn on from half intensity.
 */
export function resolveFace(
    face: Pick<Face, 'mouthStyle' | 'blink' | 'viseme'>,
    emotion: { id: string; intensity: number },
): FaceParams {
    const rest: FaceParams = { ...NEUTRAL, ...REST_MOUTH[face.mouthStyle] };
    const target = { ...rest, ...emotionOf(emotion.id).params };
    const t = Math.max(0, Math.min(1, emotion.intensity));
    const out: FaceParams = { ...rest };
    for (const k of NUMERIC) out[k] = rest[k] + (target[k] - rest[k]) * t;
    out.arch = t >= 0.5 ? target.arch : rest.arch;
    out.teeth = t >= 0.5 ? target.teeth : rest.teeth;
    const v = VISEMES.find((x) => x.id === face.viseme);
    if (v && v.id !== 'rest') {
        const p = v.params as Partial_;
        out.mouthOpen = p.mouthOpen ?? out.mouthOpen;
        out.mouthWidth = p.mouthWidth ?? out.mouthWidth;
        out.mouthRound = p.mouthRound ?? out.mouthRound;
        out.teeth = p.teeth ?? false;
        // speaking keeps a little of the emotion's smile or frown
        out.mouthCurve *= 0.4;
    }
    out.eyeOpen = Math.max(0, out.eyeOpen * (1 - Math.max(0, Math.min(1, face.blink))));
    return out;
}
