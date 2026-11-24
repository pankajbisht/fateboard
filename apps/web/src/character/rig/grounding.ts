import type { Ground, JointId } from '../schema/types';
import { pointOn, type Posed } from './fk';
import { twoBoneIK } from './ik';
import { add, apply, sub, type V3 } from './math';
import type { Skeleton } from './skeleton';

/**
 * Foot contact: puts the supporting foot (or feet) on the floor (y = 0) whatever the body's proportions. With
 * both feet down, the body is lowered onto the higher foot and the other leg bends (two-bone IK) until its foot
 * stands on the floor too. So the same pose on a child, an adult and an elder stands, sits or
 * lunges on the floor.
 */
type Side = 'L' | 'R';
const FOOT_CHAIN = (s: Side) =>
    [`upperLeg${s}`, `lowerLeg${s}`, `foot${s}`, `toe${s}`] as unknown as [
        JointId,
        JointId,
        JointId,
        JointId,
    ];

export const heelOf = (skel: Skeleton, p: Posed, s: Side): V3 =>
    pointOn(p, `foot${s}` as JointId, [0, -skel.ankle, -skel.foot * 0.28]);

/** Lowest point of a foot (heel or toe). */
export const footBottom = (skel: Skeleton, p: Posed, s: Side) =>
    Math.min(p.pos[`toe${s}` as JointId][1], heelOf(skel, p, s)[1]);

const shift = (p: Posed, by: V3): Posed => {
    const pos = { ...p.pos };
    for (const j of Object.keys(pos) as JointId[]) pos[j] = add(pos[j], by);
    return { pos, rot: p.rot };
};

/** Moves one leg so its lowest foot point is at y = 0 (the foot keeps its orientation). */
function plantLeg(skel: Skeleton, p: Posed, s: Side): Posed {
    const dy = footBottom(skel, p, s);
    if (Math.abs(dy) < 0.05) return p;
    const [hip, knee, ankle, toe] = FOOT_CHAIN(s);
    const target: V3 = [p.pos[ankle][0], p.pos[ankle][1] - dy, p.pos[ankle][2]];
    // a straight leg has no bend plane: bend the knee toward where the thigh faces (not world +z)
    const solved = twoBoneIK(
        p.pos[hip],
        p.pos[knee],
        p.pos[ankle],
        target,
        apply(p.rot[hip], [0, 0, 1]),
    );
    const moved = sub(solved.end, p.pos[ankle]);
    const pos = { ...p.pos };
    pos[knee] = solved.mid;
    pos[ankle] = solved.end;
    pos[toe] = add(p.pos[toe], moved);
    return { pos, rot: p.rot };
}

/**
 * Lying down: the body rests on the floor. Each joint carries the thickness of the body around it (the torso is
 * deep, a hand is thin); the lowest surface of any of them is put at y = 0, so a character on its back, side or
 * front lies on the floor whatever its build.
 */
function lieOnFloor(skel: Skeleton, p: Posed): Posed {
    const z = skel.size;
    const thick = (j: JointId): number =>
        /^(pelvis|spine|chest)/.test(j)
            ? z.chestDepth * 0.5
            : j === 'head' || j === 'neck'
              ? z.head[2] * 0.9
              : /^shoulder|^upperArm|^upperLeg/.test(j)
                ? z.thigh * 0.8
                : z.ankle * 0.9;
    let low = Infinity;
    for (const j of Object.keys(p.pos) as JointId[]) low = Math.min(low, p.pos[j][1] - thick(j));
    return shift(p, [0, -low, 0]);
}

export function ground(skel: Skeleton, p: Posed, mode: Ground): Posed {
    if (mode === 'air') return p;
    if (mode === 'floor') return lieOnFloor(skel, p);
    if (mode === 'left' || mode === 'right') {
        const s: Side = mode === 'left' ? 'L' : 'R';
        return shift(p, [0, -footBottom(skel, p, s), 0]);
    }
    // lower the body until the HIGHER foot touches; the other foot is then at or below the floor and its leg
    // bends to stand on it (a leg can always bend shorter; it cannot always stretch longer)
    const l = footBottom(skel, p, 'L');
    const r = footBottom(skel, p, 'R');
    const lowered = shift(p, [0, -Math.max(l, r), 0]);
    return plantLeg(skel, lowered, l <= r ? 'L' : 'R');
}
