import type { AccessoryKind, ShoeKind } from '../schema/types';
import type { Collar, Hang } from './garments';

/**
 * Shoes and accessories as data (docs/CHARACTER_STUDIO.md phase 3). Shoes: how far up the shin they reach, whether
 * the foot shows (sandals, bare feet), the toe and the size. Accessories: where they are worn (`slot`: one per
 * slot), what colour they start in, and when they do not go with the top (`dressRules.ts` reads `needs` / `blocks`).
 */
export interface ShoeDef {
    name: string;
    /** how far up the shin the shoe reaches: 0 = the foot only, 1 = to the knee */
    cover: number;
    /** the foot shows (sandals, flip-flops, bare feet): the shoe is drawn as a sole and straps */
    open?: 'sandal' | 'flip' | 'bare';
    /** size of the shoe shell */
    scale: number;
    pointed?: boolean;
    suits: 'any' | 'feminine' | 'masculine';
}

export const SHOE_DEFS: Record<ShoeKind, ShoeDef> = {
    sneakers: { name: 'Sneakers', cover: 0, scale: 1, suits: 'any' },
    'sports-shoes': { name: 'Sports shoes', cover: 0.06, scale: 1.1, suits: 'any' },
    'school-shoes': { name: 'School shoes', cover: 0, scale: 0.98, suits: 'any' },
    loafers: { name: 'Loafers', cover: 0, scale: 0.96, pointed: true, suits: 'any' },
    boots: { name: 'Boots', cover: 0.34, scale: 1.06, suits: 'any' },
    'ankle-boots': { name: 'Ankle boots', cover: 0.16, scale: 1.02, suits: 'any' },
    wellies: { name: 'Rain boots', cover: 0.74, scale: 1.08, suits: 'any' },
    sandals: { name: 'Sandals', cover: 0, scale: 0.98, open: 'sandal', suits: 'any' },
    'flip-flops': { name: 'Flip-flops', cover: 0, scale: 0.98, open: 'flip', suits: 'any' },
    heels: { name: 'Heels', cover: 0, scale: 0.94, pointed: true, suits: 'feminine' },
    slippers: { name: 'Slippers', cover: 0, scale: 1.04, suits: 'any' },
    'combat-boots': { name: 'Combat boots', cover: 0.42, scale: 1.1, suits: 'any' },
    barefoot: { name: 'Barefoot', cover: 0, scale: 0.9, open: 'bare', suits: 'any' },
};

export type Slot =
    | 'head'
    | 'face'
    | 'neck'
    | 'jewel'
    | 'ear'
    | 'forehead'
    | 'wrist'
    | 'waist'
    | 'back'
    | 'hand'
    | 'torso'
    | 'hair'
    | 'legs'
    | 'arm'
    | 'mouth';

export interface AccessoryDef {
    name: string;
    slot: Slot;
    color: string;
    /** only with these collars (a tie needs a shirt collar) */
    needs?: Collar[];
    /** not with these collars (a scarf and a high collar) */
    blocksCollar?: Collar[];
    /** not with a top that hangs this far (a belt under a kurta) */
    blocksHang?: Hang[];
    /** not with these other accessories (earrings under a helmet) */
    blocksWith?: AccessoryKind[];
    suits: 'any' | 'feminine' | 'masculine';
}

export const ACCESSORY_DEFS: Record<AccessoryKind, AccessoryDef> = {
    glasses: { name: 'Glasses', slot: 'face', color: '#2b2b2b', suits: 'any' },
    sunglasses: { name: 'Sunglasses', slot: 'face', color: '#111111', suits: 'any' },
    cap: { name: 'Cap', slot: 'head', color: '#2563eb', suits: 'any' },
    hat: { name: 'Sun hat', slot: 'head', color: '#d6b26e', suits: 'any' },
    beanie: {
        name: 'Beanie',
        slot: 'head',
        color: '#dc2626',
        blocksWith: ['bindi'],
        suits: 'any',
    },
    headband: { name: 'Headband', slot: 'head', color: '#f59e0b', suits: 'any' },
    turban: { name: 'Turban', slot: 'head', color: '#f97316', suits: 'masculine' },
    headscarf: { name: 'Headscarf', slot: 'head', color: '#0f766e', suits: 'feminine' },
    helmet: {
        name: 'Helmet',
        slot: 'head',
        color: '#facc15',
        blocksWith: ['earrings', 'bindi'],
        suits: 'any',
    },
    scarf: {
        name: 'Scarf',
        slot: 'neck',
        color: '#dc2626',
        blocksCollar: ['high', 'hood'],
        suits: 'any',
    },
    tie: { name: 'Tie', slot: 'neck', color: '#1d4ed8', needs: ['polo', 'lapel'], suits: 'any' },
    necklace: {
        name: 'Necklace',
        slot: 'jewel',
        color: '#d4a017',
        blocksCollar: ['high'],
        suits: 'any',
    },
    earrings: { name: 'Earrings', slot: 'ear', color: '#d4a017', suits: 'feminine' },
    bindi: {
        name: 'Bindi',
        slot: 'forehead',
        color: '#dc2626',
        suits: 'feminine',
    },
    watch: { name: 'Watch', slot: 'wrist', color: '#4b5563', suits: 'any' },
    bracelet: { name: 'Bracelet', slot: 'wrist', color: '#d4a017', suits: 'any' },
    belt: {
        name: 'Belt',
        slot: 'waist',
        color: '#78350f',
        blocksHang: ['thigh', 'knee'],
        suits: 'any',
    },
    backpack: { name: 'Backpack', slot: 'back', color: '#16a34a', suits: 'any' },
    bag: { name: 'Shoulder bag', slot: 'hand', color: '#92400e', suits: 'any' },
    beret: {
        name: 'Beret',
        slot: 'head',
        color: '#3f6212',
        blocksWith: ['bindi'],
        suits: 'any',
    },
    'army-helmet': {
        name: 'Army helmet',
        slot: 'head',
        color: '#4d5d2f',
        blocksWith: ['earrings', 'bindi'],
        suits: 'any',
    },
    apron: { name: 'Apron', slot: 'torso', color: '#f8fafc', suits: 'any' },
    // a ribbon bow at the collar (one neck piece at a time, so not with a tie or a scarf)
    bow: {
        name: 'Collar bow',
        slot: 'neck',
        color: '#d6405e',
        blocksCollar: ['high', 'hood'],
        suits: 'any',
    },
    'hair-clip': { name: 'Hair clip', slot: 'hair', color: '#f2b632', suits: 'any' },
    socks: { name: 'Socks', slot: 'legs', color: '#f5f7fb', suits: 'any' },
    // combat-sport gear (docs/COMBAT_PACK.md): gloves cover the hands, so nothing is held with them on
    'boxing-gloves': { name: 'Boxing gloves', slot: 'hand', color: '#dc2626', suits: 'any' },
    'mma-gloves': {
        name: 'MMA gloves (open finger)',
        slot: 'hand',
        color: '#111827',
        suits: 'any',
    },
    'hand-wraps': { name: 'Hand wraps', slot: 'wrist', color: '#f8fafc', suits: 'any' },
    mouthguard: { name: 'Mouthguard', slot: 'mouth', color: '#2563eb', suits: 'any' },
    'head-guard': { name: 'Head guard', slot: 'head', color: '#b91c1c', suits: 'any' },
    mongkol: { name: 'Mongkol (headband)', slot: 'head', color: '#dc2626', suits: 'any' },
    prajioud: { name: 'Prajioud (armbands)', slot: 'arm', color: '#dc2626', suits: 'any' },
    'ankle-wraps': { name: 'Ankle wraps', slot: 'legs', color: '#f8fafc', suits: 'any' },
    'gi-belt': { name: 'Gi belt', slot: 'waist', color: '#f8fafc', suits: 'any' },
};

export const SHOE_IDS = Object.keys(SHOE_DEFS) as ShoeKind[];
export const ACCESSORY_IDS = Object.keys(ACCESSORY_DEFS) as AccessoryKind[];
