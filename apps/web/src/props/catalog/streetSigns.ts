import { pts } from '../render/shapes';
import type { PropDef } from '../types';

const POLE = '#8d969f';

/** Signs and small street items (no lettering: Fabric's SVG loader keeps no text, the user adds Text). */
export const STREET_SIGN_PROPS: PropDef[] = [
    {
        id: 'post-box',
        label: 'Post box',
        category: 'street',
        tags: ['mailbox', 'postbox', 'post', 'letter', 'japan', 'red'],
        width: 100,
        height: 180,
        colors: { box: '#d8433c' },
        draw: (k) =>
            k.rect(36, 150, 28, 26, k.shade('box', 0.25)) +
            k.path('M14 40 Q14 6 50 6 Q86 6 86 40 L86 152 L14 152 Z', k.c('box')) +
            k.rect(28, 46, 44, 8, '#2f2f33', { rx: 3 }) +
            k.rect(30, 70, 40, 30, '#ffffff', { lw: 0.6 }) +
            k.line('M36 80 h28 M36 90 h20', { lw: 0.5 }) +
            k.line('M22 40 Q22 14 50 12', { lw: 0.9, color: '#ffffff' }),
    },
    {
        id: 'fire-hydrant',
        label: 'Fire hydrant',
        category: 'street',
        tags: ['hydrant', 'fire', 'sidewalk', 'red'],
        width: 100,
        height: 130,
        colors: { body: '#d8433c' },
        draw: (k) =>
            k.rect(10, 52, 80, 18, k.shade('body', 0.1), { rx: 8 }) +
            k.path('M26 34 Q26 10 50 10 Q74 10 74 34 L78 112 L22 112 Z', k.c('body')) +
            k.circle(50, 61, 9, k.shade('body', 0.25)) +
            k.rect(42, 2, 16, 10, k.shade('body', 0.2), { rx: 2 }) +
            k.rect(14, 112, 72, 12, k.shade('body', 0.2), { rx: 3 }),
    },
    {
        id: 'traffic-cone',
        label: 'Traffic cone',
        category: 'street',
        tags: ['cone', 'roadwork', 'construction', 'pylon'],
        width: 90,
        height: 110,
        colors: { cone: '#f2792b' },
        draw: (k) =>
            k.rect(4, 94, 82, 12, k.shade('cone', 0.2), { rx: 3 }) +
            k.path(pts('38 6 52 6 74 96 16 96'), k.c('cone')) +
            k.path(pts('33 30 57 30 62 50 28 50'), '#ffffff', { lw: 0.6 }) +
            k.path(pts('25 62 65 62 70 80 20 80'), '#ffffff', { lw: 0.6 }),
    },
    {
        id: 'stop-sign',
        label: 'Stop sign',
        category: 'street',
        tags: ['sign', 'stop', 'road sign', 'traffic'],
        width: 110,
        height: 240,
        colors: { sign: '#d8433c' },
        draw: (k) => {
            const oct = (r: number) => {
                const p: string[] = [];
                for (let i = 0; i < 8; i++) {
                    const a = Math.PI / 8 + (i * Math.PI) / 4;
                    p.push(
                        `${(55 + Math.cos(a) * r).toFixed(1)} ${(55 + Math.sin(a) * r).toFixed(1)}`,
                    );
                }
                return pts(p.join(' '));
            };
            return (
                k.limb('M55 100 L55 236', 6, POLE) +
                k.path(oct(50), k.c('sign')) +
                k.stroke(oct(43), 3, '#ffffff') +
                k.rect(28, 48, 54, 14, '#ffffff', { rx: 3, bare: true })
            );
        },
    },
    {
        id: 'direction-sign',
        label: 'Direction sign',
        category: 'street',
        tags: ['signpost', 'arrow', 'road sign', 'way'],
        width: 170,
        height: 240,
        colors: { sign: '#2f7fd1', second: '#3f8f5a' },
        draw: (k) =>
            k.limb('M85 30 L85 236', 7, POLE) +
            k.path(pts('20 20 136 20 160 40 136 60 20 60'), k.c('sign')) +
            k.path(pts('150 70 34 70 10 90 34 110 150 110'), k.c('second')) +
            k.line('M34 40 h80 M52 90 h80', { lw: 1.4, color: '#ffffff' }),
    },
    {
        id: 'bus-stop',
        label: 'Bus stop',
        category: 'street',
        tags: ['bus', 'stop sign', 'timetable', 'station'],
        width: 120,
        height: 260,
        colors: { sign: '#2f9e5b' },
        draw: (k) =>
            k.path(pts('36 246 84 246 80 256 40 256'), '#55595f') +
            k.limb('M60 70 L60 248', 6, POLE) +
            k.circle(60, 40, 34, k.c('sign')) +
            k.circle(60, 40, 26, '#ffffff', { lw: 0.6 }) +
            k.rect(46, 30, 28, 16, k.c('sign'), { rx: 3, bare: true }) +
            k.circle(52, 48, 3, '#2f2f33', { bare: true }) +
            k.circle(68, 48, 3, '#2f2f33', { bare: true }) +
            k.rect(40, 110, 40, 56, '#ffffff', { lw: 0.8 }) +
            k.line('M46 122 h28 M46 132 h28 M46 142 h20 M46 152 h24', { lw: 0.4 }),
    },
    {
        id: 'trash-can',
        label: 'Trash can',
        category: 'street',
        tags: ['bin', 'garbage', 'rubbish', 'litter', 'park'],
        width: 100,
        height: 130,
        colors: { bin: '#4f7d63' },
        draw: (k) =>
            k.path(pts('16 30 84 30 78 124 22 124'), k.c('bin')) +
            k.line('M34 42 L36 116 M50 42 L50 116 M66 42 L64 116', { lw: 0.5 }) +
            k.rect(8, 18, 84, 14, k.shade('bin', 0.15), { rx: 4 }) +
            k.rect(40, 8, 20, 10, k.shade('bin', 0.25), { rx: 3 }),
    },
];
