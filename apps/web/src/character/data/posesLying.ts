import type { Pose } from '../schema/types';
import { pose } from './poseDsl';

/**
 * Lying poses (docs/CHARACTER_STUDIO.md phase 3): the body turned onto its back, side or front (`root` pitch / roll)
 * and rested on the floor (`ground: 'floor'`: the lowest surface of the body is the floor, whatever the build).
 */
// turned a quarter round as well, so the body lies across the default front view (head to one side, feet to the
// other) instead of toward the viewer, where it read as two big shoes and a far-away head
const back = { pitch: -90, yaw: 90 };
const front = { pitch: 90, yaw: 90 };

export const POSES_LYING: Pose[] = [
    pose('lie-back', 'Lie on your back', 'lying', ['lie', 'back', 'rest', 'floor'], {
        root: back,
        ground: 'floor',
        armL: { spread: 12 },
        armR: { spread: 12 },
    }),
    pose('sleeping', 'Sleeping', 'lying', ['sleep', 'bed', 'night', 'rest'], {
        root: back,
        ground: 'floor',
        armL: { raise: 25, bend: 60, twist: -40 },
        armR: { raise: 20, bend: 70, twist: -40 },
        head: { tilt: 10, turn: 8 },
        legL: { bend: 6 },
        legR: { lift: 8, bend: 14, spread: -4 },
    }),
    pose('sunbathing', 'Sunbathing', 'lying', ['relax', 'sun', 'beach', 'back'], {
        root: back,
        ground: 'floor',
        armL: { raise: 160, bend: 90, spread: 30 },
        armR: { raise: 160, bend: 90, spread: 30 },
        legL: { spread: 8 },
        legR: { spread: 8, lift: 6 },
    }),
    pose('lie-knees-up', 'Lie, knees up', 'lying', ['lie', 'knees', 'relax', 'stargaze'], {
        root: back,
        ground: 'floor',
        legL: { lift: 70, bend: 100, spread: 6 },
        legR: { lift: 70, bend: 100, spread: 6 },
        armL: { raise: 150, bend: 100 },
        armR: { raise: 150, bend: 100 },
    }),
    pose('snow-angel', 'Snow angel', 'lying', ['snow', 'angel', 'play', 'winter'], {
        root: back,
        ground: 'floor',
        armL: { spread: 145 },
        armR: { spread: 145 },
        legL: { spread: 28 },
        legR: { spread: 28 },
        hands: ['open', 'open'],
    }),
    pose('lie-front', 'Lie on your front', 'lying', ['lie', 'front', 'stomach', 'read'], {
        root: front,
        ground: 'floor',
        armL: { raise: 130, bend: 100 },
        armR: { raise: 130, bend: 100 },
        head: { turn: 25, nod: -20 },
    }),
    pose('lie-reading', 'Reading on your stomach', 'lying', ['read', 'book', 'front', 'relax'], {
        root: front,
        ground: 'floor',
        armL: { raise: 100, bend: 110 },
        armR: { raise: 100, bend: 110 },
        legL: { lift: -10, bend: 80 },
        legR: { lift: -10, bend: 90 },
        head: { nod: -30 },
    }),
    pose('knocked-out', 'Knocked out', 'lying', ['faint', 'fall', 'defeated', 'comic'], {
        root: back,
        ground: 'floor',
        armL: { spread: 50, raise: 20, bend: 20 },
        armR: { spread: 70, raise: -10, bend: 30 },
        legL: { spread: 20, bend: 12 },
        legR: { spread: 35, lift: -8 },
        head: { tilt: 18, turn: 28 },
        hands: ['open', 'open'],
    }),
    pose('side-lying', 'Lie on your side', 'lying', ['side', 'sleep', 'rest', 'curl'], {
        root: { pitch: 0, roll: 90 },
        ground: 'floor',
        armL: { raise: 30, bend: 70 },
        armR: { raise: 40, bend: 90 },
        legL: { lift: 40, bend: 70 },
        legR: { lift: 55, bend: 90 },
        spine: { bend: 18 },
    }),
    pose('elbow-lean', 'Resting on an elbow', 'lying', ['side', 'elbow', 'relax', 'lounge'], {
        root: { pitch: 0, roll: 80 },
        ground: 'floor',
        armL: { raise: 70, bend: 100, twist: -40 },
        armR: { raise: 10, bend: 20 },
        legL: { lift: 8, bend: 14 },
        legR: { lift: 18, bend: 40 },
        head: { tilt: 14 },
    }),
    pose('curled-up', 'Curled up', 'lying', ['curl', 'fetal', 'sad', 'cold'], {
        root: { pitch: 0, roll: 90 },
        ground: 'floor',
        legL: { lift: 95, bend: 130 },
        legR: { lift: 100, bend: 135 },
        armL: { raise: 70, bend: 120 },
        armR: { raise: 80, bend: 125 },
        spine: { bend: 28 },
        head: { nod: 18 },
    }),
    pose(
        'lie-hands-behind-head',
        'Hands behind your head',
        'lying',
        ['lie', 'relax', 'daydream', 'back'],
        {
            root: back,
            ground: 'floor',
            armL: { raise: 120, spread: 80, twist: -60, bend: 125 },
            armR: { raise: 120, spread: 80, twist: -60, bend: 125 },
            legL: { bend: 6, spread: 4 },
            legR: { lift: 14, bend: 28, spread: -6 },
            head: { nod: 6 },
        },
    ),
];
