import { pts } from '../render/shapes';
import type { PropDef } from '../types';

const METAL = '#8d969f';

/** The classroom and school fittings (small school items: classroomItems.ts). */
export const CLASSROOM_PROPS: PropDef[] = [
    {
        id: 'school-desk',
        label: 'School desk',
        category: 'classroom',
        tags: ['desk', 'chair', 'student', 'classroom', 'japan', 'anime'],
        width: 140,
        height: 170,
        colors: { wood: '#d9b27c' },
        draw: (k) =>
            k.rect(36, 18, 68, 46, k.c('wood'), { rx: 4 }) +
            k.limbs(
                [
                    { d: 'M40 62 L40 100 M100 62 L100 100', width: 4 },
                    { d: 'M18 96 L18 166 M122 96 L122 166 M18 150 L122 150', width: 5 },
                ],
                METAL,
            ) +
            k.path(pts('20 72 120 72 132 88 8 88'), k.light('wood', 0.15)) +
            k.rect(8, 88, 124, 10, k.c('wood')) +
            k.rect(16, 98, 108, 22, '#6d7680', { lw: 0.7 }),
    },
    {
        id: 'blackboard',
        label: 'Blackboard',
        category: 'classroom',
        tags: ['chalkboard', 'board', 'classroom', 'teacher', 'lesson'],
        width: 320,
        height: 200,
        colors: { board: '#2f5d46' },
        noShadow: true,
        draw: (k) =>
            k.rect(6, 6, 308, 170, '#9b6b43') +
            k.rect(16, 16, 288, 150, k.c('board')) +
            k.line(
                'M40 50 h90 M40 70 h130 M40 90 h70 M200 56 q30 -20 60 0 M210 100 l40 30 M250 100 l-40 30',
                {
                    lw: 0.7,
                    color: '#e8f0ea',
                    opacity: 0.85,
                },
            ) +
            k.rect(16, 176, 288, 10, '#7a5236') +
            k.rect(230, 168, 40, 10, '#3a3a40', { rx: 2 }) +
            k.rect(70, 172, 22, 5, '#ffffff', { rx: 2, lw: 0.4 }) +
            k.rect(98, 172, 18, 5, '#f7c6d6', { rx: 2, lw: 0.4 }),
    },
    {
        id: 'lectern',
        label: "Teacher's lectern",
        category: 'classroom',
        tags: ['podium', 'teacher desk', 'kyoutaku', 'classroom'],
        width: 150,
        height: 170,
        colors: { wood: '#a8744a' },
        draw: (k) =>
            k.path(pts('22 40 128 40 116 166 34 166'), k.c('wood')) +
            k.rect(46, 60, 58, 70, k.light('wood', 0.12), { lw: 0.6 }) +
            k.path(pts('10 22 140 22 132 40 18 40'), k.light('wood', 0.2)) +
            k.rect(52, 10, 46, 12, '#e8e2d0', { lw: 0.6 }),
    },
    {
        id: 'lockers',
        label: 'Lockers',
        category: 'classroom',
        tags: ['locker', 'school', 'hallway', 'gym', 'storage'],
        width: 240,
        height: 220,
        colors: { metal: '#7c9cb8' },
        draw: (k) =>
            [0, 1, 2, 3]
                .map((i) => {
                    const x = 10 + i * 56;
                    return (
                        k.rect(x, 10, 56, 204, k.c('metal')) +
                        k.line(
                            `M${x + 14} 26 h28 M${x + 14} 32 h28 M${x + 14} 38 h28 M${x + 14} 44 h28`,
                            { lw: 0.5 },
                        ) +
                        k.rect(x + 42, 104, 6, 20, '#3a3a40', { rx: 2, lw: 0.4 }) +
                        k.rect(x + 12, 160, 24, 14, '#ffffff', { lw: 0.4 })
                    );
                })
                .join(''),
    },
    {
        id: 'shoe-lockers',
        label: 'Shoe lockers',
        category: 'classroom',
        tags: ['getabako', 'shoe box', 'school entrance', 'japan', 'love letter'],
        width: 240,
        height: 200,
        colors: { wood: '#c9b08a' },
        draw: (k) => {
            let cubbies = '';
            for (let r = 0; r < 4; r++)
                for (let c = 0; c < 5; c++) {
                    const x = 16 + c * 42;
                    const y = 14 + r * 44;
                    cubbies += k.rect(x, y, 36, 38, k.shade('wood', 0.35), { lw: 0.5 });
                    if (k.rand() > 0.5)
                        cubbies += k.path(
                            `M${x + 6} ${y + 36} q0 -12 12 -12 l10 0 q2 12 -2 12 Z`,
                            '#ffffff',
                            { lw: 0.5 },
                        );
                }
            return k.rect(8, 6, 224, 190, k.c('wood')) + cubbies;
        },
    },
    {
        id: 'bulletin-board',
        label: 'Bulletin board',
        category: 'classroom',
        tags: ['notice board', 'cork board', 'announcements', 'pins'],
        width: 240,
        height: 170,
        colors: { cork: '#c99a62' },
        noShadow: true,
        draw: (k) =>
            k.rect(6, 6, 228, 158, '#7a5236') +
            k.rect(14, 14, 212, 142, k.c('cork')) +
            [
                [28, 26, 56, 70, '#ffffff', -4],
                [98, 30, 50, 40, '#fff3a6', 3],
                [160, 24, 52, 64, '#d6ecff', -2],
                [100, 86, 64, 52, '#ffd6e0', 4],
            ]
                .map(
                    ([x, y, w, h, c, a]) =>
                        k.rect(Number(x), Number(y), Number(w), Number(h), String(c), {
                            lw: 0.5,
                            transform: `rotate(${a} ${Number(x) + Number(w) / 2} ${Number(y)})`,
                        }) +
                        k.circle(Number(x) + Number(w) / 2, Number(y) + 4, 3.5, '#e04848', {
                            lw: 0.4,
                        }),
                )
                .join('') +
            k.line('M36 50 h40 M36 60 h32 M168 46 h36 M168 56 h28', { lw: 0.4 }),
    },
    {
        id: 'school-gate',
        label: 'School gate',
        category: 'classroom',
        tags: ['gate', 'entrance', 'school', 'pillar', 'graduation'],
        width: 340,
        height: 220,
        colors: { stone: '#c9c3b6' },
        draw: (k) => {
            let bars = '';
            for (let x = 70; x < 270; x += 14) bars += `M${x} 120 V200 `;
            return (
                k.line(bars, { lw: 0.9 }) +
                k.rect(62, 118, 216, 8, METAL, { lw: 0.6 }) +
                k.rect(62, 196, 216, 8, METAL, { lw: 0.6 }) +
                k.rect(10, 40, 52, 176, k.c('stone')) +
                k.rect(278, 40, 52, 176, k.c('stone')) +
                k.rect(4, 30, 64, 14, k.shade('stone', 0.15)) +
                k.rect(272, 30, 64, 14, k.shade('stone', 0.15)) +
                k.rect(22, 70, 28, 96, '#f6f2e6', { lw: 0.6 }) +
                k.line('M30 84 v68 M42 84 v68', { lw: 0.5 })
            );
        },
    },
    {
        id: 'wall-speaker',
        label: 'Wall speaker',
        category: 'classroom',
        tags: ['speaker', 'pa', 'announcement', 'school bell', 'chime', 'anime'],
        width: 120,
        height: 120,
        colors: { box: '#e9e4d8' },
        noShadow: true,
        draw: (k) => {
            let grille = '';
            for (let y = 34; y <= 86; y += 8)
                for (let x = 34; x <= 86; x += 8)
                    if ((x - 60) ** 2 + (y - 60) ** 2 < 30 ** 2)
                        grille += k.circle(x, y, 2, '#4a4a50', { bare: true });
            return (
                k.rect(10, 10, 100, 100, k.c('box'), { rx: 10 }) +
                k.circle(60, 60, 34, k.shade('box', 0.1), { lw: 0.6 }) +
                grille
            );
        },
    },
];
