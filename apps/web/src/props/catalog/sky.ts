import { n } from '../render/ink';
import { blob, mound, poly, star, streak } from '../render/shapes';
import type { PropDef } from '../types';

/**
 * A crescent: the outer circle minus an inner one (centre offset toward the upper right). The two circles
 * cross at p1 / p2; the path runs the long way round the outer circle and back along the inner one.
 */
function crescent(cx: number, cy: number, r: number, ox: number, oy: number, r2: number) {
    const dx = ox - cx;
    const dy = oy - cy;
    const d = Math.hypot(dx, dy);
    const a = (r * r - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r * r - a * a));
    const mx = cx + (dx * a) / d;
    const my = cy + (dy * a) / d;
    const p1 = [mx + (dy * h) / d, my - (dx * h) / d];
    const p2 = [mx - (dy * h) / d, my + (dx * h) / d];
    return (
        `M${n(p1[0])} ${n(p1[1])} A${n(r)} ${n(r)} 0 1 0 ${n(p2[0])} ${n(p2[1])}` +
        ` A${n(r2)} ${n(r2)} 0 0 1 ${n(p1[0])} ${n(p1[1])} Z`
    );
}

/** Points on a ring, for rays. */
const at = (cx: number, cy: number, r: number, a: number) =>
    [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];

export const SKY_PROPS: PropDef[] = [
    {
        id: 'cloud-puffy',
        label: 'Puffy cloud',
        category: 'sky',
        tags: ['cloud', 'cumulus', 'weather'],
        width: 220,
        height: 130,
        colors: { cloud: '#ffffff' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) =>
            k.path(mound(110, 120, 104, 100, 7, k.rand, 1.3), k.c('cloud')) +
            k.path('M26 116 Q110 92 194 116 Z', k.shade('cloud', 0.08), { bare: true }) +
            k.path('M6 120 L214 120', 'none'),
    },
    {
        id: 'cloud-long',
        label: 'Long cloud',
        category: 'sky',
        tags: ['cloud', 'stratus', 'weather', 'horizon'],
        width: 340,
        height: 90,
        colors: { cloud: '#ffffff' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) =>
            k.path(mound(170, 84, 164, 72, 10, k.rand, 1.2), k.c('cloud')) +
            k.path('M30 82 Q170 62 310 82 Z', k.shade('cloud', 0.08), { bare: true }),
    },
    {
        id: 'cloud-small',
        label: 'Small cloud',
        category: 'sky',
        tags: ['cloud', 'puff', 'weather'],
        width: 130,
        height: 80,
        colors: { cloud: '#ffffff' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) =>
            k.path(blob(65, 42, 54, 30, 6, k.rand, 1.3), k.c('cloud')) +
            k.line('M40 54 q12 6 26 2', { lw: 0.45 }),
    },
    {
        id: 'cloud-storm',
        label: 'Storm cloud',
        category: 'sky',
        tags: ['cloud', 'thunder', 'rain', 'dark', 'weather'],
        width: 250,
        height: 150,
        colors: { cloud: '#7d8494' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) => {
            let hatch = '';
            for (let x = 60; x <= 190; x += 13) hatch += `M${x} 104 l-10 16 `;
            return (
                k.path(blob(125, 72, 112, 60, 10, k.rand, 1.25), k.c('cloud')) +
                k.path(blob(140, 92, 70, 28, 7, k.rand, 0.8), k.shade('cloud', 0.22), {
                    bare: true,
                }) +
                k.line(hatch, { lw: 0.45 })
            );
        },
    },
    {
        id: 'cloud-wisp',
        label: 'Wispy cloud',
        category: 'sky',
        tags: ['cloud', 'cirrus', 'wind', 'streak'],
        width: 280,
        height: 70,
        colors: { cloud: '#ffffff' },
        draw: (k) =>
            k.path(streak(24, 20, 236, 16), k.c('cloud'), { lw: 0.7 }) +
            k.path(streak(62, 40, 200, 12), k.c('cloud'), { lw: 0.7 }) +
            k.path(streak(14, 57, 160, 10), k.c('cloud'), { lw: 0.7 }),
    },
    {
        id: 'sun',
        label: 'Sun',
        category: 'sky',
        tags: ['sun', 'day', 'summer', 'weather'],
        width: 170,
        height: 170,
        colors: { sun: '#ffc93c' },
        draw: (k) => {
            let rays = '';
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                rays += k.path(
                    poly([at(85, 85, 58, a - 0.13), at(85, 85, 82, a), at(85, 85, 58, a + 0.13)]),
                    k.c('sun'),
                    {
                        lw: 0.8,
                    },
                );
            }
            return (
                rays +
                k.circle(85, 85, 50, k.c('sun')) +
                k.line('M58 70 A32 32 0 0 1 80 52', { lw: 0.5, color: '#ffffff' })
            );
        },
    },
    {
        id: 'sun-burst',
        label: 'Manga sun',
        category: 'sky',
        tags: ['sun', 'glow', 'rays', 'day'],
        width: 210,
        height: 210,
        colors: { sun: '#ffdd55', glow: '#fff2b8' },
        draw: (k) => {
            let rays = '';
            for (let i = 0; i < 36; i++) {
                const a = (i / 36) * Math.PI * 2;
                const [x0, y0] = at(105, 105, 72, a);
                const [x1, y1] = at(105, 105, i % 2 ? 90 : 102, a);
                rays += `M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)} `;
            }
            return (
                k.line(rays, { lw: 0.6 }) +
                k.circle(105, 105, 66, k.c('glow'), { bare: true }) +
                k.circle(105, 105, 52, k.c('sun'))
            );
        },
    },
    {
        id: 'moon-crescent',
        label: 'Crescent moon',
        category: 'sky',
        tags: ['moon', 'night'],
        width: 150,
        height: 150,
        colors: { moon: '#fbe7a1' },
        draw: (k) => k.path(crescent(72, 78, 62, 104, 58, 52), k.c('moon')),
    },
    {
        id: 'moon-full',
        label: 'Full moon',
        category: 'sky',
        tags: ['moon', 'night'],
        width: 160,
        height: 160,
        colors: { moon: '#f6eec8' },
        draw: (k) =>
            k.circle(80, 80, 66, k.c('moon')) +
            k.ellipse(56, 62, 14, 11, k.shade('moon', 0.12), { lw: 0.4 }) +
            k.ellipse(100, 98, 18, 13, k.shade('moon', 0.12), { lw: 0.4 }) +
            k.ellipse(98, 50, 7, 6, k.shade('moon', 0.12), { lw: 0.4 }) +
            k.ellipse(60, 108, 6, 5, k.shade('moon', 0.12), { lw: 0.4 }),
    },
    {
        id: 'star',
        label: 'Star',
        category: 'sky',
        tags: ['star', 'night'],
        width: 110,
        height: 110,
        colors: { star: '#ffd84a' },
        draw: (k) => k.path(star(55, 58, 50, 21, 5), k.c('star')),
    },
    {
        id: 'stars-twinkle',
        label: 'Twinkling stars',
        category: 'sky',
        tags: ['stars', 'sparkle', 'night', 'sky'],
        width: 230,
        height: 150,
        colors: { star: '#fff3a6' },
        variants: ['Shape 1', 'Shape 2', 'Shape 3'],
        draw: (k) => {
            let out = '';
            for (let i = 0; i < 7; i++) {
                const x = 20 + k.rand() * 190;
                const y = 18 + k.rand() * 114;
                const r = 8 + k.rand() * 18;
                out += k.path(star(x, y, r, r * 0.28, 4), k.c('star'), { lw: 0.6 });
            }
            for (let i = 0; i < 9; i++)
                out += k.circle(10 + k.rand() * 210, 10 + k.rand() * 130, 2, k.c('star'), {
                    lw: 0.4,
                });
            return out;
        },
    },
    {
        id: 'rain',
        label: 'Rain',
        category: 'sky',
        tags: ['rain', 'weather', 'storm', 'drops'],
        width: 230,
        height: 230,
        colors: { drop: '#5d8fd6' },
        draw: (k) => {
            let d = '';
            for (let i = 0; i < 34; i++) {
                const x = 14 + k.rand() * 210;
                const y = 6 + k.rand() * 180;
                const l = 24 + k.rand() * 20;
                d += `M${n(x)} ${n(y)} l${n(-l * 0.22)} ${n(l)} `;
            }
            return k.stroke(d, 2.2, k.c('drop'));
        },
    },
    {
        id: 'snow',
        label: 'Snow',
        category: 'sky',
        tags: ['snow', 'winter', 'weather', 'flakes'],
        width: 230,
        height: 230,
        colors: { flake: '#ffffff' },
        draw: (k) => {
            let out = '';
            for (let i = 0; i < 30; i++)
                out += k.circle(
                    8 + k.rand() * 214,
                    8 + k.rand() * 214,
                    2.5 + k.rand() * 3.5,
                    k.c('flake'),
                    {
                        lw: 0.5,
                    },
                );
            for (let i = 0; i < 5; i++) {
                const x = 24 + k.rand() * 182;
                const y = 24 + k.rand() * 182;
                const r = 9 + k.rand() * 5;
                const arms = [0, 60, 120].map((deg) => {
                    const a = (deg * Math.PI) / 180;
                    const dx = Math.cos(a) * r;
                    const dy = Math.sin(a) * r;
                    return {
                        d: `M${n(x - dx)} ${n(y - dy)} L${n(x + dx)} ${n(y + dy)}`,
                        width: 2.4,
                    };
                });
                out += k.limbs(arms, k.c('flake'));
            }
            return out;
        },
    },
    {
        id: 'speed-lines',
        label: 'Speed lines',
        category: 'sky',
        tags: ['speed', 'motion', 'wind', 'manga', 'effect'],
        width: 320,
        height: 170,
        colors: { line: '#141414' },
        draw: (k) => {
            let out = '';
            for (let i = 0; i < 22; i++) {
                const y = 6 + ((i + k.rand() * 0.8) / 22) * 158;
                const l = 120 + k.rand() * 190;
                out += k.path(streak(316 - l, y, l, 2 + k.rand() * 4), k.c('line'), { bare: true });
            }
            return out;
        },
    },
    {
        id: 'lightning',
        label: 'Lightning bolt',
        category: 'sky',
        tags: ['lightning', 'thunder', 'storm', 'flash'],
        width: 110,
        height: 220,
        colors: { bolt: '#ffe14d' },
        draw: (k) =>
            k.path(
                poly([
                    [62, 4],
                    [18, 112],
                    [52, 112],
                    [30, 216],
                    [94, 88],
                    [58, 88],
                    [84, 4],
                ]),
                k.c('bolt'),
            ),
    },
    {
        id: 'rainbow',
        label: 'Rainbow',
        category: 'sky',
        tags: ['rainbow', 'weather', 'colorful'],
        width: 320,
        height: 170,
        colors: {
            red: '#ef5350',
            orange: '#ffa04d',
            yellow: '#ffe066',
            green: '#7ccf73',
            blue: '#5fa8e8',
            violet: '#9a7ad8',
        },
        draw: (k) => {
            const slots = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];
            const band = 14;
            const arc = (r: number) =>
                `M${n(160 - r)} 166 A${n(r)} ${n(r)} 0 0 1 ${n(160 + r)} 166`;
            const bands = slots
                .map((s, i) => k.stroke(arc(150 - band / 2 - i * band), band, k.c(s)))
                .join('');
            return (
                bands +
                k.line(arc(150), { lw: 1 }) +
                k.line(arc(150 - band * slots.length), { lw: 1 })
            );
        },
    },
    {
        id: 'birds',
        label: 'Flying birds',
        category: 'sky',
        tags: ['birds', 'gulls', 'flock', 'sky'],
        width: 220,
        height: 100,
        colors: { bird: '#141414' },
        draw: (k) => {
            let d = '';
            for (let i = 0; i < 6; i++) {
                const x = 24 + k.rand() * 172;
                const y = 26 + k.rand() * 60;
                const w = 9 + k.rand() * 10;
                d += `M${n(x - w)} ${n(y)} Q${n(x - w / 2)} ${n(y - w * 0.7)} ${n(x)} ${n(y)} Q${n(x + w / 2)} ${n(y - w * 0.7)} ${n(x + w)} ${n(y)} `;
            }
            return k.stroke(d, 3, k.c('bird'));
        },
    },
];
