import { SKIN_TONES } from '@/character/data/recipes';
import type { Rand } from '../world/random';
import { card, scatter } from './build';
import type { CardPiece, EnvironmentDef } from './types';

/**
 * Crowds (docs/CHARACTER_STUDIO.md phase 10): simple extras (flat person cut-outs, the "level of detail 2" of the
 * plan) standing in the place behind the characters. They are cards like trees: they always face the camera, scale
 * and haze with distance, and sort with the actors. Seeded, so the crowd is the same every time. At most 80.
 */
export const MAX_CROWD = 80;

const CLOTH = [
    '#ef4444',
    '#f59e0b',
    '#16a34a',
    '#0ea5e9',
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#111827',
    '#f8fafc',
    '#78350f',
    '#0f766e',
    '#a3e635',
    '#64748b',
    '#e11d48',
];

const TROUSERS = ['#1f2937', '#374151', '#1d4ed8', '#78350f', '#0f172a', '#4b5563', '#7c2d12'];

/** Where extras may stand (behind the characters, whatever the place allows), and how close they may stand. */
function areaOf(env: EnvironmentDef) {
    if (env.category === 'indoor')
        return { area: { x0: -460, z0: -420, x1: 460, z1: -170 }, gap: 55 };
    if (env.category === 'studio')
        return { area: { x0: -720, z0: -640, x1: 720, z1: -200 }, gap: 60 };
    return { area: { x0: -2100, z0: -2300, x1: 2100, z1: -260 }, gap: 72 };
}

export function crowdPieces(rand: Rand, count: number, env: EnvironmentDef): CardPiece[] {
    const n = Math.max(0, Math.min(MAX_CROWD, Math.round(count)));
    if (!n) return [];
    const { area, gap } = areaOf(env);
    // keep clear of the stage and of everything in front of it
    const spots = scatter(rand, shifted(area, env), n, gap, {
        x: env.stage.x,
        z: env.stage.z,
        r: env.stage.spread * 0.6 + 40,
    });
    return spots.map(([x, z]) => {
        const h = rand.range(142, 182);
        return card(
            'person',
            x,
            z,
            h * 0.37,
            h,
            [rand.pick(CLOTH), rand.pick(SKIN_TONES).color, rand.pick(TROUSERS)],
            {
                flip: rand.chance(0.5),
            },
        );
    });
}

const shifted = (a: { x0: number; z0: number; x1: number; z1: number }, env: EnvironmentDef) => ({
    x0: a.x0 + env.stage.x,
    x1: a.x1 + env.stage.x,
    z0: a.z0 + env.stage.z,
    z1: Math.min(a.z1 + env.stage.z, env.stage.z - 110),
});
