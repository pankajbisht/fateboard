import { n } from '../render/ink';
import { blob, pts } from '../render/shapes';
import type { PropDef } from '../types';

const CREAM = '#fffaf0';
const BERRY = '#e04848';
const CHOC = '#6b4226';

/** Café, street food and sweets. */
export const FOOD_PROPS: PropDef[] = [
    {
        id: 'cake-slice',
        label: 'Cake slice',
        category: 'food',
        tags: ['cake', 'shortcake', 'dessert', 'cafe', 'birthday'],
        width: 140,
        height: 110,
        colors: { sponge: '#f6d58e' },
        draw: (k) =>
            k.path(pts('10 60 110 30 130 50 130 100 30 104 10 90'), k.c('sponge')) +
            k.path(pts('10 60 110 30 130 50 30 80'), CREAM) +
            k.path(pts('30 80 130 50 130 60 30 92'), CREAM, { lw: 0.5 }) +
            k.path(pts('30 80 30 104 10 90 10 60'), k.shade('sponge', 0.1), { lw: 0.6 }) +
            k.circle(70, 40, 10, BERRY) +
            k.path('M66 32 q4 -6 8 0', '#5aa05a', { lw: 0.5 }),
    },
    {
        id: 'shortcake',
        label: 'Strawberry cake',
        category: 'food',
        tags: ['cake', 'whole cake', 'birthday', 'party', 'dessert'],
        width: 180,
        height: 130,
        colors: { cream: '#fffaf0' },
        draw: (k) =>
            k.ellipse(90, 116, 84, 12, '#e6eaef') +
            k.path('M14 46 L14 106 A76 16 0 0 0 166 106 L166 46 Z', k.c('cream')) +
            k.stroke('M14 76 A76 16 0 0 0 166 76', 7, '#f6d58e') +
            k.ellipse(90, 46, 76, 16, k.c('cream')) +
            [40, 66, 90, 114, 140]
                .map((x, i) =>
                    k.path(
                        `M${x} ${i % 2 ? 34 : 42} q-8 -2 -6 -12 q6 -8 12 0 q2 10 -6 12 Z`,
                        BERRY,
                        { lw: 0.6 },
                    ),
                )
                .join(''),
    },
    {
        id: 'parfait',
        label: 'Parfait',
        category: 'food',
        tags: ['parfait', 'sundae', 'dessert', 'cafe', 'ice cream'],
        width: 100,
        height: 180,
        colors: { glass: '#e9f4fb' },
        draw: (k) =>
            k.path(pts('40 156 60 156 66 176 34 176'), k.c('glass')) +
            k.rect(46, 120, 8, 36, k.c('glass')) +
            k.path('M14 46 L86 46 L74 120 L26 120 Z', k.c('glass')) +
            k.path(pts('18 60 82 60 80 76 20 76'), '#f7a8c0', { bare: true }) +
            k.path(pts('20 76 80 76 78 92 22 92'), CREAM, { bare: true }) +
            k.path(pts('22 92 78 92 74 120 26 120'), CHOC, { bare: true }) +
            k.path('M14 46 L86 46 L74 120 L26 120 Z', 'none') +
            k.path(blob(50, 36, 34, 16, 7, k.rand, 1.2), CREAM) +
            k.circle(50, 18, 10, BERRY) +
            k.rect(66, 4, 6, 34, '#e2b84a', { lw: 0.5, transform: 'rotate(20 69 21)' }),
    },
    {
        id: 'bubble-tea',
        label: 'Bubble tea',
        category: 'food',
        tags: ['boba', 'tapioca', 'milk tea', 'drink', 'cafe'],
        width: 90,
        height: 180,
        colors: { tea: '#d9b38c' },
        draw: (k) => {
            let pearls = '';
            for (let i = 0; i < 12; i++)
                pearls += k.circle(
                    22 + (i % 6) * 9.5,
                    146 + Math.floor(i / 6) * 10,
                    4.5,
                    '#3a2a22',
                    { bare: true },
                );
            return (
                k.limb('M54 4 L48 60', 7, '#e04848') +
                k.path('M10 40 L80 40 L70 172 L20 172 Z', k.c('tea')) +
                pearls +
                k.ellipse(45, 40, 37, 9, '#f1f6fa') +
                k.line('M22 52 L28 160', { lw: 0.9, color: '#ffffff' })
            );
        },
    },
    {
        id: 'taiyaki',
        label: 'Taiyaki',
        category: 'food',
        tags: ['fish cake', 'sweets', 'festival', 'street food'],
        width: 150,
        height: 90,
        colors: { crust: '#d99a4e' },
        draw: (k) =>
            k.path(
                'M24 46 Q40 10 96 14 L130 6 Q124 30 140 46 Q124 62 130 86 L96 78 Q40 82 24 46 Z',
                k.c('crust'),
            ) +
            k.circle(42, 38, 5, k.shade('crust', 0.35), { lw: 0.5 }) +
            k.line('M60 34 q6 12 0 24 M76 30 q6 16 0 32 M92 30 q6 16 0 32 M30 52 q10 6 20 2', {
                lw: 0.5,
            }),
    },
    {
        id: 'takoyaki',
        label: 'Takoyaki',
        category: 'food',
        tags: ['octopus balls', 'street food', 'festival', 'osaka'],
        width: 160,
        height: 100,
        colors: { ball: '#c98a4a' },
        draw: (k) =>
            k.path(pts('6 50 154 50 140 92 20 92'), '#d9b27c') +
            [30, 60, 90, 120, 45, 75, 105]
                .map((x, i) => k.circle(x + 6, i < 4 ? 48 : 30, 17, k.c('ball')))
                .join('') +
            k.stroke('M24 34 q10 -8 20 0 q10 8 20 0 q10 -8 20 0 q10 8 20 0 q10 -8 20 0', 4, CHOC) +
            k.line('M32 40 l4 -2 M70 30 l3 2 M100 38 l4 -1', { lw: 0.8, color: '#5aa05a' }) +
            k.limb('M130 20 L150 4', 3, '#d9b27c'),
    },
    {
        id: 'crepe',
        label: 'Crepe',
        category: 'food',
        tags: ['crepe', 'harajuku', 'dessert', 'street food', 'sweets'],
        width: 100,
        height: 170,
        colors: { wrap: '#f3d79a' },
        draw: (k) =>
            k.path(blob(50, 40, 40, 26, 8, k.rand, 1.3), CREAM) +
            k.circle(34, 30, 9, BERRY) +
            k.circle(64, 26, 9, BERRY) +
            k.path(pts('50 16 56 4 62 16'), CHOC, { lw: 0.5 }) +
            k.path('M8 48 Q50 70 92 48 L56 164 Q50 170 44 164 Z', k.c('wrap')) +
            k.path(pts('8 48 50 62 92 48 72 100 28 100'), '#fbfaf5', { lw: 0.6 }) +
            k.line('M30 90 L48 150 M70 90 L54 150', { lw: 0.45 }),
    },
    {
        id: 'burger',
        label: 'Burger',
        category: 'food',
        tags: ['hamburger', 'fast food', 'lunch'],
        width: 140,
        height: 120,
        colors: { bun: '#e2a456' },
        draw: (k) =>
            k.path('M14 90 L126 90 Q126 112 70 112 Q14 112 14 90 Z', k.c('bun')) +
            k.rect(10, 74, 120, 16, CHOC, { rx: 8 }) +
            k.path('M8 74 Q30 64 50 74 Q70 64 90 74 Q110 64 132 74 L132 68 L8 68 Z', '#7cc36b') +
            k.rect(14, 60, 112, 10, '#f2c230', { rx: 3 }) +
            k.path('M10 60 Q10 10 70 10 Q130 10 130 60 Z', k.c('bun')) +
            [40, 60, 80, 100, 50, 90]
                .map((x, i) => k.ellipse(x, i < 4 ? 30 : 44, 3, 1.5, '#fff3c8', { bare: true }))
                .join(''),
    },
    {
        id: 'fries',
        label: 'French fries',
        category: 'food',
        tags: ['fries', 'chips', 'fast food', 'snack'],
        width: 100,
        height: 140,
        colors: { box: '#e04848' },
        draw: (k) =>
            [20, 32, 44, 56, 68, 26, 50, 74]
                .map((x, i) =>
                    k.rect(x, 10 + (i % 3) * 8, 10, 60, '#f6cf4a', {
                        lw: 0.6,
                        transform: `rotate(${(i % 3) * 4 - 4} ${x + 5} 60)`,
                    }),
                )
                .join('') +
            k.path('M10 54 L90 54 L80 134 L20 134 Z', k.c('box')) +
            k.path('M10 54 Q50 70 90 54', 'none', { lw: 0.7 }),
    },
    {
        id: 'pizza-slice',
        label: 'Pizza slice',
        category: 'food',
        tags: ['pizza', 'fast food', 'party'],
        width: 140,
        height: 130,
        colors: { cheese: '#f6cf4a' },
        draw: (k) =>
            k.path('M12 24 Q70 4 128 24 L70 126 Z', k.c('cheese')) +
            k.path('M8 22 Q70 2 132 22 L126 32 Q70 12 14 32 Z', '#d99a4e') +
            [
                [54, 46],
                [86, 52],
                [70, 80],
            ]
                .map(([x, y]) => k.circle(x, y, 9, BERRY, { lw: 0.6 }))
                .join('') +
            k.line('M98 70 q4 10 -2 16', { lw: 0.6 }),
    },
    {
        id: 'donut',
        label: 'Donut',
        category: 'food',
        tags: ['doughnut', 'sweets', 'snack', 'dessert'],
        width: 120,
        height: 110,
        colors: { icing: '#f7a8c0' },
        draw: (k) => {
            let sprinkles = '';
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                const r = 30 + (i % 2) * 8;
                const x = 60 + Math.cos(a) * r;
                const y = 52 + Math.sin(a) * r * 0.8;
                sprinkles += k.rect(x, y, 7, 2.5, ['#4a7bd0', '#ffffff', '#f2c230'][i % 3], {
                    bare: true,
                    transform: `rotate(${i * 37} ${n(x)} ${n(y)})`,
                });
            }
            return (
                k.ellipse(60, 60, 54, 44, '#d99a4e') +
                k.path(blob(60, 54, 50, 38, 12, k.rand, 0.7), k.c('icing')) +
                sprinkles +
                k.ellipse(60, 54, 16, 12, '#d99a4e')
            );
        },
    },
    {
        id: 'ice-cream',
        label: 'Ice cream cone',
        category: 'food',
        tags: ['ice cream', 'soft serve', 'summer', 'dessert'],
        width: 90,
        height: 170,
        colors: { scoop: '#fbe3ea' },
        draw: (k) =>
            k.path(pts('16 70 74 70 45 166'), '#e2a456') +
            k.line('M24 82 L56 124 M40 76 L64 104 M66 82 L34 124 M50 76 L26 104', { lw: 0.45 }) +
            k.path(blob(45, 56, 32, 22, 8, k.rand, 1.1), k.c('scoop')) +
            k.path(blob(45, 30, 24, 18, 7, k.rand, 1.1), k.c('scoop')) +
            k.circle(45, 10, 7, BERRY),
    },
    {
        id: 'kakigori',
        label: 'Shaved ice',
        category: 'food',
        tags: ['kakigori', 'shaved ice', 'summer', 'festival', 'dessert'],
        width: 120,
        height: 140,
        colors: { syrup: '#e04848' },
        draw: (k) =>
            k.path('M60 8 Q96 30 104 74 L16 74 Q24 30 60 8 Z', '#fbfdff') +
            k.path('M60 8 Q90 26 98 56 Q60 70 22 56 Q30 26 60 8 Z', k.c('syrup'), {
                bare: true,
                opacity: 0.85,
            }) +
            k.path('M60 8 Q96 30 104 74 L16 74 Q24 30 60 8 Z', 'none') +
            k.path('M10 74 L110 74 Q104 104 60 104 Q16 104 10 74 Z', '#cfe8f7') +
            k.rect(46, 104, 28, 24, '#cfe8f7') +
            k.rect(34, 126, 52, 8, '#cfe8f7', { rx: 3 }),
    },
    {
        id: 'melon-pan',
        label: 'Melon bread',
        category: 'food',
        tags: ['melon pan', 'bread', 'bakery', 'snack', 'lunch'],
        width: 130,
        height: 100,
        colors: { crust: '#f2cf7a' },
        draw: (k) =>
            k.path('M8 74 Q8 10 65 10 Q122 10 122 74 Q65 94 8 74 Z', k.c('crust')) +
            k.line(
                'M30 22 L90 82 M52 14 L110 72 M18 44 L64 88 M100 22 L40 82 M78 14 L20 72 M112 44 L66 88',
                { lw: 0.5 },
            ),
    },
    {
        id: 'menu-board',
        label: 'Menu board',
        category: 'food',
        tags: ['cafe sign', 'chalk board', 'a-frame', 'restaurant', 'menu'],
        width: 140,
        height: 200,
        colors: { wood: '#a8744a' },
        draw: (k) =>
            k.limbs(
                [
                    { d: 'M24 120 L10 196', width: 6 },
                    { d: 'M116 120 L130 196', width: 6 },
                ],
                k.c('wood'),
            ) +
            k.rect(14, 8, 112, 140, k.c('wood'), { rx: 4 }) +
            k.rect(22, 16, 96, 124, '#2f3b36') +
            k.line('M34 36 h72 M34 58 h50 M34 74 h60 M34 90 h44 M34 106 h56', {
                lw: 0.6,
                color: '#f6f2e6',
            }) +
            k.circle(96, 118, 9, '#f7a8c0', { lw: 0.4 }),
    },
];
