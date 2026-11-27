import type { Pose } from '../schema/types';
import { keyPose } from './bake';
import { BOXING } from './data/boxing';
import { MMA_MOVES } from './data/mma';
import { MUAY_THAI } from './data/muayThai';
import { REACTIONS } from './data/reactions';
import { stanced } from './mirror';
import type { CombatMove, Discipline, MoveCategory } from './types';

/**
 * Every combat move (docs/COMBAT_PACK.md), in menu order, and the peak of each one as a library pose (category
 * `martial`, so the Pose tab lists them with the boxing / Muay Thai poses).
 */
export const COMBAT_MOVES: CombatMove[] = [...BOXING, ...MUAY_THAI, ...MMA_MOVES, ...REACTIONS];

export const moveById = (id: string) => COMBAT_MOVES.find((m) => m.id === id);

export const movesOf = (discipline: Discipline, category?: MoveCategory) =>
    COMBAT_MOVES.filter(
        (m) => m.discipline === discipline && (!category || m.category === category),
    );

/** The peak pose of every move, orthodox, body-free (the solved, per-body version comes from `bakeMove`). */
export const MOVE_POSES: Pose[] = COMBAT_MOVES.filter((m) => m.category !== 'stance').map((m) =>
    keyPose(stanced(m), 'peak'),
);
