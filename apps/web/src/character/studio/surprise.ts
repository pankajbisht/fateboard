import { BUILDS, HAIR_COLORS, RECIPES, SKIN_TONES, fromRecipe, type Build } from '../data/recipes';
import { BOTTOM_DEFS, BOTTOM_IDS, TOP_DEFS, TOP_IDS, suited } from '../data/garments';
import { hairPool } from '../data/hairStyles';
import { parseCharacter } from '../schema/parse';
import {
    BROW_STYLES,
    EYE_STYLES,
    MOUTH_STYLES,
    NOSE_STYLES,
    type Character,
} from '../schema/types';

/** "Surprise me": loaded on first use (it pulls in the recipe data). */
const CLOTH = [
    '#ef4444',
    '#f59e0b',
    '#16a34a',
    '#0ea5e9',
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#111827',
    '#f8fafc',
    '#78350f',
    '#0f766e',
    '#a3e635',
];

/** A random new person: a recipe for the age group, with a random build, colours, hair and clothes. */
export function surpriseCharacter(random: () => number, id: string): Character {
    const any = <T>(list: readonly T[]) => list[Math.floor(random() * list.length) % list.length];
    const base = fromRecipe(any(RECIPES), id);
    const female = random() < 0.5;
    const build = any(Object.keys(BUILDS) as Build[]);
    const age = any([7, 11, 15, 19, 26, 34, 45, 58, 70]);
    return parseCharacter({
        ...base,
        name: `${any(['Aditi', 'Arjun', 'Zara', 'Leo', 'Ishaan', 'Mia', 'Dev', 'Noor', 'Yuki', 'Omar', 'Tara', 'Kai'])}`,
        source: 'custom',
        recipeRef: undefined,
        body: {
            ...base.body,
            ...BUILDS[build],
            age,
            gender: female ? 0.85 + random() * 0.15 : random() * 0.15,
            skinTone: any(SKIN_TONES).color,
            overridden: ['hairColor'],
        },
        face: {
            eyeStyle: any(EYE_STYLES),
            eyeColor: any(['#2b1d14', '#3b2a1f', '#4a2e1b', '#1d4ed8', '#15803d', '#57534e']),
            browStyle: any(BROW_STYLES),
            mouthStyle: any(MOUTH_STYLES),
            noseStyle: any(NOSE_STYLES),
        },
        hair: { style: any(hairPool(female, age)), color: any(HAIR_COLORS), tip: null },
        dress: {
            top: {
                kind: any(TOP_IDS.filter((k) => suited(TOP_DEFS[k].suits, female))),
                color: any(CLOTH),
            },
            bottom: {
                kind: any(BOTTOM_IDS.filter((k) => suited(BOTTOM_DEFS[k].suits, female))),
                color: any(CLOTH),
            },
            shoes: { color: any(CLOTH) },
        },
    })!;
}
