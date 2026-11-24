import type { AccessoryKind, BottomKind, ShoeKind, TopKind } from '../schema/types';
import { ACCESSORY_DEFS } from './wardrobe';
import type { Outfit, OutfitGroup } from './outfits';

/** The helper the outfit tables are written with (outfitsA.ts, outfitsB.ts). */
export type Acc = [AccessoryKind, string?];

export const make = (
    group: OutfitGroup,
    name: string,
    top: [TopKind, string],
    bottom: [BottomKind, string],
    shoes: [ShoeKind, string],
    acc: Acc[] = [],
    suits: Outfit['suits'] = 'any',
): Outfit => ({
    id: `${group}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    group,
    suits,
    dress: {
        top: { kind: top[0], color: top[1] },
        bottom: { kind: bottom[0], color: bottom[1] },
        shoes: { kind: shoes[0], color: shoes[1] },
        accessories: acc.map(([kind, color]) => ({
            kind,
            color: color ?? ACCESSORY_DEFS[kind].color,
        })),
        held: [],
    },
});

export const W = '#f8fafc';
export const K = '#111827';
export const NAVY = '#1e3a8a';
export const DENIM = '#2563eb';
