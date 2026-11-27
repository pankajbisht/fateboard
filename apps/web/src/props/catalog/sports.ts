import { n } from '../render/ink';
import { ellipsePath, pts } from '../render/shapes';
import type { PropDef } from '../types';

const NET = '#55595f';
const BERRY = '#d8433c';

/** Sports and school clubs. */
export const SPORT_PROPS: PropDef[] = [
    {
        id: 'soccer-ball',
        label: 'Soccer ball',
        category: 'sports',
        tags: ['football', 'ball', 'soccer', 'club'],
        width: 100,
        height: 100,
        colors: { leather: '#ffffff' },
        draw: (k) => {
            const pent = (cx: number, cy: number, r: number) => {
                const p: string[] = [];
                for (let i = 0; i < 5; i++) {
                    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                    p.push(`${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`);
                }
                return pts(p.join(' '));
            };
            return (
                k.circle(50, 50, 44, k.c('leather')) +
                k.path(pent(50, 50, 14), '#2b2b2e', { lw: 0.5 }) +
                [0, 1, 2, 3, 4]
                    .map((i) => {
                        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                        return k.line(
                            `M${n(50 + Math.cos(a) * 14)} ${n(50 + Math.sin(a) * 14)} L${n(50 + Math.cos(a) * 30)} ${n(50 + Math.sin(a) * 30)}`,
                            { lw: 0.6 },
                        );
                    })
                    .join('') +
                [0, 1, 2, 3, 4]
                    .map((i) => {
                        const a = -Math.PI / 2 + Math.PI / 5 + (i * 2 * Math.PI) / 5;
                        return k.path(
                            pent(50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40, 9),
                            '#2b2b2e',
                            { bare: true },
                        );
                    })
                    .join('') +
                k.circle(50, 50, 44, 'none')
            );
        },
    },
    {
        id: 'soccer-goal',
        label: 'Soccer goal',
        category: 'sports',
        tags: ['goal', 'net', 'football', 'field'],
        width: 260,
        height: 150,
        colors: { frame: '#ffffff' },
        draw: (k) => {
            let mesh = '';
            for (let x = 20; x < 240; x += 14) mesh += `M${x} 16 V144 `;
            for (let y = 26; y < 144; y += 14) mesh += `M14 ${y} H246 `;
            return (
                k.line(mesh, { lw: 0.3, color: NET }) +
                k.limbs([{ d: 'M14 146 L14 14 L246 14 L246 146', width: 7 }], k.c('frame'))
            );
        },
    },
    {
        id: 'basketball',
        label: 'Basketball',
        category: 'sports',
        tags: ['ball', 'basketball', 'club', 'court'],
        width: 100,
        height: 100,
        colors: { leather: '#e8783a' },
        draw: (k) =>
            k.circle(50, 50, 44, k.c('leather')) +
            k.line('M6 50 H94 M50 6 V94 M18 20 Q40 50 18 80 M82 20 Q60 50 82 80', { lw: 0.8 }),
    },
    {
        id: 'basketball-hoop',
        label: 'Basketball hoop',
        category: 'sports',
        tags: ['hoop', 'basket', 'backboard', 'court', 'gym'],
        width: 160,
        height: 220,
        colors: { board: '#ffffff' },
        draw: (k) =>
            k.limb('M80 116 L80 216', 8, NET) +
            k.rect(16, 10, 128, 90, k.c('board'), { rx: 4 }) +
            k.rect(56, 46, 48, 36, 'none', { lw: 0.8 }) +
            k.line(
                'M54 98 L62 142 M66 98 L70 142 M80 98 V142 M94 98 L90 142 M106 98 L98 142 M58 116 H102 M62 132 H98',
                { lw: 0.45 },
            ) +
            k.stroke(ellipsePath(80, 96, 28, 6), 4, '#e8783a') +
            k.line(ellipsePath(80, 96, 30, 8), { lw: 0.4 }),
    },
    {
        id: 'baseball',
        label: 'Baseball',
        category: 'sports',
        tags: ['ball', 'baseball', 'club', 'koshien'],
        width: 90,
        height: 90,
        colors: { leather: '#fbfaf5' },
        draw: (k) =>
            k.circle(45, 45, 40, k.c('leather')) +
            k.stroke('M20 14 Q38 45 20 76 M70 14 Q52 45 70 76', 1.6, BERRY) +
            k.line(
                'M24 24 l6 -2 M28 36 l6 -1 M28 54 l6 1 M24 66 l6 2 M66 24 l-6 -2 M62 36 l-6 -1 M62 54 l-6 1 M66 66 l-6 2',
                { lw: 0.4, color: BERRY },
            ),
    },
    {
        id: 'baseball-bat',
        label: 'Baseball bat',
        category: 'sports',
        tags: ['bat', 'baseball', 'club'],
        width: 220,
        height: 50,
        colors: { wood: '#d9b27c' },
        draw: (k) =>
            k.path(
                'M10 22 Q10 18 16 18 L80 20 Q150 10 206 12 Q216 25 206 38 Q150 40 80 30 L16 32 Q10 32 10 28 Z',
                k.c('wood'),
            ) +
            k.ellipse(12, 25, 5, 9, k.shade('wood', 0.25)) +
            k.rect(20, 18, 40, 14, '#2f3a55', { rx: 3, lw: 0.6 }),
    },
    {
        id: 'baseball-glove',
        label: 'Baseball glove',
        category: 'sports',
        tags: ['glove', 'mitt', 'baseball', 'club'],
        width: 130,
        height: 130,
        colors: { leather: '#b8743f' },
        draw: (k) =>
            k.path(
                'M30 120 Q8 80 14 50 Q18 30 30 32 L34 70 L36 18 Q40 6 52 10 L56 60 L60 8 Q66 0 76 6 L78 60 L84 16 Q92 8 100 16 L98 72 Q112 54 124 62 Q118 100 92 120 Z',
                k.c('leather'),
            ) +
            k.path('M44 70 Q64 56 88 72 Q86 100 60 104 Q42 96 44 70 Z', k.shade('leather', 0.2), {
                lw: 0.6,
            }) +
            k.stroke('M30 118 L92 118', 6, k.shade('leather', 0.3)),
    },
    {
        id: 'tennis-racket',
        label: 'Tennis racket',
        category: 'sports',
        tags: ['racket', 'tennis', 'club', 'badminton'],
        width: 110,
        height: 220,
        colors: { frame: '#4a7bd0' },
        draw: (k) => {
            let strings = '';
            for (let x = 26; x <= 84; x += 8) strings += `M${x} 16 V124 `;
            for (let y = 22; y <= 122; y += 8) strings += `M14 ${y} H96 `;
            return (
                k.limb('M55 132 L55 212', 10, '#2f2f33') +
                k.limb('M40 120 L55 140 L70 120', 6, k.c('frame')) +
                `<g opacity="0.8">${k.line(strings, { lw: 0.3 })}</g>` +
                k.stroke(ellipsePath(55, 70, 40, 56), 7, k.c('frame')) +
                k.line(ellipsePath(55, 70, 44, 60), { lw: 0.5 }) +
                k.line(ellipsePath(55, 70, 36, 52), { lw: 0.5 })
            );
        },
    },
    {
        id: 'tennis-ball',
        label: 'Tennis ball',
        category: 'sports',
        tags: ['ball', 'tennis'],
        width: 80,
        height: 80,
        colors: { felt: '#d8e84a' },
        draw: (k) =>
            k.circle(40, 40, 34, k.c('felt')) +
            k.stroke('M12 22 Q40 40 12 58 M68 22 Q40 40 68 58', 2.2, '#ffffff'),
    },
    {
        id: 'volleyball',
        label: 'Volleyball',
        category: 'sports',
        tags: ['ball', 'volleyball', 'club', 'beach'],
        width: 100,
        height: 100,
        colors: { panel: '#f2c230' },
        draw: (k) =>
            k.circle(50, 50, 44, '#ffffff') +
            k.path('M50 6 Q90 20 94 50 Q70 40 50 50 Z', k.c('panel'), { lw: 0.6 }) +
            k.path('M50 50 Q40 76 14 80 Q4 60 10 40 Q30 50 50 50 Z', '#4a7bd0', { lw: 0.6 }) +
            k.line('M50 50 Q70 70 70 92 M50 50 Q30 30 30 8', { lw: 0.7 }) +
            k.circle(50, 50, 44, 'none'),
    },
    {
        id: 'volleyball-net',
        label: 'Volleyball net',
        category: 'sports',
        tags: ['net', 'volleyball', 'badminton', 'gym', 'court'],
        width: 320,
        height: 200,
        colors: { tape: '#ffffff' },
        draw: (k) => {
            let mesh = '';
            for (let x = 26; x < 296; x += 10) mesh += `M${x} 30 V90 `;
            for (let y = 40; y < 90; y += 10) mesh += `M20 ${y} H300 `;
            return (
                k.limbs(
                    [
                        { d: 'M14 20 L14 196', width: 8 },
                        { d: 'M306 20 L306 196', width: 8 },
                    ],
                    '#8d969f',
                ) +
                k.line(mesh, { lw: 0.3 }) +
                k.rect(18, 24, 284, 8, k.c('tape')) +
                k.rect(18, 88, 284, 5, k.c('tape'))
            );
        },
    },
    {
        id: 'shinai',
        label: 'Kendo sword',
        category: 'sports',
        tags: ['shinai', 'kendo', 'bamboo sword', 'club', 'martial arts'],
        width: 240,
        height: 50,
        colors: { bamboo: '#e3cf98' },
        draw: (k) =>
            k.rect(60, 18, 170, 14, k.c('bamboo'), { rx: 6 }) +
            k.line('M100 18 v14 M150 18 v14 M200 18 v14 M62 25 H228', { lw: 0.4 }) +
            k.ellipse(56, 25, 6, 16, '#3a2a22') +
            k.rect(8, 18, 48, 14, '#f4efe2', { rx: 6 }),
    },
    {
        id: 'hurdle',
        label: 'Hurdle',
        category: 'sports',
        tags: ['track', 'athletics', 'race', 'sports day'],
        width: 200,
        height: 130,
        colors: { bar: '#ffffff' },
        draw: (k) =>
            k.limbs(
                [
                    { d: 'M30 30 L30 124 L6 124', width: 5 },
                    { d: 'M170 30 L170 124 L146 124', width: 5 },
                ],
                '#8d969f',
            ) +
            k.rect(20, 16, 160, 22, k.c('bar')) +
            k.rect(20, 16, 40, 22, '#2f2f33', { bare: true }) +
            k.rect(100, 16, 40, 22, '#2f2f33', { bare: true }) +
            k.rect(20, 16, 160, 22, 'none'),
    },
    {
        id: 'whistle',
        label: 'Whistle',
        category: 'sports',
        tags: ['whistle', 'coach', 'referee', 'pe class'],
        width: 140,
        height: 90,
        colors: { metal: '#c9ccd1' },
        draw: (k) =>
            k.line('M30 40 Q10 10 40 6 Q70 4 80 20', { lw: 0.8, color: '#e04848' }) +
            k.path(
                'M40 34 L120 34 L120 54 L84 54 Q84 84 56 84 Q30 84 30 58 Q30 38 40 34 Z',
                k.c('metal'),
            ) +
            k.rect(70, 34, 12, 8, '#2f2f33', { bare: true }),
    },
    {
        id: 'trophy',
        label: 'Trophy',
        category: 'sports',
        tags: ['trophy', 'cup', 'winner', 'prize', 'championship'],
        width: 130,
        height: 170,
        colors: { gold: '#e8b830' },
        draw: (k) =>
            k.limb('M30 30 Q4 30 10 54 Q16 74 42 74', 6, k.c('gold')) +
            k.limb('M100 30 Q126 30 120 54 Q114 74 88 74', 6, k.c('gold')) +
            k.path('M24 16 L106 16 Q106 92 65 100 Q24 92 24 16 Z', k.c('gold')) +
            k.rect(57, 100, 16, 26, k.c('gold')) +
            k.rect(34, 126, 62, 14, k.shade('gold', 0.2)) +
            k.rect(26, 140, 78, 24, '#5b4a3a') +
            k.line('M40 26 Q42 64 58 84', { lw: 1, color: '#ffffff' }),
    },
];
