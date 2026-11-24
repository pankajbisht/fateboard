import type { BottomKind, MORE_BOTTOM_KINDS, MORE_TOP_KINDS, TopKind } from '../schema/types';
import { MORE_BOTTOMS, MORE_TOPS } from './garmentsMore';

/**
 * The garment library (docs/CHARACTER_STUDIO.md phase 3) as data: what each top and bottom is made of, in terms the
 * body renderer understands. Sleeve and leg lengths run along the limb: 0 = none, 1 = the whole upper arm or thigh,
 * 2 = the wrist or ankle. `fit` thickens the garment over the body (1 = close, above = loose). `Record<Kind, …>` makes
 * a missing garment a compile error; `garments.test.ts` draws every one.
 */
export type Collar = 'none' | 'crew' | 'v' | 'polo' | 'hood' | 'high' | 'open' | 'lapel';
/** how far a top hangs: at the waist, over the hips, to mid-thigh, to the knee */
export type Hang = 'waist' | 'hip' | 'thigh' | 'knee';

/** small details drawn on the cloth */
export type Trim = 'buttons' | 'stripe' | 'pocket' | 'border' | 'badge';

export interface TopDef {
    name: string;
    sleeve: number;
    fit: number;
    hang: Hang;
    collar: Collar;
    /** fabric folds drawn on loose garments */
    folds?: boolean;
    trim?: Trim;
    suits: 'any' | 'feminine' | 'masculine';
}

export interface BottomDef {
    name: string;
    /** leg length 0..2, as above (0 for a skirt) */
    leg: number;
    fit: number;
    /** 0 = not a skirt; else how far down along the leg it hangs (0.4 mini … 1.75 long) */
    skirt: number;
    /** how wide a skirt flares (1.5 = a plain skirt) */
    flare?: number;
    trim?: 'pocket' | 'stripe';
    suits: 'any' | 'feminine' | 'masculine';
}

const CORE_TOPS: Record<Exclude<TopKind, (typeof MORE_TOP_KINDS)[number]>, TopDef> = {
    tshirt: { name: 'T-shirt', sleeve: 0.5, fit: 1, hang: 'waist', collar: 'crew', suits: 'any' },
    longsleeve: {
        name: 'Long sleeves',
        sleeve: 2,
        fit: 1,
        hang: 'waist',
        collar: 'crew',
        suits: 'any',
    },
    tank: { name: 'Tank top', sleeve: 0, fit: 1, hang: 'waist', collar: 'none', suits: 'any' },
    polo: {
        name: 'Polo shirt',
        sleeve: 0.55,
        fit: 1.02,
        hang: 'waist',
        collar: 'polo',
        suits: 'any',
    },
    shirt: {
        name: 'Button-up shirt',
        sleeve: 2,
        fit: 1.04,
        hang: 'hip',
        collar: 'polo',
        suits: 'any',
    },
    blouse: { name: 'Blouse', sleeve: 0.7, fit: 1.05, hang: 'hip', collar: 'v', suits: 'feminine' },
    sweater: {
        name: 'Sweater',
        sleeve: 2,
        fit: 1.13,
        hang: 'hip',
        collar: 'crew',
        folds: true,
        suits: 'any',
    },
    hoodie: {
        name: 'Hoodie',
        sleeve: 2,
        fit: 1.14,
        hang: 'hip',
        collar: 'hood',
        folds: true,
        suits: 'any',
    },
    jacket: {
        name: 'Jacket',
        sleeve: 2,
        fit: 1.1,
        hang: 'hip',
        collar: 'open',
        folds: true,
        suits: 'any',
    },
    vest: { name: 'Vest', sleeve: 0, fit: 1.05, hang: 'waist', collar: 'lapel', suits: 'any' },
    kurta: {
        name: 'Kurta',
        sleeve: 1.6,
        fit: 1.06,
        hang: 'knee',
        collar: 'high',
        folds: true,
        suits: 'any',
    },
    'oversized-tee': {
        name: 'Oversized tee',
        sleeve: 0.65,
        fit: 1.24,
        hang: 'hip',
        collar: 'crew',
        folds: true,
        suits: 'any',
    },
    henley: {
        name: 'Henley',
        sleeve: 2,
        fit: 1.03,
        hang: 'waist',
        collar: 'polo',
        trim: 'buttons',
        suits: 'any',
    },
    turtleneck: {
        name: 'Turtleneck',
        sleeve: 2,
        fit: 1.02,
        hang: 'waist',
        collar: 'high',
        suits: 'any',
    },
    cardigan: {
        name: 'Cardigan',
        sleeve: 2,
        fit: 1.12,
        hang: 'hip',
        collar: 'open',
        trim: 'buttons',
        folds: true,
        suits: 'any',
    },
    blazer: {
        name: 'Blazer',
        sleeve: 2,
        fit: 1.07,
        hang: 'hip',
        collar: 'lapel',
        trim: 'buttons',
        suits: 'any',
    },
    'lab-coat': {
        name: 'Lab coat',
        sleeve: 2,
        fit: 1.1,
        hang: 'thigh',
        collar: 'lapel',
        trim: 'pocket',
        folds: true,
        suits: 'any',
    },
    raincoat: {
        name: 'Raincoat',
        sleeve: 2,
        fit: 1.2,
        hang: 'thigh',
        collar: 'hood',
        folds: true,
        suits: 'any',
    },
    'long-kurta': {
        name: 'Long kurta',
        sleeve: 2,
        fit: 1.07,
        hang: 'knee',
        collar: 'high',
        trim: 'border',
        folds: true,
        suits: 'any',
    },
    kurti: {
        name: 'Kurti',
        sleeve: 1.4,
        fit: 1.04,
        hang: 'thigh',
        collar: 'high',
        trim: 'border',
        suits: 'feminine',
    },
    sherwani: {
        name: 'Sherwani',
        sleeve: 2,
        fit: 1.09,
        hang: 'knee',
        collar: 'high',
        trim: 'buttons',
        suits: 'masculine',
    },
    tunic: { name: 'Tunic', sleeve: 0.7, fit: 1.08, hang: 'thigh', collar: 'v', suits: 'feminine' },
    'sleeveless-hoodie': {
        name: 'Sleeveless hoodie',
        sleeve: 0,
        fit: 1.1,
        hang: 'hip',
        collar: 'hood',
        suits: 'any',
    },
    'long-tee': {
        name: 'Long tee',
        sleeve: 0.55,
        fit: 1.1,
        hang: 'hip',
        collar: 'crew',
        suits: 'any',
    },
    jersey: {
        name: 'Sports jersey',
        sleeve: 0.45,
        fit: 1.05,
        hang: 'waist',
        collar: 'v',
        trim: 'stripe',
        suits: 'any',
    },
    'school-shirt': {
        name: 'School shirt',
        sleeve: 0.55,
        fit: 1.03,
        hang: 'hip',
        collar: 'polo',
        trim: 'pocket',
        suits: 'any',
    },
    'kimono-top': {
        name: 'Kimono top',
        sleeve: 1.4,
        fit: 1.16,
        hang: 'thigh',
        collar: 'lapel',
        trim: 'border',
        folds: true,
        suits: 'any',
    },
    poncho: {
        name: 'Poncho',
        sleeve: 0.7,
        fit: 1.32,
        hang: 'thigh',
        collar: 'high',
        folds: true,
        suits: 'any',
    },
};

const CORE_BOTTOMS: Record<Exclude<BottomKind, (typeof MORE_BOTTOM_KINDS)[number]>, BottomDef> = {
    pants: { name: 'Trousers', leg: 2, fit: 1, skirt: 0, suits: 'any' },
    shorts: { name: 'Shorts', leg: 1, fit: 1, skirt: 0, suits: 'any' },
    skirt: { name: 'Skirt', skirt: 0.85, leg: 0, fit: 1, suits: 'feminine' },
    capri: { name: 'Capri pants', leg: 1.6, fit: 1, skirt: 0, suits: 'any' },
    bermuda: { name: 'Long shorts', leg: 1.35, fit: 1.1, skirt: 0, suits: 'any' },
    leggings: { name: 'Leggings', leg: 2, fit: 0.97, skirt: 0, suits: 'feminine' },
    'wide-pants': { name: 'Wide trousers', leg: 2, fit: 1.3, skirt: 0, suits: 'any' },
    'track-pants': { name: 'Track pants', leg: 2, fit: 1.08, skirt: 0, suits: 'any' },
    'mini-skirt': { name: 'Mini skirt', skirt: 0.4, leg: 0, fit: 1, suits: 'feminine' },
    'long-skirt': { name: 'Long skirt', skirt: 1.75, leg: 0, fit: 1, suits: 'feminine' },
    jeans: { name: 'Jeans', leg: 2, fit: 1.03, skirt: 0, suits: 'any' },
    cargo: { name: 'Cargo pants', leg: 2, fit: 1.14, skirt: 0, trim: 'pocket', suits: 'any' },
    churidar: { name: 'Churidar', leg: 2, fit: 0.95, skirt: 0, suits: 'any' },
    dhoti: { name: 'Dhoti pants', leg: 2, fit: 1.42, skirt: 0, suits: 'masculine' },
    palazzo: { name: 'Palazzo pants', leg: 2, fit: 1.5, skirt: 0, suits: 'feminine' },
    'bike-shorts': { name: 'Bike shorts', leg: 0.6, fit: 0.97, skirt: 0, suits: 'any' },
    'pleated-skirt': {
        name: 'Pleated skirt',
        skirt: 0.85,
        flare: 1.95,
        leg: 0,
        fit: 1,
        suits: 'feminine',
    },
    'pencil-skirt': {
        name: 'Pencil skirt',
        skirt: 1.05,
        flare: 1.18,
        leg: 0,
        fit: 1,
        suits: 'feminine',
    },
    'maxi-skirt': {
        name: 'Maxi skirt',
        skirt: 1.85,
        flare: 1.7,
        leg: 0,
        fit: 1,
        suits: 'feminine',
    },
    lehenga: {
        name: 'Lehenga',
        skirt: 1.8,
        flare: 2.2,
        leg: 0,
        fit: 1,
        trim: 'stripe',
        suits: 'feminine',
    },
};

export const TOP_DEFS: Record<TopKind, TopDef> = { ...CORE_TOPS, ...MORE_TOPS };
export const BOTTOM_DEFS: Record<BottomKind, BottomDef> = { ...CORE_BOTTOMS, ...MORE_BOTTOMS };

/** Does the person's look suit the garment? (cast generator, Surprise me) */
export const suited = (suits: 'any' | 'feminine' | 'masculine', female: boolean) =>
    suits === 'any' || (female ? suits === 'feminine' : suits === 'masculine');

export const TOP_IDS = Object.keys(TOP_DEFS) as TopKind[];
export const BOTTOM_IDS = Object.keys(BOTTOM_DEFS) as BottomKind[];

/**
 * What the seeded cast generator draws from: the first batch only, so the 100 people stay the same people (same seed,
 * same cast, forever). The second batch is for the wardrobe, outfits and Surprise me.
 */
export const CAST_TOP_IDS = Object.keys(CORE_TOPS) as TopKind[];
export const CAST_BOTTOM_IDS = Object.keys(CORE_BOTTOMS) as BottomKind[];
