import type { CombatMove } from '../types';
import { BOX, ON_BACK, key, move } from './build';

/**
 * Hit reactions and pad work (docs/COMBAT_PACK.md §1, §2): what the defender does when a strike lands. Reactions
 * are fast in (2–3 frames, the impact) and slow out; their eyes are not locked on the opponent (`free`).
 */
const guard = key(BOX);

export const REACTIONS: CombatMove[] = [
    move(
        'cs-head-snap',
        'Head snap-back',
        'any',
        'reaction',
        ['hit', 'reaction', 'head', 'snap'],
        'A clean shot to the head: the chin flies up and back, the upper body follows and the hands come away from the face; then the fighter recovers the guard.',
        {
            start: guard,
            peak: key(
                BOX,
                {
                    head: { nod: -30, turn: 10 },
                    spine: { bend: -12, twist: 10 },
                    armL: { raise: 40, spread: 30, twist: 0, bend: 60 },
                    armR: { raise: 50, spread: 35, twist: 0, bend: 70 },
                    legL: { lift: 10 },
                    legR: { bend: 24 },
                },
                { weight: 0.3, frames: 2, ease: 'snap', free: true },
            ),
            recover: key(BOX, {}, { frames: 8, ease: 'settle' }),
        },
    ),
    move(
        'cs-body-recoil',
        'Body recoil',
        'any',
        'reaction',
        ['hit', 'reaction', 'body', 'liver'],
        'A body shot folds the fighter around it: the torso curls forward, the elbows clamp to the ribs and the knees give a little.',
        {
            start: guard,
            peak: key(
                BOX,
                {
                    root: { z: -6 },
                    spine: { bend: 35, side: -6 },
                    head: { nod: 20 },
                    armL: { raise: 20, spread: -5, twist: -40, bend: 110 },
                    armR: { raise: 20, spread: -5, twist: -40, bend: 110 },
                    legL: { bend: 30 },
                    legR: { bend: 30 },
                },
                { weight: 0.4, frames: 3, ease: 'snap', free: true },
            ),
            recover: key(BOX, {}, { frames: 9, ease: 'settle' }),
        },
    ),
    move(
        'cs-stagger',
        'Stagger',
        'any',
        'reaction',
        ['hit', 'reaction', 'stagger', 'hurt', 'off balance'],
        'Hurt and off balance: a step back with uneven legs, the body tilting, the arms out to catch the balance and the guard gone.',
        {
            start: guard,
            peak: key(
                BOX,
                {
                    root: { z: -30, roll: 8, yaw: -10 },
                    legL: { lift: 30, bend: 10 },
                    legR: { lift: -30, bend: 30 },
                    spine: { bend: -10, side: -12, twist: 0 },
                    head: { nod: -10, tilt: 10 },
                    armL: { raise: 30, spread: 60, twist: 0, bend: 30 },
                    armR: { raise: 20, spread: 55, twist: 0, bend: 30 },
                    hands: ['open', 'open'],
                },
                { weight: 0.2, frames: 6, ease: 'settle', free: true },
            ),
            recover: key(BOX, { root: { z: -30 } }, { frames: 10, ease: 'settle' }),
        },
    ),
    move(
        'cs-knockdown',
        'Knockdown',
        'any',
        'reaction',
        ['hit', 'reaction', 'knockdown', 'fall', 'knockout', 'seated'],
        'The legs go: the fighter drops onto the seat, the hands post behind, then the back goes to the canvas. Shown without injury detail.',
        {
            start: key(
                BOX,
                {
                    root: { z: -20, roll: 6 },
                    legL: { bend: 40 },
                    legR: { bend: 50 },
                    spine: { bend: -6, twist: 0 },
                    head: { nod: -16 },
                    armL: { raise: 30, spread: 40, twist: 0, bend: 30 },
                    armR: { raise: 30, spread: 40, twist: 0, bend: 30 },
                    hands: ['open', 'open'],
                },
                { weight: 0.3, free: true },
            ),
            peak: key(
                {},
                {
                    legL: { lift: 80, bend: 30, spread: 15 },
                    legR: { lift: 70, bend: 50, spread: 10 },
                    spine: { bend: -15 },
                    head: { nod: -15 },
                    armL: { raise: -40, spread: 20, bend: 10 },
                    armR: { raise: -40, spread: 20, bend: 10 },
                    hands: ['open', 'open'],
                    ground: 'floor',
                },
                { frames: 6, ease: 'drop', free: true },
            ),
            recover: key(
                {},
                {
                    root: ON_BACK,
                    legL: { lift: 20, bend: 20, spread: 10 },
                    legR: { lift: 35, bend: 50, spread: 8 },
                    armL: { spread: 40, bend: 20 },
                    armR: { spread: 25, bend: 40 },
                    head: { turn: 20 },
                    hands: ['relaxed', 'relaxed'],
                    ground: 'floor',
                },
                { frames: 10, ease: 'settle', free: true },
            ),
        },
    ),
    move(
        'cs-pad-hold',
        'Holding pads',
        'any',
        'defence',
        ['pads', 'mitts', 'coach', 'training', 'pad work'],
        'The coach holds the focus mitts up in front of the shoulders, facing the puncher, and meets each punch with a short push so it lands with a snap.',
        {
            start: key(BOX, {
                armL: { raise: 80, spread: 25, twist: -40, bend: 110 },
                armR: { raise: 80, spread: 25, twist: -40, bend: 110 },
                hands: ['open', 'open'],
            }),
            peak: key(
                BOX,
                {
                    armL: { raise: 85, spread: 20, twist: -40, bend: 90 },
                    armR: { raise: 80, spread: 25, twist: -40, bend: 110 },
                    hands: ['open', 'open'],
                },
                { frames: 2, ease: 'snap' },
            ),
            recover: key(
                BOX,
                {
                    armL: { raise: 80, spread: 25, twist: -40, bend: 110 },
                    armR: { raise: 80, spread: 25, twist: -40, bend: 110 },
                    hands: ['open', 'open'],
                },
                { frames: 4, ease: 'settle' },
            ),
        },
    ),
];
