import type { Arm } from './poseDsl';

/**
 * Poses 46–120 (docs/CHARACTER_STUDIO.md phase 3), written in the same body terms as poses.ts. Hand placements
 * reuse the angle-searched arms of the first library (hip, chin, ear, mouth, forehead, together).
 */
export const handOnHip: Arm = { raise: -40, spread: -10, twist: -105, bend: 110 };
export const handToChin: Arm = { raise: 70, spread: 10, twist: -75, bend: 120 };
export const handToForehead: Arm = { raise: 60, spread: 120, twist: -90, bend: 120 };
export const handToEar: Arm = { raise: 80, twist: 0, bend: 140 };
export const handToMouth: Arm = { raise: 80, twist: -60, bend: 120 };
export const handsTogether: Arm = { raise: 30, spread: 60, twist: -75, bend: 130 };
export const side: Arm = { spread: 85, bend: 8 };
/** fists in front of the chin, elbows down by the ribs (angle-searched on a child, an adult and a tall adult, both bodies: poseFixes.test.ts); the old one crossed the forearms in front of the chest */
export const guard: Arm = { raise: 65, twist: -50, bend: 130 };
