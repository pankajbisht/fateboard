import type { CombatMove, FightSpec } from '../types';
import { THAI, THAI_REAR, key, move } from './build';

/**
 * Muay Thai (docs/COMBAT_PACK.md §1), orthodox. Kicks turn over the hip on a standing foot that pivots on its
 * ball (heel toward the target), the kicking-side arm swings down and back for power and balance while the other
 * hand guards the face; knees and elbows come with the hips driving in.
 */
const stance = key(THAI, {}, { weight: 0.3 });
const back = (frames = 7) => key(THAI, {}, { weight: 0.3, frames, ease: 'settle' });
/** the guard hand near the face during a kick */
const faceGuard = { raise: 90, spread: 10, twist: -20, bend: 150 };

/** A rear-leg roundhouse at a height: the standing lead foot pivots out, the body leans away. */
function roundhouse(lift: number, spread: number, yaw: number, lean: number): FightSpec {
    return {
        root: { yaw },
        spine: { side: lean, bend: -2, twist: -20 },
        legR: { lift, spread, bend: 12, twist: -20, point: 30 },
        legL: { lift: 0, bend: 14, spread: 4, twist: 0, pivot: 60, heel: 30 },
        armR: { raise: -30, spread: 34, twist: 0, bend: 20 },
        armL: faceGuard,
        ground: 'left',
    };
}

export const MUAY_THAI: CombatMove[] = [
    move(
        'cs-teep',
        'Lead teep',
        'muay-thai',
        'kick',
        ['teep', 'push kick', 'front kick', 'lead'],
        'A push kick with the lead leg. Chamber the knee high, then drive the hips forward and push the ball of the foot into the belly; lean back so the head stays out of range, the lead arm swings down for balance, the rear hand stays high. Re-chamber before the foot comes down.',
        {
            start: key(
                THAI,
                {
                    root: { yaw: -20 },
                    spine: { bend: -8 },
                    legL: { lift: 85, bend: 105, point: -15, twist: 10, heel: 0 },
                    legR: { lift: -4, bend: 16, spread: 6, twist: 15 },
                    armL: { raise: 55, spread: 15, bend: 120 },
                    ground: 'right',
                },
                { weight: 0, frames: 0 },
            ),
            peak: key(
                THAI,
                {
                    root: { yaw: -8, z: 8 },
                    spine: { bend: -20, twist: 0 },
                    head: { nod: 14 },
                    legL: { lift: 88, bend: 4, point: -25, twist: 0, heel: 0 },
                    legR: { lift: -6, bend: 12, spread: 6, twist: 15, pivot: 15 },
                    armL: { raise: -15, spread: 28, twist: 0, bend: 20 },
                    ground: 'right',
                },
                { weight: 0, frames: 4, ease: 'snap' },
            ),
            recover: key(
                THAI,
                {
                    root: { yaw: -16, z: 4 },
                    spine: { bend: -8 },
                    legL: { lift: 62, bend: 95, point: -10, twist: 8, heel: 0 },
                    legR: { lift: -4, bend: 16, spread: 6, twist: 15 },
                    armL: { raise: 50, spread: 15, bend: 120 },
                    ground: 'right',
                },
                { weight: 0, frames: 7, ease: 'settle' },
            ),
        },
        { strike: { limb: 'foot', side: 'L', target: 'body', reach: 0.95 } },
    ),
    move(
        'cs-teep-counter',
        'Rear teep (counter)',
        'muay-thai',
        'kick',
        ['teep', 'counter', 'stop', 'rear'],
        'The rear-leg teep thrown as the opponent steps in to kick: it stops them on the way in. The hips push forward off the standing lead leg, the rear-side arm swings back.',
        {
            start: key(
                THAI,
                {
                    spine: { bend: -8 },
                    legR: { lift: 85, bend: 105, point: -15 },
                    legL: { lift: 0, bend: 16, heel: 0 },
                    ground: 'left',
                },
                { weight: 1 },
            ),
            peak: key(
                THAI,
                {
                    root: { yaw: 5, z: 8 },
                    spine: { bend: -20, twist: 0 },
                    legR: { lift: 88, bend: 4, point: -25, twist: 0 },
                    legL: { lift: 0, bend: 12, heel: 0, pivot: 15 },
                    armR: { raise: -15, spread: 28, twist: 0, bend: 20 },
                    armL: faceGuard,
                    ground: 'left',
                },
                { weight: 1, frames: 4, ease: 'snap' },
            ),
            recover: back(7),
        },
        { strike: { limb: 'foot', side: 'R', target: 'body', reach: 0.95 } },
    ),
    move(
        'cs-kick-leg',
        'Leg kick',
        'muay-thai',
        'kick',
        ['roundhouse', 'low kick', 'leg kick', 'rear'],
        'The rear-leg roundhouse into the thigh: step the lead foot out and turn it, then turn the hip over so the shin (not the foot) lands across the thigh; the rear arm swings down and back, the lead glove guards the face.',
        {
            start: key(THAI, { legL: { pivot: 35, heel: 20 } }, { weight: 0.8 }),
            peak: key(THAI, roundhouse(40, 50, 60, 14), { weight: 1, frames: 5, ease: 'snap' }),
            recover: back(8),
        },
        { strike: { limb: 'shin', side: 'R', target: 'leg', reach: 0.9 }, hitStop: 3 },
    ),
    move(
        'cs-kick-body',
        'Body kick',
        'muay-thai',
        'kick',
        ['roundhouse', 'body kick', 'mid kick', 'rear'],
        'The roundhouse to the ribs: the standing foot turns until the heel points at the target, the hip turns over and the shin swings through level with the body; the body leans away to balance the kick.',
        {
            start: key(THAI, { legL: { pivot: 35, heel: 20 } }, { weight: 0.8 }),
            peak: key(THAI, roundhouse(75, 55, 72, 22), { weight: 1, frames: 5, ease: 'snap' }),
            recover: back(8),
        },
        { strike: { limb: 'shin', side: 'R', target: 'body', reach: 0.92 }, hitStop: 3 },
    ),
    move(
        'cs-kick-head',
        'Head kick',
        'muay-thai',
        'kick',
        ['roundhouse', 'high kick', 'head kick', 'rear'],
        'The roundhouse at head height: the most turn on the standing foot, the deepest lean away and the biggest arm swing; the shin lands on the side of the head.',
        {
            start: key(THAI, { legL: { pivot: 40, heel: 25 } }, { weight: 0.85 }),
            peak: key(
                THAI,
                { ...roundhouse(100, 70, 80, 30), armR: { raise: -40, spread: 40, bend: 10 } },
                { weight: 1, frames: 6, ease: 'snap' },
            ),
            recover: back(9),
        },
        { strike: { limb: 'shin', side: 'R', target: 'head', reach: 0.95 }, hitStop: 4 },
    ),
    move(
        'cs-switch-kick',
        'Switch kick',
        'muay-thai',
        'kick',
        ['switch', 'roundhouse', 'lead', 'body kick'],
        'A quick switch of the feet (the lead foot steps back, the rear one forward), then a roundhouse with the now-rear lead leg: the speed of a lead kick with the turn of a rear one.',
        {
            start: key(THAI, {
                root: { yaw: 15 },
                legL: { lift: -14, bend: 16, heel: 10 },
                legR: { lift: 16, bend: 14 },
            }),
            peak: key(
                THAI,
                {
                    root: { yaw: -72 },
                    spine: { side: -22, bend: -2, twist: 20 },
                    legL: { lift: 75, spread: 55, bend: 15, twist: -20, point: 30, heel: 0 },
                    legR: { lift: 0, bend: 14, spread: 4, twist: 0, pivot: 60, heel: 30 },
                    armL: { raise: -30, spread: 34, twist: 0, bend: 20 },
                    armR: faceGuard,
                    ground: 'right',
                },
                { weight: 0, frames: 5, ease: 'snap' },
            ),
            recover: back(8),
        },
        { strike: { limb: 'shin', side: 'L', target: 'body', reach: 0.92 }, hitStop: 3 },
    ),
    move(
        'cs-front-knee',
        'Straight knee',
        'muay-thai',
        'knee',
        ['knee', 'khao', 'straight', 'rear'],
        'The rear knee drives straight up and forward into the body while the hips push in and the body leans back; the standing foot rises on its ball and both hands pull down.',
        {
            start: stance,
            peak: key(
                THAI,
                {
                    root: { yaw: -5, z: 10 },
                    spine: { bend: -12, twist: 0 },
                    legR: { lift: 100, bend: 140, point: 20 },
                    legL: { lift: 0, bend: 8, heel: 30 },
                    armL: { raise: 70, spread: 10, twist: -30, bend: 70 },
                    armR: { raise: 70, spread: 10, twist: -30, bend: 70 },
                    hands: ['grip', 'grip'],
                    ground: 'left',
                },
                { weight: 1, frames: 4, ease: 'snap' },
            ),
            recover: back(7),
        },
        { strike: { limb: 'knee', side: 'R', target: 'belly', reach: 0.95 } },
    ),
    move(
        'cs-elbow-horizontal',
        'Slashing elbow',
        'muay-thai',
        'elbow',
        ['elbow', 'sok', 'horizontal', 'slash'],
        'At close range the bent arm swings level so the point of the elbow slashes across the brow; the hips and shoulders turn like a hook and the other hand covers.',
        {
            start: stance,
            peak: key(
                THAI,
                {
                    root: { yaw: 10 },
                    spine: { twist: 25, bend: 8 },
                    armR: { raise: 90, spread: 85, twist: -10, bend: 155, shrug: 10 },
                    armL: faceGuard,
                    legR: { heel: 30, pivot: -40 },
                },
                { weight: 0.6, frames: 3, ease: 'snap' },
            ),
            recover: back(6),
        },
        { strike: { limb: 'elbow', side: 'R', target: 'chin', reach: 1 } },
    ),
    move(
        'cs-elbow-uppercut',
        'Uppercut elbow',
        'muay-thai',
        'elbow',
        ['elbow', 'uppercut', 'rising'],
        'The elbow rises straight up the centre line under the chin, the fist by the ear, driven by the legs and a small hip turn.',
        {
            start: stance,
            peak: key(
                THAI,
                {
                    spine: { twist: 15, bend: -4 },
                    armR: { raise: 140, spread: 10, twist: -20, bend: 155 },
                    armL: faceGuard,
                    legR: { heel: 30, pivot: -40 },
                },
                { weight: 0.6, frames: 3, ease: 'snap' },
            ),
            recover: back(6),
        },
        { strike: { limb: 'elbow', side: 'R', target: 'chin', reach: 1, across: -5 } },
    ),
    move(
        'cs-elbow-down',
        'Chopping elbow',
        'muay-thai',
        'elbow',
        ['elbow', 'chop', 'downward', 'spear'],
        'The elbow is raised high, then chops down onto the top of the head as the knees bend and the body drops behind it.',
        {
            start: key(THAI, { armR: { raise: 160, spread: 20, bend: 155 } }, { weight: 0.4 }),
            peak: key(
                THAI,
                {
                    spine: { bend: 24, twist: 10 },
                    armR: { raise: 110, spread: 15, bend: 155 },
                    armL: faceGuard,
                    legL: { bend: 24 },
                },
                { weight: 0.7, frames: 3, ease: 'drop' },
            ),
            recover: back(6),
        },
        { strike: { limb: 'elbow', side: 'R', target: 'head', reach: 1 } },
    ),
    move(
        'cs-clinch-knee',
        'Clinch knee',
        'muay-thai',
        'knee',
        ['clinch', 'knee', 'plum', 'thai clinch'],
        'Both hands clasped behind the opponent’s head (elbows squeezed in), pull the head down while the knee drives up into the body; the standing foot rises on its ball.',
        {
            start: key(THAI, {
                spine: { bend: 10 },
                armL: { raise: 100, spread: 10, twist: -30, bend: 120 },
                armR: { raise: 100, spread: 10, twist: -30, bend: 120 },
                hands: ['grip', 'grip'],
            }),
            peak: key(
                THAI,
                {
                    root: { z: 6 },
                    spine: { bend: -14 },
                    armL: { raise: 90, spread: 10, twist: -30, bend: 110 },
                    armR: { raise: 90, spread: 10, twist: -30, bend: 110 },
                    legR: { lift: 95, bend: 140, point: 20 },
                    legL: { lift: 0, bend: 8, heel: 30 },
                    hands: ['grip', 'grip'],
                    ground: 'left',
                },
                { weight: 1, frames: 4, ease: 'snap' },
            ),
            recover: back(6),
        },
        { strike: { limb: 'knee', side: 'R', target: 'belly', reach: 0.95 } },
    ),
    // defence
    move(
        'cs-check',
        'Leg check',
        'muay-thai',
        'defence',
        ['check', 'block', 'shin', 'leg kick'],
        'Lift the lead knee up and out so the kick lands on the shin, not the thigh; the toes point down, the weight sits on the rear leg and the hands stay up.',
        {
            start: stance,
            peak: key(
                THAI,
                {
                    legL: { lift: 70, spread: 25, twist: 30, bend: 100, point: 10, heel: 0 },
                    spine: { bend: 4 },
                    armL: faceGuard,
                    ground: 'right',
                },
                { weight: 0, frames: 3, ease: 'snap' },
            ),
            recover: back(5),
        },
    ),
    move(
        'cs-shin-block',
        'Shin block',
        'muay-thai',
        'defence',
        ['block', 'shin', 'body kick', 'elbow to knee'],
        'Against a body kick the knee comes higher and the elbow comes down to meet it, closing the gap so the ribs are covered.',
        {
            start: stance,
            peak: key(
                THAI,
                {
                    legL: { lift: 90, spread: 15, twist: 20, bend: 120, heel: 0 },
                    armL: { raise: 55, spread: 5, twist: -30, bend: 150 },
                    spine: { bend: 10, side: -4 },
                    ground: 'right',
                },
                { weight: 0, frames: 3, ease: 'snap' },
            ),
            recover: back(5),
        },
    ),
    move(
        'cs-catch-kick',
        'Catch the kick',
        'muay-thai',
        'defence',
        ['catch', 'trap', 'kick', 'counter'],
        'Take the kick on the body side, scoop the leg with the lead arm under it and wrap it from above with the other; then sweep or counter.',
        {
            start: stance,
            peak: key(
                THAI,
                {
                    spine: { bend: 10, side: 8 },
                    armL: { raise: 30, spread: 35, twist: 60, bend: 100 },
                    armR: { raise: 55, spread: -15, twist: -30, bend: 100 },
                    legL: { bend: 22 },
                    legR: { bend: 30 },
                    hands: ['grip', 'grip'],
                },
                { weight: 0.4, frames: 3, ease: 'snap' },
            ),
            recover: key(THAI, { armR: THAI_REAR }, { weight: 0.3, frames: 6, ease: 'settle' }),
        },
    ),
];
