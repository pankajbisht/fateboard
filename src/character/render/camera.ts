import type { CharacterCamera, ShotId } from '../schema/types';
import { apply, mul, rotX, rotY, rotZ, wrapDeg, type M3, type V3 } from '../rig/math';

/**
 * The studio camera orbits the character (orthographic). World → camera: turn by -yaw around up, tilt by pitch
 * (+ = looking from above), then roll. Screen: x right, y DOWN (SVG), depth + = nearer the viewer.
 */
export const viewMatrix = (c: CharacterCamera): M3 =>
    mul(rotZ(c.roll), mul(rotX(c.pitch), rotY(-c.yaw)));

/** [screen x, screen y, depth] */
export const project = (m: M3, p: V3): V3 => {
    const v = apply(m, p);
    return [v[0], -v[1], v[2]];
};

/** How the character is seen: the art variant to use (phase 1 draws front, ¾ and side; back reuses them). */
export type ViewBin = 'front' | 'threeQuarter' | 'side' | 'backThreeQuarter' | 'back';

/**
 * `facing` = the body's yaw (where its chest points). `mirrored`: seen from its right side, so a variant drawn
 * for the left side is flipped.
 */
export function viewBin(cameraYaw: number, facing: number): { bin: ViewBin; mirrored: boolean } {
    const a = wrapDeg(cameraYaw - facing);
    const abs = Math.abs(a);
    const bin: ViewBin =
        abs < 25
            ? 'front'
            : abs < 65
              ? 'threeQuarter'
              : abs < 115
                ? 'side'
                : abs < 155
                  ? 'backThreeQuarter'
                  : 'back';
    return { bin, mirrored: a < 0 };
}

/** Framing: the lowest point that must be in the picture, by the joint that marks it. */
export const SHOT_BOTTOM: Record<ShotId, 'feet' | 'knee' | 'pelvis' | 'chest' | 'neck'> = {
    full: 'feet',
    knee: 'knee',
    waist: 'pelvis',
    bust: 'chest',
    closeup: 'neck',
};

export const SHOT_LABELS: Record<ShotId, string> = {
    full: 'Full body',
    knee: 'Knee shot',
    waist: 'Waist shot',
    bust: 'Bust',
    closeup: 'Close-up',
};

/** A view box around screen points, cut at `bottom` (screen y), with a margin, never thinner than 3:4. */
export function frame(
    points: [number, number][],
    top: number,
    bottom: number,
    margin = 0.08,
): [number, number, number, number] {
    const inside = points.filter(([, y]) => y <= bottom + 1e-6);
    const xs = (inside.length ? inside : points).map(([x]) => x);
    let x0 = Math.min(...xs);
    let x1 = Math.max(...xs);
    let y0 = top;
    let y1 = bottom;
    const pad = Math.max(x1 - x0, y1 - y0) * margin;
    x0 -= pad;
    x1 += pad;
    y0 -= pad;
    y1 += pad;
    const minW = (y1 - y0) * 0.75;
    if (x1 - x0 < minW) {
        const cx = (x0 + x1) / 2;
        x0 = cx - minW / 2;
        x1 = cx + minW / 2;
    }
    return [x0, y0, x1 - x0, y1 - y0];
}
