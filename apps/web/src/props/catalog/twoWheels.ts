import type { Ink } from '../render/ink';
import { n } from '../render/ink';
import { pts } from '../render/shapes';
import type { PropDef } from '../types';
import { GLASS, HUB, LAMP, TIRE, wheel } from './vehicles';

/** A spoked bicycle wheel: tyre ring, spokes, hub. */
function spoked(k: Ink, x: number, y: number, r: number) {
    let spokes = '';
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        const dx = Math.cos(a) * r;
        const dy = Math.sin(a) * r;
        spokes += `M${n(x - dx)} ${n(y - dy)} L${n(x + dx)} ${n(y + dy)} `;
    }
    return (
        k.line(spokes, { lw: 0.35 }) +
        k.stroke(
            `M${n(x - r)} ${n(y)} a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0 a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`,
            4.5,
            TIRE,
        ) +
        k.circle(x, y, 4, HUB, { lw: 0.5 })
    );
}

/** Frame tubes as one outlined tree (no seams at the joints). */
const frame = (k: Ink, tubes: string[], width = 5) =>
    k.limbs(
        tubes.map((d) => ({ d, width })),
        k.c('frame'),
    );

export const TWO_WHEEL_PROPS: PropDef[] = [
    {
        id: 'bicycle',
        label: 'Bicycle',
        category: 'vehicles',
        tags: ['cycle', 'bike', 'ride'],
        width: 220,
        height: 130,
        colors: { frame: '#2f7fd1' },
        draw: (k) =>
            spoked(k, 50, 90, 36) +
            spoked(k, 170, 90, 36) +
            frame(k, [
                'M50 90 L104 92 L86 46 Z',
                'M86 46 L150 48 L104 92',
                'M150 48 L170 90',
                'M150 48 L146 34',
            ]) +
            k.limb('M140 34 L160 30', 4, '#3a3a3a') +
            k.path('M74 40 Q86 34 98 40 L94 44 L78 44 Z', '#3a3a3a') +
            k.circle(104, 92, 8, HUB, { lw: 0.6 }) +
            k.line('M104 92 L114 104 M108 104 h10', { lw: 0.9 }),
    },
    {
        id: 'city-bicycle',
        label: 'City bicycle',
        category: 'vehicles',
        tags: ['cycle', 'bike', 'mamachari', 'basket', 'japan', 'shopping'],
        width: 220,
        height: 130,
        colors: { frame: '#9ccfb6' },
        draw: (k) =>
            k.stroke('M14 84 A36 36 0 0 1 72 64', 4, '#a9aeb5') +
            spoked(k, 50, 90, 36) +
            spoked(k, 170, 90, 36) +
            frame(k, [
                'M50 90 L106 92 Q120 70 150 44',
                'M106 92 L86 48 L50 90',
                'M150 44 L170 90',
                'M150 44 L148 30',
            ]) +
            k.limb('M140 30 Q150 24 164 30', 4, '#3a3a3a') +
            k.path('M74 44 Q86 38 98 44 L94 48 L78 48 Z', '#3a3a3a') +
            k.rect(154, 28, 34, 22, '#e6e1d3', { rx: 2 }) +
            k.line('M154 36 h34 M154 43 h34 M163 28 v22 M171 28 v22 M179 28 v22', { lw: 0.35 }) +
            k.circle(106, 92, 8, HUB, { lw: 0.6 }),
    },
    {
        id: 'motorbike',
        label: 'Motorbike',
        category: 'vehicles',
        tags: ['bike', 'motorcycle', 'rider', 'road'],
        width: 240,
        height: 140,
        colors: { body: '#d63b3b' },
        draw: (k) =>
            k.limb('M172 46 L190 104', 6, '#55595f') +
            k.limb('M90 112 L156 112', 6, HUB) +
            k.rect(100, 80, 46, 26, '#8b9097', { rx: 4 }) +
            k.line('M108 86 v14 M118 86 v14 M128 86 v14', { lw: 0.4 }) +
            k.path(pts('70 74 96 56 150 54 172 62 160 82 100 86'), k.c('body')) +
            k.path(pts('48 66 98 58 100 68 52 74'), '#2f2f33') +
            k.path('M24 86 Q40 70 70 76 L66 84 Q44 80 30 92 Z', k.c('body')) +
            k.limb('M166 42 L182 38', 4, '#2f2f33') +
            k.circle(184, 58, 7, LAMP, { lw: 0.6 }) +
            wheel(k, 52, 104, 30) +
            wheel(k, 190, 104, 30),
    },
    {
        id: 'scooter',
        label: 'Scooter',
        category: 'vehicles',
        tags: ['bike', 'moped', 'vespa', 'city'],
        width: 220,
        height: 140,
        colors: { body: '#7ec8e3' },
        draw: (k) =>
            k.path(pts('22 106 26 76 60 70 120 74 132 96 150 104'), k.c('body')) +
            k.path(pts('150 106 158 40 172 40 168 106'), k.c('body')) +
            k.path(pts('36 64 94 62 94 72 36 74'), '#2f2f33') +
            k.limb('M152 36 L178 32', 4, '#2f2f33') +
            k.circle(170, 50, 6, LAMP, { lw: 0.6 }) +
            k.line('M60 100 L132 100', { lw: 0.5 }) +
            wheel(k, 48, 112, 22) +
            wheel(k, 174, 112, 22),
    },
    {
        id: 'train',
        label: 'Train car',
        category: 'vehicles',
        tags: ['train', 'railway', 'commuter', 'station', 'japan'],
        width: 340,
        height: 150,
        colors: { body: '#e9eef2', stripe: '#2f9e5b' },
        draw: (k) => {
            let windows = '';
            for (const x of [30, 82, 200, 252])
                windows += k.rect(x, 34, 40, 34, GLASS, { lw: 0.7, rx: 3 });
            const door = (x: number) =>
                k.rect(x, 30, 36, 92, k.shade('body', 0.06), { lw: 0.7 }) +
                k.rect(x + 6, 38, 10, 30, GLASS, { lw: 0.5 }) +
                k.rect(x + 20, 38, 10, 30, GLASS, { lw: 0.5 });
            return (
                k.line('M150 18 L170 4 L190 18 M160 4 h20', { lw: 0.8 }) +
                k.rect(6, 18, 328, 108, k.c('body'), { rx: 10 }) +
                k.rect(6, 96, 328, 10, k.c('stripe'), { bare: true }) +
                windows +
                door(126) +
                door(162) +
                k.rect(40, 126, 70, 8, '#55595f', { lw: 0.6 }) +
                k.rect(230, 126, 70, 8, '#55595f', { lw: 0.6 }) +
                [56, 94, 246, 284]
                    .map(
                        (x) =>
                            k.circle(x, 136, 12, TIRE) + k.circle(x, 136, 5, HUB, { bare: true }),
                    )
                    .join('')
            );
        },
    },
];
