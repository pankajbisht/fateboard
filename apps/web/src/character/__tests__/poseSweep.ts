/**
 * The every-pose × every-15° render sweep (docs/CHARACTER_STUDIO.md §5), shared by one test file per body
 * (`render.sweep.<body>.test.ts`). Vitest runs the tests inside a file one after another but files in parallel, so
 * one file per body lets the three sweeps (about 12 s each) run on three workers instead of 36 s on one: this sweep
 * was the critical path of the whole unit run (docs/TESTING.md "Speed").
 */
import { expect, it } from 'vitest';
import { POSES } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { PART_GROUPS, type CharacterCamera } from '../schema/types';

const cam = (yaw: number): CharacterCamera => ({ yaw, pitch: 0, roll: 0, shot: 'full' });

// the geometry checks run in cartoon (no shading layers): the art styles are covered by styles.test.ts and the
// BUG-253 face test, and new characters' anime shading would make this 278 × 24 × 3 sweep twice as slow
export const SWEEP_BODIES = {
    kid: fromRecipe(RECIPES[0], 'kid'),
    adult: fromRecipe(RECIPES[4], 'adult'),
    elder: fromRecipe(RECIPES[10], 'elder'),
} as const;

/** Registers the sweep for one body: one test per half turn, so each stays well inside the time limit on a loaded machine. */
export const poseSweepTests = (id: keyof typeof SWEEP_BODIES) => {
    const c = { ...SWEEP_BODIES[id], style: 'cartoon' as const };
    for (const [from, to] of [
        [0, 180],
        [180, 360],
    ])
        it(`every pose on the ${c.id}, every 15° from ${from}° to ${to - 15}°: finite, every part drawn`, () => {
            // failures are collected and asserted once: an expect per part was about 1.5 million calls
            const bad: string[] = [];
            for (const pose of POSES)
                for (let yaw = from; yaw < to; yaw += 15) {
                    const m = renderCharacter({ ...c, rig: { pose } }, cam(yaw));
                    if (!m.viewBox.every(Number.isFinite)) bad.push(`${pose.id} ${yaw} viewBox`);
                    for (const p of m.parts)
                        if (/NaN|Infinity/.test(p.d))
                            bad.push(`${c.id} ${pose.id} ${yaw} ${p.key}`);
                    const groups = new Set(m.parts.map((p) => p.group));
                    for (const g of PART_GROUPS)
                        if (!groups.has(g)) bad.push(`${pose.id} ${yaw} missing ${g}`);
                }
            expect(bad).toEqual([]);
        }, 30000);
};
