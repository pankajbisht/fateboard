import type { Ink } from '../render/ink';
import { n } from '../render/ink';
import { pts } from '../render/shapes';
import type { PropDef } from '../types';

/** Shared vehicle paints (not slots: glass, tyres and lamps stay readable whatever the body colour). */
export const GLASS = '#bfe0f2';
export const TIRE = '#2b2b2e';
export const HUB = '#c9ccd1';
export const LAMP = '#fff3b0';
export const TAIL = '#e04848';

/**
 * A side-view body facing right: `top` runs from the rear sill over the roof to the front sill ("x y x y …"),
 * then the sill comes back with an arch over each wheel.
 */
export function body(top: string, sill: number, wheels: readonly (readonly [number, number])[]) {
    const v = top
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    let d = `M${v[0]} ${v[1]}`;
    for (let i = 2; i + 1 < v.length; i += 2) d += ` L${v[i]} ${v[i + 1]}`;
    for (const [x, r] of [...wheels].sort((a, b) => b[0] - a[0])) {
        const a = r + 4;
        d += ` L${n(x + a)} ${sill} A${n(a)} ${n(a)} 0 0 0 ${n(x - a)} ${sill}`;
    }
    return `${d} Z`;
}

export const wheel = (k: Ink, x: number, y: number, r: number) =>
    k.circle(x, y, r, TIRE) +
    k.circle(x, y, r * 0.52, HUB, { lw: 0.6 }) +
    k.circle(x, y, r * 0.16, TIRE, { bare: true });

export const glass = (k: Ink, list: string) => k.path(pts(list), GLASS, { lw: 0.7 });

/** A car: body, optional lower band, windows, details, then the wheels over the arches. */
function car(
    k: Ink,
    o: {
        top: string;
        sill: number;
        wheels: readonly (readonly [number, number])[];
        windows: readonly string[];
        details?: string;
        band?: string;
    },
) {
    const shape = body(o.top, o.sill, o.wheels);
    return (
        k.path(shape, k.c('body')) +
        (o.band ?? '') +
        o.windows.map((w) => glass(k, w)).join('') +
        (o.details ?? '') +
        o.wheels.map(([x, r]) => wheel(k, x, o.sill, r)).join('')
    );
}

const SEDAN = {
    top: '6 96 6 72 18 64 66 58 96 30 166 28 204 56 246 62 254 74 254 96',
    sill: 96,
    wheels: [
        [62, 20],
        [200, 20],
    ] as const,
    windows: ['92 38 126 36 126 56 76 56', '134 36 162 35 192 56 134 56'],
};
const sedanDetails = (k: Ink) =>
    k.line('M130 60 L130 92 M108 66 h10 M146 66 h10 M8 84 h30 M222 84 h30', { lw: 0.5 }) +
    k.ellipse(247, 70, 5, 3.5, LAMP, { lw: 0.5 }) +
    k.rect(6, 70, 6, 8, TAIL, { lw: 0.5 });

export const VEHICLE_PROPS: PropDef[] = [
    {
        id: 'car',
        label: 'Car',
        category: 'vehicles',
        tags: ['sedan', 'automobile', 'street', 'road'],
        width: 260,
        height: 120,
        colors: { body: '#e2504c' },
        draw: (k) => car(k, { ...SEDAN, details: sedanDetails(k) }),
    },
    {
        id: 'car-kei',
        label: 'Compact car',
        category: 'vehicles',
        tags: ['car', 'kei', 'small', 'japan', 'city'],
        width: 200,
        height: 120,
        colors: { body: '#9fd3c7' },
        draw: (k) =>
            car(k, {
                top: '6 96 6 52 22 22 140 20 160 52 192 60 194 96',
                sill: 96,
                wheels: [
                    [48, 18],
                    [156, 18],
                ],
                windows: ['24 28 74 27 74 50 14 50', '82 27 136 26 152 50 82 50'],
                details:
                    k.line('M78 54 L78 92 M60 60 h10 M96 60 h10', { lw: 0.5 }) +
                    k.ellipse(188, 66, 5, 4, LAMP, { lw: 0.5 }),
            }),
    },
    {
        id: 'car-sports',
        label: 'Sports car',
        category: 'vehicles',
        tags: ['car', 'race', 'fast', 'coupe'],
        width: 270,
        height: 100,
        colors: { body: '#f2b233' },
        draw: (k) =>
            car(k, {
                top: '4 82 4 62 30 54 96 50 136 30 196 30 236 50 264 58 266 82',
                sill: 82,
                wheels: [
                    [64, 18],
                    [214, 18],
                ],
                windows: ['140 35 192 35 220 49 112 49'],
                details:
                    k.path(pts('6 58 0 46 24 46 28 56'), k.c('body')) +
                    k.line('M100 60 L250 64 M150 52 L150 78', { lw: 0.5 }) +
                    k.ellipse(258, 62, 6, 3, LAMP, { lw: 0.5 }),
            }),
    },
    {
        id: 'taxi',
        label: 'Taxi',
        category: 'vehicles',
        tags: ['car', 'cab', 'city', 'street'],
        width: 260,
        height: 130,
        colors: { body: '#f5c518' },
        draw: (k) =>
            `<g transform="translate(0 10)">` +
            k.rect(112, 8, 36, 14, '#ffffff', { rx: 3 }) +
            k.line('M118 15 h24', { lw: 0.5 }) +
            car(k, {
                ...SEDAN,
                details: sedanDetails(k) + k.line('M20 76 L240 76', { lw: 0.7, color: '#141414' }),
            }) +
            '</g>',
    },
    {
        id: 'police-car',
        label: 'Police car',
        category: 'vehicles',
        tags: ['car', 'police', 'patrol', 'siren', 'emergency'],
        width: 260,
        height: 130,
        colors: { body: '#ffffff', lower: '#1f2937' },
        draw: (k) =>
            `<g transform="translate(0 10)">` +
            k.rect(114, 12, 16, 10, TAIL, { lw: 0.7 }) +
            k.rect(130, 12, 16, 10, '#3d7bd9', { lw: 0.7 }) +
            car(k, {
                ...SEDAN,
                band: k.path(body('6 96 6 76 254 76 254 96', 96, SEDAN.wheels), k.c('lower')),
                details: sedanDetails(k),
            }) +
            '</g>',
    },
    {
        id: 'van',
        label: 'Van',
        category: 'vehicles',
        tags: ['minivan', 'delivery', 'car'],
        width: 260,
        height: 140,
        colors: { body: '#d9dde3' },
        draw: (k) =>
            car(k, {
                top: '6 116 6 24 16 12 190 12 222 40 252 70 254 116',
                sill: 116,
                wheels: [
                    [58, 22],
                    [204, 22],
                ],
                windows: [
                    '24 22 70 22 70 56 24 56',
                    '80 22 126 22 126 56 80 56',
                    '136 22 188 22 216 52 136 52',
                ],
                details:
                    k.line('M76 60 L76 112 M130 60 L130 112 M112 70 h10 M8 100 h28', {
                        lw: 0.5,
                    }) + k.ellipse(248, 84, 5, 5, LAMP, { lw: 0.5 }),
            }),
    },
    {
        id: 'pickup-truck',
        label: 'Pickup truck',
        category: 'vehicles',
        tags: ['truck', 'pickup', 'farm'],
        width: 280,
        height: 130,
        colors: { body: '#4a7bd0' },
        draw: (k) =>
            car(k, {
                top: '6 106 6 66 140 66 150 30 200 28 230 60 270 66 274 106',
                sill: 106,
                wheels: [
                    [64, 22],
                    [222, 22],
                ],
                windows: ['158 36 198 34 220 60 156 60'],
                details:
                    k.line('M144 70 L144 102 M10 76 L138 76 M166 70 h10', { lw: 0.5 }) +
                    k.ellipse(268, 76, 5, 4, LAMP, { lw: 0.5 }),
            }),
    },
    {
        id: 'truck',
        label: 'Truck',
        category: 'vehicles',
        tags: ['lorry', 'cargo', 'delivery', 'big'],
        width: 320,
        height: 160,
        colors: { cargo: '#f0f0ea', cab: '#3a8f5c' },
        draw: (k) => {
            const wheels = [
                [56, 22],
                [104, 22],
                [266, 22],
            ] as const;
            return (
                k.path(body('6 136 6 20 214 20 214 136', 136, wheels.slice(0, 2)), k.c('cargo')) +
                k.line('M20 34 L200 34 M20 120 L200 120', { lw: 0.45 }) +
                k.path(
                    body('214 136 214 50 268 50 300 84 312 92 314 136', 136, wheels.slice(2)),
                    k.c('cab'),
                ) +
                glass(k, '224 58 262 58 290 88 224 88') +
                k.ellipse(308, 104, 5, 5, LAMP, { lw: 0.5 }) +
                wheels.map(([x, r]) => wheel(k, x, 136, r)).join('')
            );
        },
    },
    {
        id: 'bus',
        label: 'Bus',
        category: 'vehicles',
        tags: ['city bus', 'transport', 'school', 'street'],
        width: 340,
        height: 160,
        colors: { body: '#3fa7a0' },
        draw: (k) => {
            let windows = '';
            for (let i = 0; i < 5; i++) {
                const x = 20 + i * 50;
                windows += glass(k, `${x} 28 ${x + 42} 28 ${x + 42} 66 ${x} 66`);
            }
            return car(k, {
                top: '6 136 6 22 14 12 320 12 332 24 334 136',
                sill: 136,
                wheels: [
                    [70, 22],
                    [276, 22],
                ],
                windows: ['296 28 326 28 326 84 296 84'],
                band:
                    k.rect(8, 92, 324, 10, '#ffffff', { bare: true }) +
                    windows +
                    k.line('M272 72 L272 132 M290 72 L290 132', { lw: 0.6 }),
                details: k.ellipse(328, 112, 4, 6, LAMP, { lw: 0.5 }),
            });
        },
    },
    {
        id: 'ambulance',
        label: 'Ambulance',
        category: 'vehicles',
        tags: ['emergency', 'hospital', 'van', 'siren'],
        width: 270,
        height: 140,
        colors: { body: '#ffffff', stripe: '#e04848' },
        draw: (k) =>
            car(k, {
                top: '6 116 6 16 186 16 186 40 226 40 256 76 264 84 264 116',
                sill: 116,
                wheels: [
                    [58, 22],
                    [214, 22],
                ],
                windows: ['194 48 222 48 246 78 194 78'],
                band:
                    k.rect(8, 86, 254, 8, k.c('stripe'), { bare: true }) +
                    k.rect(80, 36, 12, 36, k.c('stripe'), { bare: true }) +
                    k.rect(68, 48, 36, 12, k.c('stripe'), { bare: true }) +
                    k.rect(170, 6, 14, 10, k.c('stripe'), { lw: 0.6 }),
                details: k.ellipse(258, 94, 4, 5, LAMP, { lw: 0.5 }),
            }),
    },
];
