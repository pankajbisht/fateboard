import type { CharacterRecipe } from './recipes';

/**
 * The owner's two reference characters (manga_character_female.svg and manga_character_redraw.svg, 2026-11-25), as
 * hand-made cast recipes. Colours are taken from the SVGs: the girl's collared blouse, red collar bow, gold hair clip and
 * white socks, the boy's collared button shirt.
 */
export const REFERENCE_RECIPES: CharacterRecipe[] = [
    {
        id: 'sakura',
        name: 'Sakura',
        gender: 1,
        age: 15,
        build: 'average',
        skin: 'wheat',
        eye: 'sparkle',
        eyeColor: '#7a4fd8',
        brow: 'thin',
        nose: 'dot',
        mouth: 'small',
        // long straight hair, bangs and side locks in front of the shoulders
        hair: { style: 'hime', color: '#2f2036' },
        // the pink blouse with its collar, ending at the waist over the skirt
        top: { kind: 'school-blouse', color: '#f4a0b0' },
        bottom: { kind: 'pleated-skirt', color: '#2d3a6b' },
        shoes: '#6b3f2a',
        accessories: [
            { kind: 'bow', color: '#d6405e' },
            { kind: 'hair-clip', color: '#f2b632' },
            { kind: 'socks', color: '#f5f7fb' },
        ],
        role: 'hero',
        tags: ['teen', 'student', 'manga', 'reference'],
    },
    {
        id: 'haruto',
        name: 'Haruto',
        gender: 0,
        age: 15,
        build: 'average',
        skin: 'wheat',
        eye: 'round',
        eyeColor: '#2f6fe0',
        brow: 'straight',
        nose: 'dot',
        mouth: 'smile',
        hair: { style: 'spiky', color: '#1c1b2e' },
        // the orange collared shirt with its buttons, ending at the waist above the shorts
        top: { kind: 'camp-shirt', color: '#eca33a' },
        bottom: { kind: 'shorts', color: '#f5f7fb' },
        shoes: '#c8335f',
        role: 'hero',
        tags: ['teen', 'student', 'manga', 'reference'],
    },
];
