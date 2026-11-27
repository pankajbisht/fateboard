import { identityOf } from './audience';
import type { Body, Character } from '../schema/types';
import type { StudioEdit } from '../studio/edit';

/**
 * Body type presets (2026-11-27, owner: "athletic, lean … in both male and female versions"): six builds, each a
 * set of the Body tab's shape sliders. The frame (male … female) already shapes shoulders, waist and hips; a version
 * only moves the sliders on top of it, so a female athletic body is athletic and still a woman's. Separate from the
 * cast's `BUILDS` (recipes.ts), which the 100-person cast is made from and must not change.
 */
export const BODY_TYPES = ['slim', 'lean', 'average', 'athletic', 'muscular', 'heavy'] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
    slim: 'Slim',
    lean: 'Lean',
    average: 'Average',
    athletic: 'Athletic',
    muscular: 'Muscular',
    heavy: 'Heavy',
};

type Shape = Pick<Body, 'fat' | 'muscle' | 'shoulderWidth' | 'hipWidth'>;

export const BODY_TYPE_SHAPES: Record<BodyType, { male: Shape; female: Shape }> = {
    slim: {
        male: { fat: 0.08, muscle: 0.18, shoulderWidth: 0.42, hipWidth: 0.4 },
        female: { fat: 0.1, muscle: 0.14, shoulderWidth: 0.38, hipWidth: 0.44 },
    },
    lean: {
        male: { fat: 0.1, muscle: 0.45, shoulderWidth: 0.52, hipWidth: 0.42 },
        female: { fat: 0.14, muscle: 0.36, shoulderWidth: 0.44, hipWidth: 0.46 },
    },
    average: {
        male: { fat: 0.3, muscle: 0.3, shoulderWidth: 0.5, hipWidth: 0.5 },
        female: { fat: 0.32, muscle: 0.25, shoulderWidth: 0.46, hipWidth: 0.55 },
    },
    athletic: {
        male: { fat: 0.14, muscle: 0.68, shoulderWidth: 0.64, hipWidth: 0.45 },
        female: { fat: 0.18, muscle: 0.56, shoulderWidth: 0.52, hipWidth: 0.5 },
    },
    muscular: {
        male: { fat: 0.22, muscle: 0.95, shoulderWidth: 0.82, hipWidth: 0.5 },
        female: { fat: 0.22, muscle: 0.84, shoulderWidth: 0.62, hipWidth: 0.54 },
    },
    heavy: {
        male: { fat: 0.85, muscle: 0.35, shoulderWidth: 0.6, hipWidth: 0.64 },
        female: { fat: 0.82, muscle: 0.28, shoulderWidth: 0.52, hipWidth: 0.72 },
    },
};

/** Which version a character takes: its identity's, a trans character's by the frame. */
const versionOf = (c: Pick<Character, 'identity' | 'body'>): 'male' | 'female' => {
    const who = identityOf(c);
    return who === 'trans' ? (c.body.gender >= 0.5 ? 'female' : 'male') : who;
};

/** The studio edit that applies a body type. */
export const bodyTypeEdit = (
    c: Pick<Character, 'identity' | 'body'>,
    type: BodyType,
): StudioEdit => ({ body: { ...BODY_TYPE_SHAPES[type][versionOf(c)] } });

/** The body type the sliders are at now (either version), or null once one was moved by hand. */
export function bodyTypeOf(c: Pick<Character, 'identity' | 'body'>): BodyType | null {
    const near = (s: Shape) =>
        (Object.keys(s) as (keyof Shape)[]).every((k) => Math.abs(c.body[k] - s[k]) < 0.005);
    return (
        BODY_TYPES.find(
            (t) => near(BODY_TYPE_SHAPES[t].male) || near(BODY_TYPE_SHAPES[t].female),
        ) ?? null
    );
}
