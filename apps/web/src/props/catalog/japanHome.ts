import { pts } from '../render/shapes';
import type { PropDef } from '../types';
import { bamboo } from './japan';

/** Japanese home and food things: kotatsu, futon, shoji, fans, umbrella, snacks, bamboo. */
export const JAPAN_HOME_PROPS: PropDef[] = [
    {
        id: 'onigiri',
        label: 'Onigiri',
        category: 'japan',
        tags: ['rice ball', 'food', 'snack', 'lunch', 'bento'],
        width: 120,
        height: 110,
        colors: { rice: '#ffffff', nori: '#2f3b2f' },
        draw: (k) =>
            k.path(
                'M60 8 Q72 8 106 74 Q116 102 86 104 L34 104 Q4 102 14 74 Q48 8 60 8 Z',
                k.c('rice'),
            ) +
            k.path('M36 70 L84 70 L86 104 L34 104 Z', k.c('nori'), { lw: 0.6 }) +
            k.line('M48 40 l2 2 M70 36 l2 2 M60 54 l2 2', { lw: 0.6 }),
    },
    {
        id: 'dango',
        label: 'Dango',
        category: 'japan',
        tags: ['sweets', 'hanami dango', 'snack', 'festival', 'mochi'],
        width: 60,
        height: 200,
        colors: { top: '#f7a8c0' },
        draw: (k) =>
            k.limb('M30 4 L30 196', 4, '#d9b27c') +
            k.circle(30, 40, 24, k.c('top')) +
            k.circle(30, 88, 24, '#ffffff') +
            k.circle(30, 136, 24, '#9fcf7a'),
    },
    {
        id: 'kotatsu',
        label: 'Kotatsu',
        category: 'japan',
        tags: ['heated table', 'winter', 'living room', 'cozy', 'blanket'],
        width: 260,
        height: 160,
        colors: { quilt: '#d97a5a' },
        draw: (k) =>
            k.path(
                'M30 44 L230 44 Q250 100 246 150 Q200 140 130 152 Q60 140 14 150 Q10 100 30 44 Z',
                k.c('quilt'),
            ) +
            k.line('M70 70 Q66 110 62 146 M130 70 L130 150 M190 70 Q194 110 198 146', { lw: 0.5 }) +
            k.path(pts('20 30 240 30 232 46 28 46'), '#b98656') +
            k.rect(20, 22, 220, 10, '#d9b27c') +
            k.circle(80, 18, 9, '#f28c28', { lw: 0.6 }) +
            k.circle(102, 20, 8, '#f28c28', { lw: 0.6 }),
    },
    {
        id: 'futon',
        label: 'Futon',
        category: 'japan',
        tags: ['bed', 'bedding', 'sleep', 'tatami', 'japanese room'],
        width: 280,
        height: 110,
        colors: { quilt: '#7fb0d9' },
        draw: (k) =>
            k.path(pts('20 40 270 40 278 92 6 92'), '#fbfaf5') +
            k.rect(6, 92, 272, 10, '#e5e1d6') +
            k.path(
                'M22 30 Q20 16 40 16 L80 16 Q96 16 92 34 Q90 46 72 46 L36 46 Q20 46 22 30 Z',
                '#ffffff',
            ) +
            k.path('M100 34 L268 34 L276 90 L94 90 Q86 60 100 34 Z', k.c('quilt')) +
            k.path('M100 34 L132 34 Q124 60 128 90 L94 90 Q86 60 100 34 Z', k.light('quilt', 0.3)) +
            k.line('M160 50 q24 8 48 0 M180 72 q24 8 48 0', { lw: 0.4 }),
    },
    {
        id: 'shoji',
        label: 'Shoji screen',
        category: 'japan',
        tags: ['sliding door', 'fusuma', 'paper door', 'japanese room', 'tatami'],
        width: 200,
        height: 220,
        colors: { wood: '#b98656' },
        noShadow: true,
        draw: (k) => {
            let grid = '';
            for (const x of [44, 72, 128, 156]) grid += `M${x} 12 V208 `;
            for (let y = 40; y < 208; y += 28) grid += `M16 ${y} H96 M104 ${y} H184 `;
            return (
                k.rect(6, 4, 188, 212, k.c('wood')) +
                k.rect(16, 12, 80, 196, '#fbf6e9', { lw: 0.6 }) +
                k.rect(104, 12, 80, 196, '#fbf6e9', { lw: 0.6 }) +
                k.line(grid, { lw: 1.4, color: k.c('wood') })
            );
        },
    },
    {
        id: 'uchiwa',
        label: 'Paper fan',
        category: 'japan',
        tags: ['uchiwa', 'fan', 'summer', 'festival', 'yukata'],
        width: 120,
        height: 200,
        colors: { paper: '#7fc8e8' },
        draw: (k) =>
            k.limb('M60 108 L60 194', 7, '#d9b27c') +
            k.path(
                'M60 8 C100 8 114 38 112 66 C110 96 86 114 60 114 C34 114 10 96 8 66 C6 38 20 8 60 8 Z',
                k.c('paper'),
            ) +
            k.line('M60 112 L60 20 M60 112 L30 28 M60 112 L90 28 M60 112 L14 58 M60 112 L106 58', {
                lw: 0.35,
            }) +
            k.path('M30 76 q10 -14 20 0 q10 14 20 0 q10 -14 20 0', 'none', { lw: 0.8 }) +
            k.circle(84, 40, 12, '#e04848', { lw: 0.5 }),
    },
    {
        id: 'wagasa',
        label: 'Paper umbrella',
        category: 'japan',
        tags: ['wagasa', 'umbrella', 'parasol', 'rain', 'traditional'],
        width: 220,
        height: 200,
        colors: { paper: '#d8433c' },
        draw: (k) => {
            let ribs = '';
            for (let i = 0; i <= 8; i++) ribs += `M110 18 L${20 + i * 22.5} ${i % 2 ? 92 : 88} `;
            return (
                k.limb('M110 30 L110 194', 5, '#7a5236') +
                k.path(
                    'M110 14 Q30 30 10 90 Q32 84 54 92 Q76 84 98 92 Q110 88 122 92 Q144 84 166 92 Q188 84 210 90 Q190 30 110 14 Z',
                    k.c('paper'),
                ) +
                k.line(ribs, { lw: 0.4 }) +
                k.circle(110, 14, 6, '#2f2f33')
            );
        },
    },
    {
        id: 'bamboo',
        label: 'Bamboo',
        category: 'japan',
        tags: ['bamboo', 'forest', 'garden', 'kyoto', 'tanabata'],
        width: 170,
        height: 300,
        colors: { stalk: '#8cbf5a', leaf: '#5c9c45' },
        draw: (k) => bamboo(k),
    },
];
