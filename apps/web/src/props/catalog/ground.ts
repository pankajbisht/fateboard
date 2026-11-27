import type { Ink } from '../render/ink';
import { n } from '../render/ink';
import { blade, poly, star } from '../render/shapes';
import type { PropDef } from '../types';

/** A fan of grass blades from a base line; back blades darker. */
function grass(
    k: Ink,
    x0: number,
    x1: number,
    base: number,
    count: number,
    h0: number,
    h1: number,
) {
    let back = '';
    let front = '';
    for (let i = 0; i < count; i++) {
        const x = x0 + ((x1 - x0) * (i + k.rand() * 0.6)) / count;
        const h = h0 + k.rand() * (h1 - h0);
        const lean = (k.rand() - 0.5) * h * 0.5;
        const d = blade(x, base, x + lean, base - h, 4 + k.rand() * 2);
        if (i % 2) back += k.path(d, k.shade('blade', 0.18), { lw: 0.6 });
        else front += k.path(d, k.c('blade'), { lw: 0.6 });
    }
    return back + front;
}

/** An outlined faceted rock: fill, shadow facet, highlight, then the outline on top. */
function rock(k: Ink, x: number, y: number, w: number, h: number) {
    const j = () => (k.rand() - 0.5) * w * 0.08;
    const pts: [number, number][] = [
        [x, y],
        [x + w * 0.08 + j(), y - h * 0.55],
        [x + w * 0.32 + j(), y - h * 0.92],
        [x + w * 0.62 + j(), y - h],
        [x + w * 0.88 + j(), y - h * 0.68],
        [x + w, y],
    ];
    const shade = poly([pts[3], pts[4], pts[5], [x + w * 0.62, y], [x + w * 0.68, y - h * 0.5]]);
    const crack = `M${n(x + w * 0.4)} ${n(y - h * 0.8)} L${n(x + w * 0.46)} ${n(y - h * 0.55)} L${n(x + w * 0.4)} ${n(y - h * 0.35)}`;
    return (
        k.path(poly(pts), k.c('stone'), { bare: true }) +
        k.path(shade, k.shade('stone', 0.2), { bare: true }) +
        k.path(poly([pts[1], pts[2], [x + w * 0.3, y - h * 0.6]]), k.light('stone', 0.3), {
            bare: true,
        }) +
        k.line(crack, { lw: 0.45 }) +
        k.path(poly(pts), 'none')
    );
}

/** A daisy-like flower head: petals turned round a centre. */
function flowerHead(k: Ink, x: number, y: number, r: number, petals: number) {
    let out = '';
    for (let i = 0; i < petals; i++) {
        const a = (360 / petals) * i;
        out += k.ellipse(x + r, y, r * 0.95, r * 0.38, k.c('petal'), {
            lw: 0.4,
            transform: `rotate(${n(a)} ${n(x)} ${n(y)})`,
        });
    }
    return out + k.circle(x, y, r * 0.55, k.c('center'), { lw: 0.5 });
}

export const GROUND_PROPS: PropDef[] = [
    {
        id: 'grass-tuft',
        label: 'Grass tuft',
        category: 'nature',
        tags: ['grass', 'weeds', 'field'],
        width: 120,
        height: 80,
        colors: { blade: '#6dbb4f' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) => grass(k, 30, 90, 78, 10, 34, 70),
    },
    {
        id: 'tall-grass',
        label: 'Tall grass',
        category: 'nature',
        tags: ['grass', 'field', 'meadow', 'reeds'],
        width: 220,
        height: 150,
        colors: { blade: '#7cc35a' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) => grass(k, 8, 212, 148, 26, 60, 138),
    },
    {
        id: 'flower-tulip',
        label: 'Tulip',
        category: 'nature',
        tags: ['flower', 'garden', 'spring'],
        width: 70,
        height: 150,
        colors: { petal: '#e8505b', stem: '#4f9c55' },
        draw: (k) =>
            k.limb('M35 148 Q32 110 35 72', 5, k.c('stem')) +
            k.path('M35 142 Q8 122 14 88 Q30 106 35 128 Z', k.c('stem')) +
            k.path('M35 136 Q62 120 58 92 Q42 106 36 122 Z', k.shade('stem', 0.15)) +
            k.path('M18 44 Q15 76 35 80 Q55 76 52 44 L44 58 L35 38 L26 58 Z', k.c('petal')) +
            k.line('M27 62 Q28 72 34 76', { lw: 0.45 }),
    },
    {
        id: 'flower-daisies',
        label: 'Daisies',
        category: 'nature',
        tags: ['flowers', 'patch', 'meadow', 'white'],
        width: 180,
        height: 100,
        colors: { petal: '#ffffff', center: '#f2c230', stem: '#5aa05a' },
        draw: (k) => {
            const heads: [number, number, number][] = [
                [30, 46, 11],
                [70, 30, 13],
                [110, 50, 10],
                [146, 34, 12],
                [92, 70, 9],
            ];
            const stems = heads.map(([x, y]) => ({
                d: `M${x} ${y} Q${x + 4} ${(y + 98) / 2} ${x} 98`,
                width: 3,
            }));
            return (
                k.limbs(stems, k.c('stem')) +
                heads.map(([x, y, r]) => flowerHead(k, x, y, r, 10)).join('')
            );
        },
    },
    {
        id: 'sunflower',
        label: 'Sunflower',
        category: 'nature',
        tags: ['flower', 'summer', 'yellow'],
        width: 100,
        height: 230,
        colors: { petal: '#f7c531', center: '#6b4426', stem: '#4f9c55' },
        draw: (k) => {
            let petals = '';
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2;
                petals += k.path(
                    blade(
                        50 + Math.cos(a) * 16,
                        52 + Math.sin(a) * 16,
                        50 + Math.cos(a) * 44,
                        52 + Math.sin(a) * 44,
                        7,
                    ),
                    k.c('petal'),
                    { lw: 0.6 },
                );
            }
            let seeds = '';
            for (let i = 0; i < 10; i++) {
                const a = k.rand() * Math.PI * 2;
                const r = Math.sqrt(k.rand()) * 14;
                seeds += k.circle(
                    50 + Math.cos(a) * r,
                    52 + Math.sin(a) * r,
                    1.6,
                    k.shade('center', 0.4),
                    {
                        bare: true,
                    },
                );
            }
            return (
                k.limb('M50 228 Q45 150 50 80', 7, k.c('stem')) +
                k.path('M48 170 Q14 160 8 130 Q34 136 48 158 Z', k.c('stem')) +
                k.path('M52 140 Q86 132 92 104 Q66 108 52 128 Z', k.c('stem')) +
                petals +
                k.circle(50, 52, 20, k.c('center')) +
                seeds
            );
        },
    },
    {
        id: 'rock',
        label: 'Rock',
        category: 'nature',
        tags: ['stone', 'boulder'],
        width: 170,
        height: 100,
        colors: { stone: '#a3a7ad' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) => rock(k, 6, 96, 158, 82),
    },
    {
        id: 'rock-pile',
        label: 'Rock pile',
        category: 'nature',
        tags: ['stones', 'rocks', 'pebbles'],
        width: 220,
        height: 110,
        colors: { stone: '#9a9fa6' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) =>
            rock(k, 100, 106, 110, 70) + rock(k, 8, 106, 120, 96) + rock(k, 86, 106, 54, 36),
    },
    {
        id: 'mountain',
        label: 'Mountain',
        category: 'nature',
        tags: ['peak', 'snow', 'landscape', 'background'],
        width: 300,
        height: 200,
        colors: { rock: '#8a9bb0', snow: '#ffffff' },
        draw: (k) => {
            const outline = poly([
                [0, 198],
                [70, 110],
                [95, 118],
                [150, 14],
                [200, 92],
                [222, 86],
                [300, 198],
            ]);
            const shade = poly([
                [150, 14],
                [200, 92],
                [222, 86],
                [300, 198],
                [162, 198],
                [172, 120],
            ]);
            const snow = poly([
                [150, 14],
                [128, 56],
                [138, 52],
                [146, 62],
                [156, 50],
                [166, 60],
                [177, 56],
            ]);
            return (
                k.path(outline, k.c('rock'), { bare: true }) +
                k.path(shade, k.shade('rock', 0.2), { bare: true }) +
                k.path(snow, k.c('snow'), { lw: 0.6 }) +
                k.line('M120 120 L132 150 M210 130 L226 160 M60 150 L74 176', { lw: 0.45 }) +
                k.path(outline, 'none')
            );
        },
    },
    {
        id: 'mountain-range',
        label: 'Mountain range',
        category: 'nature',
        tags: ['mountains', 'peaks', 'landscape', 'background', 'horizon'],
        width: 420,
        height: 200,
        colors: { rock: '#7f93ad', far: '#b9c6d8', snow: '#ffffff' },
        draw: (k) => {
            const far = poly([
                [0, 198],
                [0, 120],
                [60, 60],
                [110, 100],
                [200, 30],
                [290, 96],
                [350, 52],
                [420, 110],
                [420, 198],
            ]);
            const near = poly([
                [0, 198],
                [90, 96],
                [130, 128],
                [220, 58],
                [300, 140],
                [340, 116],
                [420, 198],
            ]);
            const cap = (x: number, y: number, w: number) =>
                k.path(
                    poly([
                        [x, y],
                        [x - w, y + w * 0.9],
                        [x - w * 0.3, y + w * 0.6],
                        [x, y + w],
                        [x + w * 0.4, y + w * 0.6],
                        [x + w, y + w * 0.85],
                    ]),
                    k.c('snow'),
                    { lw: 0.6 },
                );
            return (
                k.path(far, k.c('far'), { lw: 0.6 }) +
                k.path(near, k.c('rock'), { bare: true }) +
                k.path(
                    poly([
                        [220, 58],
                        [300, 140],
                        [340, 116],
                        [420, 198],
                        [236, 198],
                    ]),
                    k.shade('rock', 0.18),
                    {
                        bare: true,
                    },
                ) +
                cap(220, 58, 22) +
                cap(90, 96, 14) +
                k.path(near, 'none')
            );
        },
    },
    {
        id: 'river',
        label: 'River',
        category: 'nature',
        tags: ['water', 'stream', 'landscape'],
        width: 300,
        height: 170,
        colors: { water: '#6fb6e6' },
        noShadow: true,
        draw: (k) =>
            k.path(
                'M196 4 C186 40 118 60 128 98 C136 128 64 142 40 166 L262 166 C254 140 204 124 202 98 C198 66 232 40 214 4 Z',
                k.c('water'),
            ) +
            k.path(
                'M200 12 C192 44 140 64 148 98 C152 120 112 140 98 156 L114 156 C130 138 166 120 162 98 C156 66 206 44 206 12 Z',
                k.light('water', 0.25),
                {
                    bare: true,
                },
            ) +
            k.line(
                'M170 140 q14 -4 28 0 M150 112 q10 -3 20 0 M178 72 q8 -3 16 0 M120 156 q18 -5 36 0',
                {
                    lw: 0.5,
                    color: '#ffffff',
                },
            ) +
            k.line(
                'M30 166 l-8 -10 M36 166 l2 -12 M266 166 l6 -11 M272 166 l12 -8 M120 100 l-6 -8 M212 96 l6 -8',
                { lw: 0.5 },
            ),
    },
    {
        id: 'pond',
        label: 'Pond',
        category: 'nature',
        tags: ['water', 'lake', 'lily pad', 'garden'],
        width: 240,
        height: 120,
        colors: { water: '#6fb6e6', pad: '#5aa05a' },
        noShadow: true,
        draw: (k) => {
            const pad = (x: number, y: number, r: number) =>
                k.path(
                    `M${x} ${y} L${n(x + r)} ${n(y - r * 0.18)} A${r} ${n(r * 0.55)} 0 1 1 ${n(x + r)} ${n(y + r * 0.18)} Z`,
                    k.c('pad'),
                    { lw: 0.7 },
                );
            return (
                k.ellipse(120, 62, 114, 54, k.c('water')) +
                k.line('M40 64 a80 34 0 0 0 160 0 M70 62 a50 20 0 0 0 100 0', {
                    lw: 0.4,
                    color: '#ffffff',
                }) +
                pad(70, 52, 18) +
                pad(160, 74, 15) +
                pad(128, 40, 11) +
                k.path(star(72, 50, 8, 3.5, 6), '#f7b3c7', { lw: 0.5 })
            );
        },
    },
    {
        id: 'log',
        label: 'Log',
        category: 'nature',
        tags: ['wood', 'stump', 'forest', 'timber'],
        width: 170,
        height: 90,
        colors: { wood: '#a8784e', cut: '#e2c08d' },
        draw: (k) =>
            k.path('M30 24 L142 24 A14 28 0 0 1 142 80 L30 80 Z', k.c('wood')) +
            k.line('M60 36 L120 36 M50 54 L132 54 M66 68 L112 68', { lw: 0.45 }) +
            k.ellipse(30, 52, 14, 28, k.c('cut')) +
            k.ellipse(30, 52, 8, 17, 'none', { lw: 0.45 }) +
            k.ellipse(30, 52, 3, 7, 'none', { lw: 0.45 }),
    },
];
