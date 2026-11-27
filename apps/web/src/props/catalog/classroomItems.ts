import { blob, pts } from '../render/shapes';
import type { PropDef } from '../types';

/** Small school things: bags, clock, globe, books, stationery. */
export const CLASSROOM_ITEM_PROPS: PropDef[] = [
    {
        id: 'randoseru',
        label: 'Randoseru',
        category: 'classroom',
        tags: ['school bag', 'backpack', 'elementary', 'japan', 'kid'],
        width: 130,
        height: 150,
        colors: { leather: '#c7364a' },
        draw: (k) =>
            k.rect(14, 22, 102, 120, k.shade('leather', 0.1), { rx: 14 }) +
            k.path('M14 40 Q14 10 65 10 Q116 10 116 40 L116 112 L14 112 Z', k.c('leather')) +
            k.line('M24 40 Q24 20 65 20 Q106 20 106 40', { lw: 0.4 }) +
            k.rect(55, 96, 20, 22, '#e2c06a', { rx: 3, lw: 0.6 }) +
            k.rect(20, 132, 90, 6, '#3a3a40', { lw: 0.4 }),
    },
    {
        id: 'school-bag',
        label: 'School bag',
        category: 'classroom',
        tags: ['briefcase', 'satchel', 'gakuseikaban', 'student', 'bag'],
        width: 180,
        height: 130,
        colors: { bag: '#2f3a55' },
        draw: (k) =>
            k.limb('M64 34 Q64 10 90 10 Q116 10 116 34', 7, '#1f2738') +
            k.rect(10, 32, 160, 92, k.c('bag'), { rx: 8 }) +
            k.path(
                'M10 40 Q10 32 18 32 L162 32 Q170 32 170 40 L170 66 L10 66 Z',
                k.light('bag', 0.12),
            ) +
            k.rect(80, 58, 20, 16, '#c9ccd1', { rx: 2, lw: 0.6 }) +
            k.circle(150, 104, 7, '#f7c6d6', { lw: 0.5 }),
    },
    {
        id: 'wall-clock',
        label: 'Wall clock',
        category: 'classroom',
        tags: ['clock', 'time', 'classroom', 'school'],
        width: 120,
        height: 120,
        colors: { frame: '#3a3a40' },
        noShadow: true,
        draw: (k) => {
            let ticks = '';
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                const r0 = i % 3 ? 40 : 36;
                ticks += `M${(60 + Math.cos(a) * r0).toFixed(1)} ${(60 + Math.sin(a) * r0).toFixed(1)} L${(60 + Math.cos(a) * 44).toFixed(1)} ${(60 + Math.sin(a) * 44).toFixed(1)} `;
            }
            return (
                k.circle(60, 60, 54, k.c('frame')) +
                k.circle(60, 60, 47, '#ffffff', { lw: 0.6 }) +
                k.line(ticks, { lw: 0.6 }) +
                k.limb('M60 60 L60 30', 3, '#3a3a40') +
                k.limb('M60 60 L80 70', 3, '#3a3a40') +
                k.line('M60 66 L60 20', { lw: 0.4, color: '#e04848' }) +
                k.circle(60, 60, 3, '#e04848', { bare: true })
            );
        },
    },
    {
        id: 'globe',
        label: 'Globe',
        category: 'classroom',
        tags: ['world', 'earth', 'geography', 'map'],
        width: 120,
        height: 170,
        colors: { sea: '#6fb6e6', land: '#7cc36b' },
        draw: (k) =>
            k.path(pts('34 158 86 158 80 166 40 166'), '#7a5236') +
            k.limb('M60 132 L60 158', 5, '#9b8a5a') +
            k.circle(60, 64, 48, k.c('sea')) +
            k.path(blob(46, 50, 20, 16, 6, k.rand, 0.9), k.c('land'), { lw: 0.6 }) +
            k.path(blob(78, 84, 14, 18, 6, k.rand, 0.9), k.c('land'), { lw: 0.6 }) +
            k.path(blob(84, 36, 8, 6, 5, k.rand, 0.9), k.c('land'), { lw: 0.6 }) +
            k.stroke('M20 26 A56 56 0 0 0 98 130', 4, '#c9a24a') +
            k.line('M20 26 A56 56 0 0 0 98 130', { lw: 0.4 }),
    },
    {
        id: 'books',
        label: 'Stack of books',
        category: 'classroom',
        tags: ['books', 'textbooks', 'study', 'library', 'homework'],
        width: 160,
        height: 120,
        colors: { cover: '#4a7bd0' },
        draw: (k) =>
            [
                [14, 90, 132, '#c7364a'],
                [22, 66, 120, 'cover'],
                [10, 44, 128, '#5aa05a'],
                [28, 22, 108, '#e2b84a'],
            ]
                .map(([x, y, w, c]) => {
                    const color = c === 'cover' ? k.c('cover') : String(c);
                    return (
                        k.rect(Number(x), Number(y), Number(w), 22, color, { rx: 2 }) +
                        k.rect(Number(x) + Number(w) - 14, Number(y) + 4, 10, 14, '#f6f2e6', {
                            lw: 0.4,
                        })
                    );
                })
                .join(''),
    },
    {
        id: 'notebook',
        label: 'Open notebook',
        category: 'classroom',
        tags: ['notebook', 'notes', 'homework', 'diary', 'paper'],
        width: 180,
        height: 120,
        colors: { paper: '#fbfaf5' },
        draw: (k) => {
            let lines = '';
            for (let y = 30; y < 104; y += 10) lines += `M18 ${y} H84 M96 ${y} H162 `;
            return (
                k.path(
                    'M6 14 Q48 6 90 16 Q132 6 174 14 L174 112 Q132 104 90 114 Q48 104 6 112 Z',
                    k.c('paper'),
                ) +
                k.line(lines, { lw: 0.35, color: '#8fb3d9' }) +
                k.line('M90 16 L90 114', { lw: 0.7 }) +
                k.line('M22 40 q10 -6 20 0 q10 6 20 0 M100 50 h40', { lw: 0.5 })
            );
        },
    },
    {
        id: 'pencil-case',
        label: 'Pencil case',
        category: 'classroom',
        tags: ['pencil case', 'pouch', 'stationery', 'school'],
        width: 180,
        height: 80,
        colors: { cloth: '#f2a7c3' },
        draw: (k) =>
            k.rect(8, 12, 164, 60, k.c('cloth'), { rx: 26 }) +
            k.stroke('M28 24 H152', 4, '#ffffff') +
            k.line('M28 24 H152', { lw: 0.5 }) +
            k.rect(148, 18, 10, 14, '#c9ccd1', { rx: 2, lw: 0.5 }) +
            k.circle(60, 50, 8, '#ffffff', { lw: 0.5 }) +
            k.circle(60, 50, 3, '#e04848', { bare: true }),
    },
    {
        id: 'pencil',
        label: 'Pencil',
        category: 'classroom',
        tags: ['pencil', 'write', 'stationery', 'draw'],
        width: 200,
        height: 40,
        colors: { body: '#f2c230' },
        draw: (k) =>
            k.rect(6, 10, 20, 20, '#f2a7c3', { rx: 3 }) +
            k.rect(24, 9, 14, 22, '#c9ccd1') +
            k.rect(36, 9, 124, 22, k.c('body')) +
            k.line('M36 16 H160 M36 24 H160', { lw: 0.35 }) +
            k.path(pts('160 9 194 20 160 31'), '#efd3a8') +
            k.path(pts('184 17 194 20 184 23'), '#3a3a40', { lw: 0.4 }),
    },
];
