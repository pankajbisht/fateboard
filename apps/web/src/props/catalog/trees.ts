import type { Ink } from '../render/ink';
import { n } from '../render/ink';
import { blob, mound, poly } from '../render/shapes';
import type { PropDef } from '../types';

/** Leaf ticks: small ink hooks inside a crown, the manga shorthand for foliage. */
function ticks(k: Ink, cx: number, cy: number, rx: number, ry: number, count: number) {
    let out = '';
    for (let i = 0; i < count; i++) {
        const a = k.rand() * Math.PI * 2;
        const r = Math.sqrt(k.rand()) * 0.62;
        const x = cx + Math.cos(a) * rx * r;
        const y = cy + Math.sin(a) * ry * r;
        out += k.line(`M${n(x)} ${n(y)} q5 -6 11 -1`, { lw: 0.45 });
    }
    return out;
}

/** Branches from (x, y) going up: a seeded binary tree of limbs. */
function branches(k: Ink, x: number, y: number, len: number, width: number) {
    const list: { d: string; width: number }[] = [];
    const grow = (x0: number, y0: number, a: number, l: number, w: number, depth: number) => {
        const x1 = x0 + Math.cos(a) * l;
        const y1 = y0 + Math.sin(a) * l;
        const bend = (k.rand() - 0.5) * l * 0.25;
        const mx = (x0 + x1) / 2 + bend;
        const my = (y0 + y1) / 2;
        list.push({ d: `M${n(x0)} ${n(y0)} Q${n(mx)} ${n(my)} ${n(x1)} ${n(y1)}`, width: w });
        if (depth === 0) return;
        const kids = depth > 1 && k.rand() > 0.5 ? 3 : 2;
        for (let i = 0; i < kids; i++) {
            const spread = (i / (kids - 1) - 0.5) * 2 * (0.3 + k.rand() * 0.25);
            const next = Math.min(-0.2, Math.max(-Math.PI + 0.2, a + spread));
            grow(x1, y1, next, l * (0.62 + k.rand() * 0.12), w * 0.6, depth - 1);
        }
    };
    grow(x, y, -Math.PI / 2, len, width, 3);
    return list;
}

/** The round tree's crown per variant: one round crown, a tall one, or two side by side. */
function crown(k: Ink) {
    const one = (cx: number, cy: number, rx: number, ry: number, bumps: number) =>
        k.path(blob(cx, cy, rx, ry, bumps, k.rand, 1.1), k.c('leaf')) +
        k.path(
            blob(cx + rx * 0.18, cy + ry * 0.26, rx * 0.58, ry * 0.48, 8, k.rand, 0.8),
            k.shade('leaf', 0.16),
            {
                bare: true,
            },
        ) +
        k.path(
            blob(cx - rx * 0.27, cy - ry * 0.36, rx * 0.3, ry * 0.24, 6, k.rand, 0.8),
            k.light('leaf', 0.3),
            {
                bare: true,
            },
        ) +
        ticks(k, cx, cy, rx, ry, Math.round(bumps * 0.75));
    if (k.variant === 1) return one(110, 100, 66, 92, 11);
    if (k.variant === 2) return one(76, 116, 64, 64, 9) + one(146, 92, 62, 72, 10);
    return one(110, 104, 96, 84, 12);
}

export const TREE_PROPS: PropDef[] = [
    {
        id: 'tree-round',
        label: 'Round tree',
        category: 'nature',
        tags: ['tree', 'oak', 'park'],
        width: 220,
        height: 280,
        colors: { leaf: '#7cc36b', trunk: '#9a6a42' },
        variants: ['Round', 'Tall', 'Twin'],
        draw: (k) =>
            k.path(
                poly([
                    [96, 278],
                    [100, 190],
                    [82, 160],
                    [90, 155],
                    [104, 175],
                    [116, 148],
                    [124, 153],
                    [114, 190],
                    [120, 278],
                ]),
                k.c('trunk'),
            ) +
            k.line('M108 272 L108 226 M102 246 L102 214', { lw: 0.45 }) +
            crown(k),
    },
    {
        id: 'tree-pine',
        label: 'Pine tree',
        category: 'nature',
        tags: ['tree', 'fir', 'conifer', 'forest', 'evergreen'],
        width: 180,
        height: 300,
        colors: { needle: '#3f8f5a', trunk: '#8a5a3a' },
        variants: ['Full', 'Slim'],
        draw: (k) => {
            const slim = k.variant === 1 ? 0.62 : 1;
            const tier = (top: number, bottom: number, full: number) => {
                const hw = full * slim;
                const teeth = 5;
                const pts: [number, number][] = [
                    [90, top],
                    [90 + hw, bottom],
                ];
                for (let i = 1; i < teeth * 2; i++) {
                    const x = 90 + hw - (i * 2 * hw) / (teeth * 2);
                    pts.push([x, i % 2 ? bottom - 12 : bottom]);
                }
                pts.push([90 - hw, bottom]);
                const shade = poly([
                    [90, top],
                    [90 + hw - 6, bottom - 4],
                    [98, bottom - 10],
                ]);
                return (
                    k.path(poly(pts), k.c('needle'), { bare: true }) +
                    k.path(shade, k.shade('needle', 0.2), { bare: true }) +
                    k.path(poly(pts), 'none')
                );
            };
            return (
                k.rect(80, 236, 20, 62, k.c('trunk')) +
                tier(118, 250, 84) +
                tier(66, 186, 66) +
                tier(10, 128, 46)
            );
        },
    },
    {
        id: 'tree-sakura',
        label: 'Sakura tree',
        category: 'nature',
        tags: ['tree', 'cherry blossom', 'spring', 'pink', 'japan'],
        width: 240,
        height: 280,
        colors: { blossom: '#f6c1d1', trunk: '#5e3b32' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) => {
            let petals = '';
            for (let i = 0; i < 16; i++) {
                const fall = i >= 11;
                const x = fall ? 30 + k.rand() * 180 : 30 + k.rand() * 180;
                const y = fall ? 196 + k.rand() * 70 : 40 + k.rand() * 110;
                const a = Math.round(k.rand() * 180);
                petals += k.ellipse(
                    x,
                    y,
                    4.5,
                    2.6,
                    fall ? k.c('blossom') : k.light('blossom', 0.5),
                    {
                        lw: 0.35,
                        transform: `rotate(${a} ${n(x)} ${n(y)})`,
                    },
                );
            }
            return (
                k.path(
                    poly([
                        [108, 278],
                        [112, 200],
                        [90, 162],
                        [70, 152],
                        [74, 145],
                        [96, 154],
                        [110, 172],
                        [116, 140],
                        [124, 140],
                        [122, 176],
                        [146, 152],
                        [166, 148],
                        [166, 155],
                        [148, 162],
                        [126, 200],
                        [132, 278],
                    ]),
                    k.c('trunk'),
                ) +
                k.path(blob(120, 98, 108, 80, 13, k.rand, 1.15), k.c('blossom')) +
                k.path(blob(140, 120, 62, 38, 8, k.rand, 0.8), k.shade('blossom', 0.12), {
                    bare: true,
                }) +
                petals
            );
        },
    },
    {
        id: 'tree-dead',
        label: 'Dead tree',
        category: 'nature',
        tags: ['tree', 'bare', 'winter', 'spooky', 'branches'],
        width: 220,
        height: 280,
        colors: { bark: '#7a6656' },
        draw: (k) => k.limbs(branches(k, 110, 276, 88, 18), k.c('bark')),
    },
    {
        id: 'bush',
        label: 'Bush',
        category: 'nature',
        tags: ['shrub', 'hedge', 'garden'],
        width: 200,
        height: 120,
        colors: { leaf: '#5fae5a' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) =>
            k.path(mound(100, 116, 94, 92, 9, k.rand, 1.1), k.c('leaf')) +
            k.path(mound(116, 114, 66, 50, 6, k.rand, 0.8), k.shade('leaf', 0.16), { bare: true }) +
            ticks(k, 96, 76, 70, 30, 6),
    },
    {
        id: 'flower-bush',
        label: 'Hydrangea bush',
        category: 'nature',
        tags: ['flowers', 'bush', 'garden', 'blue'],
        width: 210,
        height: 130,
        colors: { leaf: '#4f9c55', flower: '#8fa8e8' },
        draw: (k) => {
            const centres: [number, number][] = [
                [55, 72],
                [102, 54],
                [150, 68],
                [80, 98],
                [132, 100],
            ];
            const clusters = centres
                .map(([x, y]) => {
                    let dots = '';
                    for (let i = 0; i < 5; i++)
                        dots += k.circle(
                            x + (k.rand() - 0.5) * 24,
                            y + (k.rand() - 0.5) * 18,
                            2.2,
                            k.shade('flower', 0.25),
                            { bare: true },
                        );
                    return k.path(blob(x, y, 22, 17, 7, k.rand, 1.3), k.c('flower')) + dots;
                })
                .join('');
            return k.path(mound(105, 126, 100, 86, 9, k.rand, 1), k.c('leaf')) + clusters;
        },
    },
];
