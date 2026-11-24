import type { Euler, Ground, HandShape, JointId, Pose } from '../schema/types';

/**
 * A small language to write poses in body terms instead of raw Euler angles (degrees):
 *   arm  { raise (forward), spread (out to the side), twist (out +), bend (elbow), wrist }
 *   leg  { lift (forward), spread (out), twist (out +), bend (knee), point (toes down) }
 *   spine{ bend (forward), side (lean to the character's left +), twist (turn left +) }
 *   head { nod (down +), turn (left +), tilt (ear to the left shoulder +) }
 *   root { yaw, pitch (lean forward +), roll, x, y (+ up), z }
 * It converts to the rig convention (R = Ry · Rx · Rz, +x = the character's left; see schema/types.ts).
 */
export interface Arm {
    raise?: number;
    spread?: number;
    twist?: number;
    bend?: number;
    wrist?: number;
}
export interface Leg {
    lift?: number;
    spread?: number;
    twist?: number;
    bend?: number;
    point?: number;
}
export interface PoseSpec {
    root?: { yaw?: number; pitch?: number; roll?: number; x?: number; y?: number; z?: number };
    spine?: { bend?: number; side?: number; twist?: number };
    head?: { nod?: number; turn?: number; tilt?: number };
    armL?: Arm;
    armR?: Arm;
    legL?: Leg;
    legR?: Leg;
    hands?: [HandShape, HandShape];
    ground?: Ground;
    mirrorable?: boolean;
}

/** `+ 0` turns -0 (from negating a zero) into 0: JSON has no -0, so a saved pose reads back equal. */
const e = (x = 0, y = 0, z = 0): Euler => ({ x: x + 0, y: y + 0, z: z + 0 });

export function pose(
    id: string,
    name: string,
    category: string,
    tags: string[],
    s: PoseSpec,
): Pose {
    const joints: Partial<Record<JointId, Euler>> = {};
    const sp = s.spine ?? {};
    const b = sp.bend ?? 0;
    const sd = sp.side ?? 0;
    const tw = sp.twist ?? 0;
    joints.spine1 = e(b * 0.3, tw * 0.3, -sd * 0.3);
    joints.spine2 = e(b * 0.35, tw * 0.35, -sd * 0.35);
    joints.chest = e(b * 0.35, tw * 0.35, -sd * 0.35);
    const h = s.head ?? {};
    joints.neck = e((h.nod ?? 0) * 0.4, (h.turn ?? 0) * 0.4, -(h.tilt ?? 0) * 0.4);
    joints.head = e((h.nod ?? 0) * 0.6, (h.turn ?? 0) * 0.6, -(h.tilt ?? 0) * 0.6);
    for (const side of ['L', 'R'] as const) {
        const k = side === 'L' ? 1 : -1;
        // a relaxed arm hangs a little away from the body
        const a = s[`arm${side}`] ?? {};
        joints[`upperArm${side}`] = e(
            -(a.raise ?? 0),
            k * (a.twist ?? 0),
            k * ((a.spread ?? 0) + 8),
        );
        joints[`lowerArm${side}`] = e(-(a.bend ?? 8), 0, 0);
        joints[`hand${side}`] = e(-(a.wrist ?? 0), 0, 0);
        const l = s[`leg${side}`] ?? {};
        joints[`upperLeg${side}`] = e(-(l.lift ?? 0), k * (l.twist ?? 0), k * (l.spread ?? 0));
        joints[`lowerLeg${side}`] = e(l.bend ?? 0, 0, 0);
        joints[`foot${side}`] = e(l.point ?? 0, 0, 0);
    }
    const r = s.root ?? {};
    return {
        id,
        name,
        tags,
        category,
        rootOffset: { x: r.x ?? 0, y: r.y ?? 0, z: r.z ?? 0 },
        rootRotation: { yaw: r.yaw ?? 0, pitch: r.pitch ?? 0, roll: r.roll ?? 0 },
        joints,
        handShapeL: s.hands?.[0] ?? 'relaxed',
        handShapeR: s.hands?.[1] ?? 'relaxed',
        headLook: { yaw: 0, pitch: 0 },
        ground: s.ground ?? 'both',
        mirrorable: s.mirrorable ?? true,
    };
}
