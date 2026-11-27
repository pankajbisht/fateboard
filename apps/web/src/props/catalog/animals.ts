import type { Ink } from '../render/ink';
import { pts } from '../render/shapes';
import type { PropDef } from '../types';

const EYE = '#141414';
const PINK = '#f7a8b8';

/** Dot eyes with a highlight. */
const eyes = (k: Ink, x0: number, x1: number, y: number, r = 3.5) =>
    [x0, x1]
        .map(
            (x) =>
                k.circle(x, y, r, EYE, { bare: true }) +
                k.circle(x + r * 0.3, y - r * 0.3, r * 0.3, '#ffffff', { bare: true }),
        )
        .join('');

/** Animals in a simple, chibi-friendly style. */
export const ANIMAL_PROPS: PropDef[] = [
    {
        id: 'cat',
        label: 'Cat',
        category: 'animals',
        tags: ['cat', 'kitty', 'neko', 'pet'],
        width: 130,
        height: 140,
        colors: { fur: '#f2a65a' },
        draw: (k) =>
            k.limb('M96 120 Q128 110 118 70', 8, k.c('fur')) +
            k.ellipse(62, 102, 40, 34, k.c('fur')) +
            k.path(pts('32 40 34 8 58 28'), k.c('fur')) +
            k.path(pts('66 28 90 8 92 40'), k.c('fur')) +
            k.path(pts('37 32 38 16 50 28'), PINK, { bare: true }) +
            k.circle(62, 52, 32, k.c('fur')) +
            eyes(k, 50, 74, 50) +
            k.path(pts('59 60 65 60 62 64'), PINK, { lw: 0.4 }) +
            k.line(
                'M62 64 q-5 5 -9 2 M62 64 q5 5 9 2 M36 58 h-14 M36 64 h-12 M88 58 h14 M88 64 h12',
                { lw: 0.5 },
            ) +
            k.line('M40 100 q8 -8 16 0 M68 100 q8 -8 16 0', { lw: 0.5 }),
    },
    {
        id: 'cat-sleeping',
        label: 'Sleeping cat',
        category: 'animals',
        tags: ['cat', 'nap', 'sleep', 'loaf', 'pet'],
        width: 170,
        height: 90,
        colors: { fur: '#9aa0a8' },
        draw: (k) =>
            k.ellipse(92, 58, 72, 28, k.c('fur')) +
            k.limb('M150 70 Q160 84 120 86 L70 86', 9, k.c('fur')) +
            k.path(pts('20 36 22 12 40 28'), k.c('fur')) +
            k.path(pts('46 26 62 10 64 36'), k.c('fur')) +
            k.circle(42, 52, 24, k.c('fur')) +
            k.line('M30 52 q5 4 10 0 M46 52 q5 4 10 0 M100 44 q10 6 20 0', { lw: 0.6 }),
    },
    {
        id: 'dog',
        label: 'Dog',
        category: 'animals',
        tags: ['dog', 'puppy', 'pet', 'inu'],
        width: 170,
        height: 130,
        colors: { fur: '#c89a6a' },
        draw: (k) =>
            k.limb('M26 64 Q8 50 14 34', 7, k.c('fur')) +
            [38, 58, 98, 118].map((x) => k.rect(x, 82, 12, 42, k.c('fur'), { rx: 5 })).join('') +
            k.ellipse(78, 72, 54, 28, k.c('fur')) +
            k.circle(128, 46, 26, k.c('fur')) +
            k.ellipse(150, 56, 16, 11, k.light('fur', 0.3)) +
            k.circle(162, 52, 4, EYE, { bare: true }) +
            k.path('M108 28 Q96 40 104 66 Q114 56 116 36 Z', k.shade('fur', 0.2)) +
            eyes(k, 132, 132, 40) +
            k.line('M146 64 q6 4 12 0', { lw: 0.6 }),
    },
    {
        id: 'shiba-inu',
        label: 'Shiba inu',
        category: 'animals',
        tags: ['dog', 'shiba', 'doge', 'japan', 'pet'],
        width: 140,
        height: 140,
        colors: { fur: '#e0a060' },
        draw: (k) =>
            k.limb('M102 104 Q132 98 116 70 Q104 64 108 82', 8, k.c('fur')) +
            k.ellipse(70, 104, 40, 32, k.c('fur')) +
            k.ellipse(70, 112, 22, 22, '#fbf3e4', { bare: true }) +
            k.path(pts('36 38 42 6 62 30'), k.c('fur')) +
            k.path(pts('78 30 98 6 104 38'), k.c('fur')) +
            k.circle(70, 54, 34, k.c('fur')) +
            k.ellipse(70, 66, 22, 16, '#fbf3e4', { bare: true }) +
            eyes(k, 56, 84, 50) +
            k.ellipse(70, 62, 5, 3.5, EYE, { bare: true }) +
            k.line('M70 66 q-5 6 -10 2 M70 66 q5 6 10 2', { lw: 0.5 }) +
            k.ellipse(46, 62, 6, 3, PINK, { bare: true, opacity: 0.7 }) +
            k.ellipse(94, 62, 6, 3, PINK, { bare: true, opacity: 0.7 }),
    },
    {
        id: 'sparrow',
        label: 'Sparrow',
        category: 'animals',
        tags: ['bird', 'sparrow', 'suzume', 'small bird'],
        width: 110,
        height: 80,
        colors: { feather: '#a8794e' },
        noShadow: true,
        draw: (k) =>
            k.path(pts('12 50 30 40 34 58'), k.shade('feather', 0.2)) +
            k.ellipse(54, 50, 30, 22, k.c('feather')) +
            k.ellipse(58, 58, 18, 12, '#f4ead8', { bare: true }) +
            k.circle(80, 32, 16, k.c('feather')) +
            k.path(pts('94 30 106 34 94 38'), '#3a3a40', { lw: 0.5 }) +
            k.ellipse(86, 40, 4, 3, '#2f2f33', { bare: true }) +
            k.circle(84, 28, 2.5, EYE, { bare: true }) +
            k.path('M36 44 Q52 30 68 44 Q52 52 36 44 Z', k.shade('feather', 0.15), { lw: 0.6 }) +
            k.line('M50 72 v6 M60 72 v6', { lw: 0.8 }),
    },
    {
        id: 'crow',
        label: 'Crow',
        category: 'animals',
        tags: ['bird', 'crow', 'karasu', 'raven', 'black'],
        width: 130,
        height: 90,
        colors: { feather: '#2b2b33' },
        noShadow: true,
        draw: (k) =>
            k.path(pts('8 50 34 38 34 62'), k.c('feather')) +
            k.ellipse(60, 52, 36, 22, k.c('feather')) +
            k.circle(94, 34, 18, k.c('feather')) +
            k.path(pts('108 28 128 36 108 42'), '#55595f', { lw: 0.6 }) +
            k.circle(98, 30, 3, '#ffffff', { bare: true }) +
            k.line('M60 74 v12 M72 74 v12', { lw: 1 }),
    },
    {
        id: 'goldfish',
        label: 'Goldfish',
        category: 'animals',
        tags: ['fish', 'kingyo', 'summer', 'festival', 'pet'],
        width: 130,
        height: 80,
        colors: { scale: '#f2662b' },
        draw: (k) =>
            k.path('M44 40 Q22 10 6 18 Q16 40 6 62 Q22 70 44 40 Z', k.light('scale', 0.2)) +
            k.ellipse(76, 40, 38, 24, k.c('scale')) +
            k.path('M70 18 Q80 4 92 18 Z', k.c('scale')) +
            eyes(k, 100, 100, 34, 4) +
            k.line('M58 30 q6 10 0 20 M70 28 q6 12 0 24', { lw: 0.45 }),
    },
    {
        id: 'butterfly',
        label: 'Butterfly',
        category: 'animals',
        tags: ['butterfly', 'insect', 'garden', 'spring'],
        width: 130,
        height: 100,
        colors: { wing: '#ffb347' },
        noShadow: true,
        draw: (k) =>
            k.ellipse(40, 34, 30, 24, k.c('wing'), { transform: 'rotate(-20 40 34)' }) +
            k.ellipse(90, 34, 30, 24, k.c('wing'), { transform: 'rotate(20 90 34)' }) +
            k.ellipse(46, 70, 20, 16, k.shade('wing', 0.15), { transform: 'rotate(20 46 70)' }) +
            k.ellipse(84, 70, 20, 16, k.shade('wing', 0.15), { transform: 'rotate(-20 84 70)' }) +
            k.circle(38, 34, 7, '#ffffff', { lw: 0.5 }) +
            k.circle(92, 34, 7, '#ffffff', { lw: 0.5 }) +
            k.ellipse(65, 52, 5, 26, '#3a3a40') +
            k.line('M63 28 Q56 10 48 8 M67 28 Q74 10 82 8', { lw: 0.6 }),
    },
    {
        id: 'rabbit',
        label: 'Rabbit',
        category: 'animals',
        tags: ['bunny', 'rabbit', 'usagi', 'pet', 'moon'],
        width: 110,
        height: 150,
        colors: { fur: '#fbfaf5' },
        draw: (k) =>
            k.ellipse(40, 34, 11, 32, k.c('fur'), { transform: 'rotate(-10 40 34)' }) +
            k.ellipse(70, 34, 11, 32, k.c('fur'), { transform: 'rotate(10 70 34)' }) +
            k.ellipse(40, 36, 5, 22, PINK, { bare: true, transform: 'rotate(-10 40 36)' }) +
            k.ellipse(70, 36, 5, 22, PINK, { bare: true, transform: 'rotate(10 70 36)' }) +
            k.ellipse(55, 116, 38, 30, k.c('fur')) +
            k.circle(55, 76, 28, k.c('fur')) +
            eyes(k, 44, 66, 74) +
            k.path(pts('52 84 58 84 55 87'), PINK, { lw: 0.4 }),
    },
    {
        id: 'deer',
        label: 'Deer',
        category: 'animals',
        tags: ['deer', 'nara', 'shika', 'fawn', 'park'],
        width: 180,
        height: 180,
        colors: { fur: '#b97a48' },
        draw: (k) =>
            [46, 64, 112, 130].map((x) => k.rect(x, 110, 9, 64, k.c('fur'), { rx: 4 })).join('') +
            k.ellipse(90, 100, 58, 30, k.c('fur')) +
            k.path(pts('128 92 140 40 160 44 150 98'), k.c('fur')) +
            k.ellipse(156, 40, 18, 14, k.c('fur')) +
            k.ellipse(140, 24, 10, 5, k.c('fur'), { transform: 'rotate(-30 140 24)' }) +
            k.circle(170, 44, 3, EYE, { bare: true }) +
            eyes(k, 154, 154, 36, 3) +
            [70, 90, 110, 80, 100]
                .map((x, i) => k.circle(x, 92 + (i % 2) * 12, 3.5, '#fbf3e4', { bare: true }))
                .join(''),
    },
    {
        id: 'frog',
        label: 'Frog',
        category: 'animals',
        tags: ['frog', 'kaeru', 'rain', 'pond'],
        width: 120,
        height: 90,
        colors: { skin: '#7cc36b' },
        draw: (k) =>
            k.ellipse(60, 60, 50, 28, k.c('skin')) +
            k.circle(36, 30, 14, k.c('skin')) +
            k.circle(84, 30, 14, k.c('skin')) +
            k.circle(36, 30, 8, '#ffffff', { lw: 0.5 }) +
            k.circle(84, 30, 8, '#ffffff', { lw: 0.5 }) +
            eyes(k, 36, 84, 30, 4) +
            k.line('M40 62 Q60 76 80 62', { lw: 0.8 }) +
            k.ellipse(30, 60, 6, 3, PINK, { bare: true }) +
            k.ellipse(90, 60, 6, 3, PINK, { bare: true }),
    },
    {
        id: 'turtle',
        label: 'Turtle',
        category: 'animals',
        tags: ['turtle', 'tortoise', 'kame', 'slow'],
        width: 160,
        height: 90,
        colors: { shell: '#5f9e5a' },
        draw: (k) =>
            [36, 112].map((x) => k.ellipse(x, 78, 12, 8, '#a8c98a')).join('') +
            k.ellipse(140, 58, 16, 13, '#a8c98a') +
            k.circle(146, 54, 2.5, EYE, { bare: true }) +
            k.path('M14 70 Q20 10 76 10 Q132 10 138 70 Z', k.c('shell')) +
            k.path(pts('58 30 94 30 104 52 76 64 48 52'), k.light('shell', 0.2), { lw: 0.6 }) +
            k.line('M58 30 L46 16 M94 30 L106 16 M48 52 L22 60 M104 52 L130 60 M76 64 L76 70', {
                lw: 0.6,
            }) +
            k.rect(14, 68, 124, 8, k.shade('shell', 0.2), { rx: 4 }),
    },
    {
        id: 'owl',
        label: 'Owl',
        category: 'animals',
        tags: ['owl', 'fukurou', 'night', 'bird', 'forest'],
        width: 110,
        height: 140,
        colors: { feather: '#9b7653' },
        draw: (k) =>
            k.path(
                'M55 14 Q100 14 100 70 Q100 132 55 132 Q10 132 10 70 Q10 14 55 14 Z',
                k.c('feather'),
            ) +
            k.path(pts('16 24 30 4 40 22'), k.c('feather')) +
            k.path(pts('70 22 80 4 94 24'), k.c('feather')) +
            k.ellipse(55, 98, 28, 28, '#f1dfc0', { bare: true }) +
            k.circle(36, 50, 16, '#ffffff') +
            k.circle(74, 50, 16, '#ffffff') +
            eyes(k, 36, 74, 50, 7) +
            k.path(pts('49 62 61 62 55 74'), '#f2b233', { lw: 0.6 }) +
            k.line('M44 94 q4 4 8 0 M58 94 q4 4 8 0 M50 108 q4 4 8 0', { lw: 0.5 }),
    },
    {
        id: 'penguin',
        label: 'Penguin',
        category: 'animals',
        tags: ['penguin', 'bird', 'aquarium', 'cute'],
        width: 100,
        height: 130,
        colors: { back: '#2f3a4a' },
        draw: (k) =>
            k.ellipse(36, 124, 14, 5, '#f2b233') +
            k.ellipse(64, 124, 14, 5, '#f2b233') +
            k.path('M50 6 Q92 6 92 72 Q92 122 50 122 Q8 122 8 72 Q8 6 50 6 Z', k.c('back')) +
            k.path('M50 30 Q78 30 78 76 Q78 116 50 116 Q22 116 22 76 Q22 30 50 30 Z', '#ffffff', {
                bare: true,
            }) +
            eyes(k, 40, 60, 40) +
            k.path(pts('44 48 56 48 50 56'), '#f2b233', { lw: 0.5 }) +
            k.ellipse(32, 54, 5, 3, PINK, { bare: true }) +
            k.ellipse(68, 54, 5, 3, PINK, { bare: true }),
    },
    {
        id: 'duck',
        label: 'Duck',
        category: 'animals',
        tags: ['duck', 'duckling', 'pond', 'bird'],
        width: 130,
        height: 100,
        colors: { feather: '#ffffff' },
        draw: (k) =>
            k.path(
                'M10 56 Q14 92 66 92 Q112 92 112 62 Q96 70 70 58 Q40 46 10 56 Z',
                k.c('feather'),
            ) +
            k.circle(92, 34, 20, k.c('feather')) +
            k.path('M108 34 Q126 32 126 40 Q120 46 108 42 Z', '#f2992b') +
            k.circle(96, 28, 3, EYE, { bare: true }) +
            k.path('M44 60 Q62 52 80 66 Q60 76 44 60 Z', k.shade('feather', 0.08), { lw: 0.5 }),
    },
];
