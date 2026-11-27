import { pts } from '../render/shapes';
import type { PropDef } from '../types';
import { GLASS } from './vehicles';

const POLE = '#8d969f';
const DARK = '#2f2f33';

/** Stations, roads, bridges and things that fly or float. */
export const TRAVEL_PROPS: PropDef[] = [
    {
        id: 'station-sign',
        label: 'Station sign',
        category: 'travel',
        tags: ['station', 'eki', 'platform', 'train', 'sign'],
        width: 240,
        height: 200,
        colors: { band: '#2f9e5b' },
        draw: (k) =>
            k.limbs(
                [
                    { d: 'M40 90 L40 196', width: 6 },
                    { d: 'M200 90 L200 196', width: 6 },
                ],
                POLE,
            ) +
            k.rect(8, 8, 224, 90, '#ffffff', { rx: 4 }) +
            k.rect(8, 64, 224, 12, k.c('band'), { bare: true }) +
            k.rect(8, 8, 224, 90, 'none', { rx: 4 }) +
            k.rect(84, 22, 72, 14, DARK, { rx: 3, bare: true }) +
            k.path(pts('24 84 40 78 40 90'), DARK, { bare: true }) +
            k.path(pts('216 84 200 78 200 90'), DARK, { bare: true }),
    },
    {
        id: 'railway-crossing',
        label: 'Railway crossing',
        category: 'travel',
        tags: ['fumikiri', 'crossing', 'train', 'signal', 'anime', 'level crossing'],
        width: 160,
        height: 280,
        colors: { stripe: '#f2c230' },
        draw: (k) =>
            k.limb('M80 40 L80 276', 8, '#ffffff') +
            k.line('M80 120 v16 M80 156 v16 M80 192 v16 M80 228 v16', { lw: 4, color: DARK }) +
            k.path(pts('20 14 140 70 134 82 14 26'), k.c('stripe')) +
            k.path(pts('140 14 20 70 26 82 146 26'), k.c('stripe')) +
            k.line('M44 26 L54 42 M92 48 L102 64 M116 26 L106 42 M68 48 L58 64', {
                lw: 2,
                color: DARK,
            }) +
            k.rect(20, 92, 120, 14, DARK, { rx: 3 }) +
            k.circle(34, 114, 16, '#e04848') +
            k.circle(126, 114, 16, '#7a2a2a') +
            k.rect(64, 96, 32, 22, DARK),
    },
    {
        id: 'rail-tracks',
        label: 'Rail tracks',
        category: 'travel',
        tags: ['railway', 'tracks', 'train', 'perspective', 'rails'],
        width: 240,
        height: 200,
        colors: { tie: '#8a6a4a' },
        noShadow: true,
        draw: (k) => {
            let ties = '';
            for (let i = 0; i < 9; i++) {
                const t = i / 8;
                const y = 20 + t * t * 176;
                const half = 14 + t * 96;
                ties += k.rect(120 - half * 1.08, y, half * 2.16, 4 + t * 10, k.c('tie'), {
                    lw: 0.5,
                });
            }
            return (
                ties +
                k.line('M110 20 L24 196 M130 20 L216 196', { lw: 1.6, color: '#8d969f' }) +
                k.line('M110 20 L24 196 M130 20 L216 196', { lw: 0.4 })
            );
        },
    },
    {
        id: 'ticket-gate',
        label: 'Ticket gate',
        category: 'travel',
        tags: ['station', 'turnstile', 'ticket', 'gate', 'commute'],
        width: 240,
        height: 150,
        colors: { body: '#d9dde3' },
        draw: (k) =>
            [10, 96, 182]
                .map(
                    (x) =>
                        k.rect(x, 40, 48, 106, k.c('body'), { rx: 6 }) +
                        k.rect(x + 8, 50, 32, 12, '#2f9e5b', { rx: 2, lw: 0.4 }) +
                        k.rect(x + 14, 30, 20, 10, '#3a3a40', { rx: 2 }),
                )
                .join('') +
            k.rect(58, 86, 38, 10, '#e04848', { rx: 4, lw: 0.6 }) +
            k.rect(144, 86, 38, 10, '#e04848', { rx: 4, lw: 0.6 }),
    },
    {
        id: 'road',
        label: 'Road',
        category: 'travel',
        tags: ['road', 'street', 'highway', 'perspective', 'asphalt'],
        width: 300,
        height: 200,
        colors: { asphalt: '#6d737a' },
        noShadow: true,
        draw: (k) => {
            let dashes = '';
            for (let i = 0; i < 6; i++) {
                const t0 = i / 6;
                const t1 = t0 + 0.08;
                dashes += k.path(
                    pts(
                        `${150 - 1 - t0 * 4} ${10 + t0 * t0 * 190} ${150 + 1 + t0 * 4} ${10 + t0 * t0 * 190} ${150 + 1 + t1 * 4} ${10 + t1 * t1 * 190} ${150 - 1 - t1 * 4} ${10 + t1 * t1 * 190}`,
                    ),
                    '#ffffff',
                    { bare: true },
                );
            }
            return (
                k.path(pts('138 10 162 10 296 198 4 198'), k.c('asphalt')) +
                k.line('M140 10 L18 198 M160 10 L282 198', { lw: 1.2, color: '#ffffff' }) +
                dashes
            );
        },
    },
    {
        id: 'crosswalk',
        label: 'Crosswalk',
        category: 'travel',
        tags: ['zebra crossing', 'pedestrian', 'street', 'road'],
        width: 300,
        height: 120,
        colors: { asphalt: '#6d737a' },
        noShadow: true,
        draw: (k) =>
            k.path(pts('30 10 270 10 296 110 4 110'), k.c('asphalt')) +
            [0, 1, 2, 3, 4, 5, 6]
                .map((i) =>
                    k.path(
                        pts(
                            `${40 + i * 32} 18 ${58 + i * 32} 18 ${54 + i * 38} 102 ${32 + i * 38} 102`,
                        ),
                        '#ffffff',
                        { bare: true },
                    ),
                )
                .join(''),
    },
    {
        id: 'bridge',
        label: 'Arched bridge',
        category: 'travel',
        tags: ['bridge', 'river', 'park', 'japanese garden', 'taikobashi'],
        width: 280,
        height: 140,
        colors: { wood: '#c7364a' },
        draw: (k) => {
            let posts = '';
            // posts run from the deck curve up to the rail curve (both quadratics over x 10 … 270)
            for (let x = 32; x <= 248; x += 24) {
                const t = (x - 10) / 260;
                const deck = 100 * (1 - t) ** 2 + 100 * t ** 2;
                const rail = 74 * (1 - t) ** 2 - 52 * t * (1 - t) + 74 * t ** 2;
                posts += `M${x} ${deck.toFixed(1)} V${rail.toFixed(1)} `;
            }
            return (
                k.path('M10 120 Q140 20 270 120 L270 100 Q140 0 10 100 Z', k.c('wood')) +
                k.line(posts, { lw: 3, color: k.c('wood') }) +
                k.line(posts, { lw: 0.5 }) +
                k.stroke('M10 74 Q140 -26 270 74', 5, k.c('wood')) +
                k.line('M10 74 Q140 -26 270 74', { lw: 0.5 })
            );
        },
    },
    {
        id: 'bus-shelter',
        label: 'Bus shelter',
        category: 'travel',
        tags: ['bus stop', 'shelter', 'rain', 'countryside', 'waiting'],
        width: 240,
        height: 200,
        colors: { roof: '#4a7bd0' },
        draw: (k) =>
            k.rect(14, 40, 212, 156, '#f1ecdf') +
            k.rect(30, 60, 70, 60, GLASS, { lw: 0.6 }) +
            k.rect(140, 60, 70, 60, GLASS, { lw: 0.6 }) +
            k.rect(34, 140, 172, 12, '#a8744a', { lw: 0.7 }) +
            k.line('M50 152 v40 M190 152 v40', { lw: 1 }) +
            k.path(pts('4 44 236 44 224 18 16 18'), k.c('roof')),
    },
    {
        id: 'tunnel',
        label: 'Tunnel',
        category: 'travel',
        tags: ['tunnel', 'mountain', 'road', 'train'],
        width: 260,
        height: 200,
        colors: { stone: '#a8a39a' },
        noShadow: true,
        draw: (k) => {
            let bricks = '';
            for (let i = 0; i <= 10; i++) {
                const a = Math.PI + (i / 10) * Math.PI;
                bricks += `M${(130 + Math.cos(a) * 76).toFixed(1)} ${(180 + Math.sin(a) * 120).toFixed(1)} L${(130 + Math.cos(a) * 100).toFixed(1)} ${(180 + Math.sin(a) * 144).toFixed(1)} `;
            }
            return (
                k.path('M10 196 L10 120 Q20 20 130 14 Q240 20 250 120 L250 196 Z', '#7cb85a') +
                k.path('M30 196 L30 180 A100 144 0 0 1 230 180 L230 196 Z', k.c('stone')) +
                k.path('M54 196 L54 180 A76 120 0 0 1 206 180 L206 196 Z', '#1f2328') +
                k.line(bricks, { lw: 0.5 })
            );
        },
    },
    {
        id: 'airplane',
        label: 'Airplane',
        category: 'travel',
        tags: ['plane', 'airliner', 'flight', 'travel', 'sky'],
        width: 280,
        height: 110,
        colors: { body: '#f4f6f8' },
        noShadow: true,
        draw: (k) =>
            k.path(pts('120 54 70 104 100 104 160 60'), k.shade('body', 0.1)) +
            k.path(pts('34 44 14 8 34 8 64 44'), '#4a7bd0') +
            k.path(
                'M20 44 L240 40 Q276 44 272 56 Q268 66 240 66 L40 66 Q20 66 20 56 Z',
                k.c('body'),
            ) +
            k.path(pts('130 50 100 8 128 8 172 50'), k.shade('body', 0.06)) +
            k.stroke('M30 58 L250 58', 3, '#4a7bd0') +
            [80, 100, 120, 140, 160, 180, 200]
                .map((x) => k.circle(x, 50, 3, GLASS, { lw: 0.4 }))
                .join('') +
            k.path('M240 44 Q260 46 266 54 L246 54 Z', GLASS, { lw: 0.5 }),
    },
    {
        id: 'helicopter',
        label: 'Helicopter',
        category: 'travel',
        tags: ['helicopter', 'rescue', 'news', 'flight'],
        width: 240,
        height: 140,
        colors: { body: '#e04848' },
        noShadow: true,
        draw: (k) =>
            k.limb('M30 16 L210 16', 4, DARK) +
            k.rect(114, 16, 12, 22, DARK) +
            k.path(pts('20 60 100 70 100 84 20 76'), k.c('body')) +
            k.path(pts('10 50 20 50 26 72 14 72'), k.c('body')) +
            k.path(
                'M90 40 L160 38 Q200 40 200 76 Q200 104 160 104 L100 104 Q86 100 86 74 Z',
                k.c('body'),
            ) +
            k.path('M150 46 Q190 48 192 74 L150 74 Z', GLASS, { lw: 0.6 }) +
            k.limb('M100 124 L200 124 M120 104 L114 124 M180 104 L186 124', 3, DARK),
    },
    {
        id: 'boat',
        label: 'Row boat',
        category: 'travel',
        tags: ['boat', 'rowboat', 'lake', 'pond', 'date'],
        width: 220,
        height: 100,
        colors: { hull: '#ffffff' },
        draw: (k) =>
            k.limb('M60 30 L20 92 M160 30 L200 92', 3, '#a8744a') +
            k.path('M6 40 L214 40 Q200 92 110 92 Q20 92 6 40 Z', k.c('hull')) +
            k.stroke('M12 56 Q110 70 208 56', 5, '#4a7bd0') +
            k.rect(60, 34, 100, 8, '#a8744a', { lw: 0.6 }),
    },
    {
        id: 'ship',
        label: 'Ship',
        category: 'travel',
        tags: ['ship', 'ferry', 'cruise', 'harbor', 'sea'],
        width: 300,
        height: 170,
        colors: { hull: '#2f3a55' },
        draw: (k) =>
            k.rect(170, 20, 26, 50, '#e04848') +
            k.rect(170, 20, 26, 10, DARK, { bare: true }) +
            k.rect(80, 60, 160, 40, '#ffffff') +
            k.rect(110, 36, 100, 26, '#ffffff') +
            [96, 120, 144, 168, 192, 216]
                .map((x) => k.circle(x, 80, 5, GLASS, { lw: 0.4 }))
                .join('') +
            k.path('M6 96 L294 96 L262 162 L36 162 Z', k.c('hull')) +
            k.stroke('M20 118 L282 118', 4, '#ffffff'),
    },
    {
        id: 'hot-air-balloon',
        label: 'Hot air balloon',
        category: 'travel',
        tags: ['balloon', 'flight', 'sky', 'adventure'],
        width: 140,
        height: 200,
        colors: { envelope: '#f2862b' },
        noShadow: true,
        draw: (k) =>
            k.line('M42 120 L56 166 M98 120 L84 166', { lw: 0.6 }) +
            k.path(
                'M70 6 Q134 6 134 70 Q134 104 98 124 L42 124 Q6 104 6 70 Q6 6 70 6 Z',
                k.c('envelope'),
            ) +
            k.path(
                'M70 6 Q94 6 96 70 Q96 104 84 124 L56 124 Q44 104 44 70 Q46 6 70 6 Z',
                '#f2c230',
                { lw: 0.6 },
            ) +
            k.rect(50, 164, 40, 30, '#a8744a', { rx: 3 }),
    },
    {
        id: 'rocket',
        label: 'Rocket',
        category: 'travel',
        tags: ['rocket', 'space', 'launch', 'sci-fi', 'astronaut'],
        width: 110,
        height: 220,
        colors: { body: '#f4f6f8' },
        noShadow: true,
        draw: (k) =>
            k.path('M40 172 Q55 216 70 172 Z', '#f2992b', { lw: 0.6 }) +
            k.path(pts('30 130 8 176 30 166'), '#e04848') +
            k.path(pts('80 130 102 176 80 166'), '#e04848') +
            k.path('M55 6 Q90 40 82 170 L28 170 Q20 40 55 6 Z', k.c('body')) +
            k.circle(55, 80, 14, GLASS, { lw: 0.8 }) +
            k.path('M55 6 Q72 22 78 44 L32 44 Q38 22 55 6 Z', '#e04848'),
    },
];
