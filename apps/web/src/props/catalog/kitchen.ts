import type { Ink } from '../render/ink';
import { blob, ellipsePath, pts } from '../render/shapes';
import type { PropDef } from '../types';

/** Drinks and food fills (fixed: a recoloured cup still holds coffee). */
const COFFEE = '#6b4226';
const TEA = '#b8c86a';
const STEAM = (k: Ink, x: number, y: number) =>
    k.line(`M${x} ${y} q-6 -8 0 -16 q6 -8 0 -16 M${x + 14} ${y + 2} q-6 -8 0 -16 q6 -8 0 -16`, {
        lw: 0.45,
        opacity: 0.7,
    });

/** A plate seen at a slant: rim, a coloured ring, the well. */
const plate = (k: Ink, cx: number, cy: number, rx: number, ry: number) =>
    k.ellipse(cx, cy + 4, rx * 0.7, ry * 0.7, k.shade('plate', 0.15), { lw: 0.7 }) +
    k.ellipse(cx, cy, rx, ry, k.c('plate')) +
    k.stroke(ellipsePath(cx, cy, rx * 0.92, ry * 0.88), 2.2, k.c('rim')) +
    k.ellipse(cx, cy + 2, rx * 0.66, ry * 0.6, k.shade('plate', 0.04), { lw: 0.45 });

export const KITCHEN_PROPS: PropDef[] = [
    {
        id: 'cup',
        label: 'Cup',
        category: 'kitchen',
        tags: ['coffee', 'tea cup', 'saucer', 'cafe', 'drink'],
        width: 140,
        height: 130,
        colors: { cup: '#ffffff' },
        draw: (k) =>
            STEAM(k, 56, 40) +
            k.ellipse(66, 112, 60, 12, k.shade('cup', 0.08)) +
            k.limb('M98 64 q24 0 20 20 q-4 14 -22 12', 6, k.c('cup')) +
            k.path('M30 52 L38 100 Q66 112 94 100 L102 52 Z', k.c('cup')) +
            k.ellipse(66, 52, 36, 8, k.shade('cup', 0.08)) +
            k.ellipse(66, 53, 30, 5.5, COFFEE, { bare: true }),
    },
    {
        id: 'mug',
        label: 'Mug',
        category: 'kitchen',
        tags: ['cup', 'coffee', 'cocoa', 'drink', 'office'],
        width: 130,
        height: 130,
        colors: { mug: '#e86f5a' },
        draw: (k) =>
            k.limb('M88 46 q30 0 28 30 q-2 22 -28 20', 9, k.c('mug')) +
            k.path('M16 30 L16 112 Q52 126 88 112 L88 30 Z', k.c('mug')) +
            k.ellipse(52, 30, 36, 9, k.shade('mug', 0.1)) +
            k.ellipse(52, 31, 30, 6, COFFEE, { bare: true }) +
            k.circle(52, 74, 14, '#ffffff', { lw: 0.6 }) +
            k.line('M46 72 q6 6 12 0', { lw: 0.5 }),
    },
    {
        id: 'teacup',
        label: 'Tea cup',
        category: 'kitchen',
        tags: ['yunomi', 'green tea', 'japanese', 'cup', 'drink'],
        width: 100,
        height: 120,
        colors: { cup: '#7fae6b' },
        draw: (k) =>
            STEAM(k, 38, 28) +
            k.path('M14 36 L20 104 Q50 114 80 104 L86 36 Z', k.c('cup')) +
            k.line('M18 64 q8 -6 16 0 q8 6 16 0 q8 -6 16 0 q8 6 16 0', {
                lw: 0.5,
                color: '#ffffff',
            }) +
            k.ellipse(50, 36, 36, 8, k.light('cup', 0.3)) +
            k.ellipse(50, 37, 30, 5, TEA, { bare: true }),
    },
    {
        id: 'glass',
        label: 'Glass of water',
        category: 'kitchen',
        tags: ['glass', 'water', 'drink', 'cup'],
        width: 80,
        height: 130,
        colors: { water: '#9fd4f2' },
        draw: (k) =>
            k.path('M10 10 L18 118 Q40 126 62 118 L70 10 Z', '#eef7fc', { opacity: 0.9 }) +
            k.path('M13 44 L18 118 Q40 126 62 118 L67 44 Q40 52 13 44 Z', k.c('water'), {
                bare: true,
                opacity: 0.85,
            }) +
            k.ellipse(40, 44, 27, 5, k.light('water', 0.3), { lw: 0.5 }) +
            k.line('M22 20 L28 104', { lw: 0.8, color: '#ffffff' }) +
            k.ellipse(40, 10, 30, 5, 'none'),
    },
    {
        id: 'plate',
        label: 'Plate',
        category: 'kitchen',
        tags: ['dish', 'empty plate', 'dinner', 'table'],
        width: 180,
        height: 80,
        colors: { plate: '#ffffff', rim: '#5a8fd6' },
        draw: (k) => plate(k, 90, 38, 84, 30),
    },
    {
        id: 'plate-food',
        label: 'Omurice plate',
        category: 'kitchen',
        tags: ['food', 'meal', 'omelette', 'rice', 'dinner', 'plate'],
        width: 180,
        height: 100,
        colors: { plate: '#ffffff', rim: '#e08a5a', food: '#f6cf4a' },
        draw: (k) =>
            plate(k, 90, 58, 84, 30) +
            k.path('M40 64 Q42 22 90 20 Q138 22 140 64 Q90 76 40 64 Z', k.c('food')) +
            k.stroke('M60 40 q10 -8 20 0 q10 8 20 0 q10 -8 20 0', 4, '#d8433c') +
            k.circle(132, 70, 7, '#5aa05a', { lw: 0.5 }),
    },
    {
        id: 'bowl-rice',
        label: 'Rice bowl',
        category: 'kitchen',
        tags: ['bowl', 'rice', 'gohan', 'japanese', 'meal'],
        width: 140,
        height: 120,
        colors: { bowl: '#5b7fb8' },
        draw: (k) =>
            k.path(blob(70, 42, 50, 22, 9, k.rand, 1.2), '#ffffff') +
            k.rect(50, 100, 40, 12, k.shade('bowl', 0.2), { rx: 2 }) +
            k.path('M12 50 Q16 104 70 104 Q124 104 128 50 Z', k.c('bowl')) +
            k.line('M30 78 q10 -8 20 0 M90 78 q10 -8 20 0 M60 90 q10 -8 20 0', {
                lw: 0.5,
                color: '#ffffff',
            }) +
            k.ellipse(70, 50, 58, 10, 'none'),
    },
    {
        id: 'ramen',
        label: 'Ramen bowl',
        category: 'kitchen',
        tags: ['noodles', 'soup', 'bowl', 'japanese', 'food'],
        width: 180,
        height: 130,
        colors: { bowl: '#d8433c' },
        draw: (k) =>
            k.limbs(
                [
                    { d: 'M120 6 L60 60', width: 4 },
                    { d: 'M134 10 L70 62', width: 4 },
                ],
                '#c58b52',
            ) +
            k.rect(64, 110, 52, 12, k.shade('bowl', 0.2), { rx: 2 }) +
            k.path('M8 50 Q14 116 90 116 Q166 116 172 50 Z', k.c('bowl')) +
            k.stroke('M20 74 Q90 92 160 74', 6, '#ffffff') +
            k.ellipse(90, 50, 82, 16, '#e9b468') +
            k.line('M30 52 q10 -6 20 0 q10 6 20 0 q10 -6 20 0 M44 58 q10 -5 20 0 q10 5 20 0', {
                lw: 0.55,
            }) +
            k.circle(122, 48, 10, '#ffffff', { lw: 0.6 }) +
            k.line('M116 48 q6 -6 12 0 q-6 6 -10 2', { lw: 0.5, color: '#e85a8a' }) +
            k.ellipse(60, 46, 12, 8, '#ffffff', { lw: 0.6 }) +
            k.circle(60, 46, 5, '#f2a531', { bare: true }) +
            k.path(pts('140 36 156 32 158 52 142 56'), '#2f3b2f', { lw: 0.6 }),
    },
    {
        id: 'teapot',
        label: 'Teapot',
        category: 'kitchen',
        tags: ['tea', 'pot', 'kyusu', 'japanese'],
        width: 170,
        height: 140,
        colors: { pot: '#6c9a8b' },
        draw: (k) =>
            k.path('M126 74 Q150 66 160 40 L166 44 Q160 80 132 96 Z', k.c('pot')) +
            k.limb('M40 66 q-34 6 -28 32 q6 18 28 12', 7, k.c('pot')) +
            k.ellipse(84, 88, 54, 42, k.c('pot')) +
            k.ellipse(84, 52, 30, 8, k.shade('pot', 0.12)) +
            k.circle(84, 42, 7, k.shade('pot', 0.2)) +
            k.line('M50 74 q34 14 68 0', { lw: 0.5, color: '#ffffff' }),
    },
    {
        id: 'kettle',
        label: 'Kettle',
        category: 'kitchen',
        tags: ['kettle', 'boil', 'water', 'stove'],
        width: 160,
        height: 160,
        colors: { steel: '#c8ccd2' },
        draw: (k) =>
            k.limb('M46 70 Q46 18 84 18 Q122 18 122 70', 7, '#3a3a3a') +
            k.path('M126 100 L154 70 L158 76 L134 116 Z', k.c('steel')) +
            k.path('M28 150 L40 74 Q84 60 128 74 L140 150 Z', k.c('steel')) +
            k.ellipse(84, 74, 44, 9, k.light('steel', 0.2)) +
            k.circle(84, 66, 7, '#3a3a3a') +
            k.line('M52 96 L46 140', { lw: 0.9, color: '#ffffff' }),
    },
    {
        id: 'cooking-pot',
        label: 'Cooking pot',
        category: 'kitchen',
        tags: ['pot', 'stew', 'soup', 'saucepan', 'stove'],
        width: 180,
        height: 130,
        colors: { pot: '#d4572f' },
        draw: (k) =>
            k.rect(6, 50, 26, 12, '#3a3a3a', { rx: 6 }) +
            k.rect(148, 50, 26, 12, '#3a3a3a', { rx: 6 }) +
            k.path('M26 44 L26 110 Q90 126 154 110 L154 44 Z', k.c('pot')) +
            k.ellipse(90, 44, 66, 14, k.shade('pot', 0.1)) +
            k.ellipse(90, 32, 26, 6, '#3a3a3a') +
            k.line('M40 64 L40 104', { lw: 0.9, color: '#ffffff' }),
    },
    {
        id: 'frying-pan',
        label: 'Frying pan',
        category: 'kitchen',
        tags: ['pan', 'skillet', 'cook', 'stove'],
        width: 240,
        height: 90,
        colors: { pan: '#3a3a3a' },
        draw: (k) =>
            k.limb('M138 46 L232 34', 10, '#8a5a3a') +
            k.path('M6 40 L10 56 Q74 80 138 56 L142 40 Z', k.c('pan')) +
            k.ellipse(74, 40, 68, 20, k.c('pan')) +
            k.ellipse(74, 42, 56, 14, k.light('pan', 0.18), { lw: 0.5 }),
    },
    {
        id: 'bottle',
        label: 'Bottle',
        category: 'kitchen',
        tags: ['bottle', 'drink', 'soda', 'ramune', 'water'],
        width: 70,
        height: 180,
        colors: { bottle: '#6bbf8a' },
        draw: (k) =>
            k.path(
                'M27 8 L43 8 L43 46 Q62 60 62 84 L62 168 Q35 176 8 168 L8 84 Q8 60 27 46 Z',
                k.c('bottle'),
                { opacity: 0.95 },
            ) +
            k.rect(25, 2, 20, 10, '#d8433c', { rx: 2 }) +
            k.rect(8, 100, 54, 40, '#ffffff', { lw: 0.6 }) +
            k.line('M16 112 h38 M16 122 h26', { lw: 0.5 }) +
            k.line('M16 70 L16 160', { lw: 0.9, color: '#ffffff' }),
    },
    {
        id: 'chopsticks',
        label: 'Chopsticks',
        category: 'kitchen',
        tags: ['hashi', 'japanese', 'eat', 'table'],
        width: 190,
        height: 60,
        colors: { wood: '#b0703a' },
        draw: (k) =>
            k.path(pts('6 20 186 12 186 18 6 26'), k.c('wood')) +
            k.path(pts('6 36 186 28 186 34 6 42'), k.c('wood')) +
            k.rect(130, 30, 30, 18, '#e2e6ea', { rx: 8 }),
    },
    {
        id: 'bento',
        label: 'Bento box',
        category: 'kitchen',
        tags: ['lunch', 'food', 'box', 'japanese', 'school'],
        width: 200,
        height: 130,
        colors: { box: '#2f2f36' },
        draw: (k) =>
            k.rect(6, 6, 188, 118, k.c('box'), { rx: 10 }) +
            k.rect(16, 16, 92, 98, '#ffffff', { rx: 4 }) +
            k.circle(62, 64, 9, '#c7364a', { lw: 0.6 }) +
            k.rect(116, 16, 68, 46, '#5aa05a', { rx: 4, lw: 0.6 }) +
            k.path(blob(150, 39, 22, 14, 7, k.rand, 1.3), '#3f8f4a') +
            k.rect(116, 68, 68, 46, '#f6d36a', { rx: 4, lw: 0.6 }) +
            k.line('M132 68 v46 M150 68 v46 M168 68 v46', { lw: 0.5 }),
    },
];
