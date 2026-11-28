/**
 * Symmetry presets: one click restores a whole setup (mode, counts, options, chain, variation). Built-ins are
 * the Kaleidoscope Brush (Snowflake, Mandala, Flower, Lotus) and the moods (Calm, Chaos, Royal, Tech); the
 * user's own are saved in the browser (`@/lib/storage` local list "symmetry-presets"). The dice makes a random
 * setup from a seed, so "lock this one" can save exactly what is on screen.
 */
import { isSymmetryMode, type SymmetryMode } from '@/lib/canvas/symmetry';
import { newChainStep, WALLPAPER_GROUPS, type ChainStep } from '@/lib/canvas/symmetryGroups';
import { seededRandom } from '@/lib/canvas/symmetryVariation';
import {
    DEFAULT_SYMMETRY_OPTIONS,
    DEFAULT_SYMMETRY_VARIATION,
    type SymmetryModeOptions,
    type SymmetryVariation,
} from './symmetrySetup';

export type SymmetryPreset = {
    id: string;
    name: string;
    /** Group in the panel. */
    group: 'brush' | 'mood' | 'mine';
    symmetry: Exclude<SymmetryMode, 'none'>;
    symmetryAngle: number;
    symmetryCount: number;
    options: Partial<SymmetryModeOptions>;
    chain: ChainStep[];
    variation: Partial<SymmetryVariation>;
};

const preset = (
    id: string,
    name: string,
    group: SymmetryPreset['group'],
    symmetry: SymmetryPreset['symmetry'],
    rest: Partial<Omit<SymmetryPreset, 'id' | 'name' | 'group' | 'symmetry'>> = {},
): SymmetryPreset => ({
    id,
    name,
    group,
    symmetry,
    symmetryAngle: 90,
    symmetryCount: 6,
    options: {},
    chain: [],
    variation: {},
    ...rest,
});

const step = (kind: ChainStep['kind'], id: string, patch: Partial<ChainStep> = {}): ChainStep => ({
    ...newChainStep(kind, id),
    ...patch,
});

export const BUILTIN_SYMMETRY_PRESETS: SymmetryPreset[] = [
    preset('snowflake', 'Snowflake', 'brush', 'kaleido', { symmetryCount: 6 }),
    preset('mandala', 'Mandala', 'brush', 'kaleido', {
        symmetryCount: 12,
        variation: { hue: 8 },
    }),
    preset('flower', 'Flower', 'brush', 'radial', {
        symmetryCount: 8,
        variation: { hue: 12, shrink: 0.15 },
    }),
    preset('lotus', 'Lotus', 'brush', 'chain', {
        chain: [
            step('kaleido', 'lotus-1', { count: 8 }),
            step('translate', 'lotus-2', { count: 3, shift: 0, scale: 0.7 }),
        ],
        variation: { fade: 0.4 },
    }),
    preset('face', 'Face', 'brush', 'x', {
        variation: { wobble: 2, shrink: 0.02, seed: 11 },
    }),
    preset('calm', 'Calm', 'mood', 'radial', {
        symmetryCount: 5,
        variation: { fade: 0.5, shrink: 0.2 },
    }),
    preset('chaos', 'Chaos', 'mood', 'spiral', {
        symmetryCount: 24,
        options: { spiralTurn: 47, spiralScale: 0.94 },
        variation: { hue: 15, wobble: 18, seed: 7 },
    }),
    preset('royal', 'Royal', 'mood', 'chain', {
        chain: [step('mirror', 'royal-1'), step('kaleido', 'royal-2', { count: 8 })],
        options: { chainDepth: 1 },
    }),
    preset('tech', 'Tech', 'mood', 'wallpaper', {
        options: { wallpaper: 'p6m', tileSize: 120, tileReach: 2 },
    }),
];

const MODES_FOR_DICE: SymmetryPreset['symmetry'][] = [
    'radial',
    'kaleido',
    'spiral',
    'glide',
    'wallpaper',
    'chain',
];

/** A surprising but tidy setup from `seed` (same seed → same setup). */
export function randomSymmetryPreset(seed: number): SymmetryPreset {
    const rnd = seededRandom(seed);
    const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];
    const between = (lo: number, hi: number) => Math.round(lo + rnd() * (hi - lo));
    const mode = pick(MODES_FOR_DICE);
    const chainKinds = ['mirror', 'rotate', 'kaleido', 'spiral'] as const;
    return preset(`dice-${seed}`, `Dice #${seed}`, 'mine', mode, {
        symmetryAngle: pick([0, 30, 45, 60, 90]),
        symmetryCount: between(3, 16),
        options: {
            spiralTurn: between(15, 75),
            spiralScale: 0.8 + rnd() * 0.15,
            glideShift: between(40, 160),
            wallpaper: pick(WALLPAPER_GROUPS),
            tileSize: between(80, 260),
        },
        chain:
            mode === 'chain'
                ? Array.from({ length: between(2, 3) }, (_, i) =>
                      step(pick(chainKinds), `dice-${seed}-${i}`, {
                          count: between(2, 8),
                          angle: pick([0, 45, 90]),
                      }),
                  )
                : [],
        variation: {
            hue: rnd() < 0.5 ? between(4, 30) : 0,
            fade: rnd() < 0.3 ? 0.4 : 0,
            wobble: rnd() < 0.25 ? between(4, 16) : 0,
            seed,
        },
    });
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** A saved preset read back from storage. */
export const isSymmetryPreset = (v: unknown): v is SymmetryPreset =>
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    isSymmetryMode(v.symmetry) &&
    v.symmetry !== 'none' &&
    typeof v.symmetryAngle === 'number' &&
    typeof v.symmetryCount === 'number' &&
    isObj(v.options) &&
    Array.isArray(v.chain) &&
    isObj(v.variation);

export const PRESET_DEFAULTS = {
    options: DEFAULT_SYMMETRY_OPTIONS,
    variation: DEFAULT_SYMMETRY_VARIATION,
};
