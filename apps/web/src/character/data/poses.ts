import { MOVE_POSES } from '../combat/registry';
import { mirrorPose } from '../rig/poseOps';
import type { Pose } from '../schema/types';
import { pose, type Arm } from './poseDsl';
import { POSES_A } from './posesA';
import { POSES_B } from './posesB';
import { POSES_C } from './posesC';
import { POSES_D } from './posesD';
import { POSES_ACTION } from './posesAction';
import { POSES_E } from './posesE';
import { POSES_LYING } from './posesLying';
import { POSES_MANGA } from './posesManga';
import { POSES_MARTIAL } from './posesMartial';
import { POSES_REFERENCE } from './posesReference';

/**
 * The pose library: the first ones here, the rest in posesA.ts, posesB.ts and posesC.ts, all written in body terms (poseDsl). Every pose
 * works on every body (foot contact keeps the feet down) and from every camera angle. Checked on rendered contact
 * sheets.
 */
// hand-placing arms: found by searching the angles whose wrist reaches the target with a natural elbow
// (hip, chin, forehead, ear, mouth, chest, behind the back) on the default body
const handOnHip: Arm = { raise: -40, spread: -10, twist: -105, bend: 110 };
/** fists in front of the chin, elbows down by the ribs (angle-searched on a child, an adult and a tall adult, both bodies: poseFixes.test.ts); the old one crossed the forearms in front of the chest */
const guard: Arm = { raise: 65, twist: -50, bend: 130 };
const handToChin: Arm = { raise: 70, spread: 10, twist: -75, bend: 120 };
const handToForehead: Arm = { raise: 60, spread: 120, twist: -90, bend: 120 };
const handToEar: Arm = { raise: 80, twist: 0, bend: 140 };
const handToMouth: Arm = { raise: 80, twist: -60, bend: 120 };
const handsTogether: Arm = { raise: 30, spread: 60, twist: -75, bend: 130 };
const handBehind: Arm = { spread: -10, twist: -135, bend: 70 };
const relaxed: Arm = { spread: 2 };

const walkA = pose('walk-a', 'Walk (left step)', 'walk', ['walk', 'step', 'move'], {
    legL: { lift: 24, bend: 8 },
    legR: { lift: -16, bend: 22, point: 8 },
    armL: { raise: -18, bend: 15 },
    armR: { raise: 22, bend: 28 },
    spine: { twist: 4 },
});
const runA = pose('run-a', 'Run (left stride)', 'walk', ['run', 'sprint', 'move'], {
    legL: { lift: 62, bend: 95 },
    legR: { lift: -28, bend: 55, point: 25 },
    armL: { raise: -40, bend: 95 },
    armR: { raise: 50, bend: 95 },
    spine: { bend: 12, twist: 8 },
    hands: ['fist', 'fist'],
    ground: 'right',
});
const renamed = (p: Pose, id: string, name: string): Pose => ({ ...p, id, name });

const CORE_POSES: Pose[] = [
    // standing
    pose('stand', 'Stand', 'standing', ['standing', 'neutral', 'idle'], {}),
    pose('stand-relaxed', 'Relaxed', 'standing', ['standing', 'casual', 'idle'], {
        root: { roll: 2 },
        legL: { spread: 4 },
        legR: { lift: 6, bend: 14, spread: -2 },
        spine: { side: -3 },
        head: { tilt: 5 },
    }),
    pose('hands-on-hips', 'Hands on hips', 'standing', ['standing', 'confident', 'hips'], {
        armL: handOnHip,
        armR: handOnHip,
        legL: { spread: 5 },
        legR: { spread: 5 },
        hands: ['fist', 'fist'],
    }),
    pose('arms-crossed', 'Arms crossed', 'standing', ['standing', 'serious', 'arms'], {
        armL: { raise: 30, twist: -70, bend: 112 },
        armR: { raise: 34, twist: -62, bend: 118 },
        head: { nod: -4 },
    }),
    pose('hands-behind', 'Hands behind back', 'standing', ['standing', 'calm', 'waiting'], {
        armL: handBehind,
        armR: handBehind,
    }),
    pose('shrug', 'Shrug', 'standing', ['gesture', 'confused', 'shrug'], {
        armL: { spread: 18, twist: 55, bend: 85 },
        armR: { spread: 18, twist: 55, bend: 85 },
        head: { tilt: 10 },
        hands: ['open', 'open'],
    }),
    pose('thinking', 'Thinking', 'standing', ['thinking', 'chin', 'idea'], {
        armR: handToChin,
        armL: { raise: 22, twist: -75, bend: 92 },
        head: { tilt: 8, nod: 6 },
        hands: ['relaxed', 'fist'],
    }),
    pose('confident', 'Confident', 'standing', ['standing', 'proud', 'hero'], {
        armL: handOnHip,
        armR: relaxed,
        legL: { spread: 9 },
        legR: { spread: 9 },
        head: { nod: -9 },
        hands: ['fist', 'relaxed'],
    }),
    // gestures
    pose('wave', 'Wave', 'gesture', ['wave', 'hello', 'greeting'], {
        armR: { spread: 80, raise: 90, bend: 95 },
        head: { tilt: 6 },
        hands: ['relaxed', 'wave'],
    }),
    pose('point', 'Point forward', 'gesture', ['point', 'direction', 'there'], {
        armR: { raise: 85, bend: 4 },
        hands: ['relaxed', 'point'],
    }),
    pose('thumbs-up', 'Thumbs up', 'gesture', ['thumbs up', 'ok', 'like'], {
        // the forearm about level, so the thumb (the hand's +z) points up, not sideways
        armR: { raise: 15, twist: -15, bend: 80 },
        hands: ['relaxed', 'thumbsUp'],
    }),
    pose('salute', 'Salute', 'gesture', ['salute', 'respect', 'soldier'], {
        armR: handToForehead,
        hands: ['relaxed', 'open'],
    }),
    pose('namaste', 'Namaste', 'gesture', ['namaste', 'greeting', 'pray'], {
        armL: handsTogether,
        armR: handsTogether,
        hands: ['open', 'open'],
    }),
    pose('bow', 'Bow', 'gesture', ['bow', 'respect', 'greeting'], {
        spine: { bend: 40 },
        head: { nod: 15 },
        armL: { raise: 22 },
        armR: { raise: 22 },
    }),
    // walk, run, jump
    walkA,
    renamed(mirrorPose(walkA), 'walk-b', 'Walk (right step)'),
    runA,
    renamed(mirrorPose(runA), 'run-b', 'Run (right stride)'),
    pose('jump', 'Jump', 'walk', ['jump', 'happy', 'air'], {
        root: { y: 28 },
        armL: { spread: 150, bend: 15 },
        armR: { spread: 150, bend: 15 },
        legL: { lift: 25, bend: 55, point: 30 },
        legR: { lift: 10, bend: 40, point: 30 },
        hands: ['open', 'open'],
        ground: 'air',
    }),
    pose('star-jump', 'Star jump', 'walk', ['jump', 'exercise', 'air'], {
        root: { y: 22 },
        armL: { spread: 135 },
        armR: { spread: 135 },
        legL: { spread: 28, point: 25 },
        legR: { spread: 28, point: 25 },
        hands: ['open', 'open'],
        ground: 'air',
    }),
    // sit, kneel, crouch
    pose('sit-chair', 'Sit on a chair', 'sitting', ['sit', 'chair', 'rest'], {
        legL: { lift: 88, bend: 88, spread: 4 },
        legR: { lift: 88, bend: 88, spread: 4 },
        armL: { raise: 35, bend: 45 },
        armR: { raise: 35, bend: 45 },
        spine: { bend: 4 },
    }),
    pose('sit-floor', 'Sit on the floor', 'sitting', ['sit', 'floor', 'knees'], {
        legL: { lift: 105, bend: 135, spread: 10 },
        legR: { lift: 105, bend: 135, spread: 10 },
        armL: { raise: 65, twist: -30, bend: 55 },
        armR: { raise: 65, twist: -30, bend: 55 },
        spine: { bend: 18 },
    }),
    pose('sit-cross-legged', 'Cross-legged', 'sitting', ['sit', 'floor', 'meditate', 'yoga'], {
        legL: { lift: 75, spread: 55, twist: 45, bend: 140 },
        legR: { lift: 75, spread: 55, twist: 45, bend: 140 },
        armL: { raise: 30, spread: 10, bend: 40 },
        armR: { raise: 30, spread: 10, bend: 40 },
        hands: ['ok', 'ok'],
    }),
    pose('kneel', 'Kneel on one knee', 'sitting', ['kneel', 'propose', 'rest'], {
        legL: { lift: 85, bend: 88 },
        legR: { lift: -5, bend: 92, point: -30 },
        armL: { raise: 40, bend: 50 },
        armR: { raise: 10 },
    }),
    pose('crouch', 'Crouch', 'sitting', ['crouch', 'hide', 'squat'], {
        legL: { lift: 100, bend: 140, spread: 12 },
        legR: { lift: 100, bend: 140, spread: 12 },
        spine: { bend: 28 },
        armL: { raise: 55, bend: 30 },
        armR: { raise: 55, bend: 30 },
    }),
    // fight
    pose('guard', 'Boxing guard', 'fight', ['fight', 'boxing', 'guard', 'stance'], {
        root: { yaw: 22 },
        legL: { lift: 18, bend: 18, spread: 6 },
        legR: { lift: -16, bend: 12, spread: 6 },
        armL: guard,
        armR: guard,
        head: { nod: 10, turn: -18 },
        hands: ['fist', 'fist'],
    }),
    pose('jab', 'Jab', 'fight', ['fight', 'punch', 'boxing'], {
        root: { yaw: 25 },
        legL: { lift: 20, bend: 18, spread: 6 },
        legR: { lift: -18, bend: 10, spread: 6 },
        armL: { raise: 88, bend: 2 },
        armR: guard,
        spine: { twist: -18 },
        head: { nod: 8, turn: -15 },
        hands: ['fist', 'fist'],
    }),
    pose('uppercut', 'Uppercut', 'fight', ['fight', 'punch', 'boxing'], {
        legL: { lift: 12, bend: 25 },
        legR: { lift: -10, bend: 30 },
        armR: { raise: 70, twist: -20, bend: 95 },
        armL: guard,
        spine: { twist: 20, side: -8 },
        hands: ['fist', 'fist'],
    }),
    pose('front-kick', 'Front kick', 'fight', ['fight', 'kick', 'karate'], {
        legR: { lift: 88, bend: 8, point: 20 },
        legL: { bend: 12 },
        armL: guard,
        armR: { raise: 20, spread: 30, bend: 60 },
        spine: { bend: -12 },
        hands: ['fist', 'fist'],
        ground: 'left',
    }),
    pose('block', 'Block', 'fight', ['fight', 'defend', 'block'], {
        armL: { raise: 78, twist: -55, bend: 100 },
        armR: { raise: 70, twist: -50, bend: 105 },
        legL: { lift: 12, bend: 20 },
        legR: { lift: -10, bend: 20 },
        head: { nod: 12 },
        hands: ['fist', 'fist'],
    }),
    pose('fist-pump', 'Fist pump', 'fight', ['victory', 'win', 'celebrate'], {
        armR: { spread: 150, bend: 35 },
        armL: { spread: 10, bend: 70, raise: 20 },
        head: { nod: -12 },
        hands: ['fist', 'fist'],
    }),
    // sports
    pose('bat-stance', 'Batting stance', 'sports', ['cricket', 'bat', 'stance'], {
        root: { yaw: 70 },
        spine: { bend: 22 },
        legL: { spread: 12, bend: 22, lift: 10 },
        legR: { spread: 12, bend: 22, lift: 10 },
        armL: { raise: 40, twist: -50, bend: 40 },
        armR: { raise: 40, twist: -40, bend: 45 },
        head: { turn: -65, nod: 10 },
        hands: ['holdBat', 'holdBat'],
    }),
    pose('bowling', 'Bowling release', 'sports', ['cricket', 'bowl', 'throw'], {
        armR: { spread: 172, raise: 10 },
        armL: { raise: 35, spread: 40, bend: 30 },
        legL: { lift: 40, bend: 18 },
        legR: { lift: -22, bend: 10, point: 20 },
        spine: { bend: 14, side: -10 },
        hands: ['open', 'fist'],
        ground: 'left',
    }),
    pose('football-kick', 'Football kick', 'sports', ['football', 'soccer', 'kick'], {
        legR: { lift: 58, bend: 12, point: 30 },
        legL: { bend: 16 },
        armL: { spread: 55, raise: 10 },
        armR: { spread: 25, raise: -20 },
        spine: { bend: -10, side: 8 },
        ground: 'left',
    }),
    pose('basketball-shot', 'Basketball shot', 'sports', ['basketball', 'shoot', 'throw'], {
        armR: { raise: 150, bend: 85 },
        armL: { raise: 130, bend: 60 },
        legL: { lift: 18, bend: 28 },
        legR: { lift: 18, bend: 28 },
        head: { nod: -18 },
        hands: ['open', 'open'],
    }),
    pose('sprint-start', 'Sprint start', 'sports', ['athletics', 'sprint', 'start', 'race'], {
        spine: { bend: 50 },
        legL: { lift: 85, bend: 100 },
        legR: { lift: 25, bend: 70, point: 30 },
        armL: { raise: 75, bend: 4 },
        armR: { raise: 75, bend: 4 },
        head: { nod: -20 },
        hands: ['open', 'open'],
    }),
    // emotion
    pose('cheer', 'Cheer', 'emotion', ['happy', 'cheer', 'celebrate'], {
        armL: { spread: 148, raise: 15, bend: 20 },
        armR: { spread: 148, raise: 15, bend: 20 },
        head: { nod: -15 },
        hands: ['open', 'open'],
    }),
    pose('sad', 'Sad', 'emotion', ['sad', 'down', 'tired'], {
        spine: { bend: 14 },
        head: { nod: 30 },
        armL: { raise: 6 },
        armR: { raise: 6 },
    }),
    pose('scared', 'Scared', 'emotion', ['fear', 'scared', 'cower'], {
        armL: { raise: 70, twist: -40, bend: 125 },
        armR: { raise: 70, twist: -40, bend: 125 },
        spine: { bend: 18 },
        legL: { lift: 18, bend: 30 },
        legR: { lift: 18, bend: 30 },
        head: { nod: 15, turn: -20 },
        hands: ['open', 'open'],
    }),
    pose('angry', 'Angry', 'emotion', ['angry', 'mad', 'fists'], {
        armL: { spread: 6, bend: 25, raise: 8 },
        armR: { spread: 6, bend: 25, raise: 8 },
        spine: { bend: 9 },
        head: { nod: 10 },
        legL: { spread: 8 },
        legR: { spread: 8 },
        hands: ['fist', 'fist'],
    }),
    // daily life
    pose('phone-call', 'Phone call', 'daily', ['phone', 'call', 'talk'], {
        armR: handToEar,
        armL: relaxed,
        head: { tilt: -10 },
        hands: ['relaxed', 'holdPhone'],
    }),
    pose('reading', 'Reading', 'daily', ['read', 'book', 'study'], {
        armL: { raise: 42, twist: -30, bend: 92 },
        armR: { raise: 42, twist: -30, bend: 92 },
        head: { nod: 25 },
        hands: ['open', 'open'],
    }),
    pose('drinking', 'Drinking', 'daily', ['drink', 'tea', 'cup', 'eat'], {
        armR: handToMouth,
        head: { nod: -6 },
        hands: ['relaxed', 'holdCup'],
    }),
    pose('carry-bag', 'Carry a bag', 'daily', ['bag', 'carry', 'shopping'], {
        armR: { spread: 4, bend: 6 },
        spine: { side: 5 },
        hands: ['relaxed', 'grip'],
    }),
    pose('stretch', 'Stretch', 'daily', ['stretch', 'morning', 'yawn'], {
        armL: { spread: 165, raise: 10, bend: 10 },
        armR: { spread: 165, raise: 10, bend: 10 },
        spine: { bend: -10 },
        head: { nod: -20 },
        hands: ['open', 'open'],
    }),
];

/** The whole library: the first poses here and the rest in posesA.ts, posesB.ts and posesC.ts. */
export const POSES: Pose[] = [
    ...CORE_POSES,
    ...POSES_A,
    ...POSES_B,
    ...POSES_C,
    ...POSES_D,
    ...POSES_E,
    ...POSES_ACTION,
    ...POSES_LYING,
    ...POSES_MARTIAL,
    ...POSES_MANGA,
    ...POSES_REFERENCE,
    // Combat Sports Pack: the peak of every move (docs/COMBAT_PACK.md)
    ...MOVE_POSES,
];

export const POSE_CATEGORIES = [
    'standing',
    'gesture',
    'walk',
    'sitting',
    'fight',
    'sports',
    'emotion',
    'daily',
    'dance',
    'work',
    'lying',
    'action',
    'martial',
] as const;

export const poseById = (id: string) => POSES.find((p) => p.id === id);
