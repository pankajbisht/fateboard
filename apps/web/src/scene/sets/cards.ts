import { darken, lighten } from '@/character/render/styles';
import type { WorldLook } from '../world/look';

/**
 * Card silhouettes in a unit box: x from -0.5 to 0.5 (× the card's width), y from 0 (ground) to 1 (top), y UP.
 * A card always faces the camera, so round things (trees, pillars, lamps, people) look right from every side.
 * `colors` override the defaults in order; the defaults follow the season and the time of day.
 */
export type U2 = [number, number];
export interface CardPath {
    pts: U2[];
    fill: string;
    /** rounded corners (smooth outline) */
    smooth?: boolean;
    /** drawn without an outline (highlights, glows) */
    bare?: boolean;
    opacity?: number;
}

type Shape = (c: (i: number, d: string) => string, look: WorldLook) => CardPath[];

const ring = (cx: number, cy: number, rx: number, ry: number, n = 14, wobble = 0): U2[] =>
    Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const w = 1 + (i % 2 ? wobble : -wobble);
        return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w];
    });

const rect = (x0: number, y0: number, x1: number, y1: number): U2[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
];

const BARK = '#7a5234';

export const CARD_SHAPES: Record<string, Shape> = {
    'tree-round': (c, l) => [
        { pts: rect(-0.05, 0, 0.05, 0.5), fill: c(1, BARK) },
        { pts: ring(0, 0.64, 0.48, 0.34, 16, 0.06), fill: c(0, l.foliage.leaf), smooth: true },
        {
            pts: ring(0.1, 0.55, 0.3, 0.2, 12, 0.05),
            fill: c(2, l.foliage.leafDark),
            smooth: true,
            bare: true,
            opacity: 0.6,
        },
    ],
    'tree-pine': (c, l) => [
        { pts: rect(-0.05, 0, 0.05, 0.22), fill: c(1, BARK) },
        {
            pts: [
                [-0.5, 0.15],
                [0.5, 0.15],
                [0, 0.62],
            ],
            fill: c(0, l.foliage.leafDark),
        },
        {
            pts: [
                [-0.4, 0.42],
                [0.4, 0.42],
                [0, 0.82],
            ],
            fill: c(0, l.foliage.leafDark),
        },
        {
            pts: [
                [-0.28, 0.66],
                [0.28, 0.66],
                [0, 1],
            ],
            fill: c(2, l.foliage.leaf),
        },
    ],
    'tree-palm': (c, l) => {
        const out: CardPath[] = [
            {
                pts: [
                    [-0.04, 0],
                    [0.05, 0],
                    [0.1, 0.5],
                    [0.06, 0.82],
                    [0.01, 0.82],
                    [0.04, 0.5],
                ],
                fill: c(1, '#9c7448'),
            },
        ];
        for (let i = 0; i < 6; i++) {
            const a = Math.PI * (0.05 + (i / 5) * 0.9);
            const ex = 0.035 + Math.cos(a) * 0.48;
            const ey = 0.8 + Math.sin(a) * 0.2 - 0.12;
            out.push({
                pts: [
                    [0.035, 0.84],
                    [(0.035 + ex) / 2, (0.84 + ey) / 2 + 0.07],
                    [ex, ey],
                    [(0.035 + ex) / 2, (0.84 + ey) / 2 + 0.01],
                ],
                fill: c(0, i % 2 ? l.foliage.leaf : l.foliage.leafDark),
            });
        }
        return out;
    },
    bush: (c, l) => [
        { pts: ring(0, 0.48, 0.5, 0.48, 14, 0.07), fill: c(0, l.foliage.leaf), smooth: true },
        {
            pts: ring(0.12, 0.38, 0.28, 0.24, 10, 0.06),
            fill: c(1, l.foliage.leafDark),
            smooth: true,
            bare: true,
            opacity: 0.55,
        },
    ],
    fern: (c, l) =>
        Array.from({ length: 7 }, (_, i) => {
            const a = Math.PI * (0.12 + (i / 6) * 0.76);
            const tip: U2 = [Math.cos(a) * 0.5, Math.sin(a) * 0.98];
            const side: U2 = [-Math.sin(a) * 0.06, Math.cos(a) * 0.06];
            return {
                pts: [
                    [0, 0],
                    [tip[0] * 0.5 + side[0], tip[1] * 0.5 + side[1]],
                    tip,
                    [tip[0] * 0.5 - side[0], tip[1] * 0.5 - side[1]],
                ],
                fill: c(0, i % 2 ? l.foliage.leaf : l.foliage.leafDark),
                smooth: true,
            };
        }),
    rock: (c) => [
        {
            pts: [
                [-0.5, 0],
                [0.5, 0],
                [0.42, 0.55],
                [0.1, 0.95],
                [-0.3, 0.8],
                [-0.48, 0.4],
            ],
            fill: c(0, '#8d8d86'),
            smooth: true,
        },
    ],
    lamp: (c, l) => [
        { pts: rect(-0.06, 0, 0.06, 0.92), fill: c(0, '#3b3f46') },
        { pts: rect(-0.5, 0.9, 0.5, 1), fill: c(0, '#3b3f46') },
        {
            pts: ring(0, 0.86, 0.32, 0.07, 10),
            fill: l.night ? '#ffe08a' : c(1, '#e6e1cf'),
            bare: true,
        },
    ],
    pillar: (c) => {
        const stone = c(0, '#d9cdb4');
        return [
            { pts: rect(-0.5, 0, 0.5, 0.06), fill: darken(stone, 0.12) },
            { pts: rect(-0.36, 0.06, 0.36, 0.92), fill: stone },
            { pts: rect(-0.22, 0.06, -0.12, 0.92), fill: darken(stone, 0.08), bare: true },
            { pts: rect(-0.5, 0.92, 0.5, 1), fill: darken(stone, 0.12) },
        ];
    },
    // [shirt, skin, trousers]: legs, a torso with shoulders, a head (a small crowd member is a few shapes)
    person: (c) => [
        { pts: rect(-0.2, 0, -0.02, 0.46), fill: c(2, '#2b2f3a') },
        { pts: rect(0.02, 0, 0.2, 0.46), fill: c(2, '#2b2f3a') },
        {
            pts: [
                [-0.3, 0.4],
                [0.3, 0.4],
                [0.34, 0.68],
                [0.2, 0.76],
                [-0.2, 0.76],
                [-0.34, 0.68],
            ],
            fill: c(0, '#5b6b8c'),
            smooth: true,
        },
        { pts: ring(0, 0.88, 0.22, 0.12, 12), fill: c(1, '#e0b896'), smooth: true },
    ],
    cloud: (c) => [
        {
            pts: [
                ...ring(-0.25, 0.35, 0.25, 0.3, 8).slice(4),
                ...ring(0.05, 0.6, 0.3, 0.38, 10).slice(5),
                ...ring(0.3, 0.38, 0.2, 0.28, 8).slice(4),
            ].reverse(),
            fill: c(0, '#ffffff'),
            smooth: true,
            bare: true,
            opacity: 0.92,
        },
    ],
    flag: (c) => [
        { pts: rect(-0.5, 0, -0.44, 1), fill: c(1, '#5b5b5b') },
        {
            pts: [
                [-0.44, 0.62],
                [0.5, 0.66],
                [0.48, 0.98],
                [-0.44, 0.97],
            ],
            fill: c(0, '#e05050'),
        },
    ],
    'traffic-light': (c) => [
        { pts: rect(-0.08, 0, 0.08, 0.7), fill: c(0, '#3b3f46') },
        { pts: rect(-0.5, 0.62, 0.5, 1), fill: c(0, '#2a2d33') },
        { pts: ring(0, 0.93, 0.22, 0.05, 10), fill: '#e5484d', bare: true },
        { pts: ring(0, 0.81, 0.22, 0.05, 10), fill: '#f5b43c', bare: true },
        { pts: ring(0, 0.69, 0.22, 0.05, 10), fill: '#3fb950', bare: true },
    ],
    goal: (c) => {
        const w = c(0, '#f4f4f4');
        return [
            { pts: rect(-0.5, 0, -0.46, 1), fill: w },
            { pts: rect(0.46, 0, 0.5, 1), fill: w },
            { pts: rect(-0.5, 0.94, 0.5, 1), fill: w },
            {
                pts: rect(-0.46, 0, 0.46, 0.94),
                fill: lighten('#9aa5b1', 0.5),
                bare: true,
                opacity: 0.35,
            },
        ];
    },
    sign: (c) => [
        { pts: rect(-0.42, 0, -0.36, 0.6), fill: c(1, '#5b5b5b') },
        { pts: rect(0.36, 0, 0.42, 0.6), fill: c(1, '#5b5b5b') },
        { pts: rect(-0.5, 0.55, 0.5, 1), fill: c(0, '#2f6f4e') },
    ],
};

export const CARD_SHAPE_IDS = Object.keys(CARD_SHAPES);
