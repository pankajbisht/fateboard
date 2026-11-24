import type { StudioPart, Material } from '@/character/studio/edit';
import type { BodyStyle } from '@/character/schema/bodyStyles';

/** Plain names for the studio's parts, materials and options. */
export const PART_LABELS: Record<StudioPart, string> = {
    head: 'Head',
    neck: 'Neck',
    torso: 'Torso',
    upperArmL: 'Left upper arm',
    lowerArmL: 'Left forearm',
    handL: 'Left hand',
    upperArmR: 'Right upper arm',
    lowerArmR: 'Right forearm',
    handR: 'Right hand',
    upperLegL: 'Left thigh',
    lowerLegL: 'Left shin',
    footL: 'Left foot',
    upperLegR: 'Right thigh',
    lowerLegR: 'Right shin',
    footR: 'Right foot',
    hair: 'Hair',
};

export const MATERIAL_LABELS: Record<Material, string> = {
    skin: 'Skin',
    top: 'Top',
    bottom: 'Bottom',
    shoes: 'Shoes',
    hair: 'Hair',
};

export const BODY_STYLE_LABELS: Record<BodyStyle, string> = { classic: 'Classic', manga: 'Manga' };

export const EYE_LABELS = {
    round: 'Round',
    almond: 'Almond',
    sleepy: 'Sleepy',
    sharp: 'Sharp (upturned)',
    droopy: 'Droopy',
    sparkle: 'Sparkle (big)',
};
export const BROW_LABELS = {
    soft: 'Soft',
    straight: 'Straight',
    thick: 'Thick',
    angry: 'Angry (shonen)',
    thin: 'Thin arch',
};
export const NOSE_LABELS = { dot: 'Dot', button: 'Button', line: 'Line' };
export const MOUTH_LABELS = {
    smile: 'Smile',
    neutral: 'Neutral',
    grin: 'Grin',
    cat: 'Cat (ω)',
    small: 'Small',
    fang: 'Fang',
};

export const CATEGORY_LABELS: Record<string, string> = {
    standing: 'Standing',
    gesture: 'Gestures',
    walk: 'Walk, run, jump',
    sitting: 'Sit, kneel',
    fight: 'Fight',
    sports: 'Sports',
    emotion: 'Emotion',
    daily: 'Daily life',
    dance: 'Dance',
    work: 'Work',
    lying: 'Lying down',
    action: 'Action',
    martial: 'Boxing, Muay Thai, army',
};

/** Options for a `Select` from a label map. */
export const options = <T extends string>(labels: Record<T, string>) =>
    (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
