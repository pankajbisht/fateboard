import { parseCharacter } from '../schema/parse';
import { MANGA_IDLE_POSE } from './posesManga';
import type { MangaVariant } from '../schema/bodyStyles';
import type {
    BottomKind,
    BrowStyle,
    Character,
    EyeStyle,
    HairStyle,
    MouthStyle,
    NoseStyle,
    TopKind,
} from '../schema/types';

/**
 * Phase 1 cast: 12 recipes (boys / girls, adults, elders), turned into full characters by `fromRecipe`. Phase 3
 * grows this to 100 with a seeded generator; the uniqueness rule (face + hair + palette) is tested.
 */
export const SKIN_TONES = [
    { id: 'porcelain', color: '#f6dcc8' },
    { id: 'fair', color: '#f1c9a5' },
    { id: 'light', color: '#e8b98f' },
    { id: 'warm-light', color: '#deaa7e' },
    { id: 'wheat', color: '#d39d6e' },
    { id: 'tan', color: '#c68a5c' },
    { id: 'honey', color: '#b87a4b' },
    { id: 'caramel', color: '#a5683e' },
    { id: 'bronze', color: '#8d5634' },
    { id: 'brown', color: '#76452a' },
    { id: 'deep', color: '#5c3420' },
    { id: 'ebony', color: '#432517' },
] as const;

export const HAIR_COLORS = [
    '#141010',
    '#2b1d14',
    '#4a2e1b',
    '#7a4a24',
    '#a8743a',
    '#d6b26e',
    '#b5462e',
    '#8f8f8f',
    '#e4e4e4',
    '#3a4fb8',
    '#d0569b',
    '#2f8f6f',
];

export type Build = 'slim' | 'average' | 'athletic' | 'heavy' | 'muscular' | 'petite' | 'tall';

export const BUILDS: Record<Build, Partial<Character['body']>> = {
    slim: { fat: 0.1, muscle: 0.2, shoulderWidth: 0.4, hipWidth: 0.4 },
    average: { fat: 0.3, muscle: 0.3 },
    athletic: { fat: 0.15, muscle: 0.65, shoulderWidth: 0.6 },
    heavy: { fat: 0.85, muscle: 0.3, hipWidth: 0.65 },
    muscular: { fat: 0.25, muscle: 0.95, shoulderWidth: 0.8 },
    petite: { fat: 0.2, muscle: 0.15, height: 0.25, shoulderWidth: 0.35 },
    tall: { height: 0.85, fat: 0.2, muscle: 0.35, legLength: 0.65 },
};

export interface CharacterRecipe {
    id: string;
    name: string;
    /** 0 male … 1 female */
    gender: number;
    age: number;
    build: Build;
    skin: (typeof SKIN_TONES)[number]['id'];
    eye: EyeStyle;
    eyeColor: string;
    brow: BrowStyle;
    nose: NoseStyle;
    mouth: MouthStyle;
    hair: { style: HairStyle; color: string; tip?: string };
    top: { kind: TopKind; color: string };
    bottom: { kind: BottomKind; color: string };
    shoes: string;
    role: string;
    tags: string[];
}

export const RECIPES: CharacterRecipe[] = [
    {
        id: 'aarav',
        name: 'Aarav',
        gender: 0,
        age: 9,
        build: 'slim',
        skin: 'wheat',
        eye: 'round',
        eyeColor: '#3b2a1f',
        brow: 'soft',
        nose: 'button',
        mouth: 'grin',
        hair: { style: 'short', color: '#141010' },
        top: { kind: 'tshirt', color: '#f59e0b' },
        bottom: { kind: 'shorts', color: '#1d4ed8' },
        shoes: '#ef4444',
        role: 'hero',
        tags: ['kid', 'brave', 'curious'],
    },
    {
        id: 'meera',
        name: 'Meera',
        gender: 1,
        age: 8,
        build: 'petite',
        skin: 'honey',
        eye: 'round',
        eyeColor: '#2b1d14',
        brow: 'soft',
        nose: 'dot',
        mouth: 'smile',
        hair: { style: 'long', color: '#2b1d14' },
        top: { kind: 'tshirt', color: '#ec4899' },
        bottom: { kind: 'skirt', color: '#7c3aed' },
        shoes: '#f9fafb',
        role: 'best friend',
        tags: ['kid', 'cheerful'],
    },
    {
        id: 'kabir',
        name: 'Kabir',
        gender: 0,
        age: 16,
        build: 'athletic',
        skin: 'tan',
        eye: 'almond',
        eyeColor: '#4a2e1b',
        brow: 'straight',
        nose: 'line',
        mouth: 'smile',
        hair: { style: 'short', color: '#2b1d14' },
        top: { kind: 'tshirt', color: '#16a34a' },
        bottom: { kind: 'pants', color: '#e5e7eb' },
        shoes: '#111827',
        role: 'athlete',
        tags: ['teen', 'cricket', 'rival'],
    },
    {
        id: 'ananya',
        name: 'Ananya',
        gender: 1,
        age: 15,
        build: 'average',
        skin: 'light',
        eye: 'almond',
        eyeColor: '#3b2a1f',
        brow: 'soft',
        nose: 'button',
        mouth: 'neutral',
        hair: { style: 'bun', color: '#4a2e1b' },
        top: { kind: 'longsleeve', color: '#f8fafc' },
        bottom: { kind: 'skirt', color: '#1e3a8a' },
        shoes: '#111827',
        role: 'shy student',
        tags: ['teen', 'school', 'smart'],
    },
    {
        id: 'rohan',
        name: 'Rohan',
        gender: 0,
        age: 28,
        build: 'average',
        skin: 'warm-light',
        eye: 'round',
        eyeColor: '#2b1d14',
        brow: 'straight',
        nose: 'button',
        mouth: 'smile',
        hair: { style: 'short', color: '#4a2e1b' },
        top: { kind: 'longsleeve', color: '#0ea5e9' },
        bottom: { kind: 'pants', color: '#374151' },
        shoes: '#78350f',
        role: 'office worker',
        tags: ['adult', 'friendly'],
    },
    {
        id: 'priya',
        name: 'Dr. Priya',
        gender: 1,
        age: 32,
        build: 'slim',
        skin: 'caramel',
        eye: 'almond',
        eyeColor: '#2b1d14',
        brow: 'soft',
        nose: 'dot',
        mouth: 'smile',
        hair: { style: 'long', color: '#141010' },
        top: { kind: 'longsleeve', color: '#ffffff' },
        bottom: { kind: 'pants', color: '#0f766e' },
        shoes: '#e5e7eb',
        role: 'doctor',
        tags: ['adult', 'kind', 'mentor'],
    },
    {
        id: 'vikram',
        name: 'Inspector Vikram',
        gender: 0,
        age: 38,
        build: 'muscular',
        skin: 'bronze',
        eye: 'almond',
        eyeColor: '#141010',
        brow: 'thick',
        nose: 'line',
        mouth: 'neutral',
        hair: { style: 'short', color: '#141010' },
        top: { kind: 'tshirt', color: '#a16207' },
        bottom: { kind: 'pants', color: '#713f12' },
        shoes: '#1c1917',
        role: 'police',
        tags: ['adult', 'strong', 'serious'],
    },
    {
        id: 'sana',
        name: 'Sana',
        gender: 1,
        age: 24,
        build: 'athletic',
        skin: 'brown',
        eye: 'round',
        eyeColor: '#4a2e1b',
        brow: 'straight',
        nose: 'button',
        mouth: 'grin',
        hair: { style: 'bun', color: '#141010' },
        top: { kind: 'tank', color: '#dc2626' },
        bottom: { kind: 'shorts', color: '#111827' },
        shoes: '#f97316',
        role: 'athlete',
        tags: ['adult', 'sports', 'energetic'],
    },
    {
        id: 'kenji',
        name: 'Kenji',
        gender: 0,
        age: 25,
        build: 'tall',
        skin: 'fair',
        eye: 'sleepy',
        eyeColor: '#2b1d14',
        brow: 'thick',
        nose: 'line',
        mouth: 'neutral',
        hair: { style: 'long', color: '#3a4fb8' },
        top: { kind: 'longsleeve', color: '#111827' },
        bottom: { kind: 'pants', color: '#1f2937' },
        shoes: '#991b1b',
        role: 'rival',
        tags: ['adult', 'cool', 'mysterious'],
    },
    {
        id: 'grace',
        name: 'Grace',
        gender: 1,
        age: 44,
        build: 'heavy',
        skin: 'deep',
        eye: 'round',
        eyeColor: '#2b1d14',
        brow: 'soft',
        nose: 'button',
        mouth: 'smile',
        hair: { style: 'short', color: '#7a4a24' },
        top: { kind: 'tshirt', color: '#8b5cf6' },
        bottom: { kind: 'skirt', color: '#0f172a' },
        shoes: '#7c2d12',
        role: 'mother',
        tags: ['adult', 'warm', 'funny'],
    },
    {
        id: 'hari',
        name: 'Hari Dada',
        gender: 0,
        age: 72,
        build: 'average',
        skin: 'tan',
        eye: 'sleepy',
        eyeColor: '#4a2e1b',
        brow: 'thick',
        nose: 'button',
        mouth: 'smile',
        hair: { style: 'bald', color: '#e4e4e4' },
        top: { kind: 'longsleeve', color: '#fef3c7' },
        bottom: { kind: 'pants', color: '#f5f5f4' },
        shoes: '#57534e',
        role: 'grandparent',
        tags: ['elder', 'wise', 'funny'],
    },
    {
        id: 'kamala',
        name: 'Kamala Nani',
        gender: 1,
        age: 68,
        build: 'petite',
        skin: 'light',
        eye: 'sleepy',
        eyeColor: '#2b1d14',
        brow: 'soft',
        nose: 'dot',
        mouth: 'smile',
        hair: { style: 'bun', color: '#8f8f8f' },
        top: { kind: 'longsleeve', color: '#be185d' },
        bottom: { kind: 'skirt', color: '#9d174d' },
        shoes: '#78350f',
        role: 'grandparent',
        tags: ['elder', 'caring', 'storyteller'],
    },
];

export const skinColor = (id: string) =>
    SKIN_TONES.find((s) => s.id === id)?.color ?? SKIN_TONES[4].color;

/**
 * The manga variant for a new person: tall and slim young people get the long-legged webtoon body; grown-ups (25+)
 * seinen (men) or josei (women); children and teens shonen or shojo.
 */
export const mangaVariantFor = (
    r: Pick<CharacterRecipe, 'build' | 'age' | 'gender'>,
): MangaVariant => {
    const female = r.gender >= 0.5;
    if ((r.build === 'tall' || r.build === 'slim') && r.age >= 14 && r.age <= 40) return 'webtoon';
    if (r.age >= 25) return female ? 'josei' : 'seinen';
    return female ? 'shojo' : 'shonen';
};

/**
 * A full character from a recipe (a new id each time: placing the same recipe twice makes two people). New characters
 * are manga-friendly: the manga body, the anime art style, the relaxed manga idle, eyelashes on women.
 */
export function fromRecipe(r: CharacterRecipe, id: string): Character {
    return parseCharacter({
        id,
        name: r.name,
        source: 'recipe',
        recipeRef: r.id,
        body: {
            ...BUILDS[r.build],
            // new characters use the manga body (saved ones keep the body they were made with)
            bodyStyle: 'manga',
            mangaVariant: mangaVariantFor(r),
            age: r.age,
            gender: r.gender,
            skinTone: skinColor(r.skin),
            // the recipe chose the hair colour: age must not grey it
            overridden: ['hairColor'],
        },
        face: {
            eyeStyle: r.eye,
            eyeColor: r.eyeColor,
            browStyle: r.brow,
            mouthStyle: r.mouth,
            noseStyle: r.nose,
            lashes: r.gender >= 0.5,
        },
        hair: r.hair,
        dress: { top: r.top, bottom: r.bottom, shoes: { color: r.shoes } },
        rig: { pose: MANGA_IDLE_POSE },
        style: 'anime',
    })!;
}
