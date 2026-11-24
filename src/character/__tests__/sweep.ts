/**
 * Helpers for sweeps over many poses, styles and angles. A full cross product (every style × every pose × every
 * angle) was tens of thousands of renders, each followed by an `expect` per part or per number: the coverage run in CI
 * took more than ten minutes and was cancelled. A sweep now gives each combination a few angles spread round the
 * circle, a different set for each one, so every style, every pose and every angle is still drawn.
 */

/** `n` angles in degrees (multiples of `step`) for combination number `i`, spread evenly round the circle. */
export const anglesFor = (i: number, n: number, step: number): number[] => {
    const slots = Math.round(360 / step);
    return Array.from({ length: n }, (_, k) => ((i + Math.floor((k * slots) / n)) % slots) * step);
};
