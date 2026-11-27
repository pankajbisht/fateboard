import { n } from '../render/ink';
import { pts } from '../render/shapes';
import type { PropDef } from '../types';
import { GLASS } from './vehicles';

const POLE = '#3b4652';

/** Street lights, signals, poles and street furniture (signs and small items: streetSigns.ts). */
export const STREET_PROPS: PropDef[] = [
    {
        id: 'street-lamp',
        label: 'Street lamp',
        category: 'street',
        tags: ['street light', 'lamp post', 'lantern', 'night', 'park'],
        width: 90,
        height: 300,
        colors: { pole: '#3b4652', light: '#fff2a8' },
        draw: (k) =>
            k.path('M45 52 L80 130 L10 130 Z', k.c('light'), { bare: true, opacity: 0.25 }) +
            k.path(pts('22 276 68 276 74 296 16 296'), k.c('pole')) +
            k.limb('M45 60 L45 278', 8, k.c('pole')) +
            k.path(pts('30 18 60 18 66 56 24 56'), k.c('light')) +
            k.line('M45 18 L45 56 M28 37 L62 37', { lw: 0.5 }) +
            k.path(pts('22 18 68 18 56 6 34 6'), k.c('pole')) +
            k.rect(26, 56, 38, 6, k.c('pole')),
    },
    {
        id: 'street-lamp-modern',
        label: 'Modern street light',
        category: 'street',
        tags: ['street light', 'road light', 'highway', 'night'],
        width: 160,
        height: 300,
        colors: { pole: '#8d969f', light: '#fffbe0' },
        draw: (k) =>
            k.path('M130 28 L156 140 L74 140 L110 28 Z', k.c('light'), {
                bare: true,
                opacity: 0.3,
            }) +
            k.limb('M40 296 L40 50 Q40 18 72 18 L118 18', 7, k.c('pole')) +
            k.rect(100, 12, 46, 14, k.c('pole'), { rx: 6 }) +
            k.rect(106, 26, 34, 4, k.c('light'), { lw: 0.6 }) +
            k.rect(28, 280, 24, 16, k.shade('pole', 0.2)),
    },
    {
        id: 'traffic-light',
        label: 'Traffic light',
        category: 'street',
        tags: ['signal', 'traffic signal', 'crossing', 'road'],
        width: 100,
        height: 280,
        colors: { housing: '#3f4a3c' },
        draw: (k) =>
            k.limb('M50 150 L50 276', 7, POLE) +
            k.rect(22, 8, 56, 146, k.c('housing'), { rx: 10 }) +
            [
                [34, '#e04848'],
                [80, '#f2b233'],
                [126, '#4cc26a'],
            ]
                .map(
                    ([y, c]) =>
                        k.circle(50, Number(y), 15, String(c)) +
                        k.path(
                            `M33 ${Number(y) - 8} Q50 ${Number(y) - 26} 67 ${Number(y) - 8} Z`,
                            '#2a3228',
                            { lw: 0.6 },
                        ),
                )
                .join(''),
    },
    {
        id: 'pedestrian-signal',
        label: 'Pedestrian signal',
        category: 'street',
        tags: ['crosswalk', 'walk sign', 'signal', 'crossing'],
        width: 80,
        height: 240,
        colors: { housing: '#3f4a3c' },
        draw: (k) => {
            const person = (x: number, y: number, c: string, walking: boolean) =>
                k.circle(x, y - 14, 4, c, { bare: true }) +
                k.stroke(
                    walking
                        ? `M${x} ${y - 8} L${x} ${y + 4} L${x - 6} ${y + 14} M${x} ${y + 4} L${x + 6} ${y + 14} M${x - 7} ${y - 2} L${x + 7} ${y - 6}`
                        : `M${x} ${y - 8} L${x} ${y + 14} M${x - 7} ${y - 4} L${x + 7} ${y - 4}`,
                    3.5,
                    c,
                );
            return (
                k.limb('M40 120 L40 236', 6, POLE) +
                k.rect(14, 8, 52, 54, k.c('housing'), { rx: 6 }) +
                k.rect(14, 64, 52, 54, k.c('housing'), { rx: 6 }) +
                person(40, 36, '#e04848', false) +
                person(40, 92, '#4cc26a', true)
            );
        },
    },
    {
        id: 'utility-pole',
        label: 'Utility pole',
        category: 'street',
        tags: ['power line', 'electric pole', 'wires', 'telephone pole', 'japan', 'town'],
        width: 220,
        height: 320,
        colors: { pole: '#a8a39a' },
        draw: (k) => {
            const wires = [40, 58, 92]
                .map(
                    (y, i) =>
                        `M0 ${y + 10} Q55 ${y + 34 - i * 4} 110 ${y} Q165 ${y + 30 - i * 4} 220 ${y + 6}`,
                )
                .join(' ');
            return (
                k.line(wires, { lw: 0.5 }) +
                k.limb('M110 316 L110 14', 12, k.c('pole')) +
                k.rect(46, 36, 128, 7, '#6d6a64', { lw: 0.7 }) +
                k.rect(66, 88, 88, 6, '#6d6a64', { lw: 0.7 }) +
                [54, 84, 136, 166]
                    .map((x) => k.rect(x - 3, 26, 6, 10, '#ffffff', { lw: 0.5, rx: 2 }))
                    .join('') +
                k.rect(118, 120, 30, 44, '#8d969f', { rx: 8 }) +
                k.line('M104 200 h12 M104 214 h12 M104 228 h12', { lw: 0.5 })
            );
        },
    },
    {
        id: 'bench',
        label: 'Bench',
        category: 'street',
        tags: ['park bench', 'seat', 'park', 'bus stop'],
        width: 220,
        height: 120,
        colors: { wood: '#b9824f' },
        draw: (k) =>
            k.limbs(
                [
                    { d: 'M30 6 L30 112 M30 70 L44 112', width: 5 },
                    { d: 'M190 6 L190 112 M190 70 L176 112', width: 5 },
                ],
                '#3b3f46',
            ) +
            [10, 28].map((y) => k.rect(14, y, 192, 12, k.c('wood'), { rx: 3 })).join('') +
            k.rect(6, 66, 208, 12, k.light('wood', 0.1), { rx: 3 }) +
            k.rect(10, 80, 200, 10, k.c('wood'), { rx: 3 }),
    },
    {
        id: 'vending-machine',
        label: 'Vending machine',
        category: 'street',
        tags: ['drinks', 'jidouhanbaiki', 'japan', 'soda', 'machine'],
        width: 140,
        height: 240,
        colors: { body: '#d8433c' },
        draw: (k) => {
            const CANS = ['#4a7bd0', '#f2b233', '#5aa05a', '#e86f5a', '#8e6fc1', '#3fa7a0'];
            let cans = '';
            for (const y of [30, 66, 102])
                for (let i = 0; i < 6; i++) {
                    const x = 22 + i * 16;
                    cans += k.rect(x, y, 11, 24, CANS[(i + y) % CANS.length], { lw: 0.5, rx: 2 });
                    cans += k.circle(x + 5.5, y + 30, 2.2, '#4cc26a', { bare: true });
                }
            return (
                k.rect(6, 6, 128, 228, k.c('body'), { rx: 6 }) +
                k.rect(16, 18, 108, 122, GLASS, { lw: 0.7 }) +
                cans +
                k.rect(16, 150, 70, 26, '#2f2f33', { rx: 3 }) +
                k.rect(96, 150, 28, 40, '#e9eef2', { lw: 0.6 }) +
                k.rect(104, 158, 4, 14, '#2f2f33', { bare: true }) +
                k.rect(20, 196, 100, 28, '#2f2f33', { rx: 3 })
            );
        },
    },
    {
        id: 'fence',
        label: 'Fence',
        category: 'street',
        tags: ['chain link', 'rooftop fence', 'school', 'railing', 'mesh'],
        width: 260,
        height: 120,
        colors: { metal: '#6f8a7a' },
        draw: (k) => {
            // diamond mesh: diagonals clipped to the panel (x 4 … 256, y 12 … 116)
            let mesh = '';
            const H = 104;
            for (let x = 4 - H; x < 256; x += 14) {
                const t0 = Math.max(0, (4 - x) / H);
                const t1 = Math.min(1, (256 - x) / H);
                if (t1 <= t0) continue;
                mesh += `M${n(x + H * t0)} ${n(116 - H * t0)} L${n(x + H * t1)} ${n(116 - H * t1)} `;
                mesh += `M${n(x + H * t0)} ${n(12 + H * t0)} L${n(x + H * t1)} ${n(12 + H * t1)} `;
            }
            return (
                `<g opacity="0.85">` +
                k.stroke(mesh, 1.2, k.c('metal')) +
                '</g>' +
                k.rect(4, 6, 252, 8, k.c('metal')) +
                [8, 130, 248].map((x) => k.rect(x - 4, 6, 8, 110, k.shade('metal', 0.15))).join('')
            );
        },
    },
];
