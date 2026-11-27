import type { Ink } from '../render/ink';
import { n } from '../render/ink';
import { blob, pts } from '../render/shapes';
import type { PropDef } from '../types';

/** A five-petal sakura blossom (notched petals turned round the centre). */
export function blossom(k: Ink, x: number, y: number, r: number, color: string, turn = 0) {
    let out = '';
    for (let i = 0; i < 5; i++)
        out += k.path(
            `M${n(x)} ${n(y)} Q${n(x - r * 0.6)} ${n(y - r * 0.7)} ${n(x - r * 0.2)} ${n(y - r)} L${n(x)} ${n(y - r * 0.8)} L${n(x + r * 0.2)} ${n(y - r)} Q${n(x + r * 0.6)} ${n(y - r * 0.7)} ${n(x)} ${n(y)} Z`,
            color,
            { lw: 0.5, transform: `rotate(${n(turn + i * 72)} ${n(x)} ${n(y)})` },
        );
    return out + k.circle(x, y, r * 0.16, '#f2c230', { bare: true });
}

/** Shrines, festivals and lucky charms (home things: japanHome.ts). */
export const JAPAN_PROPS: PropDef[] = [
    {
        id: 'torii',
        label: 'Torii gate',
        category: 'japan',
        tags: ['shrine gate', 'gate', 'shinto', 'japan', 'red'],
        width: 260,
        height: 220,
        colors: { red: '#d8433c' },
        draw: (k) =>
            k.path(pts('52 44 72 44 76 216 48 216'), k.c('red')) +
            k.path(pts('188 44 208 44 212 216 184 216'), k.c('red')) +
            k.rect(30, 66, 200, 14, k.c('red')) +
            k.rect(118, 36, 24, 30, k.c('red')) +
            k.rect(122, 40, 16, 20, '#2f2f33', { lw: 0.5 }) +
            k.path('M6 18 Q130 30 254 18 L248 36 Q130 46 12 36 Z', '#2f2f33') +
            k.rect(44, 206, 36, 10, '#2f2f33') +
            k.rect(180, 206, 36, 10, '#2f2f33'),
    },
    {
        id: 'paper-lantern',
        label: 'Paper lantern',
        category: 'japan',
        tags: ['chochin', 'lantern', 'festival', 'matsuri', 'izakaya', 'red'],
        width: 100,
        height: 160,
        colors: { paper: '#e04848' },
        noShadow: true,
        draw: (k) => {
            let ribs = '';
            for (let y = 40; y < 124; y += 12)
                ribs += `M${n(50 - Math.sqrt(Math.max(0, 1 - ((y - 82) / 54) ** 2)) * 42)} ${y} H${n(50 + Math.sqrt(Math.max(0, 1 - ((y - 82) / 54) ** 2)) * 42)} `;
            return (
                k.line('M50 2 V20', { lw: 0.8 }) +
                k.ellipse(50, 82, 44, 56, k.c('paper')) +
                k.line(ribs, { lw: 0.4 }) +
                k.rect(28, 18, 44, 14, '#2f2f33', { rx: 2 }) +
                k.rect(28, 132, 44, 14, '#2f2f33', { rx: 2 }) +
                k.line('M50 146 V158', { lw: 0.8 })
            );
        },
    },
    {
        id: 'stone-lantern',
        label: 'Stone lantern',
        category: 'japan',
        tags: ['toro', 'lantern', 'garden', 'shrine', 'temple'],
        width: 110,
        height: 220,
        colors: { stone: '#a8a39a' },
        draw: (k) =>
            k.path(pts('22 200 88 200 94 216 16 216'), k.c('stone')) +
            k.rect(42, 118, 26, 82, k.c('stone')) +
            k.path(pts('20 106 90 106 82 120 28 120'), k.shade('stone', 0.1)) +
            k.rect(30, 70, 50, 36, k.c('stone')) +
            k.rect(44, 78, 22, 20, '#fff2a8', { lw: 0.6 }) +
            k.path('M4 72 Q55 40 106 72 Z', k.shade('stone', 0.15)) +
            k.circle(55, 42, 8, k.c('stone')),
    },
    {
        id: 'wind-chime',
        label: 'Wind chime',
        category: 'japan',
        tags: ['furin', 'chime', 'summer', 'bell', 'glass'],
        width: 80,
        height: 170,
        colors: { glass: '#cfe8f7' },
        noShadow: true,
        draw: (k) =>
            k.line('M40 2 V16 M40 50 V100', { lw: 0.6 }) +
            k.path('M10 52 Q10 16 40 16 Q70 16 70 52 Z', k.c('glass')) +
            k.path('M22 40 q6 -6 12 0 q6 6 12 0', '#e04848', { lw: 0.4 }) +
            k.circle(40, 60, 4, '#c9a24a', { lw: 0.4 }) +
            k.path(pts('28 100 52 100 54 166 26 166'), '#ffffff', { lw: 0.6 }) +
            k.line('M32 114 h16 M32 124 h12', { lw: 0.4 }),
    },
    {
        id: 'koinobori',
        label: 'Carp streamers',
        category: 'japan',
        tags: ['koinobori', 'carp', 'fish', "children's day", 'festival', 'may'],
        width: 260,
        height: 220,
        colors: { carp: '#e04848', second: '#4a7bd0' },
        draw: (k) => {
            const fish = (y: number, len: number, color: string) => {
                let scales = '';
                for (let x = 50; x < len - 20; x += 22) scales += `M${x} ${y - 10} q8 10 0 20 `;
                return (
                    k.path(
                        `M28 ${y - 22} Q${len * 0.6} ${y - 28} ${len} ${y - 14} L${len - 20} ${y} L${len} ${y + 14} Q${len * 0.6} ${y + 26} 28 ${y + 22} Z`,
                        color,
                    ) +
                    k.line(scales, { lw: 0.5, color: '#ffffff' }) +
                    k.circle(42, y - 4, 7, '#ffffff', { lw: 0.5 }) +
                    k.circle(42, y - 4, 3, '#141414', { bare: true })
                );
            };
            return (
                k.limb('M20 6 L20 216', 6, '#9b8a5a') +
                k.circle(20, 8, 7, '#e2c06a') +
                fish(56, 240, k.c('carp')) +
                fish(128, 200, k.c('second'))
            );
        },
    },
    {
        id: 'daruma',
        label: 'Daruma',
        category: 'japan',
        tags: ['daruma', 'lucky', 'wish', 'goal', 'charm', 'red'],
        width: 120,
        height: 130,
        colors: { body: '#d8433c' },
        draw: (k) =>
            k.path(
                'M60 6 C96 6 114 40 114 76 C114 108 92 124 60 124 C28 124 6 108 6 76 C6 40 24 6 60 6 Z',
                k.c('body'),
            ) +
            k.ellipse(60, 54, 32, 28, '#fbf3e4') +
            k.circle(46, 50, 9, '#ffffff', { lw: 0.6 }) +
            k.circle(46, 50, 4, '#141414', { bare: true }) +
            k.circle(74, 50, 9, '#ffffff', { lw: 0.6 }) +
            k.line('M42 68 q8 -6 18 0 q10 -6 18 0', { lw: 0.8 }) +
            k.line('M40 94 q20 12 40 0', { lw: 0.8, color: '#e2c06a' }),
    },
    {
        id: 'maneki-neko',
        label: 'Lucky cat',
        category: 'japan',
        tags: ['maneki neko', 'beckoning cat', 'lucky', 'shop', 'charm'],
        width: 140,
        height: 180,
        colors: { fur: '#fbfaf5', collar: '#d8433c' },
        draw: (k) =>
            k.path('M22 176 Q12 110 40 92 L100 92 Q128 110 118 176 Z', k.c('fur')) +
            k.path('M100 98 Q118 70 112 40 Q124 34 128 46 Q132 84 108 112 Z', k.c('fur')) +
            k.path(pts('28 38 36 6 56 30'), k.c('fur')) +
            k.path(pts('84 30 104 6 112 38'), k.c('fur')) +
            k.path(pts('34 30 38 14 50 28'), '#f7b3c7', { bare: true }) +
            k.ellipse(70, 56, 46, 38, k.c('fur')) +
            k.line(
                'M50 54 q6 -6 12 0 M78 54 q6 -6 12 0 M64 70 q6 4 12 0 M30 64 h-14 M30 70 h-14 M110 64 h14 M110 70 h14',
                { lw: 0.6 },
            ) +
            k.stroke('M34 94 Q70 106 106 94', 7, k.c('collar')) +
            k.circle(70, 108, 8, '#e2c06a', { lw: 0.6 }) +
            k.ellipse(70, 146, 22, 16, '#e2c06a', { lw: 0.7 }),
    },
    {
        id: 'fireworks',
        label: 'Fireworks',
        category: 'japan',
        tags: ['hanabi', 'fireworks', 'festival', 'summer', 'night', 'celebration'],
        width: 240,
        height: 240,
        colors: { spark: '#ffb347', second: '#7fc8ff' },
        noShadow: true,
        draw: (k) => {
            const burst = (cx: number, cy: number, r: number, color: string, rays: number) => {
                let d = '';
                let dots = '';
                for (let i = 0; i < rays; i++) {
                    const a = (i / rays) * Math.PI * 2;
                    d += `M${n(cx + Math.cos(a) * r * 0.25)} ${n(cy + Math.sin(a) * r * 0.25)} L${n(cx + Math.cos(a) * r * 0.85)} ${n(cy + Math.sin(a) * r * 0.85)} `;
                    dots += k.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, color, {
                        bare: true,
                    });
                }
                return k.stroke(d, 2.4, color) + dots;
            };
            return (
                burst(100, 100, 92, k.c('spark'), 24) +
                burst(186, 60, 44, k.c('second'), 16) +
                burst(180, 180, 36, '#ff7eb6', 14)
            );
        },
    },
    {
        id: 'sakura-petals',
        label: 'Sakura petals',
        category: 'japan',
        tags: ['cherry blossom', 'petals', 'spring', 'falling', 'romance', 'sakura'],
        width: 200,
        height: 160,
        colors: { petal: '#f7c6d6' },
        noShadow: true,
        draw: (k) => {
            let out =
                blossom(k, 50, 50, 20, k.c('petal'), 10) +
                blossom(k, 146, 104, 16, k.c('petal'), -14);
            for (let i = 0; i < 9; i++) {
                const x = 12 + k.rand() * 176;
                const y = 12 + k.rand() * 136;
                out += k.ellipse(x, y, 6, 3.5, k.light('petal', 0.3), {
                    lw: 0.4,
                    transform: `rotate(${Math.round(k.rand() * 180)} ${n(x)} ${n(y)})`,
                });
            }
            return out;
        },
    },
];

/** Bamboo for japanHome: a few stalks with nodes and leaves. */
export function bamboo(k: Ink) {
    let out = '';
    for (const [x, top] of [
        [40, 10],
        [86, 30],
        [126, 4],
    ] as const) {
        out += k.limb(`M${x} 296 L${x} ${top}`, 14, k.c('stalk'));
        let nodes = '';
        for (let y = top + 40; y < 290; y += 46) nodes += `M${x - 7} ${y} h14 `;
        out += k.line(nodes, { lw: 0.8 });
    }
    for (let i = 0; i < 7; i++) {
        const x = 30 + k.rand() * 110;
        const y = 20 + k.rand() * 200;
        out += k.path(blob(x + (i % 2 ? 18 : -18), y, 18, 5, 4, k.rand, 0.4), k.c('leaf'), {
            lw: 0.6,
            transform: `rotate(${i % 2 ? 20 : -20} ${n(x)} ${n(y)})`,
        });
    }
    return out;
}
