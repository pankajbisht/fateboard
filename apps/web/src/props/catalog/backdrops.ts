import type { Ink } from '../render/ink';
import { n } from '../render/ink';
import { mound, pts, star, streak } from '../render/shapes';
import type { PropDef } from '../types';
import { blossom } from './japan';
import { GLASS } from './vehicles';

/** Every backdrop is a 400 × 260 panel plate: put it on the background layer and scale it to the panel. */
const W = 400;
const H = 260;

/** Posterised sky: flat bands from top to horizon (manga tone steps, no gradients: Fabric keeps them flat). */
function bands(k: Ink, colors: string[], bottom = H) {
    const h = bottom / colors.length;
    return colors.map((c, i) => k.rect(0, i * h, W, h + 1, c, { bare: true })).join('');
}

const base = (
    id: string,
    label: string,
    tags: string[],
    colors: Record<string, string>,
    draw: (k: Ink) => string,
): PropDef => ({
    id,
    label,
    category: 'backdrops',
    tags: ['background', 'backdrop', 'panel', ...tags],
    width: W,
    height: H,
    colors,
    draw,
});

export const BACKDROP_PROPS: PropDef[] = [
    base(
        'sky-day',
        'Day sky',
        ['sky', 'day', 'clouds', 'blue'],
        { sky: '#8ccaf0' },
        (k) =>
            bands(k, [
                k.shade('sky', 0.12),
                k.c('sky'),
                k.light('sky', 0.25),
                k.light('sky', 0.5),
            ]) +
            k.path(mound(110, 120, 80, 60, 6, k.rand, 1.2), '#ffffff', { lw: 0.6 }) +
            k.path(mound(300, 80, 60, 40, 5, k.rand, 1.2), '#ffffff', { lw: 0.6 }),
    ),
    base(
        'sky-sunset',
        'Sunset sky',
        ['sunset', 'evening', 'dusk', 'orange'],
        { sky: '#f29a5a' },
        (k) =>
            bands(k, ['#6a5a9a', '#b86a8a', k.c('sky'), '#f6c77a']) +
            k.circle(200, 206, 50, '#ffe08a', { lw: 0.6 }) +
            k.path(streak(40, 110, 160, 8), '#f6c3a0', { bare: true }) +
            k.path(streak(220, 140, 140, 6), '#f6c3a0', { bare: true }),
    ),
    base('sky-night', 'Night sky', ['night', 'stars', 'moon', 'dark'], { sky: '#1f2a4a' }, (k) => {
        let stars = '';
        for (let i = 0; i < 40; i++)
            stars += k.circle(
                4 + k.rand() * 392,
                4 + k.rand() * 252,
                1 + k.rand() * 1.6,
                '#fff8d8',
                { bare: true },
            );
        for (let i = 0; i < 5; i++)
            stars += k.path(star(20 + k.rand() * 360, 20 + k.rand() * 200, 7, 2, 4), '#fff8d8', {
                bare: true,
            });
        return (
            bands(k, [k.shade('sky', 0.3), k.c('sky'), k.light('sky', 0.12)]) +
            stars +
            k.circle(320, 60, 28, '#fbe7a1', { lw: 0.6 })
        );
    }),
    base(
        'classroom-wall',
        'Classroom',
        ['classroom', 'school', 'blackboard', 'interior'],
        { wall: '#efe6d2' },
        (k) =>
            k.rect(0, 0, W, 200, k.c('wall'), { bare: true }) +
            k.rect(0, 200, W, 60, '#c9a06a', { bare: true }) +
            k.line('M0 200 H400 M0 220 H400 M0 240 H400', { lw: 0.35 }) +
            k.rect(40, 40, 220, 110, '#9b6b43') +
            k.rect(48, 48, 204, 94, '#2f5d46') +
            k.rect(290, 30, 90, 130, GLASS) +
            k.line('M335 30 V160 M290 95 H380', { lw: 0.6 }) +
            k.circle(150, 20, 12, '#ffffff', { lw: 0.6 }),
    ),
    base(
        'school-hallway',
        'School hallway',
        ['hallway', 'corridor', 'school', 'perspective', 'interior'],
        { wall: '#ece5d6' },
        (k) => {
            let windows = '';
            for (let i = 0; i < 4; i++) {
                const t0 = i / 4;
                const t1 = t0 + 0.18;
                const x0 = 270 + t0 * 120;
                const x1 = 270 + t1 * 120;
                windows += k.path(
                    pts(
                        `${x0} ${100 - t0 * 70} ${x1} ${100 - t1 * 70} ${x1} ${150 + t1 * 40} ${x0} ${150 + t0 * 40}`,
                    ),
                    GLASS,
                    { lw: 0.5 },
                );
            }
            return (
                k.rect(0, 0, W, H, k.c('wall'), { bare: true }) +
                k.path(pts('0 260 160 150 240 150 400 260'), '#b9a888', { bare: true }) +
                k.path(pts('160 70 240 70 240 150 160 150'), k.light('wall', 0.4), { lw: 0.6 }) +
                k.line(
                    'M0 0 L160 70 M400 0 L240 70 M0 260 L160 150 M400 260 L240 150 M0 210 L160 136',
                    { lw: 0.6 },
                ) +
                windows
            );
        },
    ),
    base(
        'rooftop',
        'School rooftop',
        ['rooftop', 'school', 'fence', 'sky', 'lunch', 'confession'],
        { sky: '#9fd2f2' },
        (k) => {
            let fence = '';
            // chain-link diagonals, clipped to the plate's width
            for (let x = -60; x <= W; x += 16) {
                const t0 = Math.max(0, -x / 60);
                const t1 = Math.min(1, (W - x) / 60);
                if (t1 <= t0) continue;
                const at = (t: number, up: boolean) =>
                    `${n(x + 60 * t)} ${n(up ? 190 - 80 * t : 110 + 80 * t)}`;
                fence += `M${at(t0, true)} L${at(t1, true)} M${at(t0, false)} L${at(t1, false)} `;
            }
            return (
                bands(k, [k.c('sky'), k.light('sky', 0.3)], 190) +
                k.path(mound(80, 160, 70, 40, 5, k.rand, 1.1), '#ffffff', { lw: 0.6 }) +
                `<g opacity="0.8">${k.line(fence, { lw: 0.6, color: '#6f8a7a' })}</g>` +
                k.line('M0 106 H400 M0 112 H400', { lw: 2, color: '#6f8a7a' }) +
                k.rect(0, 190, W, 70, '#b5b0a6', { bare: true }) +
                k.line(
                    'M0 190 H400 M0 220 L60 260 M120 190 L100 260 M240 190 L260 260 M360 190 L400 230',
                    { lw: 0.5 },
                )
            );
        },
    ),
    base(
        'bedroom',
        'Bedroom',
        ['bedroom', 'room', 'interior', 'home', 'window'],
        { wall: '#f4dfe4' },
        (k) =>
            k.rect(0, 0, W, 210, k.c('wall'), { bare: true }) +
            k.rect(0, 210, W, 50, '#c9a06a', { bare: true }) +
            k.rect(150, 40, 110, 90, GLASS) +
            k.line('M205 40 V130 M150 85 H260', { lw: 0.6 }) +
            k.path('M140 36 L180 36 Q170 90 150 140 L140 140 Z', '#f7a8c0', { lw: 0.6 }) +
            k.path('M270 36 L230 36 Q240 90 260 140 L270 140 Z', '#f7a8c0', { lw: 0.6 }) +
            k.rect(40, 60, 60, 80, '#fff3a6', { lw: 0.6 }) +
            k.rect(290, 170, 110, 50, '#8bb8e8') +
            k.line('M0 210 H400', { lw: 0.6 }),
    ),
    base(
        'street-view',
        'Street',
        ['street', 'town', 'city', 'perspective', 'road', 'outside'],
        { sky: '#a8d8f5' },
        (k) => {
            const blocks = (side: -1 | 1) => {
                let out = '';
                for (let i = 0; i < 4; i++) {
                    const t0 = i / 4;
                    const t1 = (i + 1) / 4;
                    const x0 = 200 + side * (200 - t0 * 150);
                    const x1 = 200 + side * (200 - t1 * 150);
                    const top0 = 30 + t0 * 50 + (i % 2) * 20;
                    const top1 = 30 + t1 * 50 + (i % 2) * 20;
                    out += k.path(
                        pts(
                            `${x0} ${top0} ${x1} ${top1} ${x1} ${200 - t1 * 40} ${x0} ${200 - t0 * 40}`,
                        ),
                        ['#e6ddd0', '#d9c8b4', '#c9d3dc', '#efe3c8'][i],
                        { lw: 0.6 },
                    );
                }
                return out;
            };
            return (
                k.rect(0, 0, W, H, k.c('sky'), { bare: true }) +
                k.path(pts('0 260 160 160 240 160 400 260'), '#6d737a', { bare: true }) +
                k.line('M200 166 V180 M200 196 V216 M200 234 V260', { lw: 2, color: '#ffffff' }) +
                blocks(-1) +
                blocks(1)
            );
        },
    ),
    base(
        'tatami-room',
        'Tatami room',
        ['washitsu', 'japanese room', 'tatami', 'shoji', 'interior'],
        { tatami: '#cfd59a' },
        (k) => {
            let grid = '';
            for (const x of [50, 100, 150, 250, 300, 350]) grid += `M${x} 20 V150 `;
            for (let y = 46; y < 150; y += 26) grid += `M10 ${y} H190 M210 ${y} H390 `;
            return (
                k.rect(0, 0, W, 160, '#e6d6b8', { bare: true }) +
                k.rect(10, 20, 180, 130, '#fbf6e9', { lw: 0.6 }) +
                k.rect(210, 20, 180, 130, '#fbf6e9', { lw: 0.6 }) +
                k.line(grid, { lw: 1.2, color: '#b98656' }) +
                k.path(pts('0 160 400 160 400 260 0 260'), k.c('tatami'), { bare: true }) +
                k.line('M0 160 H400 M120 160 L60 260 M280 160 L340 260 M0 210 H400', { lw: 0.6 })
            );
        },
    ),
    base(
        'beach',
        'Beach',
        ['beach', 'sea', 'ocean', 'summer', 'sand'],
        { sea: '#4fb3d9' },
        (k) =>
            bands(k, ['#a8dcf5', '#c9ebfa'], 120) +
            k.rect(0, 120, W, 70, k.c('sea'), { bare: true }) +
            k.line('M20 140 q20 -6 40 0 M140 156 q20 -6 40 0 M260 136 q20 -6 40 0', {
                lw: 0.6,
                color: '#ffffff',
            }) +
            k.path('M0 190 Q100 176 200 188 Q300 200 400 184 L400 260 L0 260 Z', '#f2dfae', {
                bare: true,
            }) +
            k.line('M0 190 Q100 176 200 188 Q300 200 400 184', { lw: 0.6 }) +
            k.path(mound(320, 60, 50, 30, 5, k.rand, 1.2), '#ffffff', { lw: 0.6 }),
    ),
    base(
        'flower-backdrop',
        'Flower backdrop',
        ['shoujo', 'flowers', 'romance', 'sparkle', 'manga effect'],
        { petal: '#f7c6d6' },
        (k) => {
            let flowers = '';
            for (let i = 0; i < 14; i++)
                flowers += blossom(
                    k,
                    36 + k.rand() * 328,
                    36 + k.rand() * 188,
                    14 + k.rand() * 18,
                    i % 3 ? k.c('petal') : '#ffffff',
                    Math.round(k.rand() * 72),
                );
            return k.rect(0, 0, W, H, '#fff6f9', { bare: true }) + flowers;
        },
    ),
    base(
        'bubble-backdrop',
        'Bubble backdrop',
        ['shoujo', 'bubbles', 'dreamy', 'romance', 'manga effect'],
        { bubble: '#cfe8f7' },
        (k) => {
            let bubbles = '';
            for (let i = 0; i < 22; i++) {
                const r = 8 + k.rand() * 30;
                const x = r + k.rand() * (W - 2 * r);
                const y = r + k.rand() * (H - 2 * r);
                bubbles +=
                    k.circle(x, y, r, k.c('bubble'), { lw: 0.5, opacity: 0.8 }) +
                    k.circle(x - r * 0.35, y - r * 0.35, r * 0.18, '#ffffff', { bare: true });
            }
            return k.rect(0, 0, W, H, '#f6fbff', { bare: true }) + bubbles;
        },
    ),
    base(
        'sparkle-backdrop',
        'Sparkle backdrop',
        ['sparkle', 'kira kira', 'glitter', 'shine', 'manga effect'],
        { glow: '#fff3a6' },
        (k) => {
            let s = '';
            for (let i = 0; i < 26; i++) {
                const r = 4 + k.rand() * 18;
                s += k.path(
                    star(r + k.rand() * (W - 2 * r), r + k.rand() * (H - 2 * r), r, r * 0.22, 4),
                    i % 4 ? '#ffffff' : k.c('glow'),
                    { lw: 0.5 },
                );
            }
            return k.rect(0, 0, W, H, '#2a2f4a', { bare: true }) + s;
        },
    ),
    base(
        'focus-backdrop',
        'Focus lines',
        ['focus lines', 'shuuchuusen', 'impact', 'shock', 'manga effect'],
        { ink: '#141414' },
        (k) => {
            // each wedge edge ends where its ray leaves the plate, so the drawing stays 400 × 260
            const edge = (a: number) => {
                const dx = Math.cos(a);
                const dy = Math.sin(a);
                const tx = dx > 0 ? (W - 200) / dx : dx < 0 ? -200 / dx : Infinity;
                const ty = dy > 0 ? (H - 130) / dy : dy < 0 ? -130 / dy : Infinity;
                const t = Math.min(tx, ty);
                return `${n(200 + dx * t)} ${n(130 + dy * t)}`;
            };
            let wedges = '';
            for (let i = 0; i < 90; i++) {
                const a = (i / 90) * Math.PI * 2 + (k.rand() - 0.5) * 0.04;
                const r0 = 90 + k.rand() * 50;
                const w = 0.008 + k.rand() * 0.014;
                wedges += `M${n(200 + Math.cos(a) * r0)} ${n(130 + Math.sin(a) * r0 * 0.7)} L${edge(a - w)} L${edge(a + w)} Z `;
            }
            return (
                k.rect(0, 0, W, H, '#ffffff', { bare: true }) +
                k.path(wedges, k.c('ink'), { bare: true })
            );
        },
    ),
    base(
        'speed-backdrop',
        'Speed lines',
        ['speed lines', 'motion', 'action', 'running', 'manga effect'],
        { ink: '#141414' },
        (k) => {
            let out = '';
            for (let i = 0; i < 42; i++) {
                const y = (i + k.rand()) * (H / 42);
                const l = 120 + k.rand() * 280;
                out += k.path(streak(W - l, y, l, 1.5 + k.rand() * 4), k.c('ink'), { bare: true });
            }
            return k.rect(0, 0, W, H, '#ffffff', { bare: true }) + out;
        },
    ),
];
