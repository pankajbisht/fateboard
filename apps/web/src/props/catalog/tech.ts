import { blob, pts } from '../render/shapes';
import type { PropDef } from '../types';

const SCREEN = '#2b3a55';
const LIT = '#8fd0ff';
const DARK = '#2f2f33';

/** Gadgets and bedroom things. */
export const TECH_PROPS: PropDef[] = [
    {
        id: 'smartphone',
        label: 'Smartphone',
        category: 'tech',
        tags: ['phone', 'mobile', 'cellphone', 'message', 'line'],
        width: 80,
        height: 150,
        colors: { case: '#3a3a40' },
        draw: (k) =>
            k.rect(6, 6, 68, 138, k.c('case'), { rx: 12 }) +
            k.rect(12, 18, 56, 112, LIT, { rx: 4 }) +
            k.rect(18, 30, 34, 12, '#ffffff', { rx: 6, lw: 0.4 }) +
            k.rect(28, 50, 34, 12, '#7cdb8a', { rx: 6, lw: 0.4 }) +
            k.rect(30, 10, 20, 4, DARK, { rx: 2, bare: true }),
    },
    {
        id: 'laptop',
        label: 'Laptop',
        category: 'tech',
        tags: ['laptop', 'computer', 'notebook pc', 'work', 'study'],
        width: 200,
        height: 140,
        colors: { body: '#b8bfc7' },
        draw: (k) =>
            k.rect(30, 8, 140, 96, k.c('body'), { rx: 6 }) +
            k.rect(38, 16, 124, 80, SCREEN) +
            k.line('M48 30 h60 M48 42 h80 M48 54 h40', { lw: 0.6, color: LIT }) +
            k.path(pts('20 104 180 104 196 128 4 128'), k.light('body', 0.15)) +
            k.rect(80, 110, 40, 8, k.shade('body', 0.15), { rx: 3, lw: 0.4 }),
    },
    {
        id: 'desktop-pc',
        label: 'Desktop computer',
        category: 'tech',
        tags: ['computer', 'pc', 'monitor', 'office', 'gaming'],
        width: 220,
        height: 180,
        colors: { body: '#2f3440' },
        draw: (k) =>
            k.rect(164, 50, 48, 124, k.c('body'), { rx: 4 }) +
            k.circle(188, 70, 5, LIT, { lw: 0.4 }) +
            k.rect(84, 120, 20, 30, k.c('body')) +
            k.rect(60, 148, 68, 10, k.c('body'), { rx: 3 }) +
            k.rect(10, 10, 168, 112, k.c('body'), { rx: 6 }) +
            k.rect(18, 18, 152, 96, SCREEN) +
            k.line('M30 34 h70 M30 48 h100 M30 62 h56', { lw: 0.6, color: LIT }) +
            k.rect(20, 162, 130, 14, '#d9dde3', { rx: 3 }),
    },
    {
        id: 'game-controller',
        label: 'Game controller',
        category: 'tech',
        tags: ['gamepad', 'video game', 'console', 'gaming', 'play'],
        width: 170,
        height: 110,
        colors: { body: '#e9eef2' },
        draw: (k) =>
            k.path(
                'M36 20 L134 20 Q166 20 166 70 Q166 104 140 100 Q126 98 116 78 L54 78 Q44 98 30 100 Q4 104 4 70 Q4 20 36 20 Z',
                k.c('body'),
            ) +
            k.path(
                pts('30 44 40 44 40 34 50 34 50 44 60 44 60 54 50 54 50 64 40 64 40 54 30 54'),
                DARK,
                { lw: 0.4 },
            ) +
            [
                [124, 34, '#4cc26a'],
                [140, 48, '#e04848'],
                [108, 48, '#4a7bd0'],
                [124, 62, '#f2c230'],
            ]
                .map(([x, y, c]) => k.circle(Number(x), Number(y), 7, String(c), { lw: 0.5 }))
                .join('') +
            k.circle(68, 72, 9, '#9aa0a8') +
            k.circle(102, 72, 9, '#9aa0a8'),
    },
    {
        id: 'handheld-console',
        label: 'Handheld console',
        category: 'tech',
        tags: ['game', 'portable', 'switch', 'gaming', 'play'],
        width: 200,
        height: 100,
        colors: { left: '#5ac8e8', right: '#f2665a' },
        draw: (k) =>
            k.rect(6, 10, 44, 80, k.c('left'), { rx: 18 }) +
            k.rect(150, 10, 44, 80, k.c('right'), { rx: 18 }) +
            k.rect(46, 10, 108, 80, DARK) +
            k.rect(54, 18, 92, 64, LIT) +
            k.circle(28, 36, 8, DARK, { bare: true }) +
            k.circle(172, 62, 8, DARK, { bare: true }) +
            k.path(blob(100, 56, 18, 10, 6, k.rand, 1), '#7cc36b', { lw: 0.5 }),
    },
    {
        id: 'tv',
        label: 'Television',
        category: 'tech',
        tags: ['tv', 'television', 'screen', 'living room'],
        width: 220,
        height: 170,
        colors: { frame: '#2f3440' },
        draw: (k) =>
            k.path(pts('80 150 140 150 156 166 64 166'), k.c('frame')) +
            k.rect(100, 136, 20, 16, k.c('frame')) +
            k.rect(6, 8, 208, 130, k.c('frame'), { rx: 6 }) +
            k.rect(14, 16, 192, 114, SCREEN) +
            k.line('M30 110 L80 40 M60 120 L110 50', { lw: 1.2, color: '#ffffff', opacity: 0.35 }),
    },
    {
        id: 'headphones',
        label: 'Headphones',
        category: 'tech',
        tags: ['headphones', 'music', 'headset', 'audio'],
        width: 140,
        height: 130,
        colors: { band: '#e86f9a' },
        draw: (k) =>
            k.limb('M20 84 Q16 10 70 10 Q124 10 120 84', 9, k.c('band')) +
            k.rect(6, 70, 32, 52, k.c('band'), { rx: 12 }) +
            k.rect(102, 70, 32, 52, k.c('band'), { rx: 12 }) +
            k.rect(30, 78, 10, 36, DARK, { rx: 4 }) +
            k.rect(100, 78, 10, 36, DARK, { rx: 4 }),
    },
    {
        id: 'camera',
        label: 'Camera',
        category: 'tech',
        tags: ['camera', 'photo', 'photography', 'club', 'trip'],
        width: 170,
        height: 120,
        colors: { body: '#3a3a40' },
        draw: (k) =>
            k.rect(40, 12, 40, 20, k.c('body'), { rx: 4 }) +
            k.rect(8, 28, 154, 84, k.c('body'), { rx: 10 }) +
            k.rect(8, 50, 154, 40, '#8b5a3c', { bare: true }) +
            k.rect(8, 28, 154, 84, 'none', { rx: 10 }) +
            k.circle(86, 70, 34, '#c9ccd1') +
            k.circle(86, 70, 24, SCREEN) +
            k.circle(78, 62, 6, '#ffffff', { bare: true, opacity: 0.7 }) +
            k.rect(130, 36, 20, 10, '#fff3b0', { lw: 0.5 }),
    },
    {
        id: 'microphone',
        label: 'Microphone',
        category: 'tech',
        tags: ['mic', 'karaoke', 'singer', 'idol', 'concert', 'stage'],
        width: 70,
        height: 180,
        colors: { handle: '#2f2f33' },
        draw: (k) =>
            k.path('M24 64 L46 64 L40 176 L30 176 Z', k.c('handle')) +
            k.rect(20, 58, 30, 10, '#c9ccd1') +
            k.circle(35, 34, 28, '#c9ccd1') +
            k.line('M14 24 H56 M10 36 H60 M14 48 H56 M24 10 V58 M35 6 V62 M46 10 V58', {
                lw: 0.35,
            }),
    },
    {
        id: 'desk-lamp',
        label: 'Desk lamp',
        category: 'tech',
        tags: ['lamp', 'light', 'study', 'desk', 'night'],
        width: 150,
        height: 170,
        colors: { metal: '#5ab0a0' },
        draw: (k) =>
            k.path('M96 52 L148 110 L80 120 Z', '#fff3b0', { bare: true, opacity: 0.4 }) +
            k.ellipse(40, 160, 34, 8, k.c('metal')) +
            k.limbs(
                [
                    { d: 'M40 156 L64 92', width: 6 },
                    { d: 'M64 92 L40 40', width: 6 },
                ],
                k.c('metal'),
            ) +
            k.path('M30 30 L60 18 L118 60 Q104 82 82 76 Z', k.c('metal')) +
            k.circle(64, 92, 5, DARK, { bare: true }),
    },
    {
        id: 'speaker',
        label: 'Speaker',
        category: 'tech',
        tags: ['speaker', 'music', 'audio', 'stereo', 'band'],
        width: 110,
        height: 170,
        colors: { box: '#3a3a40' },
        draw: (k) =>
            k.rect(8, 6, 94, 158, k.c('box'), { rx: 8 }) +
            k.circle(55, 50, 20, '#55595f') +
            k.circle(55, 50, 8, DARK, { lw: 0.5 }) +
            k.circle(55, 112, 34, '#55595f') +
            k.circle(55, 112, 14, DARK, { lw: 0.5 }),
    },
    {
        id: 'poster',
        label: 'Poster',
        category: 'tech',
        tags: ['poster', 'idol', 'anime poster', 'wall', 'bedroom'],
        width: 130,
        height: 180,
        colors: { paper: '#f7c6d6' },
        noShadow: true,
        draw: (k) =>
            k.rect(8, 8, 114, 164, k.c('paper')) +
            k.path(blob(65, 70, 40, 34, 8, k.rand, 0.9), '#fff3a6', { bare: true }) +
            k.circle(65, 70, 22, '#ffe2c8', { lw: 0.6 }) +
            k.path('M43 64 Q44 40 65 40 Q86 40 87 64 Q76 50 65 54 Q54 50 43 64 Z', '#5a3a2a', {
                lw: 0.5,
            }) +
            k.rect(24, 124, 82, 10, '#ffffff', { rx: 3 }) +
            k.rect(36, 142, 58, 6, '#ffffff', { rx: 3 }) +
            k.circle(16, 16, 3, '#e04848', { bare: true }) +
            k.circle(114, 16, 3, '#e04848', { bare: true }),
    },
    {
        id: 'plant-pot',
        label: 'Potted plant',
        category: 'tech',
        tags: ['plant', 'pot', 'house plant', 'monstera', 'room', 'office'],
        width: 120,
        height: 170,
        colors: { leaf: '#5aa05a' },
        draw: (k) =>
            [
                [-40, 60, 70],
                [-10, 56, 40],
                [20, 64, 46],
                [50, 66, 76],
                [-70, 50, 96],
            ]
                .map(([a, x, y]) =>
                    k.path(blob(Number(x), Number(y), 24, 12, 6, k.rand, 0.5), k.c('leaf'), {
                        lw: 0.6,
                        transform: `rotate(${a} ${x} ${y})`,
                    }),
                )
                .join('') +
            k.limb('M60 116 L58 70 M60 116 L36 78 M60 116 L86 80', 3, '#3f7f45') +
            k.path(pts('26 110 94 110 84 166 36 166'), '#d9774e') +
            k.rect(22, 104, 76, 12, '#c8673e', { rx: 3 }),
    },
    {
        id: 'alarm-clock',
        label: 'Alarm clock',
        category: 'tech',
        tags: ['clock', 'alarm', 'morning', 'wake up', 'late'],
        width: 120,
        height: 130,
        colors: { body: '#e04848' },
        draw: (k) =>
            k.limb('M30 118 L22 126 M90 118 L98 126', 4, DARK) +
            k.circle(28, 24, 16, k.c('body')) +
            k.circle(92, 24, 16, k.c('body')) +
            k.circle(60, 72, 50, k.c('body')) +
            k.circle(60, 72, 40, '#ffffff', { lw: 0.6 }) +
            k.limb('M60 72 L60 44 M60 72 L80 82', 3, DARK) +
            k.rect(54, 14, 12, 12, DARK, { rx: 2 }),
    },
    {
        id: 'bookcase-manga',
        label: 'Manga shelf',
        category: 'tech',
        tags: ['manga', 'comics', 'shelf', 'otaku', 'bedroom', 'collection'],
        width: 180,
        height: 140,
        colors: { wood: '#d9b27c' },
        draw: (k) => {
            const SPINES = ['#e04848', '#4a7bd0', '#f2c230', '#5aa05a', '#ffffff', '#8e6fc1'];
            let spines = '';
            for (const y of [14, 74])
                for (let i = 0; i < 16; i++)
                    spines += k.rect(16 + i * 9.4, y, 9, 48, SPINES[(i * 7 + y) % SPINES.length], {
                        lw: 0.5,
                    });
            return (
                k.rect(6, 6, 168, 128, k.c('wood')) +
                spines +
                k.rect(12, 62, 156, 10, k.c('wood'), { lw: 0.6 })
            );
        },
    },
];
