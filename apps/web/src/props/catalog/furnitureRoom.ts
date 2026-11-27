import { pts } from '../render/shapes';
import type { PropDef } from '../types';
import { GLASS } from './vehicles';

/** Room furniture and fittings: beds, storage, lamps, windows, doors, curtains. */
export const ROOM_PROPS: PropDef[] = [
    {
        id: 'bed',
        label: 'Bed',
        category: 'furniture',
        tags: ['bedroom', 'sleep', 'pillow', 'blanket'],
        width: 300,
        height: 170,
        colors: { blanket: '#8bb8e8', wood: '#a8744a' },
        draw: (k) =>
            k.rect(6, 14, 22, 150, k.c('wood'), { rx: 4 }) +
            k.rect(272, 70, 22, 94, k.c('wood'), { rx: 4 }) +
            k.rect(28, 96, 244, 40, k.c('wood')) +
            k.rect(28, 70, 244, 30, '#fbfaf5', { rx: 6 }) +
            k.rect(36, 48, 70, 32, '#ffffff', { rx: 14 }) +
            k.path(
                'M96 66 L268 66 Q276 66 276 76 L276 120 L96 120 Q88 92 96 66 Z',
                k.c('blanket'),
            ) +
            k.path(
                'M96 66 L132 66 Q122 92 132 120 L96 120 Q88 92 96 66 Z',
                k.light('blanket', 0.3),
            ) +
            k.line('M150 80 q30 10 60 0 M170 100 q30 8 70 -2', { lw: 0.4 }),
    },
    {
        id: 'bookshelf',
        label: 'Bookshelf',
        category: 'furniture',
        tags: ['shelf', 'books', 'library', 'bookcase'],
        width: 160,
        height: 240,
        colors: { wood: '#8f5e3b' },
        draw: (k) => {
            const BOOKS = [
                '#d45d5d',
                '#4a7bd0',
                '#e2b84a',
                '#5aa05a',
                '#8e6fc1',
                '#e8875a',
                '#3f8f8a',
            ];
            let books = '';
            for (const y of [16, 72, 128, 184]) {
                let x = 18;
                while (x < 130) {
                    const w = 8 + Math.floor(k.rand() * 9);
                    const h = 34 + Math.floor(k.rand() * 14);
                    if (x + w > 142) break;
                    const lean = k.rand() > 0.88;
                    books += k.rect(
                        x,
                        y + 48 - h,
                        w,
                        h,
                        BOOKS[Math.floor(k.rand() * BOOKS.length)],
                        {
                            lw: 0.6,
                            transform: lean ? `rotate(8 ${x + w} ${y + 48})` : undefined,
                        },
                    );
                    x += w + (lean ? 6 : 1);
                }
            }
            return (
                k.rect(6, 6, 148, 230, k.c('wood')) +
                k.rect(14, 14, 132, 214, k.shade('wood', 0.3), { lw: 0.6 }) +
                books +
                [64, 120, 176].map((y) => k.rect(14, y, 132, 8, k.c('wood'), { lw: 0.6 })).join('')
            );
        },
    },
    {
        id: 'wardrobe',
        label: 'Wardrobe',
        category: 'furniture',
        tags: ['closet', 'cupboard', 'cabinet', 'bedroom'],
        width: 170,
        height: 250,
        colors: { wood: '#c39060' },
        draw: (k) =>
            k.rect(4, 6, 162, 14, k.shade('wood', 0.1), { rx: 3 }) +
            k.rect(10, 20, 150, 214, k.c('wood')) +
            k.line('M85 26 v204', { lw: 0.8 }) +
            k.rect(20, 32, 56, 190, k.light('wood', 0.1), { lw: 0.5 }) +
            k.rect(94, 32, 56, 190, k.light('wood', 0.1), { lw: 0.5 }) +
            k.circle(78, 128, 4, '#6b4a33', { lw: 0.5 }) +
            k.circle(92, 128, 4, '#6b4a33', { lw: 0.5 }) +
            k.rect(16, 234, 10, 12, '#6b4a33', { lw: 0.6 }) +
            k.rect(144, 234, 10, 12, '#6b4a33', { lw: 0.6 }),
    },
    {
        id: 'drawers',
        label: 'Chest of drawers',
        category: 'furniture',
        tags: ['dresser', 'cabinet', 'drawer', 'bedroom'],
        width: 170,
        height: 160,
        colors: { wood: '#d1a06d' },
        draw: (k) =>
            k.rect(6, 8, 158, 12, k.shade('wood', 0.1), { rx: 3 }) +
            k.rect(12, 20, 146, 126, k.c('wood')) +
            [28, 66, 104]
                .map(
                    (y) =>
                        k.rect(20, y, 130, 32, k.light('wood', 0.12), { lw: 0.6 }) +
                        k.rect(72, y + 13, 26, 6, '#6b4a33', { rx: 3, lw: 0.4 }),
                )
                .join('') +
            k.rect(16, 146, 10, 10, '#6b4a33', { lw: 0.6 }) +
            k.rect(144, 146, 10, 10, '#6b4a33', { lw: 0.6 }),
    },
    {
        id: 'floor-lamp',
        label: 'Floor lamp',
        category: 'furniture',
        tags: ['lamp', 'light', 'living room', 'standing lamp'],
        width: 100,
        height: 250,
        colors: { shade: '#f3dfa2' },
        draw: (k) =>
            k.path('M16 236 Q50 222 84 236 L84 244 L16 244 Z', '#55595f') +
            k.limb('M50 72 L50 232', 5, '#55595f') +
            k.path(pts('24 10 76 10 94 72 6 72'), k.c('shade')) +
            k.line('M30 22 L22 64 M70 22 L78 64', { lw: 0.35 }) +
            k.path('M20 72 L80 72 L96 110 L4 110 Z', k.light('shade', 0.5), {
                bare: true,
                opacity: 0.35,
            }),
    },
    {
        id: 'window',
        label: 'Window',
        category: 'furniture',
        tags: ['window', 'glass', 'room', 'classroom', 'frame'],
        width: 180,
        height: 200,
        colors: { frame: '#f4f1ea' },
        noShadow: true,
        draw: (k) =>
            k.rect(10, 8, 160, 172, k.c('frame')) +
            [
                [22, 20],
                [94, 20],
                [22, 98],
                [94, 98],
            ]
                .map(
                    ([x, y]) =>
                        k.rect(x, y, 64, 70, GLASS, { lw: 0.7 }) +
                        k.line(
                            `M${x + 12} ${y + 40} L${x + 40} ${y + 12} M${x + 22} ${y + 52} L${x + 50} ${y + 24}`,
                            { lw: 0.6, color: '#ffffff' },
                        ),
                )
                .join('') +
            k.rect(2, 180, 176, 12, k.shade('frame', 0.1), { rx: 2 }),
    },
    {
        id: 'door',
        label: 'Door',
        category: 'furniture',
        tags: ['door', 'entrance', 'room', 'wooden'],
        width: 130,
        height: 250,
        colors: { wood: '#9b6b43' },
        draw: (k) =>
            k.rect(4, 4, 122, 242, k.shade('wood', 0.25)) +
            k.rect(12, 12, 106, 234, k.c('wood')) +
            [
                [24, 26, 82, 80],
                [24, 124, 36, 104],
                [70, 124, 36, 104],
            ]
                .map(([x, y, w, h]) => k.rect(x, y, w, h, k.light('wood', 0.1), { lw: 0.6 }))
                .join('') +
            k.circle(104, 122, 6, '#e2c06a', { lw: 0.6 }),
    },
    {
        id: 'curtains',
        label: 'Curtains',
        category: 'furniture',
        tags: ['curtain', 'drapes', 'window', 'room'],
        width: 220,
        height: 240,
        colors: { fabric: '#d96c7d' },
        noShadow: true,
        draw: (k) =>
            k.limb('M6 12 L214 12', 5, '#8a6a4a') +
            k.path('M10 16 L86 16 Q70 110 46 128 Q66 170 60 236 L10 236 Z', k.c('fabric')) +
            k.path('M210 16 L134 16 Q150 110 174 128 Q154 170 160 236 L210 236 Z', k.c('fabric')) +
            k.line(
                'M26 20 Q34 120 22 232 M44 20 Q50 100 40 126 M194 20 Q186 120 198 232 M176 20 Q170 100 180 126',
                { lw: 0.4 },
            ) +
            k.rect(36, 120, 22, 10, k.shade('fabric', 0.2), { rx: 4 }) +
            k.rect(162, 120, 22, 10, k.shade('fabric', 0.2), { rx: 4 }),
    },
];
