/**
 * Seeded random numbers for the stamp brush engine. A stroke stores its seed, so redrawing it (zoom, reload,
 * export, undo) places every dab exactly where it was drawn. Pure.
 */

/** mulberry32: a small, fast 32-bit PRNG. Returns numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Standard normal sample (Box-Muller) from a [0, 1) source. */
export function gaussian(rnd: () => number): number {
    let u = rnd();
    while (u === 0) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/** A new random seed for a stroke. */
export const newSeed = () => Math.floor(Math.random() * 0x7fffffff) + 1;
