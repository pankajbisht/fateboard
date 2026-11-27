import { n } from '../render/ink';
import { blob, pts, star } from '../render/shapes';
import type { PropDef } from '../types';

const EYE = '#141414';

/** A maple leaf (autumn). */
const maple = (cx: number, cy: number, r: number) =>
    pts(
        [
            [0, -1],
            [0.18, -0.55],
            [0.55, -0.75],
            [0.42, -0.3],
            [0.95, -0.2],
            [0.5, 0.15],
            [0.65, 0.55],
            [0.1, 0.35],
            [0, 0.9],
            [-0.1, 0.35],
            [-0.65, 0.55],
            [-0.5, 0.15],
            [-0.95, -0.2],
            [-0.42, -0.3],
            [-0.55, -0.75],
            [-0.18, -0.55],
        ]
            .map(([x, y]) => `${n(cx + x * r)} ${n(cy + y * r)}`)
            .join(' '),
    );

/** Seasons and holidays. */
export const SEASON_PROPS: PropDef[] = [
    {
        id: 'snowman',
        label: 'Snowman',
        category: 'seasons',
        tags: ['snowman', 'winter', 'snow', 'christmas'],
        width: 130,
        height: 180,
        colors: { scarf: '#e04848' },
        draw: (k) =>
            k.limb('M24 100 L4 80 M106 100 L126 82', 3, '#7a5236') +
            k.circle(65, 130, 46, '#ffffff') +
            k.circle(65, 66, 32, '#ffffff') +
            k.rect(42, 14, 46, 30, '#2f2f33') +
            k.rect(34, 40, 62, 8, '#2f2f33') +
            k.circle(55, 60, 3, EYE, { bare: true }) +
            k.circle(75, 60, 3, EYE, { bare: true }) +
            k.path(pts('64 68 84 72 64 76'), '#f2992b', { lw: 0.5 }) +
            k.stroke('M38 92 Q65 104 92 92', 9, k.c('scarf')) +
            k.path(pts('80 96 92 124 80 126 72 100'), k.c('scarf'), { lw: 0.6 }) +
            [116, 134, 152].map((y) => k.circle(65, y, 3.5, '#2f2f33', { bare: true })).join(''),
    },
    {
        id: 'christmas-tree',
        label: 'Christmas tree',
        category: 'seasons',
        tags: ['christmas', 'xmas', 'tree', 'winter', 'holiday'],
        width: 160,
        height: 220,
        colors: { tree: '#3f8f5a' },
        draw: (k) =>
            k.rect(66, 184, 28, 30, '#8a5a3a') +
            k.path(pts('80 60 150 186 10 186'), k.c('tree')) +
            k.path(pts('80 34 132 130 28 130'), k.c('tree')) +
            k.path(pts('80 14 116 80 44 80'), k.c('tree')) +
            k.stroke('M40 112 Q80 128 122 108 M30 166 Q80 182 132 160', 3, '#f2c230') +
            [
                [64, 98, '#e04848'],
                [100, 104, '#4a7bd0'],
                [54, 150, '#f2c230'],
                [92, 152, '#e04848'],
                [120, 172, '#4a7bd0'],
                [80, 64, '#e04848'],
            ]
                .map(([x, y, c]) => k.circle(Number(x), Number(y), 6, String(c), { lw: 0.5 }))
                .join('') +
            k.path(star(80, 14, 14, 6, 5), '#f2c230'),
    },
    {
        id: 'gift-box',
        label: 'Gift box',
        category: 'seasons',
        tags: ['present', 'gift', 'birthday', 'christmas', 'surprise'],
        width: 120,
        height: 120,
        colors: { paper: '#e04878' },
        draw: (k) =>
            k.path('M60 30 Q30 2 24 20 Q22 32 60 30 Q98 32 96 20 Q90 2 60 30 Z', '#f2c230') +
            k.rect(14, 46, 92, 68, k.c('paper')) +
            k.rect(8, 30, 104, 18, k.light('paper', 0.15)) +
            k.rect(52, 30, 16, 84, '#f2c230', { lw: 0.6 }),
    },
    {
        id: 'pumpkin-lantern',
        label: 'Jack-o-lantern',
        category: 'seasons',
        tags: ['halloween', 'pumpkin', 'autumn', 'spooky'],
        width: 140,
        height: 120,
        colors: { pumpkin: '#f2862b' },
        draw: (k) =>
            k.rect(62, 6, 14, 20, '#5a7a3a', { rx: 3 }) +
            k.ellipse(40, 70, 34, 44, k.shade('pumpkin', 0.1)) +
            k.ellipse(100, 70, 34, 44, k.shade('pumpkin', 0.1)) +
            k.ellipse(70, 70, 38, 46, k.c('pumpkin')) +
            k.path(pts('40 56 56 56 48 42'), '#3a2414', { lw: 0.4 }) +
            k.path(pts('84 56 100 56 92 42'), '#3a2414', { lw: 0.4 }) +
            k.path(pts('36 76 50 86 60 78 70 88 80 78 90 86 104 76 98 96 42 96'), '#3a2414', {
                lw: 0.4,
            }),
    },
    {
        id: 'ghost',
        label: 'Ghost',
        category: 'seasons',
        tags: ['ghost', 'halloween', 'spooky', 'obake', 'yurei'],
        width: 110,
        height: 140,
        colors: { sheet: '#ffffff' },
        noShadow: true,
        draw: (k) =>
            k.path(
                'M10 60 Q10 8 55 8 Q100 8 100 60 L100 120 Q90 134 80 120 Q70 134 60 120 Q50 134 40 120 Q30 134 20 120 Q10 134 10 120 Z',
                k.c('sheet'),
            ) +
            k.ellipse(40, 56, 6, 9, EYE, { bare: true }) +
            k.ellipse(70, 56, 6, 9, EYE, { bare: true }) +
            k.ellipse(55, 80, 8, 10, EYE, { bare: true }) +
            k.ellipse(30, 70, 7, 4, '#f7a8b8', { bare: true }),
    },
    {
        id: 'tanabata',
        label: 'Tanabata wishes',
        category: 'seasons',
        tags: ['tanabata', 'bamboo', 'wishes', 'tanzaku', 'star festival', 'july'],
        width: 180,
        height: 260,
        colors: { leaf: '#5c9c45' },
        draw: (k) => {
            const PAPERS = ['#f7a8c0', '#8fd0ff', '#f2c230', '#9fcf7a', '#c8a8f0'];
            let papers = '';
            for (let i = 0; i < 8; i++) {
                const x = 30 + k.rand() * 120;
                const y = 40 + k.rand() * 140;
                papers +=
                    k.line(`M${n(x + 6)} ${n(y - 8)} V${n(y)}`, { lw: 0.5 }) +
                    k.rect(x, y, 12, 34, PAPERS[i % PAPERS.length], { lw: 0.5 });
            }
            let leaves = '';
            for (let i = 0; i < 10; i++) {
                const x = 20 + k.rand() * 140;
                const y = 20 + k.rand() * 170;
                leaves += k.path(blob(x, y, 16, 5, 4, k.rand, 0.4), k.c('leaf'), {
                    lw: 0.6,
                    transform: `rotate(${Math.round(k.rand() * 60 - 30)} ${n(x)} ${n(y)})`,
                });
            }
            return k.limb('M90 256 Q88 120 96 10', 9, '#8cbf5a') + leaves + papers;
        },
    },
    {
        id: 'kadomatsu',
        label: 'Kadomatsu',
        category: 'seasons',
        tags: ['new year', 'shogatsu', 'bamboo', 'pine', 'japan'],
        width: 120,
        height: 200,
        colors: { bamboo: '#7cb85a' },
        draw: (k) =>
            k.path(blob(60, 124, 50, 26, 9, k.rand, 1.2), '#3f7f45') +
            [
                [30, 20],
                [60, 6],
                [90, 34],
            ]
                .map(
                    ([x, top]) =>
                        k.rect(x - 11, top, 22, 150 - top, k.c('bamboo')) +
                        k.path(
                            pts(`${x - 11} ${top} ${x + 11} ${top - 14} ${x + 11} ${top + 8}`),
                            k.light('bamboo', 0.3),
                        ),
                )
                .join('') +
            k.rect(14, 140, 92, 56, '#c9a66a', { rx: 6 }) +
            k.line('M14 156 H106 M14 176 H106', { lw: 0.5 }),
    },
    {
        id: 'kagami-mochi',
        label: 'Kagami mochi',
        category: 'seasons',
        tags: ['new year', 'mochi', 'rice cake', 'shogatsu', 'japan'],
        width: 120,
        height: 130,
        colors: { mochi: '#fbfaf5' },
        draw: (k) =>
            k.path(pts('20 96 100 96 108 126 12 126'), '#e8d6a8') +
            k.ellipse(60, 82, 46, 20, k.c('mochi')) +
            k.ellipse(60, 56, 34, 16, k.c('mochi')) +
            k.circle(60, 32, 14, '#f2992b') +
            k.path('M56 18 q4 -10 10 -6', '#5aa05a', { lw: 0.6 }),
    },
    {
        id: 'yatai',
        label: 'Festival stall',
        category: 'seasons',
        tags: ['yatai', 'festival', 'matsuri', 'stall', 'summer', 'food stand'],
        width: 240,
        height: 220,
        colors: { cloth: '#e04848' },
        draw: (k) => {
            let stripes = '';
            for (let i = 0; i < 9; i++)
                stripes += k.path(
                    `M${10 + i * 25} 40 L${35 + i * 25} 40 L${35 + i * 25} 66 L${10 + i * 25} 66 Z`,
                    i % 2 ? '#ffffff' : k.c('cloth'),
                    { lw: 0.5 },
                );
            return (
                k.limbs(
                    [
                        { d: 'M16 30 L16 214', width: 6 },
                        { d: 'M224 30 L224 214', width: 6 },
                    ],
                    '#a8744a',
                ) +
                k.path(pts('4 40 120 14 236 40'), k.c('cloth')) +
                stripes +
                k.rect(30, 72, 180, 40, '#fff3d6', { lw: 0.6 }) +
                k.line('M50 92 h140', { lw: 1.2 }) +
                [56, 96, 136, 176]
                    .map((x) => k.circle(x, 130, 14, '#e04848', { lw: 0.6 }))
                    .join('') +
                k.rect(16, 146, 208, 68, '#c9a66a')
            );
        },
    },
    {
        id: 'goldfish-bag',
        label: 'Goldfish bag',
        category: 'seasons',
        tags: ['kingyo sukui', 'goldfish', 'festival', 'summer', 'matsuri'],
        width: 100,
        height: 150,
        colors: { water: '#cfe8f7' },
        draw: (k) =>
            k.line('M50 4 V30', { lw: 0.6 }) +
            k.path(
                'M38 30 L62 30 Q96 70 92 110 Q88 144 50 144 Q12 144 8 110 Q4 70 38 30 Z',
                k.c('water'),
                { opacity: 0.9 },
            ) +
            k.rect(36, 26, 28, 8, '#e04848', { rx: 3 }) +
            k.path('M38 96 Q50 82 64 96 Q50 108 38 96 Z', '#f2662b', { lw: 0.5 }) +
            k.path(pts('64 96 74 88 74 104'), '#f2662b', { lw: 0.5 }) +
            k.line('M22 70 Q18 90 20 110', { lw: 0.9, color: '#ffffff' }),
    },
    {
        id: 'autumn-leaves',
        label: 'Autumn leaves',
        category: 'seasons',
        tags: ['momiji', 'maple', 'autumn', 'fall', 'leaves'],
        width: 200,
        height: 160,
        colors: { leaf: '#e0552b' },
        noShadow: true,
        draw: (k) => {
            const COLS = [k.c('leaf'), '#f2a12b', '#c7364a'];
            let out = '';
            for (let i = 0; i < 7; i++) {
                const x = 24 + k.rand() * 152;
                const y = 24 + k.rand() * 112;
                const r = 14 + k.rand() * 12;
                out += k.path(maple(x, y, r), COLS[i % COLS.length], {
                    lw: 0.6,
                    transform: `rotate(${Math.round(k.rand() * 80 - 40)} ${n(x)} ${n(y)})`,
                });
            }
            return out;
        },
    },
    {
        id: 'beach-umbrella',
        label: 'Beach umbrella',
        category: 'seasons',
        tags: ['beach', 'parasol', 'summer', 'vacation', 'sea'],
        width: 220,
        height: 200,
        colors: { canvas: '#e04848' },
        draw: (k) => {
            let panels = '';
            for (let i = 0; i < 6; i++)
                panels += k.path(
                    `M110 20 L${10 + i * 33.3} 84 Q${27 + i * 33.3} 76 ${43 + i * 33.3} 84 Z`,
                    i % 2 ? '#ffffff' : k.c('canvas'),
                    { lw: 0.6 },
                );
            return (
                k.limb('M110 30 L132 196', 5, '#d9d2c3') +
                k.path('M110 20 Q24 30 10 84 L210 84 Q196 30 110 20 Z', k.c('canvas'), {
                    bare: true,
                }) +
                panels
            );
        },
    },
    {
        id: 'watermelon',
        label: 'Watermelon slice',
        category: 'seasons',
        tags: ['suika', 'watermelon', 'summer', 'fruit', 'beach'],
        width: 160,
        height: 90,
        colors: { flesh: '#f25a5a' },
        draw: (k) =>
            k.path('M6 10 L154 10 Q150 86 80 86 Q10 86 6 10 Z', '#3f8f45') +
            k.path('M14 10 L146 10 Q142 76 80 76 Q18 76 14 10 Z', '#eef6d8', { bare: true }) +
            k.path('M18 10 L142 10 Q138 70 80 70 Q22 70 18 10 Z', k.c('flesh'), { bare: true }) +
            [40, 64, 96, 120, 80, 56, 104]
                .map((x, i) => k.ellipse(x, i < 4 ? 26 : 46, 3, 5, '#2f2f33', { bare: true }))
                .join('') +
            k.path('M6 10 L154 10 Q150 86 80 86 Q10 86 6 10 Z', 'none'),
    },
    {
        id: 'teru-teru-bozu',
        label: 'Teru teru bozu',
        category: 'seasons',
        tags: ['rain charm', 'doll', 'rainy season', 'tsuyu', 'japan'],
        width: 90,
        height: 150,
        colors: { cloth: '#ffffff' },
        noShadow: true,
        draw: (k) =>
            k.line('M45 2 V20', { lw: 0.6 }) +
            k.path(
                'M24 50 L66 50 Q86 110 80 140 Q62 128 45 142 Q28 128 10 140 Q4 110 24 50 Z',
                k.c('cloth'),
            ) +
            k.circle(45, 38, 22, k.c('cloth')) +
            k.stroke('M26 56 Q45 62 64 56', 3, '#e04848') +
            k.circle(37, 36, 2.5, EYE, { bare: true }) +
            k.circle(53, 36, 2.5, EYE, { bare: true }) +
            k.line('M39 44 q6 5 12 0', { lw: 0.5 }),
    },
    {
        id: 'valentine-chocolate',
        label: 'Valentine chocolate',
        category: 'seasons',
        tags: ['valentine', 'chocolate', 'love', 'gift', 'confession', 'white day'],
        width: 140,
        height: 120,
        colors: { box: '#e04878' },
        draw: (k) =>
            k.path(
                'M70 112 C30 86 8 64 8 40 C8 20 22 8 40 8 C54 8 64 16 70 28 C76 16 86 8 100 8 C118 8 132 20 132 40 C132 64 110 86 70 112 Z',
                k.c('box'),
            ) +
            k.path(
                'M70 98 C38 78 22 60 22 42 C22 28 32 20 44 20 C56 20 64 28 70 38 C76 28 84 20 96 20 C108 20 118 28 118 42 C118 60 102 78 70 98 Z',
                '#6b4226',
                { lw: 0.6 },
            ) +
            k.stroke('M40 50 q10 -8 20 0 q10 8 20 0 q10 -8 20 0', 2.5, '#f7c6d6'),
    },
];
