import { darken, lighten } from '@/character/render/styles';
import type { V3 } from '../schema/types';
import type { Rand } from '../world/random';
import { box, card, ground, line, panel, wall } from './build';
import type { SetPiece } from './types';

/**
 * Fight arenas, shared parts (docs/COMBAT_PACK.md, Stage 5). The fighting surface is at y = 0 (actors stand on
 * it); the hall floor is RING_DROP below, so a ring or cage stands on its platform. Lighting moods are variants:
 * spotlight (dark hall, cones of light on the ring), dark arena, warm gym, day-time training hall. Crowds are
 * flat cards in three tiers rising away from the ring (front / mid / back), each tier dimmer than the one in front,
 * a few shapes reused with colour variation (cheering, clapping, sitting): cheap to draw, capped at MAX_TIER_CROWD.
 */
export const RING_DROP = -100;
export const MAX_TIER_CROWD = 72;

export type Mood = 'spotlight' | 'dark' | 'gym' | 'day';
export const MOOD_VARIANTS = [
    { id: 'spotlight', name: 'Spotlight' },
    { id: 'dark', name: 'Dark arena' },
    { id: 'gym', name: 'Warm gym' },
    { id: 'day', name: 'Day-time training hall' },
] as const;

export const moodOf = (variant: string): Mood =>
    variant === 'dark' || variant === 'gym' || variant === 'day' ? variant : 'spotlight';

interface Palette {
    floor: string;
    wall: string;
    /** how much the crowd tiers dim, front → back */
    dim: [number, number, number];
    crowd: boolean;
}
const PALETTES: Record<Mood, Palette> = {
    spotlight: { floor: '#15161b', wall: '#0d0e12', dim: [0.25, 0.45, 0.62], crowd: true },
    dark: { floor: '#202229', wall: '#16171c', dim: [0.15, 0.32, 0.5], crowd: true },
    gym: { floor: '#a57a4f', wall: '#c9a97a', dim: [0, 0.08, 0.15], crowd: false },
    day: { floor: '#b9b3a6', wall: '#e9e4d8', dim: [0, 0.05, 0.1], crowd: false },
};
export const paletteOf = (m: Mood) => PALETTES[m];

const CLOTH = [
    '#ef4444',
    '#f59e0b',
    '#16a34a',
    '#0ea5e9',
    '#2563eb',
    '#7c3aed',
    '#f8fafc',
    '#111827',
];
const SKIN = ['#f1c9a5', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];
const TROUSERS = ['#1f2937', '#374151', '#1d4ed8', '#4b5563'];
const REACTIONS = ['person', 'person', 'person-clap', 'person-cheer'];

/** The hall around the fighting area: lowered floor, back and side walls, a window row by day. */
export function hall(mood: Mood, half = 1400): SetPiece[] {
    const p = PALETTES[mood];
    const g = ground(p.floor, 6000);
    const out: SetPiece[] = [
        { ...g, points: g.points.map(([x, , z]): V3 => [x, RING_DROP, z]) },
        wall([-half, -half], [half, -half], 900, p.wall, 'back', RING_DROP),
        wall([-half, half], [-half, -half], 900, darken(p.wall, 0.06), 'back', RING_DROP),
        wall([half, -half], [half, half], 900, darken(p.wall, 0.06), 'back', RING_DROP),
    ];
    if (mood === 'day')
        for (let i = 0; i < 5; i++)
            out.push(panel(-1000 + i * 500, 380, -half + 1, 320, 200, '#cfe8ff', '#8a8f98'));
    if (mood === 'gym')
        out.push(
            box(-1100, -1200, 120, 60, 260, '#5b3a22', { y: RING_DROP }),
            box(1100, -1200, 160, 150, 40, '#3b3f46', { y: RING_DROP }),
        );
    return out;
}

/** The raised platform with its apron and the fighting surface on top (a square ring or an octagon). */
export function platform(points: [number, number][], surface: string, apron: string): SetPiece[] {
    const top: V3[] = points.map(([x, z]) => [x, 0.5, z]);
    const out: SetPiece[] = [{ kind: 'quad', layer: 'ground', color: surface, points: top }];
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        out.push(wall(a, b, -RING_DROP, apron, 'mid', RING_DROP));
    }
    return out;
}

/** Ropes (or fence rails) between posts at the given heights, closed round. */
export function ropes(
    posts: [number, number][],
    heights: number[],
    colors: string[],
    width = 3,
): SetPiece[] {
    const out: SetPiece[] = [];
    heights.forEach((y, i) => {
        const pts: V3[] = posts.map(([x, z]) => [x, y, z]);
        pts.push(pts[0]);
        out.push(line(pts, colors[i % colors.length], width));
    });
    return out;
}

/** Ceiling lamps over the fighting area; spotlights add cones of light down onto it. */
export function lights(mood: Mood, spread: number): SetPiece[] {
    const out: SetPiece[] = [];
    const y = 650;
    const lamp = mood === 'gym' ? '#ffd59a' : '#f8fafc';
    for (const x of [-spread, 0, spread])
        out.push(box(x, -spread * 0.4, 90, 14, 60, '#2a2d33', { y, top: lamp, layer: 'back' }));
    if (mood === 'spotlight')
        for (const x of [-spread * 0.45, spread * 0.45])
            out.push(card('light-cone', x, 0, spread * 1.3, y, ['#fff7d6'], { layer: 'front' }));
    return out;
}

/**
 * Three rising tiers of spectators behind and beside the fighting area (front / mid / back), on stands. The
 * front tier sits nearest; every tier further back is higher and dimmer (out of focus), so the fighters stand out.
 */
export function crowdTiers(rand: Rand, mood: Mood, inner: number): SetPiece[] {
    const p = PALETTES[mood];
    if (!p.crowd) return [];
    const out: SetPiece[] = [];
    const tiers = [
        { d: inner + 160, y: 0, n: 18 },
        { d: inner + 330, y: 90, n: 24 },
        { d: inner + 520, y: 190, n: 30 },
    ];
    let count = 0;
    tiers.forEach((t, ti) => {
        // the stand under the tier (behind, then the two sides)
        const riser = darken(p.wall, 0.1 + ti * 0.05);
        out.push(
            box(0, -t.d - 40, t.d * 2 + 160, t.y - RING_DROP, 150, riser, {
                y: RING_DROP,
                layer: 'back',
            }),
        );
        const dim = p.dim[ti];
        for (let i = 0; i < t.n && count < MAX_TIER_CROWD; i++, count++) {
            // two thirds behind the ring, a sixth on each side
            const side = i % 6 === 0 ? -1 : i % 6 === 3 ? 1 : 0;
            const along = rand.range(-t.d, t.d);
            const x = side ? side * t.d : along;
            const z = side ? rand.range(-t.d, inner * 0.4) : -t.d - rand.range(0, 60);
            const h = rand.range(118, 150);
            const shade = (c: string) => darken(c, dim);
            out.push(
                card(
                    rand.pick(REACTIONS),
                    x,
                    z,
                    h * 0.42,
                    h,
                    [shade(rand.pick(CLOTH)), shade(rand.pick(SKIN)), shade(rand.pick(TROUSERS))],
                    { at: [x, t.y, z], layer: 'mid', flip: rand.chance(0.5) },
                ),
            );
        }
    });
    return out;
}

/** The referee (a set card by default: owner decision Q3) standing in the fighting area, out of the way. */
export function referee(x: number, z: number): SetPiece {
    return card('person', x, z, 66, 178, ['#f8fafc', '#c68642', '#111827'], { layer: 'mid' });
}

/** Banners hanging on the back wall (plain colours: no logos). */
export function banners(colors: string[], half = 1400): SetPiece[] {
    return colors.map((c, i) =>
        panel(-900 + i * (1800 / Math.max(1, colors.length - 1)), 520, -half + 2, 160, 260, c),
    );
}

export const shadeCanvas = (mood: Mood, c: string) =>
    mood === 'spotlight' ? lighten(c, 0.08) : mood === 'dark' ? darken(c, 0.12) : c;
