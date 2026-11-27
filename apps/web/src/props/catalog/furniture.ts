import type { Ink } from '../render/ink';
import { ellipsePath, pts } from '../render/shapes';
import type { PropDef } from '../types';

/** Wood grain: a few thin lines across a board. */
const grain = (k: Ink, d: string) => k.line(d, { lw: 0.35 });

/** Four legs seen from the front: back pair darker and shorter, front pair over them. */
function legs(k: Ink, x0: number, x1: number, top: number, h: number, w: number, slot: string) {
    return (
        k.rect(x0 + w * 1.6, top, w * 0.8, h * 0.82, k.shade(slot, 0.25), { lw: 0.6 }) +
        k.rect(x1 - w * 2.4, top, w * 0.8, h * 0.82, k.shade(slot, 0.25), { lw: 0.6 }) +
        k.rect(x0, top, w, h, k.c(slot), { lw: 0.8 }) +
        k.rect(x1 - w, top, w, h, k.c(slot), { lw: 0.8 })
    );
}

export const FURNITURE_PROPS: PropDef[] = [
    {
        id: 'chair',
        label: 'Chair',
        category: 'furniture',
        tags: ['wooden chair', 'seat', 'dining', 'classroom'],
        width: 120,
        height: 180,
        colors: { wood: '#b07a4a' },
        variants: ['Front', 'Side'],
        draw: (k) =>
            k.variant === 1
                ? // side view, facing right: back post and legs, seat edge
                  k.rect(22, 10, 12, 166, k.c('wood'), { rx: 3 }) +
                  k.line('M28 30 v50', { lw: 0.4 }) +
                  k.rect(34, 20, 8, 66, k.shade('wood', 0.15), { lw: 0.6 }) +
                  k.rect(94, 104, 10, 72, k.c('wood'), { rx: 3 }) +
                  k.rect(70, 104, 8, 60, k.shade('wood', 0.25), { lw: 0.6 }) +
                  k.rect(22, 94, 86, 12, k.light('wood', 0.15), { rx: 3 }) +
                  k.line('M30 150 H98', { lw: 1 })
                : k.rect(28, 10, 64, 70, k.c('wood'), { rx: 4 }) +
                  k.line('M40 22 v50 M60 22 v50 M80 22 v50', { lw: 0.4 }) +
                  legs(k, 14, 106, 98, 78, 9, 'wood') +
                  k.path(pts('22 84 98 84 108 100 12 100'), k.light('wood', 0.15)) +
                  k.rect(12, 100, 96, 8, k.shade('wood', 0.1), { lw: 0.8 }),
    },
    {
        id: 'chair-office',
        label: 'Office chair',
        category: 'furniture',
        tags: ['chair', 'desk chair', 'swivel', 'office', 'study'],
        width: 140,
        height: 200,
        colors: { seat: '#3c4a5c' },
        draw: (k) =>
            k.rect(64, 110, 12, 46, '#9aa0a8', { lw: 0.8 }) +
            k.path(pts('70 156 18 172 22 180 70 166 118 180 122 172'), '#55595f') +
            [22, 70, 118].map((x) => k.circle(x, 186, 8, '#2b2b2e')).join('') +
            k.rect(30, 8, 80, 84, k.c('seat'), { rx: 18 }) +
            k.line('M46 30 q24 -8 48 0', { lw: 0.4, color: '#ffffff', opacity: 0.6 }) +
            k.rect(16, 96, 108, 18, k.shade('seat', 0.12), { rx: 9 }) +
            k.limb('M24 104 L24 80 L44 80', 5, '#55595f') +
            k.limb('M116 104 L116 80 L96 80', 5, '#55595f'),
    },
    {
        id: 'stool',
        label: 'Stool',
        category: 'furniture',
        tags: ['seat', 'bar stool', 'kitchen'],
        width: 100,
        height: 140,
        colors: { wood: '#c58b52' },
        draw: (k) =>
            k.limbs(
                [
                    { d: 'M30 28 L14 136', width: 6 },
                    { d: 'M70 28 L86 136', width: 6 },
                    { d: 'M50 30 L50 132', width: 6 },
                    { d: 'M22 92 L78 92', width: 4 },
                ],
                k.shade('wood', 0.15),
            ) +
            k.path('M8 20 L8 30 A42 12 0 0 0 92 30 L92 20 Z', k.shade('wood', 0.1)) +
            k.ellipse(50, 20, 42, 12, k.c('wood')),
    },
    {
        id: 'armchair',
        label: 'Armchair',
        category: 'furniture',
        tags: ['chair', 'sofa', 'living room', 'cozy'],
        width: 200,
        height: 170,
        colors: { fabric: '#c4694f' },
        draw: (k) =>
            k.rect(34, 8, 132, 100, k.c('fabric'), { rx: 26 }) +
            k.rect(40, 92, 120, 40, k.light('fabric', 0.12), { rx: 10 }) +
            k.rect(6, 64, 40, 84, k.shade('fabric', 0.1), { rx: 18 }) +
            k.rect(154, 64, 40, 84, k.shade('fabric', 0.1), { rx: 18 }) +
            k.rect(30, 128, 140, 22, k.c('fabric'), { rx: 6 }) +
            k.rect(26, 150, 10, 16, '#6b4a33', { lw: 0.7 }) +
            k.rect(164, 150, 10, 16, '#6b4a33', { lw: 0.7 }),
    },
    {
        id: 'sofa',
        label: 'Sofa',
        category: 'furniture',
        tags: ['couch', 'settee', 'living room'],
        width: 300,
        height: 160,
        colors: { fabric: '#5b8ec9' },
        draw: (k) =>
            k.rect(30, 10, 240, 86, k.c('fabric'), { rx: 20 }) +
            k.line('M110 20 v70 M190 20 v70', { lw: 0.5 }) +
            [36, 116, 196]
                .map((x) => k.rect(x, 86, 76, 36, k.light('fabric', 0.15), { rx: 10 }))
                .join('') +
            k.rect(6, 56, 40, 86, k.shade('fabric', 0.12), { rx: 18 }) +
            k.rect(254, 56, 40, 86, k.shade('fabric', 0.12), { rx: 18 }) +
            k.rect(26, 120, 248, 22, k.c('fabric'), { rx: 6 }) +
            [30, 262].map((x) => k.rect(x, 142, 8, 14, '#6b4a33', { lw: 0.7 })).join(''),
    },
    {
        id: 'table',
        label: 'Table',
        category: 'furniture',
        tags: ['dining table', 'kitchen table', 'wooden'],
        width: 260,
        height: 150,
        colors: { wood: '#a8744a' },
        draw: (k) =>
            legs(k, 18, 242, 50, 96, 12, 'wood') +
            k.path(pts('28 16 232 16 252 38 8 38'), k.light('wood', 0.12)) +
            grain(k, 'M60 24 h120 M40 31 h70 M150 31 h80') +
            k.rect(8, 38, 244, 14, k.c('wood')),
    },
    {
        id: 'table-low',
        label: 'Low table',
        category: 'furniture',
        tags: ['chabudai', 'coffee table', 'japanese', 'tatami', 'round'],
        width: 220,
        height: 90,
        colors: { wood: '#9b6440' },
        draw: (k) =>
            k.rect(40, 40, 12, 44, k.shade('wood', 0.2), { lw: 0.7 }) +
            k.rect(168, 40, 12, 44, k.shade('wood', 0.2), { lw: 0.7 }) +
            k.path('M6 30 L6 40 A104 22 0 0 0 214 40 L214 30 Z', k.shade('wood', 0.1)) +
            k.ellipse(110, 30, 104, 22, k.c('wood')) +
            k.line(ellipsePath(110, 30, 76, 14), { lw: 0.35 }),
    },
    {
        id: 'desk',
        label: 'Desk',
        category: 'furniture',
        tags: ['study desk', 'office', 'writing desk', 'drawers'],
        width: 260,
        height: 160,
        colors: { wood: '#b98656' },
        draw: (k) =>
            k.rect(14, 44, 12, 112, k.c('wood'), { lw: 0.8 }) +
            k.rect(160, 44, 90, 112, k.c('wood')) +
            [52, 88, 124]
                .map(
                    (y) =>
                        k.rect(166, y, 78, 30, k.light('wood', 0.1), { lw: 0.6 }) +
                        k.rect(196, y + 12, 18, 5, '#6b4a33', { lw: 0.4, rx: 2 }),
                )
                .join('') +
            k.path(pts('20 14 240 14 254 32 6 32'), k.light('wood', 0.12)) +
            k.rect(6, 32, 248, 14, k.c('wood')),
    },
];
