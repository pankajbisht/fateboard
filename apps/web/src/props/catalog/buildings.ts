import type { Ink } from '../render/ink';
import { pts } from '../render/shapes';
import type { PropDef } from '../types';
import { GLASS } from './vehicles';

export const DOOR = '#7a5236';

/** A window with a cross frame. */
export const pane = (k: Ink, x: number, y: number, w: number, h: number) =>
    k.rect(x, y, w, h, GLASS, { lw: 0.7 }) +
    k.line(`M${x + w / 2} ${y} v${h} M${x} ${y + h / 2} h${w}`, { lw: 0.5 });

/** Roof tile rows: horizontal lines across a roof band. */
const tiles = (k: Ink, x0: number, x1: number, y0: number, y1: number, step: number) => {
    let d = '';
    for (let y = y0; y <= y1; y += step) d += `M${x0} ${y} H${x1} `;
    return k.line(d, { lw: 0.35 });
};

/** Village, Japanese and landmark buildings (city blocks: buildingsCity.ts). */
export const BUILDING_PROPS: PropDef[] = [
    {
        id: 'house-village',
        label: 'Village house',
        category: 'buildings',
        tags: ['farmhouse', 'thatched', 'kominka', 'countryside', 'rural', 'house'],
        width: 220,
        height: 190,
        colors: { roof: '#b89660', wall: '#efe3c8' },
        draw: (k) => {
            // straw lines fanned between the ridge (66 … 154) and the eaves (14 … 206): inside the roof
            let thatch = '';
            for (let t = 0; t <= 1.001; t += 1 / 18)
                thatch += `M${66 + t * 88} 32 L${(14 + t * 192).toFixed(1)} 100 `;
            return (
                k.rect(30, 96, 160, 90, k.c('wall')) +
                k.line('M30 120 h160 M70 96 v90 M150 96 v90', { lw: 0.8 }) +
                k.rect(92, 124, 36, 62, DOOR, { lw: 0.7 }) +
                k.rect(42, 128, 22, 22, '#e8dcc0', { lw: 0.6 }) +
                k.line('M53 128 v22 M42 139 h22 M167 128 v22 M156 139 h22', { lw: 0.4 }) +
                k.rect(156, 128, 22, 22, '#e8dcc0', { lw: 0.6 }) +
                k.path(pts('6 104 64 28 156 28 214 104'), k.c('roof')) +
                k.line(thatch, { lw: 0.35 }) +
                k.path(pts('80 28 140 28 132 14 88 14'), k.shade('roof', 0.25))
            );
        },
    },
    {
        id: 'house-cottage',
        label: 'Cottage',
        category: 'buildings',
        tags: ['house', 'home', 'chimney', 'countryside', 'storybook'],
        width: 200,
        height: 200,
        colors: { roof: '#c4553f', wall: '#f4e1c1' },
        draw: (k) =>
            k.rect(136, 24, 20, 50, '#9b6b5a') +
            k.rect(24, 92, 152, 104, k.c('wall')) +
            k.path('M84 196 L84 150 Q100 132 116 150 L116 196 Z', DOOR) +
            k.circle(110, 172, 2.5, '#e2c06a', { bare: true }) +
            pane(k, 38, 118, 32, 30) +
            pane(k, 130, 118, 32, 30) +
            k.rect(36, 148, 36, 8, '#7a9a4a', { lw: 0.6 }) +
            k.path(pts('6 98 100 14 194 98'), k.c('roof')) +
            tiles(k, 50, 150, 52, 90, 12),
    },
    {
        id: 'house-modern',
        label: 'Modern house',
        category: 'buildings',
        tags: ['house', 'home', 'suburb', 'garage', 'contemporary'],
        width: 240,
        height: 180,
        colors: { wall: '#f2f2ee', accent: '#5b6470' },
        draw: (k) =>
            k.rect(10, 60, 130, 116, k.c('wall')) +
            k.rect(140, 22, 92, 154, k.c('accent')) +
            k.rect(4, 52, 142, 10, k.shade('wall', 0.2)) +
            k.rect(134, 14, 104, 10, k.shade('accent', 0.2)) +
            k.rect(24, 76, 100, 44, '#bfe0f2', { lw: 0.7 }) +
            k.line('M57 76 v44 M90 76 v44', { lw: 0.5 }) +
            k.rect(24, 132, 70, 44, '#d9dde3', { lw: 0.7 }) +
            k.line('M24 143 h70 M24 154 h70 M24 165 h70', { lw: 0.35 }) +
            k.rect(104, 130, 26, 46, DOOR, { lw: 0.7 }) +
            pane(k, 156, 40, 60, 46) +
            pane(k, 156, 104, 60, 46),
    },
    {
        id: 'house-japanese',
        label: 'Japanese house',
        category: 'buildings',
        tags: ['house', 'home', 'japan', 'two storey', 'tiled roof', 'suburb'],
        width: 230,
        height: 220,
        colors: { roof: '#4b5563', wall: '#f3efe6' },
        draw: (k) =>
            k.rect(24, 120, 182, 96, k.c('wall')) +
            k.rect(40, 48, 150, 64, k.c('wall')) +
            k.path('M30 52 Q115 46 200 52 L176 20 L54 20 Z', k.c('roof')) +
            tiles(k, 50, 180, 28, 46, 8) +
            pane(k, 56, 62, 44, 36) +
            pane(k, 130, 62, 44, 36) +
            k.rect(48, 96, 134, 6, '#9aa0a8', { lw: 0.5 }) +
            k.line(
                'M52 96 v-14 M70 96 v-14 M88 96 v-14 M106 96 v-14 M124 96 v-14 M142 96 v-14 M160 96 v-14 M178 96 v-14 M48 82 h134',
                { lw: 0.5 },
            ) +
            k.path('M8 126 Q115 118 222 126 L204 104 L26 104 Z', k.c('roof')) +
            tiles(k, 30, 200, 110, 122, 6) +
            k.rect(40, 140, 70, 76, '#bfe0f2', { lw: 0.7 }) +
            k.line('M75 140 v76 M40 160 h70', { lw: 0.5 }) +
            k.rect(140, 148, 46, 68, DOOR, { lw: 0.7 }) +
            k.rect(146, 156, 34, 18, '#e8dcc0', { lw: 0.4 }),
    },
    {
        id: 'shrine',
        label: 'Shrine',
        category: 'buildings',
        tags: ['jinja', 'temple', 'japan', 'shinto', 'festival', 'worship'],
        width: 240,
        height: 200,
        colors: { roof: '#5b4a3a', pillar: '#d8433c' },
        draw: (k) =>
            k.rect(14, 176, 212, 18, '#a8a39a') +
            k.rect(40, 96, 160, 80, '#efe6d2') +
            [44, 92, 140, 188]
                .map((x) => k.rect(x, 96, 10, 80, k.c('pillar'), { lw: 0.7 }))
                .join('') +
            k.rect(98, 120, 44, 40, '#c49a52', { lw: 0.6 }) +
            k.line('M104 120 v40 M112 120 v40 M120 120 v40 M128 120 v40 M136 120 v40', {
                lw: 0.35,
            }) +
            k.path('M4 104 Q40 80 60 46 L180 46 Q200 80 236 104 Q120 92 4 104 Z', k.c('roof')) +
            k.path(pts('96 46 144 46 128 24 112 24'), k.shade('roof', 0.2)) +
            k.stroke('M50 100 Q120 116 190 100', 6, '#f4e1a1') +
            k.line('M84 110 l4 14 M120 112 l0 16 M156 110 l-4 14', { lw: 0.8 }) +
            k.circle(120, 132, 6, '#e2c06a', { lw: 0.6 }),
    },
    {
        id: 'pagoda',
        label: 'Pagoda',
        category: 'buildings',
        tags: ['temple', 'tower', 'japan', 'buddhist', 'kyoto'],
        width: 160,
        height: 300,
        colors: { roof: '#4a4440', wall: '#c4553f' },
        draw: (k) => {
            let out = k.limb('M80 6 L80 60', 4, '#c9a24a');
            for (let i = 4; i >= 0; i--) {
                const y = 60 + i * 46;
                const w = 34 + i * 8;
                out += k.rect(80 - w * 0.6, y + 14, w * 1.2, 32, k.c('wall'), { lw: 0.8 });
                out += k.path(
                    `M${80 - w - 16} ${y + 18} Q${80 - w} ${y + 10} ${80 - w * 0.7} ${y} L${80 + w * 0.7} ${y} Q${80 + w} ${y + 10} ${80 + w + 16} ${y + 18} Z`,
                    k.c('roof'),
                );
            }
            return k.rect(30, 286, 100, 10, '#a8a39a') + out;
        },
    },
    {
        id: 'castle',
        label: 'Castle',
        category: 'buildings',
        tags: ['japanese castle', 'himeji', 'shiro', 'fortress', 'landmark'],
        width: 260,
        height: 260,
        colors: { roof: '#4f5d6e', wall: '#f7f5ef' },
        draw: (k) => {
            const tier = (y: number, w: number, h: number) =>
                k.rect(130 - w / 2, y, w, h, k.c('wall')) +
                pane(k, 130 - w / 4 - 8, y + h / 3, 16, h / 3) +
                pane(k, 130 + w / 4 - 8, y + h / 3, 16, h / 3) +
                k.path(
                    `M${130 - w / 2 - 22} ${y + 4} Q${130 - w / 2} ${y - 2} ${130 - w / 2 + 10} ${y - 16} L${130 + w / 2 - 10} ${y - 16} Q${130 + w / 2} ${y - 2} ${130 + w / 2 + 22} ${y + 4} Z`,
                    k.c('roof'),
                );
            let stones = '';
            for (let y = 210; y < 256; y += 12)
                stones += `M${36 - (y - 200) * 0.3} ${y} H${224 + (y - 200) * 0.3} `;
            return (
                k.path(pts('40 200 220 200 236 256 24 256'), '#a8a39a') +
                k.line(stones, { lw: 0.35 }) +
                tier(150, 170, 50) +
                tier(100, 130, 46) +
                tier(56, 90, 40) +
                k.path(pts('104 40 156 40 146 20 114 20'), k.c('roof')) +
                k.path('M110 22 q-6 -10 2 -14 M150 22 q6 -10 -2 -14', '#e2c06a', { lw: 0.6 })
            );
        },
    },
    {
        id: 'barn',
        label: 'Barn',
        category: 'buildings',
        tags: ['farm', 'countryside', 'red barn', 'ranch'],
        width: 220,
        height: 190,
        colors: { wall: '#c2453a', roof: '#4a4440' },
        draw: (k) =>
            k.path(pts('20 186 20 80 50 40 110 20 170 40 200 80 200 186'), k.c('wall')) +
            k.path(
                pts('12 84 50 36 110 14 170 36 208 84 196 88 166 46 110 28 54 46 24 88'),
                k.c('roof'),
            ) +
            k.rect(70, 110, 80, 76, k.shade('wall', 0.15)) +
            k.stroke('M74 114 L146 182 M146 114 L74 182', 5, '#ffffff') +
            k.rect(70, 110, 80, 76, 'none') +
            k.rect(94, 58, 32, 26, '#ffffff', { lw: 0.8 }),
    },
];
