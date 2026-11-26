import { seeded, type Rand } from '@/lib/seededRandom';
import { BOTTOM_DEFS, CAST_BOTTOM_IDS, CAST_TOP_IDS, TOP_DEFS, suited } from './garments';
import { hairPool, hasTips } from './hairStyles';
import { HAIR_COLORS, SKIN_TONES, type Build, type CharacterRecipe } from './recipes';
import { BROW_STYLES, EYE_STYLES, HAIR_STYLES, MOUTH_STYLES, NOSE_STYLES } from '../schema/types';

// The cast is stable forever: it draws only from the eye and hair styles that existed when it was made. The manga
// styles added later (eyes from 'sharp', brows from 'angry', mouths from 'cat', hair from 'hime') are for the studio and Surprise me, not the cast.
const CAST_EYES = EYE_STYLES.slice(0, EYE_STYLES.indexOf('sharp'));
const CAST_BROWS = BROW_STYLES.slice(0, BROW_STYLES.indexOf('angry'));
const CAST_MOUTHS = MOUTH_STYLES.slice(0, MOUTH_STYLES.indexOf('cat'));
const CAST_HAIR = new Set<string>(HAIR_STYLES.slice(0, HAIR_STYLES.indexOf('hime')));

/**
 * The 100-person cast (docs/CHARACTER_STUDIO.md phase 3): the hand-made recipes plus a seeded generator for the
 * rest. Same seed, same people, forever (saved scenes and tests rely on it). The uniqueness rule: no two people share
 * a face, nor the same hair on the same skin in the same top colour.
 */
export type AgeGroup = 'child' | 'teen' | 'adult' | 'elder';

export const AGE_GROUPS: Record<AgeGroup, { label: string; from: number; to: number }> = {
    child: { label: 'Children', from: 5, to: 12 },
    teen: { label: 'Teens', from: 13, to: 19 },
    adult: { label: 'Adults', from: 20, to: 59 },
    elder: { label: 'Elders', from: 60, to: 80 },
};

export const ageGroupOf = (age: number): AgeGroup =>
    age < 13 ? 'child' : age < 20 ? 'teen' : age < 60 ? 'adult' : 'elder';

const FIRST = [
    'Aditi',
    'Arjun',
    'Zara',
    'Leo',
    'Ishaan',
    'Mia',
    'Dev',
    'Noor',
    'Yuki',
    'Omar',
    'Tara',
    'Kai',
    'Anaya',
    'Rohit',
    'Sofia',
    'Mateo',
    'Hana',
    'Ravi',
    'Lena',
    'Idris',
    'Mei',
    'Samir',
    'Nina',
    'Tomas',
    'Farah',
    'Kenta',
    'Isha',
    'Lucas',
    'Amara',
    'Vikram',
    'Elena',
    'Jonas',
    'Priya',
    'Diego',
    'Suki',
    'Karan',
    'Maya',
    'Felix',
    'Zainab',
    'Arun',
    'Chloe',
    'Imran',
    'Rina',
    'Oscar',
    'Devi',
    'Hugo',
    'Lila',
    'Tariq',
];
const LAST = [
    'Rao',
    'Khan',
    'Silva',
    'Chen',
    'Ito',
    'Nair',
    'Okafor',
    'Berg',
    'Sato',
    'Das',
    'Costa',
    'Singh',
    'Lopez',
    'Verma',
    'Haddad',
    'Kim',
    'Rossi',
    'Menon',
    'Park',
    'Ali',
    'Novak',
    'Iyer',
    'Cruz',
    'Bose',
];
const ROLES: Record<AgeGroup, string[]> = {
    child: ['student', 'little sibling', 'class monitor', 'neighbour kid', 'cousin'],
    teen: ['student', 'athlete', 'artist', 'club member', 'new kid', 'tutor'],
    adult: [
        'teacher',
        'shopkeeper',
        'doctor',
        'engineer',
        'driver',
        'chef',
        'artist',
        'officer',
        'reporter',
        'parent',
        'coach',
        'clerk',
        'farmer',
        'musician',
    ],
    elder: ['grandparent', 'retired teacher', 'storyteller', 'shop owner', 'neighbour', 'gardener'],
};
const TAGS: Record<AgeGroup, string[][]> = {
    child: [
        ['kid', 'playful'],
        ['kid', 'shy'],
        ['kid', 'curious'],
        ['kid', 'brave'],
    ],
    teen: [
        ['teen', 'sporty'],
        ['teen', 'creative'],
        ['teen', 'clever'],
        ['teen', 'cheerful'],
    ],
    adult: [
        ['adult', 'calm'],
        ['adult', 'busy'],
        ['adult', 'friendly'],
        ['adult', 'serious'],
    ],
    elder: [
        ['elder', 'wise'],
        ['elder', 'caring'],
        ['elder', 'funny'],
        ['elder', 'gentle'],
    ],
};
const BUILD_BY_GROUP: Record<AgeGroup, Build[]> = {
    child: ['slim', 'average', 'petite', 'athletic'],
    teen: ['slim', 'average', 'athletic', 'tall', 'petite'],
    adult: ['slim', 'average', 'athletic', 'heavy', 'muscular', 'tall', 'petite'],
    elder: ['slim', 'average', 'heavy', 'petite'],
};
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
    '#f97316',
    '#14b8a6',
    '#6366f1',
    '#e11d48',
    '#64748b',
    '#facc15',
];
const EYE_COLORS = ['#2b1d14', '#3b2a1f', '#4a2e1b', '#1d4ed8', '#15803d', '#57534e', '#7c3aed'];

/** What makes two people the same person (see the rule above). */
const faceKey = (r: CharacterRecipe) =>
    [r.skin, r.eye, r.eyeColor, r.brow, r.nose, r.mouth, r.hair.style, r.hair.color].join('|');
const lookKey = (r: CharacterRecipe) => [r.hair.style, r.hair.color, r.skin, r.top.color].join('|');

function person(rand: Rand, group: AgeGroup, index: number): CharacterRecipe {
    const g = AGE_GROUPS[group];
    const roll = rand();
    // mostly clearly masculine or feminine, a few in between
    const gender =
        roll < 0.08 ? 0.4 + rand() * 0.2 : roll < 0.54 ? rand() * 0.15 : 0.85 + rand() * 0.15;
    const female = gender >= 0.5;
    const first = rand.pick(FIRST);
    const age = rand.int(g.from, g.to);
    const hairStyle = rand.pick(hairPool(female, age).filter((h) => CAST_HAIR.has(h)));
    const hairColor =
        group === 'elder' && rand.chance(0.7)
            ? rand.pick(['#8f8f8f', '#e4e4e4'])
            : rand.pick(HAIR_COLORS);
    // one in eight with length has a different colour on the tips
    const tip = hasTips(hairStyle) && rand.chance(0.125) ? rand.pick(HAIR_COLORS) : undefined;
    return {
        id: `cast-${String(index).padStart(3, '0')}`,
        name: `${first} ${rand.pick(LAST)}`,
        gender: Math.round(gender * 100) / 100,
        age,
        build: rand.pick(BUILD_BY_GROUP[group]),
        skin: rand.pick(SKIN_TONES).id,
        eye: rand.pick(CAST_EYES),
        eyeColor: rand.pick(EYE_COLORS),
        brow: rand.pick(CAST_BROWS),
        nose: rand.pick(NOSE_STYLES),
        mouth: rand.pick(CAST_MOUTHS),
        hair: { style: hairStyle, color: hairColor, ...(tip && tip !== hairColor ? { tip } : {}) },
        top: {
            kind: rand.pick(CAST_TOP_IDS.filter((k) => suited(TOP_DEFS[k].suits, female))),
            color: rand.pick(CLOTH),
        },
        bottom: {
            kind: rand.pick(CAST_BOTTOM_IDS.filter((k) => suited(BOTTOM_DEFS[k].suits, female))),
            color: rand.pick(CLOTH),
        },
        shoes: rand.pick(CLOTH),
        role: rand.pick(ROLES[group]),
        tags: rand.pick(TAGS[group]),
    };
}

/** How many of each age group the generated people are (the hand-made ones are counted separately). */
const MIX: [AgeGroup, number][] = [
    ['child', 16],
    ['teen', 16],
    ['adult', 36],
    ['elder', 20],
];

export const CAST_SEED = 0xca57;

/** `total` people: the given hand-made ones first, then generated ones, all distinct. */
export function generateCast(
    base: readonly CharacterRecipe[],
    total = 100,
    seed = CAST_SEED,
): CharacterRecipe[] {
    const rand = seeded(seed);
    const out = [...base];
    const faces = new Set(out.map(faceKey));
    const looks = new Set(out.map(lookKey));
    const names = new Set(out.map((r) => r.name));
    const queue = MIX.flatMap(([g, n]) => Array.from({ length: n }, () => g));
    // fill the mix first, then any age group until the total is reached
    let guard = 0;
    for (let i = 0; out.length < total && guard < total * 400; guard++) {
        const group = queue[i % queue.length];
        const r = person(rand, group, out.length);
        if (faces.has(faceKey(r)) || looks.has(lookKey(r)) || names.has(r.name)) continue;
        faces.add(faceKey(r));
        looks.add(lookKey(r));
        names.add(r.name);
        out.push(r);
        i++;
    }
    return out;
}
