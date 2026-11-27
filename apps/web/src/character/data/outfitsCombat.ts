import type { Outfit } from './outfits';
import { K, W, make } from './outfitsMake';

/**
 * Combat-sport kits (docs/COMBAT_PACK.md, schema v9 gear): boxing, Muay Thai, MMA and BJJ, for anyone (the same
 * kit on a male or female body; the garments fit both). Plain colours, no sponsor logos. BJJ belts come in the
 * five adult ranks.
 */
export const BJJ_BELTS = {
    white: '#f8fafc',
    blue: '#1d4ed8',
    purple: '#7e22ce',
    brown: '#78350f',
    black: '#111827',
} as const;

const gi = (belt: keyof typeof BJJ_BELTS, cloth = W) =>
    make(
        'fight',
        `BJJ gi (${belt} belt)`,
        ['gi-jacket', cloth],
        ['gi-pants', cloth],
        ['barefoot', '#e0ac69'],
        [['gi-belt', BJJ_BELTS[belt]]],
    );

export const OUTFITS_COMBAT: Outfit[] = [
    make(
        'fight',
        'Pro boxer',
        ['tank', '#dc2626'],
        ['boxing-trunks', '#dc2626'],
        ['sports-shoes', W],
        [
            ['boxing-gloves', '#dc2626'],
            ['mouthguard', '#f8fafc'],
        ],
    ),
    make(
        'fight',
        'Amateur boxer',
        ['tank', '#2563eb'],
        ['boxing-trunks', '#2563eb'],
        ['sports-shoes', W],
        [
            ['boxing-gloves', '#2563eb'],
            ['head-guard', '#2563eb'],
            ['mouthguard', '#2563eb'],
        ],
    ),
    make(
        'fight',
        'Boxing training',
        ['tshirt', '#374151'],
        ['shorts', K],
        ['sports-shoes', K],
        [['hand-wraps', W]],
    ),
    make(
        'fight',
        'Nak muay',
        ['tank', W],
        ['muay-thai-shorts', '#dc2626'],
        ['barefoot', '#e0ac69'],
        [
            ['mongkol', '#dc2626'],
            ['prajioud', '#dc2626'],
            ['boxing-gloves', '#dc2626'],
            ['ankle-wraps', W],
            ['mouthguard', '#dc2626'],
        ],
    ),
    make(
        'fight',
        'MMA fighter',
        ['tank', K],
        ['fight-shorts', K],
        ['barefoot', '#e0ac69'],
        [
            ['mma-gloves', K],
            ['mouthguard', K],
        ],
    ),
    make(
        'fight',
        'MMA (rashguard and spats)',
        ['rashguard', '#1d4ed8'],
        ['spats', K],
        ['barefoot', '#e0ac69'],
        [
            ['mma-gloves', K],
            ['mouthguard', '#1d4ed8'],
        ],
    ),
    make(
        'fight',
        'No-gi grappler',
        ['rashguard', K],
        ['fight-shorts', '#374151'],
        ['barefoot', '#e0ac69'],
        [['mouthguard', W]],
    ),
    gi('white'),
    gi('blue'),
    gi('purple'),
    gi('brown', '#1e3a8a'),
    gi('black', K),
];
