import { add, cross, dist, dot, len, normalize, scale, sub, type V3 } from './math';

/**
 * Analytic two-bone IK (thigh + shin, upper arm + forearm). Keeps both bone lengths, keeps the current bend
 * plane (so a knee keeps pointing where it pointed), and reaches the target when it can; when it cannot, the
 * limb points straight at it. Returns the new middle and end positions.
 */
export function twoBoneIK(
    root: V3,
    mid: V3,
    end: V3,
    target: V3,
    fallbackPole: V3 = [0, 0, 1],
): { mid: V3; end: V3 } {
    const l1 = dist(root, mid);
    const l2 = dist(mid, end);
    const toTarget = sub(target, root);
    const want = len(toTarget);
    const d = Math.min(l1 + l2 - 1e-6, Math.max(Math.abs(l1 - l2) + 1e-6, want));
    const dir = want > 1e-9 ? normalize(toTarget) : normalize(sub(end, root));

    // bend direction: the current middle joint's offset from the root → target line
    const bent = sub(mid, root);
    let pole = sub(bent, scale(dir, dot(bent, dir)));
    if (len(pole) < 1e-6) pole = sub(fallbackPole, scale(dir, dot(fallbackPole, dir)));
    if (len(pole) < 1e-6) pole = cross(dir, [1, 0, 0]);
    pole = normalize(pole);

    const cosA = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const sinA = Math.sqrt(1 - cosA * cosA);
    const newMid = add(root, add(scale(dir, l1 * cosA), scale(pole, l1 * sinA)));
    return { mid: newMid, end: add(root, scale(dir, d)) };
}
