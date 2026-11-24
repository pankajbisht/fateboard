import type { Pose } from '../schema/types';
import { pose } from './poseDsl';

/**
 * Poses made for the manga body (docs/CHARACTER_STUDIO.md, manga phase A): an idle that is not symmetric (weight on
 * one leg, the hips tilted one way and the shoulders the other, the head tilted), and the hands-in-pockets stance.
 * The arm angles of the pocket pose were found with the reach solver for a pocket at the side of the hip, on a child,
 * a teen and two adults, then rounded, so the wrists end inside the trouser pocket on any manga body.
 */
export const POCKET_ARM = { raise: -22, spread: -2, twist: -70, bend: 60 };

export const POSES_MANGA: Pose[] = [
    pose(
        'manga-idle',
        'Relaxed idle',
        'standing',
        ['standing', 'manga', 'idle', 'relaxed', 'contrapposto'],
        {
            root: { roll: 3, yaw: 8 },
            // the feet turn out a little, as in a figure drawing
            legL: { spread: 2, twist: 8 },
            legR: { lift: 9, bend: 16, spread: -4, point: 6, twist: 8 },
            spine: { side: -6, twist: 4 },
            head: { tilt: 6, turn: 8 },
            armL: { spread: 6, bend: 14, raise: 3 },
            armR: { spread: 3, bend: 22, raise: 8 },
            hands: ['relaxed', 'relaxed'],
        },
    ),
    pose(
        'manga-pockets',
        'Hands in pockets, relaxed',
        'standing',
        ['standing', 'manga', 'pockets', 'hands-in-pockets', 'casual', 'cool'],
        {
            root: { roll: 2, yaw: 6 },
            legL: { spread: 3, twist: 8 },
            legR: { lift: 8, bend: 14, spread: -3, point: 5, twist: 8 },
            armL: POCKET_ARM,
            armR: POCKET_ARM,
            spine: { side: -4, twist: 3, bend: 3 },
            head: { tilt: 5, turn: 6 },
            hands: ['relaxed', 'relaxed'],
        },
    ),
];

/** The pose new characters start in (data/recipes.ts `fromRecipe`, schema/parse.ts `defaultCharacter`). */
export const MANGA_IDLE_POSE: Pose = POSES_MANGA[0];
