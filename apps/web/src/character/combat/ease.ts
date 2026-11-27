import type { Ease } from './types';

/**
 * Timing curves (docs/COMBAT_PACK.md §2): a strike leaves fast and arrives (snap), the recovery is slower and
 * smooth (settle), a level change accelerates like a drop. t and the result are 0..1.
 */
export const EASES: Record<Ease, (t: number) => number> = {
    linear: (t) => t,
    snap: (t) => 1 - (1 - t) ** 3,
    settle: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
    drop: (t) => t * t,
};

/** Frames per second the moves are timed at (frame counts in the data are at this rate). */
export const MOVE_FPS = 24;

export const ease = (kind: Ease, t: number) => EASES[kind](Math.min(1, Math.max(0, t)));
