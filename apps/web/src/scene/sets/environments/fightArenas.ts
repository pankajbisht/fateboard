import { darken } from '@/character/render/styles';
import { box, card, line } from '../build';
import {
    MOOD_VARIANTS,
    RING_DROP,
    banners,
    crowdTiers,
    hall,
    lights,
    moodOf,
    platform,
    referee,
    ropes,
    shadeCanvas,
} from '../arena';
import type { EnvironmentDef, SetPiece } from '../types';

/**
 * Fight arenas (docs/COMBAT_PACK.md, Stage 5): a boxing ring, a Muay Thai stadium ring and an MMA cage. Each has
 * the four lighting moods as variants, stands with a tiered crowd (none in the gym and day hall), ring-side
 * lights and a referee card. No logos anywhere.
 */
/** a 20 ft (610 cm) ring inside the ropes */
const RING = 305;
const SQUARE: [number, number][] = [
    [-RING, -RING],
    [RING, -RING],
    [RING, RING],
    [-RING, RING],
];
const CROWD_AREA = { x0: -1100, z0: -1300, x1: 1100, z1: -640 };
const CAMERA = { position: [0, 175, 980] as [number, number, number], yaw: 0, pitch: 4 };

function cornerPads(colors: string[], h: number): SetPiece[] {
    return SQUARE.map(([x, z], i) =>
        box(x, z, 26, h, 26, colors[i % colors.length], { y: 30, top: colors[i % colors.length] }),
    );
}

function posts(h: number, color: string, cap?: string): SetPiece[] {
    const out: SetPiece[] = [];
    for (const [x, z] of SQUARE) {
        out.push(box(x, z, 16, h + 20, 16, color));
        if (cap) out.push(box(x, z, 22, 26, 22, cap, { y: h + 20 }));
    }
    return out;
}

export const boxingRing: EnvironmentDef = {
    id: 'boxing-ring',
    name: 'Boxing ring',
    category: 'indoor',
    tags: ['boxing', 'ring', 'fight', 'arena', 'sport', 'crowd', 'combat'],
    variants: MOOD_VARIANTS,
    stage: { x: 0, z: 0, spread: 260 },
    camera: CAMERA,
    sky: false,
    crowdArea: CROWD_AREA,
    build({ rand, variant }) {
        const mood = moodOf(variant);
        const out: SetPiece[] = [
            ...hall(mood),
            ...platform(
                SQUARE.map(([x, z]) => [x * 1.12, z * 1.12]),
                shadeCanvas(mood, '#d9d4c7'),
                '#1e3a8a',
            ),
            ...posts(150, '#d4d4d8'),
            ...ropes(SQUARE, [48, 82, 116, 150], ['#f8fafc', '#dc2626', '#f8fafc', '#2563eb']),
            // red and blue corners, two white neutral corners
            ...cornerPads(['#dc2626', '#f8fafc', '#2563eb', '#f8fafc'], 120),
            ...lights(mood, 420),
            ...crowdTiers(rand, mood, RING + 120),
            referee(RING * 0.7, -RING * 0.6),
        ];
        // ring-side: the bell table and the judges' tables below the apron
        out.push(
            box(0, RING + 120, 240, 75, 70, '#3b3f46', { y: RING_DROP, top: '#52525b' }),
            box(-RING - 140, 0, 70, 75, 200, '#3b3f46', { y: RING_DROP, rotY: 0 }),
            card('lamp', RING + 160, RING + 100, 30, 40, ['#facc15'], {
                at: [RING + 160, -25, RING + 100],
            }),
        );
        return out;
    },
};

export const thaiRing: EnvironmentDef = {
    id: 'muay-thai-stadium',
    name: 'Muay Thai stadium',
    category: 'indoor',
    tags: ['muay thai', 'ring', 'stadium', 'fight', 'thai', 'wai khru', 'crowd', 'combat'],
    variants: MOOD_VARIANTS,
    stage: { x: 0, z: 0, spread: 260 },
    camera: CAMERA,
    sky: false,
    crowdArea: CROWD_AREA,
    build({ rand, variant }) {
        const mood = moodOf(variant);
        const out: SetPiece[] = [
            ...hall(mood),
            ...platform(
                SQUARE.map(([x, z]) => [x * 1.12, z * 1.12]),
                shadeCanvas(mood, '#e8dcc4'),
                '#7f1d1d',
            ),
            // traditional posts: taller, with a capped top, ropes wrapped in coloured cloth
            ...posts(160, '#7c2d12', '#facc15'),
            ...ropes(SQUARE, [50, 85, 120, 155], ['#dc2626', '#2563eb', '#dc2626', '#2563eb'], 4),
            ...cornerPads(['#dc2626', '#f8fafc', '#2563eb', '#f8fafc'], 125),
            ...lights(mood, 420),
            ...crowdTiers(rand, mood, RING + 120),
            ...banners(['#dc2626', '#facc15', '#2563eb', '#f8fafc', '#16a34a']),
            referee(RING * 0.7, -RING * 0.6),
        ];
        // the wai khru corner: a small shrine with garlands outside the ring, the band's bench beside it
        out.push(
            box(-RING - 150, -RING - 40, 70, 90, 50, '#7c2d12', { y: RING_DROP, top: '#facc15' }),
            card('flower', -RING - 150, -RING - 40, 40, 40, ['#f97316', '#facc15'], {
                at: [-RING - 150, -10, -RING - 40],
            }),
            box(-RING - 150, -RING + 120, 60, 45, 180, '#57534e', { y: RING_DROP }),
            line(
                [
                    [-RING, 165, -RING],
                    [-RING + 40, 140, -RING + 10],
                ],
                '#f97316',
                5,
            ),
        );
        return out;
    },
};

/** a regular octagon, 9 m across the flats */
const OCT_R = 450 / Math.cos(Math.PI / 8);
const OCTAGON: [number, number][] = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return [Math.round(Math.cos(a) * OCT_R), Math.round(Math.sin(a) * OCT_R)];
});
const FENCE = 175;

function fence(): SetPiece[] {
    const out: SetPiece[] = [];
    for (let i = 0; i < 8; i++) {
        const [ax, az] = OCTAGON[i];
        const [bx, bz] = OCTAGON[(i + 1) % 8];
        // padded post
        out.push(box(ax, az, 20, FENCE + 10, 20, '#111827'));
        // the mesh: a few uprights per panel (cheap lines, not a texture)
        for (let k = 1; k < 6; k++) {
            const t = k / 6;
            const x = ax + (bx - ax) * t;
            const z = az + (bz - az) * t;
            out.push(
                line(
                    [
                        [x, 0, z],
                        [x, FENCE, z],
                    ],
                    '#6b7280',
                    1,
                ),
            );
        }
    }
    // rails: bottom, middle and the padded top
    out.push(...ropes(OCTAGON, [4, FENCE * 0.5], ['#6b7280'], 1.5));
    out.push(...ropes(OCTAGON, [FENCE], ['#111827'], 9));
    return out;
}

export const cage: EnvironmentDef = {
    id: 'mma-cage',
    name: 'MMA cage',
    category: 'indoor',
    tags: ['mma', 'cage', 'octagon', 'fight', 'arena', 'crowd', 'combat'],
    variants: MOOD_VARIANTS,
    stage: { x: 0, z: 0, spread: 280 },
    camera: { position: [0, 185, 1150], yaw: 0, pitch: 5 },
    sky: false,
    crowdArea: { x0: -1200, z0: -1350, x1: 1200, z1: -760 },
    build({ rand, variant }) {
        const mood = moodOf(variant);
        const canvas = shadeCanvas(mood, '#e5e7eb');
        return [
            ...hall(mood),
            ...platform(
                OCTAGON.map(([x, z]) => [x * 1.05, z * 1.05]),
                canvas,
                '#111827',
            ),
            // a plain centre circle on the canvas (no logos)
            {
                kind: 'quad',
                layer: 'ground',
                color: darken(canvas, 0.06),
                points: Array.from({ length: 16 }, (_, i) => {
                    const a = (i / 16) * Math.PI * 2;
                    return [Math.cos(a) * 110, 0.8, Math.sin(a) * 110] as [number, number, number];
                }),
            },
            ...fence(),
            ...lights(mood, 460),
            ...crowdTiers(rand, mood, 560),
            referee(320, -260),
        ];
    },
};
