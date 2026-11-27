import type { Ink } from '../render/ink';
import type { PropDef } from '../types';
import { DOOR } from './buildings';
import { GLASS } from './vehicles';

/** A grid of windows; `lit` picks some warm (night-ready) panes, seeded. */
function windowGrid(
    k: Ink,
    x: number,
    y: number,
    cols: number,
    rows: number,
    w: number,
    h: number,
    gx: number,
    gy: number,
) {
    let out = '';
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            out += k.rect(
                x + c * (w + gx),
                y + r * (h + gy),
                w,
                h,
                k.rand() > 0.85 ? '#fff0b3' : GLASS,
                { lw: 0.5 },
            );
    return out;
}

/** City blocks: apartments, offices, shops, school, hospital, skyline. */
export const CITY_BUILDING_PROPS: PropDef[] = [
    {
        id: 'apartment',
        label: 'Apartment block',
        category: 'buildings',
        tags: ['apartments', 'danchi', 'flats', 'mansion', 'city', 'housing'],
        width: 220,
        height: 260,
        colors: { wall: '#e6ddd0' },
        draw: (k) => {
            let balconies = '';
            for (let r = 0; r < 6; r++)
                balconies += k.rect(14, 62 + r * 32, 192, 6, k.shade('wall', 0.15), { lw: 0.5 });
            return (
                k.rect(150, 8, 36, 22, '#a8b0b8') +
                k.rect(10, 28, 200, 228, k.c('wall')) +
                windowGrid(k, 22, 40, 4, 6, 36, 20, 12, 12) +
                balconies +
                k.rect(92, 226, 36, 30, DOOR, { lw: 0.7 })
            );
        },
    },
    {
        id: 'city-building',
        label: 'Office building',
        category: 'buildings',
        tags: ['office', 'city building', 'downtown', 'company', 'tower'],
        width: 200,
        height: 300,
        colors: { wall: '#8fa3b8' },
        draw: (k) =>
            k.rect(14, 10, 172, 286, k.c('wall')) +
            k.rect(8, 4, 184, 10, k.shade('wall', 0.2)) +
            windowGrid(k, 26, 26, 6, 10, 18, 18, 7, 6) +
            k.rect(70, 262, 60, 34, GLASS, { lw: 0.7 }) +
            k.line('M100 262 v34', { lw: 0.5 }) +
            k.rect(60, 252, 80, 8, k.shade('wall', 0.25)),
    },
    {
        id: 'skyscraper',
        label: 'Skyscraper',
        category: 'buildings',
        tags: ['tower', 'high rise', 'city', 'downtown', 'tokyo'],
        width: 140,
        height: 340,
        colors: { wall: '#6d8aa8' },
        draw: (k) => {
            let stripes = '';
            for (let y = 90; y < 330; y += 12) stripes += `M18 ${y} H122 `;
            for (let y = 46; y < 86; y += 12) stripes += `M38 ${y} H102 `;
            return (
                k.limb('M70 4 L70 34', 2.5, '#8d969f') +
                k.rect(48, 30, 44, 12, k.shade('wall', 0.2)) +
                k.rect(32, 40, 76, 50, k.c('wall')) +
                k.rect(12, 84, 116, 252, k.c('wall')) +
                k.line(stripes, { lw: 1.6, color: GLASS }) +
                k.line('M70 46 v40 M70 90 v240', { lw: 0.4 })
            );
        },
    },
    {
        id: 'city-skyline',
        label: 'City skyline',
        category: 'buildings',
        tags: ['skyline', 'city', 'background', 'downtown', 'silhouette', 'night'],
        width: 420,
        height: 200,
        colors: { near: '#7d8aa3', far: '#b5c0d3' },
        draw: (k) => {
            const row = (
                base: number,
                min: number,
                max: number,
                color: string,
                lights: boolean,
            ) => {
                let x = 0;
                let out = '';
                while (x < 420) {
                    const w = 26 + Math.floor(k.rand() * 34);
                    const h = min + Math.floor(k.rand() * (max - min));
                    const right = Math.min(420, x + w);
                    out += k.rect(x, base - h, right - x, h, color, { lw: 0.6 });
                    if (lights)
                        for (let y = base - h + 10; y < base - 10; y += 14)
                            for (let wx = x + 6; wx < right - 8; wx += 10)
                                if (k.rand() > 0.55)
                                    out += k.rect(wx, y, 4, 6, '#fff0b3', { bare: true });
                    x = right;
                }
                return out;
            };
            return row(170, 70, 150, k.c('far'), false) + row(198, 40, 120, k.c('near'), true);
        },
    },
    {
        id: 'shop',
        label: 'Shop',
        category: 'buildings',
        tags: ['store', 'storefront', 'shopping street', 'shotengai', 'bakery', 'awning'],
        width: 220,
        height: 200,
        colors: { wall: '#f2e6d6', awning: '#d8433c' },
        draw: (k) => {
            let stripes = '';
            for (let i = 0; i < 8; i++)
                stripes += k.path(
                    `M${14 + i * 24} 70 L${38 + i * 24} 70 L${38 + i * 24} 92 Q${26 + i * 24} 100 ${14 + i * 24} 92 Z`,
                    i % 2 ? '#ffffff' : k.c('awning'),
                    { lw: 0.6 },
                );
            return (
                k.rect(10, 16, 200, 180, k.c('wall')) +
                k.rect(40, 26, 140, 32, '#ffffff', { lw: 0.8 }) +
                k.line('M60 42 h100', { lw: 1.2 }) +
                stripes +
                k.rect(22, 110, 112, 70, GLASS, { lw: 0.7 }) +
                k.line('M40 120 L60 100 M90 124 L110 104', { lw: 0.6, color: '#ffffff' }) +
                k.rect(148, 110, 46, 86, DOOR, { lw: 0.7 }) +
                k.rect(156, 120, 30, 34, GLASS, { lw: 0.5 })
            );
        },
    },
    {
        id: 'convenience-store',
        label: 'Convenience store',
        category: 'buildings',
        tags: ['konbini', 'store', 'shop', '24 hours', 'japan', 'city'],
        width: 260,
        height: 170,
        colors: { wall: '#f4f4f2', band: '#2f9e5b' },
        draw: (k) =>
            k.rect(8, 20, 244, 146, k.c('wall')) +
            k.rect(8, 28, 244, 10, k.c('band'), { bare: true }) +
            k.rect(8, 40, 244, 8, '#f28c28', { bare: true }) +
            k.rect(8, 50, 244, 8, '#2f7fd1', { bare: true }) +
            k.rect(8, 20, 244, 40, 'none') +
            k.rect(20, 72, 160, 94, GLASS, { lw: 0.7 }) +
            k.line('M60 72 v94 M100 72 v94 M140 72 v94 M30 100 L50 80', { lw: 0.45 }) +
            k.rect(192, 72, 50, 94, GLASS, { lw: 0.7 }) +
            k.line('M217 72 v94', { lw: 0.6 }),
    },
    {
        id: 'school-building',
        label: 'School building',
        category: 'buildings',
        tags: ['school', 'high school', 'gakkou', 'clock tower', 'campus', 'anime'],
        width: 340,
        height: 220,
        colors: { wall: '#efe9dc' },
        draw: (k) =>
            k.rect(6, 70, 328, 146, k.c('wall')) +
            k.rect(140, 20, 60, 70, k.c('wall')) +
            k.rect(134, 14, 72, 8, k.shade('wall', 0.2)) +
            k.circle(170, 50, 18, '#ffffff') +
            k.line('M170 50 L170 38 M170 50 L180 54', { lw: 0.8 }) +
            k.rect(2, 64, 336, 8, k.shade('wall', 0.2)) +
            windowGrid(k, 18, 84, 5, 3, 18, 24, 6, 14) +
            windowGrid(k, 206, 84, 5, 3, 18, 24, 6, 14) +
            k.rect(146, 160, 48, 56, GLASS, { lw: 0.7 }) +
            k.line('M170 160 v56', { lw: 0.5 }),
    },
    {
        id: 'hospital',
        label: 'Hospital',
        category: 'buildings',
        tags: ['clinic', 'medical', 'doctor', 'city'],
        width: 240,
        height: 240,
        colors: { wall: '#f6f7f9', cross: '#e04848' },
        draw: (k) =>
            k.rect(10, 40, 220, 196, k.c('wall')) +
            k.rect(98, 6, 44, 44, '#ffffff') +
            k.rect(114, 12, 12, 32, k.c('cross'), { bare: true }) +
            k.rect(104, 22, 32, 12, k.c('cross'), { bare: true }) +
            windowGrid(k, 24, 60, 6, 5, 22, 18, 12, 12) +
            k.rect(86, 194, 68, 42, GLASS, { lw: 0.7 }) +
            k.rect(78, 186, 84, 8, k.c('cross'), { lw: 0.6 }),
    },
];
