/**
 * Seeded random numbers (mulberry32): the same seed gives the same result, so a scene always draws the same
 * (tests, undo, the page). Never use Math.random in src/scene.
 */
export interface Rand {
    /** 0 ≤ n < 1 */
    (): number;
    /** lo ≤ n < hi */
    range(lo: number, hi: number): number;
    /** an integer lo..hi (both included) */
    int(lo: number, hi: number): number;
    pick<T>(list: readonly T[]): T;
    /** true with probability p */
    chance(p: number): boolean;
}

export function seeded(seed: number): Rand {
    let a = seed >>> 0 || 0x9e3779b9;
    const next = (() => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }) as Rand;
    next.range = (lo, hi) => lo + (hi - lo) * next();
    next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
    next.pick = (list) => list[Math.floor(next() * list.length) % list.length];
    next.chance = (p) => next() < p;
    return next;
}
