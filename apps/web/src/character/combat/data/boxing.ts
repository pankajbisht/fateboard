import type { CombatMove } from '../types';
import { BOX, COVER, REAR_GUARD, key, move } from './build';

/**
 * Boxing (docs/COMBAT_PACK.md §1): punches and defence, orthodox. Every punch keeps the other fist on the cheek,
 * the chin tucked (nod) and hidden behind the punching shoulder (shrug); rear punches pivot the rear heel out and
 * turn the hips through; strikes snap out and come back slower along the same line.
 */
const stance = key(BOX);
const back = (frames = 5) => key(BOX, {}, { frames, ease: 'settle' });

export const BOXING: CombatMove[] = [
    move(
        'cs-jab',
        'Jab (boxing)',
        'boxing',
        'punch',
        ['punch', 'jab', 'straight', 'lead'],
        'A straight punch with the lead hand. The lead hip and shoulder turn in a little, the fist turns palm down at the end, the elbow stays in on the way out, the chin hides behind the lead shoulder and the rear fist never leaves the cheek. Fast out, slower back along the same line.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    root: { yaw: -38, z: 6 },
                    spine: { bend: 12, twist: 4 },
                    head: { nod: 18 },
                    armL: { raise: 88, spread: -6, twist: -20, bend: 6, shrug: 18 },
                    legL: { lift: 22, bend: 16 },
                    legR: { lift: -20, bend: 10, heel: 22, pivot: 5 },
                },
                { weight: 0.6, frames: 3, ease: 'snap' },
            ),
            recover: key(
                BOX,
                { root: { yaw: -32, z: 3 }, armL: { raise: 70, spread: 6, bend: 100 } },
                { frames: 5, ease: 'settle' },
            ),
        },
        { strike: { limb: 'hand', side: 'L', target: 'head', reach: 0.95 } },
    ),
    move(
        'cs-cross',
        'Cross',
        'boxing',
        'punch',
        ['punch', 'cross', 'straight', 'rear', 'power'],
        'The rear straight. Push off the rear foot, pivot the rear heel out, turn the hips and then the shoulders square so the rear shoulder drives through; the lead fist comes back to the chin as the cross goes out.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    root: { yaw: -5, z: 8 },
                    spine: { bend: 12, twist: 18 },
                    armR: { raise: 88, spread: -10, twist: -15, bend: 6, shrug: 16 },
                    armL: REAR_GUARD,
                    legL: { lift: 22, bend: 24 },
                    legR: { lift: -22, bend: 8, heel: 35, pivot: -40 },
                },
                { weight: 0.65, frames: 4, ease: 'snap' },
            ),
            recover: key(
                BOX,
                { root: { yaw: -26, z: 4 }, armR: { raise: 80, spread: 16, bend: 130 } },
                { frames: 6, ease: 'settle' },
            ),
        },
        { strike: { limb: 'hand', side: 'R', target: 'head', reach: 0.97 } },
    ),
    move(
        'cs-lead-hook',
        'Lead hook',
        'boxing',
        'punch',
        ['punch', 'hook', 'lead', 'power'],
        'A short, bent-arm punch from the side. The elbow comes up level with the fist (about 90°), the lead foot pivots on its ball with the heel turning out, and the hips and shoulders turn together; the power comes from the turn, not the arm.',
        {
            start: key(BOX, { legL: { bend: 24 } }, { weight: 0.55 }),
            peak: key(
                BOX,
                {
                    root: { yaw: -55 },
                    spine: { bend: 10, twist: -20 },
                    armL: { raise: 85, spread: 80, twist: -10, bend: 95, shrug: 15 },
                    legL: { bend: 22, heel: 20, pivot: -35 },
                    legR: { bend: 18, heel: 10 },
                },
                { weight: 0.55, frames: 4, ease: 'snap' },
            ),
            recover: back(6),
        },
        { strike: { limb: 'hand', side: 'L', target: 'head', reach: 0.62 }, hitStop: 3 },
    ),
    move(
        'cs-rear-hook',
        'Rear hook',
        'boxing',
        'punch',
        ['punch', 'hook', 'rear', 'power'],
        'The hook with the rear hand: the rear heel pivots out, the hips turn all the way through and the bent arm swings level with the shoulder, the lead fist back on the chin.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    root: { yaw: 5 },
                    spine: { bend: 10, twist: 20 },
                    armR: { raise: 85, spread: 80, twist: -10, bend: 95, shrug: 12 },
                    armL: REAR_GUARD,
                    legL: { bend: 22 },
                    legR: { bend: 10, heel: 35, pivot: -45 },
                },
                { weight: 0.65, frames: 5, ease: 'snap' },
            ),
            recover: back(7),
        },
        { strike: { limb: 'hand', side: 'R', target: 'head', reach: 0.62 }, hitStop: 3 },
    ),
    move(
        'cs-lead-uppercut',
        'Lead uppercut',
        'boxing',
        'punch',
        ['punch', 'uppercut', 'lead'],
        'Dip onto the lead leg, then drive up from the legs: the fist rises palm toward you inside the opponent’s guard to the chin, the elbow stays close to the body, the hips turn a little.',
        {
            start: key(
                BOX,
                {
                    spine: { side: 10, bend: 16 },
                    legL: { bend: 32 },
                    armL: { raise: 30, spread: 10, twist: 60, bend: 110 },
                },
                { weight: 0.6, frames: 0 },
            ),
            peak: key(
                BOX,
                {
                    root: { yaw: -40 },
                    spine: { side: -6, bend: 6, twist: -6 },
                    armL: { raise: 70, spread: 4, twist: 70, bend: 100 },
                    legL: { bend: 14, heel: 10, pivot: -20 },
                },
                { weight: 0.55, frames: 4, ease: 'snap' },
            ),
            recover: back(6),
        },
        { strike: { limb: 'hand', side: 'L', target: 'chin', reach: 0.55 } },
    ),
    move(
        'cs-rear-uppercut',
        'Rear uppercut',
        'boxing',
        'punch',
        ['punch', 'uppercut', 'rear', 'power'],
        'Dip onto the rear side, then the rear heel pivots and the hips drive up and through; the rear fist comes up under the chin, palm facing you, the lead hand guarding.',
        {
            start: key(
                BOX,
                {
                    spine: { side: -10, bend: 16 },
                    legR: { bend: 32 },
                    armR: { raise: 30, spread: 10, twist: 60, bend: 110 },
                },
                { weight: 0.45 },
            ),
            peak: key(
                BOX,
                {
                    root: { yaw: 0 },
                    spine: { side: 6, bend: 6, twist: 16 },
                    armR: { raise: 70, spread: 4, twist: 70, bend: 100 },
                    armL: REAR_GUARD,
                    legR: { bend: 12, heel: 30, pivot: -40 },
                },
                { weight: 0.6, frames: 4, ease: 'snap' },
            ),
            recover: back(7),
        },
        { strike: { limb: 'hand', side: 'R', target: 'chin', reach: 0.55 }, hitStop: 3 },
    ),
    move(
        'cs-overhand',
        'Overhand',
        'boxing',
        'punch',
        ['punch', 'overhand', 'rear', 'power', 'looping'],
        'A looping rear punch over the top of the opponent’s jab: the body bends forward and leans to the lead side (the head leaves the centre line), the fist arcs down onto the head, the rear heel pivots.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    root: { yaw: 0, z: 6 },
                    spine: { bend: 22, side: 12, twist: 18 },
                    armR: { raise: 115, spread: 30, twist: -30, bend: 40 },
                    armL: REAR_GUARD,
                    legL: { bend: 30 },
                    legR: { heel: 35, pivot: -40 },
                },
                { weight: 0.7, frames: 5, ease: 'snap' },
            ),
            recover: back(7),
        },
        { strike: { limb: 'hand', side: 'R', target: 'head', reach: 0.9 }, hitStop: 3 },
    ),
    move(
        'cs-body-hook',
        'Lead hook to the body',
        'boxing',
        'punch',
        ['punch', 'hook', 'body', 'liver', 'lead'],
        'Bend the knees and dip to the lead side, then turn the hips and shoulders through so the bent lead arm digs into the liver under the elbow; the rear fist stays on the chin and the lead heel turns out.',
        {
            start: key(BOX, {
                spine: { side: 8, bend: 16 },
                legL: { bend: 36 },
                legR: { bend: 30 },
            }),
            peak: key(
                BOX,
                {
                    root: { yaw: -52 },
                    spine: { bend: 22, side: 10, twist: -18 },
                    armL: { raise: 35, spread: 62, twist: -10, bend: 95, shrug: 10 },
                    legL: { bend: 36, heel: 20, pivot: -35 },
                    legR: { bend: 30, heel: 12 },
                },
                { weight: 0.55, frames: 4, ease: 'snap' },
            ),
            recover: back(6),
        },
        { strike: { limb: 'hand', side: 'L', target: 'body', reach: 0.62, across: -4 } },
    ),
    move(
        'cs-body-shot',
        'Straight to the body',
        'boxing',
        'punch',
        ['punch', 'body', 'rear', 'level change'],
        'Bend the knees to bring the shoulders down to the target (never just bend the waist), then the rear straight into the solar plexus with the heel pivot; the lead hand stays up for the counter.',
        {
            start: key(BOX, { legL: { bend: 40 }, legR: { bend: 38 }, spine: { bend: 18 } }),
            peak: key(
                BOX,
                {
                    root: { yaw: -5 },
                    spine: { bend: 24, twist: 18, side: 8 },
                    armR: { raise: 55, spread: -8, twist: -15, bend: 10 },
                    armL: REAR_GUARD,
                    legL: { lift: 24, bend: 42 },
                    legR: { bend: 30, heel: 30, pivot: -40 },
                },
                { weight: 0.6, frames: 4, ease: 'snap' },
            ),
            recover: back(6),
        },
        { strike: { limb: 'hand', side: 'R', target: 'body', reach: 0.92 } },
    ),
    // defence
    move(
        'cs-high-guard',
        'High guard',
        'boxing',
        'defence',
        ['guard', 'block', 'cover', 'high'],
        'Both forearms up in front of the face, gloves at the brow, elbows tight over the ribs, chin down and knees bent: punches land on the arms.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    armL: COVER,
                    armR: COVER,
                    spine: { bend: 16 },
                    head: { nod: 24 },
                    legL: { bend: 24 },
                    legR: { bend: 22 },
                },
                { frames: 3, ease: 'snap' },
            ),
            recover: back(5),
        },
    ),
    move(
        'cs-long-guard',
        'Long guard',
        'boxing',
        'defence',
        ['guard', 'frame', 'distance', 'long'],
        'The lead arm reaches out with an open glove to frame the opponent’s face or lead hand and keep the distance; the rear fist stays on the chin.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    armL: { raise: 80, spread: 0, twist: -60, bend: 25 },
                    head: { nod: 20 },
                    hands: ['open', 'fist'],
                },
                { weight: 0.4, frames: 4, ease: 'snap' },
            ),
            recover: back(5),
        },
    ),
    move(
        'cs-parry',
        'Parry',
        'boxing',
        'defence',
        ['parry', 'catch', 'jab', 'block'],
        'The rear hand taps the incoming jab down and across with a small, quick movement; it never reaches out, so the face stays covered.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    spine: { twist: 4 },
                    armR: { raise: 70, spread: -14, twist: -40, bend: 110 },
                    hands: ['fist', 'open'],
                },
                { frames: 2, ease: 'snap' },
            ),
            recover: back(4),
        },
    ),
    move(
        'cs-slip-left',
        'Slip left',
        'boxing',
        'defence',
        ['slip', 'dodge', 'evade', 'outside'],
        'A small turn and bend of the knees moves the head just off the centre line to the left; the eyes stay on the opponent and the hands stay up, ready to counter.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    root: { x: 4 },
                    spine: { side: 18, bend: 14, twist: -10 },
                    head: { tilt: -6 },
                    legL: { bend: 30 },
                },
                { weight: 0.65, frames: 3, ease: 'snap' },
            ),
            recover: back(4),
        },
    ),
    move(
        'cs-slip-right',
        'Slip right',
        'boxing',
        'defence',
        ['slip', 'dodge', 'evade', 'inside'],
        'The same slip to the right: the shoulders turn and the knees bend so the head leaves the line of the cross; the weight goes onto the rear leg, loading a lead hook.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    root: { x: -4 },
                    spine: { side: -18, bend: 14, twist: 14 },
                    head: { tilt: 6 },
                    legR: { bend: 30 },
                },
                { weight: 0.4, frames: 3, ease: 'snap' },
            ),
            recover: back(4),
        },
    ),
    move(
        'cs-duck',
        'Duck',
        'boxing',
        'defence',
        ['duck', 'level', 'evade', 'under'],
        'The knees bend (not the waist) and the head drops straight under the punch, the back stays fairly straight and the gloves stay up.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    spine: { bend: 22 },
                    head: { nod: 10 },
                    legL: { lift: 30, bend: 60 },
                    legR: { lift: -6, bend: 55 },
                    armL: COVER,
                    armR: REAR_GUARD,
                },
                { frames: 4, ease: 'drop' },
            ),
            recover: back(5),
        },
    ),
    move(
        'cs-bob-weave',
        'Bob and weave (U path)',
        'boxing',
        'defence',
        ['bob', 'weave', 'evade', 'hook'],
        'The head travels in a U under a hook: dip to one side, under the punch with bent knees, and up on the other side, ready to counter.',
        {
            start: key(BOX, {
                spine: { side: 12, bend: 14 },
                legL: { bend: 40 },
                legR: { bend: 36 },
            }),
            peak: key(
                BOX,
                {
                    spine: { bend: 26, twist: -12 },
                    legL: { lift: 28, bend: 60 },
                    legR: { bend: 56 },
                    armL: COVER,
                },
                { frames: 4, ease: 'settle' },
            ),
            recover: key(
                BOX,
                { spine: { side: -12, bend: 12 }, legL: { bend: 28 }, legR: { bend: 30 } },
                { weight: 0.4, frames: 5, ease: 'settle' },
            ),
        },
    ),
    move(
        'cs-roll',
        'Roll under the hook',
        'boxing',
        'defence',
        ['roll', 'shoulder roll', 'hook', 'evade'],
        'Bend the knees and roll the shoulders with the hook, the lead shoulder up over the chin, so the punch slides over the top; come up loaded for the return.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    spine: { bend: 24, side: -16, twist: -22 },
                    armL: { shrug: 20 },
                    legL: { bend: 48 },
                    legR: { bend: 44 },
                },
                { weight: 0.45, frames: 5, ease: 'settle' },
            ),
            recover: back(5),
        },
    ),
    move(
        'cs-clinch-box',
        'Clinch (tie-up)',
        'boxing',
        'clinch',
        ['clinch', 'tie up', 'hold', 'smother'],
        'Step in and tie up both of the opponent’s arms above the elbows, head beside theirs, chest close, so they cannot punch.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    root: { yaw: -10, z: 10 },
                    spine: { bend: 18 },
                    head: { nod: 10, tilt: 8 },
                    armL: { raise: 60, spread: 25, twist: -40, bend: 95 },
                    armR: { raise: 60, spread: 25, twist: -40, bend: 95 },
                    hands: ['grip', 'grip'],
                },
                { weight: 0.55, frames: 5, ease: 'settle' },
            ),
            recover: back(6),
        },
    ),
    move(
        'cs-step-back',
        'Step back (footwork)',
        'boxing',
        'defence',
        ['step', 'back', 'distance', 'footwork'],
        'The rear foot steps back first and the lead foot follows the same distance, so the stance never narrows; the hands stay up.',
        {
            start: stance,
            peak: key(
                BOX,
                {
                    root: { z: -22 },
                    legL: { lift: 8, bend: 14, heel: 6 },
                    legR: { lift: -24, bend: 22 },
                },
                { weight: 0.25, frames: 4, ease: 'snap' },
            ),
            recover: key(BOX, { root: { z: -22 } }, { frames: 4, ease: 'settle' }),
        },
    ),
];
