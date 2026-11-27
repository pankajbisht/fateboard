import type { Pose } from '../schema/types';
import { mirrorPose } from '../rig/poseOps';
import { handsTogether } from './poseArms';
import { pose } from './poseDsl';
import type { Arm } from './poseDsl';

/**
 * Combat and army poses (docs/CHARACTER_STUDIO.md phase 3): boxing stances and punches, Muay Thai stance, kicks,
 * knees, elbows and the clinch, and soldier poses. Same body terms as the other pose files; every pose is inside the
 * joint limits and different from the others (`poses.test.ts`).
 */
/** fists beside the cheeks, elbows out (searched on a child and a tall adult: 85 20 -10 155) */
const highGuard: Arm = { raise: 85, spread: 20, twist: -10, bend: 155 };
/** the front hand a little lower and further out, ready to jab */
const guard: Arm = { raise: 70, spread: 15, twist: -15, bend: 150 };
/** forearms in front of the face (covering up) */
const cover: Arm = { raise: 92, spread: 5, twist: -35, bend: 155 };
/** hands up and apart for Muay Thai blocks */
const thaiGuard: Arm = { raise: 82, spread: 30, twist: -20, bend: 135 };

/**
 * Stance convention (docs/COMBAT_PACK.md §2, BUG-279): the fighter faces +z. Orthodox leads with the left foot and
 * shoulder, so the hips turn right (root yaw < 0: `rotY(+yaw)` moves the left side back); the spine and head turn
 * back so the eyes stay on the opponent (yaw + twist + turn ≈ 0). The lead foot points at the opponent (twist out),
 * the rear foot about 45° out. Southpaw is never written by hand: it is the mirror of orthodox.
 */
const orthodox = pose(
    'box-orthodox',
    'Orthodox stance',
    'martial',
    ['boxing', 'stance', 'orthodox', 'guard'],
    {
        root: { yaw: -30 },
        legL: { lift: 18, bend: 18, spread: 6, twist: 25 },
        legR: { lift: -16, bend: 16, spread: 10, twist: 15 },
        // the lead fist out at eye level, ready to jab; the rear fist on the cheek
        armL: { raise: 62, spread: 8, twist: -15, bend: 118 },
        armR: highGuard,
        spine: { bend: 10, twist: 8 },
        head: { nod: 14, turn: 22 },
        hands: ['fist', 'fist'],
    },
);

export const POSES_MARTIAL: Pose[] = [
    // boxing
    orthodox,
    {
        ...mirrorPose(orthodox),
        id: 'box-southpaw',
        name: 'Southpaw stance',
        tags: ['boxing', 'stance', 'southpaw', 'guard'],
    },
    pose('peekaboo', 'Peek-a-boo guard', 'martial', ['boxing', 'guard', 'tight', 'defence'], {
        // a crouched, less bladed stance: both fists on the cheeks, the lead one a little out, chin down
        root: { yaw: -20 },
        legL: { lift: 14, bend: 24, spread: 6, twist: 20 },
        legR: { lift: -14, bend: 22, spread: 8, twist: 12 },
        armL: { raise: 80, spread: 12, twist: -22, bend: 140 },
        armR: { raise: 90, spread: 12, twist: -25, bend: 150 },
        spine: { bend: 16, twist: 6 },
        head: { nod: 18, turn: 14 },
        hands: ['fist', 'fist'],
    }),
    pose('overhand', 'Overhand right', 'martial', ['boxing', 'punch', 'overhand', 'power'], {
        root: { yaw: 40 },
        legL: { lift: 20, bend: 24, spread: 8 },
        legR: { lift: -14, bend: 26, spread: 10 },
        armR: { raise: 95, spread: 24, bend: 40 },
        armL: guard,
        spine: { bend: 16, twist: -32 },
        head: { nod: 10, turn: -20 },
        hands: ['fist', 'fist'],
    }),
    pose('body-hook', 'Body hook', 'martial', ['boxing', 'punch', 'body', 'hook'], {
        root: { yaw: 25 },
        legL: { lift: 16, bend: 40, spread: 6 },
        legR: { lift: -14, bend: 42, spread: 10 },
        armL: { raise: 30, spread: 62, bend: 95 },
        armR: highGuard,
        spine: { bend: 22, twist: 26, side: 8 },
        head: { nod: 12, turn: -14 },
        hands: ['fist', 'fist'],
    }),
    pose('slip', 'Slip the punch', 'martial', ['boxing', 'dodge', 'slip', 'defence'], {
        legL: { lift: 14, bend: 24, spread: 8 },
        legR: { lift: -10, bend: 20, spread: 10 },
        armL: guard,
        armR: highGuard,
        spine: { side: 24, bend: 8 },
        head: { tilt: -16, nod: 12 },
        hands: ['fist', 'fist'],
    }),
    pose('bob-weave', 'Bob and weave', 'martial', ['boxing', 'duck', 'weave', 'defence'], {
        legL: { lift: 30, bend: 60, spread: 10 },
        legR: { lift: -10, bend: 56, spread: 12 },
        armL: highGuard,
        armR: highGuard,
        spine: { bend: 38 },
        head: { nod: -8 },
        hands: ['fist', 'fist'],
    }),
    pose('cover-up', 'Cover up', 'martial', ['boxing', 'cover', 'block', 'defence'], {
        legL: { lift: 10, bend: 34, spread: 8 },
        legR: { lift: -8, bend: 34, spread: 10 },
        armL: cover,
        armR: cover,
        spine: { bend: 24 },
        head: { nod: 22 },
        hands: ['fist', 'fist'],
    }),
    pose('shadow-box', 'Shadow boxing', 'martial', ['boxing', 'training', 'shadow', 'warm up'], {
        root: { yaw: 20 },
        legL: { lift: 14, bend: 20, spread: 8 },
        legR: { lift: -12, bend: 18, spread: 10 },
        armL: { raise: 40, spread: 10, bend: 80 },
        armR: { raise: 30, spread: 10, bend: 100 },
        spine: { twist: -8 },
        head: { nod: 8 },
        hands: ['fist', 'fist'],
    }),
    pose('champion', 'Champion, arms up', 'martial', ['boxing', 'win', 'champion', 'victory'], {
        armL: { raise: 165, spread: 25, bend: 10 },
        armR: { raise: 165, spread: 25, bend: 10 },
        legL: { spread: 8 },
        legR: { spread: 8 },
        spine: { bend: -8 },
        head: { nod: -14 },
        hands: ['fist', 'fist'],
    }),
    pose('knocked-back', 'Taking a hit', 'martial', ['boxing', 'hit', 'stagger', 'knockout'], {
        root: { pitch: -10, roll: 6 },
        legL: { lift: 24, bend: 20 },
        legR: { lift: -20, bend: 30, point: 10 },
        armL: { raise: 30, spread: 70, bend: 40 },
        armR: { raise: 10, spread: 60, bend: 50 },
        spine: { bend: -14, side: 10 },
        head: { nod: -18, turn: 34, tilt: 12 },
        hands: ['open', 'open'],
        ground: 'left',
    }),
    // muay thai
    pose('wai-kru', 'Wai kru bow', 'martial', ['muay thai', 'bow', 'respect', 'ritual'], {
        armL: handsTogether,
        armR: handsTogether,
        legL: { spread: 6, bend: 14 },
        legR: { spread: 6, bend: 14 },
        spine: { bend: 22 },
        head: { nod: 14 },
        hands: ['open', 'open'],
    }),
    pose(
        'muay-stance',
        'Muay Thai stance',
        'martial',
        ['muay thai', 'stance', 'guard', 'nak muay'],
        {
            // upright and squarer than boxing, weight on the bent rear leg, the lead leg light and ready to check
            root: { yaw: -20 },
            legL: { lift: 24, bend: 10, spread: 6, twist: 18 },
            legR: { lift: -10, bend: 28, spread: 10, twist: 12 },
            armL: { raise: 80, spread: 10, twist: -30, bend: 95 },
            armR: thaiGuard,
            spine: { bend: -4, twist: 4 },
            head: { nod: 6, turn: 16 },
            hands: ['fist', 'fist'],
        },
    ),
    pose('teep', 'Teep (push kick)', 'martial', ['muay thai', 'kick', 'teep', 'push'], {
        legR: { lift: 78, bend: 12, point: 25 },
        legL: { bend: 14 },
        armL: { raise: 70, spread: 12, bend: 95 },
        armR: { raise: 40, spread: 40, bend: 80 },
        spine: { bend: -22 },
        head: { nod: -4 },
        hands: ['fist', 'fist'],
        ground: 'left',
    }),
    pose('low-kick', 'Low kick', 'martial', ['muay thai', 'kick', 'low', 'leg kick'], {
        root: { yaw: -25 },
        legR: { lift: 42, spread: 62, bend: 6, point: 15 },
        legL: { bend: 24 },
        armL: thaiGuard,
        armR: { raise: 20, spread: 66, bend: 70 },
        spine: { side: -18, twist: 14 },
        hands: ['fist', 'fist'],
        ground: 'left',
    }),
    pose(
        'high-kick',
        'High roundhouse kick',
        'martial',
        ['muay thai', 'kick', 'high', 'head kick'],
        {
            legR: { lift: 62, spread: 66, bend: 10, point: 20 },
            legL: { bend: 20 },
            armL: thaiGuard,
            armR: { raise: 30, spread: 92, bend: 46 },
            spine: { side: -26, bend: -6 },
            head: { tilt: 8 },
            hands: ['fist', 'fist'],
            ground: 'left',
        },
    ),
    pose('rising-knee', 'Rising knee', 'martial', ['muay thai', 'knee', 'strike', 'khao'], {
        legR: { lift: 110, bend: 100, point: 30 },
        legL: { bend: 10 },
        armL: { raise: 100, spread: 20, bend: 60 },
        armR: { raise: 100, spread: 20, bend: 60 },
        spine: { bend: 14 },
        head: { nod: 10 },
        hands: ['fist', 'fist'],
        ground: 'left',
    }),
    pose('flying-knee', 'Flying knee', 'martial', ['muay thai', 'knee', 'jump', 'flying'], {
        root: { y: 44, pitch: 6 },
        legR: { lift: 110, bend: 96, point: 30 },
        legL: { lift: 10, bend: 80 },
        armL: { raise: 110, spread: 30, bend: 40 },
        armR: { raise: 90, spread: 36, bend: 50 },
        spine: { bend: 10 },
        ground: 'air',
        hands: ['fist', 'fist'],
    }),
    pose('thai-clinch', 'Clinch', 'martial', ['muay thai', 'clinch', 'grip', 'neck'], {
        armL: { raise: 120, spread: 10, twist: -35, bend: 95 },
        armR: { raise: 120, spread: 10, twist: -35, bend: 95 },
        legL: { lift: 20, bend: 40, spread: 8 },
        legR: { lift: -14, bend: 34, spread: 10 },
        spine: { bend: 12 },
        head: { nod: 14 },
        hands: ['grip', 'grip'],
    }),
    pose('elbow-slash', 'Horizontal elbow', 'martial', ['muay thai', 'elbow', 'slash', 'strike'], {
        root: { yaw: 20 },
        armR: { raise: 70, spread: 80, bend: 150 },
        armL: thaiGuard,
        legL: { lift: 14, bend: 28, spread: 8 },
        legR: { lift: -10, bend: 30, spread: 10 },
        spine: { twist: -26, bend: 8 },
        hands: ['fist', 'fist'],
    }),
    pose('elbow-down', 'Downward elbow', 'martial', ['muay thai', 'elbow', 'chop', 'strike'], {
        armR: { raise: 150, spread: 20, bend: 150 },
        armL: thaiGuard,
        legL: { lift: 16, bend: 40, spread: 8 },
        legR: { lift: -10, bend: 44, spread: 10 },
        spine: { bend: 20, twist: -12 },
        head: { nod: 12 },
        hands: ['fist', 'fist'],
    }),
    pose('check-kick', 'Check the kick', 'martial', ['muay thai', 'block', 'check', 'defence'], {
        legL: { lift: 74, bend: 96, point: 20 },
        legR: { bend: 12 },
        armL: thaiGuard,
        armR: thaiGuard,
        spine: { bend: 6, side: 8 },
        hands: ['fist', 'fist'],
        ground: 'right',
    }),
    // army
    pose('stand-easy', 'At ease', 'martial', ['army', 'soldier', 'at ease', 'parade'], {
        armL: { spread: -8, twist: -135, bend: 70 },
        armR: { spread: -8, twist: -135, bend: 70 },
        legL: { spread: 14 },
        legR: { spread: 14 },
        spine: { bend: -4 },
        head: { nod: -4 },
        hands: ['fist', 'open'],
    }),
    pose('halt-signal', 'Halt, fist raised', 'martial', ['army', 'soldier', 'halt', 'signal'], {
        armR: { raise: 100, spread: 20, bend: 95 },
        armL: { raise: 20, bend: 70 },
        legL: { lift: 12, bend: 30, spread: 6 },
        legR: { lift: -8, bend: 30, spread: 8 },
        spine: { bend: 10 },
        head: { nod: 6 },
        hands: ['fist', 'grip'],
    }),
    pose('rifle-aim', 'Aiming a rifle', 'martial', ['army', 'soldier', 'rifle', 'aim'], {
        root: { yaw: 30 },
        armR: { raise: 82, spread: 8, twist: -20, bend: 90 },
        armL: { raise: 72, spread: 16, bend: 12 },
        legL: { lift: 18, bend: 20, spread: 8 },
        legR: { lift: -14, bend: 18, spread: 10 },
        spine: { bend: 6, twist: -12 },
        head: { nod: 10, turn: -14, tilt: -10 },
        hands: ['grip', 'grip'],
    }),
    pose('kneel-aim', 'Kneeling, aiming', 'martial', ['army', 'soldier', 'kneel', 'aim'], {
        root: { yaw: 30 },
        legL: { lift: 90, bend: 95 },
        legR: { lift: -10, bend: 120, point: 40 },
        armR: { raise: 82, spread: 8, twist: -20, bend: 90 },
        armL: { raise: 72, spread: 16, bend: 12 },
        spine: { bend: 10, twist: -12 },
        head: { nod: 10, turn: -14, tilt: -10 },
        hands: ['grip', 'grip'],
        ground: 'both',
    }),
    pose('crouch-advance', 'Crouched advance', 'martial', ['army', 'soldier', 'sneak', 'advance'], {
        legL: { lift: 54, bend: 80 },
        legR: { lift: -14, bend: 70, point: 12 },
        armL: { raise: 70, spread: 14, bend: 40 },
        armR: { raise: 60, spread: 16, bend: 70 },
        spine: { bend: 34 },
        head: { nod: -14 },
        hands: ['grip', 'grip'],
        ground: 'right',
    }),
];
