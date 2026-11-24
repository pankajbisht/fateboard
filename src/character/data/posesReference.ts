import type { Pose } from '../schema/types';
import { pose, type Arm, type PoseSpec } from './poseDsl';
import { POCKET_ARM } from './posesManga';

/**
 * The poses of the owner's two reference sheets (docs/CHARACTER_STUDIO.md, reference pass phase 6) that the library
 * did not have: a teen standing, walking, leaning and jumping in everyday clothes, and the hand gestures, waist up. The
 * standing ones shift the weight onto one leg (the hips tilt one way, the shoulders the other), as a figure drawing
 * does; a straight, even stance looks stiff. Arm angles reuse the placements the library found for chin, ear and pocket.
 */
const handToChin: Arm = { raise: 70, spread: 10, twist: -75, bend: 120 };
/**
 * Hands at the head: the elbow up and forward and the upper arm turned out, so the forearm comes back to the side of
 * the head (found with the reach solver, rig/reach.ts, for a wrist at the ear, the crown and the side of the head)
 */
const handToEar: Arm = { raise: 150, spread: 0, twist: 80, bend: 100 };
const handOnCrown: Arm = { raise: 172, spread: 0, twist: 70, bend: 50 };
const handBesideHead: Arm = { raise: 167, spread: 0, twist: 72, bend: 70 };
/** a hand gripping a backpack strap in front of the shoulder */
const strap: Arm = { raise: 10, spread: 10, twist: 25, bend: 140 };
/** both hands in the hoodie's front pocket, meeting at the belly */
const hoodiePocket: Arm = { raise: 2, spread: 0, twist: -45, bend: 88 };

/** weight on the left leg: the right knee eases, the hips tilt, the spine leans back the other way */
const weight = (k = 1): Pick<PoseSpec, 'root' | 'legL' | 'legR' | 'spine'> => ({
    root: { roll: 3 * k, yaw: 6 * k },
    legL: { spread: 2, twist: 6 },
    legR: { lift: 8 * k, bend: 15 * k, spread: -3, point: 5 * k, twist: 8 },
    spine: { side: -5 * k, twist: 3 * k },
});
/** a mid-stride step (left foot forward) */
const stride = { legL: { lift: 24, bend: 8 }, legR: { lift: -16, bend: 22, point: 8 } };

export const POSES_REFERENCE: Pose[] = [
    // the full-body sheet
    pose(
        'pockets-hoodie',
        'Hands in hoodie pocket',
        'standing',
        ['standing', 'hoodie', 'pockets', 'casual'],
        {
            ...weight(),
            armL: hoodiePocket,
            armR: hoodiePocket,
            head: { tilt: 4, nod: 4 },
        },
    ),
    pose(
        'pockets-side',
        'Pockets, slouched',
        'standing',
        ['standing', 'pockets', 'slouch', 'cool'],
        {
            ...weight(0.6),
            spine: { bend: 6, side: -3 },
            armL: POCKET_ARM,
            armR: POCKET_ARM,
            head: { nod: 6, tilt: 3 },
        },
    ),
    pose(
        'scratch-head',
        'Scratch the back of the head',
        'gesture',
        ['scratch', 'awkward', 'shy', 'head'],
        {
            ...weight(),
            armR: handBesideHead,
            armL: POCKET_ARM,
            head: { tilt: 9, nod: 4 },
            hands: ['relaxed', 'open'],
        },
    ),
    pose(
        'one-pocket-lean',
        'One hand in pocket',
        'standing',
        ['standing', 'pocket', 'casual', 'relaxed'],
        {
            ...weight(1.3),
            armL: POCKET_ARM,
            armR: { spread: 4, bend: 16, raise: 6 },
            head: { tilt: 7, turn: 6 },
        },
    ),
    pose('walk-strap', 'Walk, holding a strap', 'walk', ['walk', 'school', 'backpack', 'strap'], {
        ...stride,
        armR: strap,
        armL: { raise: 18, bend: 26 },
        spine: { twist: 4 },
        hands: ['relaxed', 'grip'],
    }),
    pose('walk-look-up', 'Walk, looking up', 'walk', ['walk', 'look up', 'sky', 'pockets'], {
        ...stride,
        armL: POCKET_ARM,
        armR: POCKET_ARM,
        spine: { bend: -4, twist: 3 },
        head: { nod: -22, turn: 10 },
    }),
    pose('jump-fist', 'Jump, fist up', 'walk', ['jump', 'win', 'cheer', 'air', 'fist'], {
        root: { y: 30 },
        armR: { spread: 155, raise: 10, bend: 12 },
        armL: { raise: 10, spread: 20, bend: 95 },
        legL: { lift: 30, bend: 70, point: 30 },
        legR: { lift: 4, bend: 55, point: 35 },
        spine: { bend: -6 },
        head: { nod: -12 },
        hands: ['fist', 'fist'],
        ground: 'air',
    }),
    pose('squat-rest', 'Squat, arms on knees', 'sitting', ['squat', 'rest', 'wait', 'crouch'], {
        legL: { lift: 112, bend: 142, spread: 22, twist: 10 },
        legR: { lift: 108, bend: 138, spread: 22, twist: 10 },
        armL: { raise: 52, spread: 8, bend: 40, twist: -20 },
        armR: { raise: 48, spread: 8, bend: 48, twist: -20 },
        spine: { bend: 20 },
        head: { nod: -8, tilt: 4 },
    }),
    pose('skateboard-ride', 'Skateboarding', 'sports', ['skateboard', 'skate', 'ride', 'balance'], {
        root: { yaw: 20 },
        legL: { lift: 14, bend: 34, spread: 14, twist: 20 },
        legR: { lift: -6, bend: 26, spread: 10, twist: 24 },
        armL: { spread: 45, raise: 20, bend: 24 },
        armR: { spread: 35, raise: -10, bend: 30 },
        spine: { bend: 8, twist: 10, side: 4 },
        head: { turn: -14 },
        hands: ['open', 'open'],
    }),
    pose(
        'wall-lean-crossed',
        'Lean back, arms crossed',
        'standing',
        ['lean', 'wall', 'arms crossed', 'cool'],
        {
            root: { pitch: -4, roll: 2 },
            legL: { spread: 2, twist: 6 },
            legR: { lift: 6, spread: -12, point: 30, bend: 10, twist: 6 },
            armL: { raise: 30, twist: -70, bend: 112 },
            armR: { raise: 34, twist: -62, bend: 118 },
            spine: { side: -3 },
            head: { tilt: 6, nod: -6 },
            ground: 'left',
        },
    ),
    pose('phone-look', 'Looking at a phone', 'daily', ['phone', 'scroll', 'standing', 'look'], {
        ...weight(),
        armR: { raise: 45, spread: 12, twist: -60, bend: 108 },
        armL: POCKET_ARM,
        head: { nod: 22, tilt: 4 },
        hands: ['relaxed', 'holdPhone'],
    }),
    pose('stretch-up', 'Stretch up', 'daily', ['stretch', 'reach', 'morning', 'tired'], {
        root: { roll: 2 },
        armL: { raise: 168, spread: 6, bend: 18 },
        armR: { raise: 168, spread: 6, bend: 18 },
        spine: { bend: -8, side: 3 },
        head: { nod: -14, tilt: 5 },
        hands: ['open', 'open'],
    }),
    pose(
        'strap-stand',
        'Holding backpack straps',
        'standing',
        ['standing', 'school', 'backpack', 'straps'],
        {
            ...weight(0.7),
            armL: strap,
            armR: strap,
            head: { tilt: 4 },
            hands: ['grip', 'grip'],
        },
    ),
    pose('walk-away', 'Walking away', 'walk', ['walk', 'leave', 'back', 'pockets'], {
        legL: { lift: 18, bend: 10 },
        legR: { lift: -14, bend: 20, point: 10 },
        armL: POCKET_ARM,
        armR: POCKET_ARM,
        spine: { bend: 4, twist: -3 },
        head: { nod: 6 },
    }),
    pose('hand-on-head', 'Hand on head', 'gesture', ['head', 'relaxed', 'easy', 'oops'], {
        ...weight(),
        armR: handOnCrown,
        armL: { spread: 4, bend: 14 },
        head: { tilt: 8 },
        hands: ['relaxed', 'open'],
    }),
    // the gesture sheet
    pose('thumbs-up-side', 'Thumbs up, arm out', 'gesture', ['thumbs up', 'good', 'like', 'ok'], {
        armR: { raise: 60, spread: 25, twist: -10, bend: 30 },
        head: { tilt: 6 },
        hands: ['relaxed', 'thumbsUp'],
    }),
    pose('hands-over-ears', 'Cover ears', 'gesture', ['ears', 'loud', 'noise', 'cover'], {
        armL: handToEar,
        armR: handToEar,
        head: { nod: 8 },
        hands: ['open', 'open'],
    }),
    pose('palm-up', 'Palm up', 'gesture', ['explain', 'offer', 'palm', 'present'], {
        armR: { raise: 28, spread: 22, twist: 70, bend: 82 },
        head: { tilt: 6 },
        hands: ['relaxed', 'open'],
    }),
    pose('fists-up', 'Fists up, cheer', 'gesture', ['cheer', 'yes', 'win', 'fists'], {
        armL: { raise: 22, spread: 32, twist: 30, bend: 138 },
        armR: { raise: 22, spread: 32, twist: 30, bend: 138 },
        head: { nod: -6 },
        hands: ['fist', 'fist'],
    }),
    pose('point-side', 'Point to the side', 'gesture', ['point', 'there', 'side', 'show'], {
        armR: { spread: 82, raise: 12, bend: 6 },
        head: { turn: -18 },
        hands: ['relaxed', 'point'],
    }),
    pose('chin-hand', 'Hand on chin', 'gesture', ['think', 'chin', 'hmm', 'consider'], {
        armR: handToChin,
        armL: { raise: 22, twist: -72, bend: 104 },
        head: { tilt: 5, nod: 2, turn: 6 },
        hands: ['relaxed', 'relaxed'],
    }),
    pose('hold-head', 'Hold your head', 'emotion', ['headache', 'stress', 'frustrated', 'head'], {
        armL: { raise: 160, spread: 0, twist: 75, bend: 80 },
        armR: { raise: 160, spread: 0, twist: 75, bend: 80 },
        head: { nod: 10 },
        hands: ['open', 'open'],
    }),
    pose('chin-rest', 'Chin on fists', 'gesture', ['chin', 'bored', 'daydream', 'wait'], {
        armL: { raise: 66, spread: 14, twist: -76, bend: 128 },
        armR: { raise: 66, spread: 14, twist: -76, bend: 128 },
        head: { nod: 4, tilt: 6 },
        spine: { bend: 6 },
        hands: ['fist', 'fist'],
    }),
    pose('finger-up', 'Finger up', 'gesture', ['idea', 'wait', 'one', 'finger'], {
        armR: { raise: 20, spread: 25, twist: 20, bend: 140 },
        head: { tilt: -4 },
        hands: ['relaxed', 'point'],
    }),
    pose(
        'arms-crossed-relaxed',
        'Arms crossed, relaxed',
        'standing',
        ['standing', 'arms crossed', 'relaxed', 'calm'],
        {
            ...weight(),
            armL: { raise: 22, twist: -72, bend: 100 },
            armR: { raise: 26, twist: -64, bend: 106 },
            head: { tilt: 7 },
        },
    ),
];
