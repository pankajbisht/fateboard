import type { PropCategory, PropDef } from './types';

/**
 * How tall a prop starts when it stands in a Scene Studio scene (cm, docs/PROPS.md §9). The page has no real
 * size; a scene does (world = cm), so a cup must not stand as tall as a door. Category defaults plus the props
 * whose size is far from their category's; the studio's Size slider changes it after.
 */
const CATEGORY_CM: Partial<Record<PropCategory, number>> = {
    nature: 120,
    vehicles: 150,
    furniture: 90,
    kitchen: 20,
    street: 220,
    buildings: 900,
    classroom: 110,
    japan: 120,
    animals: 50,
    food: 12,
    sports: 70,
    fantasy: 160,
    tech: 40,
    seasons: 110,
    travel: 70,
};

const PROP_CM: Record<string, number> = {
    'tree-round': 520,
    'tree-pine': 650,
    'tree-sakura': 480,
    'tree-dead': 420,
    bush: 90,
    'flower-bush': 80,
    'grass-tuft': 25,
    'tall-grass': 70,
    'flower-tulip': 35,
    'flower-daisies': 30,
    sunflower: 170,
    rock: 60,
    'rock-pile': 70,
    mountain: 30000,
    'mountain-range': 30000,
    log: 40,
    'house-village': 650,
    'house-cottage': 600,
    'house-modern': 700,
    'house-japanese': 650,
    shrine: 700,
    pagoda: 2200,
    castle: 2500,
    barn: 800,
    apartment: 1800,
    'city-building': 2400,
    skyscraper: 6000,
    'city-skyline': 6000,
    shop: 550,
    'convenience-store': 450,
    'school-building': 1300,
    hospital: 1800,
    truck: 330,
    bus: 320,
    train: 380,
    van: 200,
    'pickup-truck': 180,
    'car-kei': 160,
    'car-sports': 120,
    bicycle: 100,
    'city-bicycle': 100,
    motorbike: 110,
    scooter: 110,
    'street-lamp': 450,
    'street-lamp-modern': 500,
    'traffic-light': 400,
    'pedestrian-signal': 300,
    'utility-pole': 900,
    bench: 85,
    'vending-machine': 180,
    fence: 110,
};

/** Categories that stand in a 3D place. Sky, Effects and Backdrops do not: the place has its own sky, and
 * manga symbols or flat plates belong on the page, over the picture. */
export const sceneReady = (def: Pick<PropDef, 'category'>) => def.category in CATEGORY_CM;

/** The height a new scene prop starts at, in cm. */
export const sceneHeightOf = (def: Pick<PropDef, 'id' | 'category'>): number =>
    PROP_CM[def.id] ?? CATEGORY_CM[def.category] ?? 100;
