import { apply, rotY } from '@/character/rig/math';
import { buildSkeleton } from '@/character/rig/skeleton';
import type { Character } from '@/character/schema/types';
import type { SceneActor } from '../schema/types';

const DEG = 180 / Math.PI;

/**
 * The character with its head turned toward another actor's head (eye lines in group pictures). Relative to
 * the body's facing; the neck turns at most 75° sideways and 35° up or down, as a person would.
 */
export function lookToward(actor: SceneActor, target: SceneActor): Character {
    const own = buildSkeleton(actor.character.body).height;
    const other = buildSkeleton(target.character.body).height;
    const pose = actor.character.rig.pose;
    const dir: [number, number, number] = [
        target.x - actor.x,
        (other - own) * 0.93,
        target.z - actor.z,
    ];
    const d = apply(rotY(-(actor.facing + pose.rootRotation.yaw)), dir);
    const yaw = Math.max(-75, Math.min(75, Math.atan2(d[0], d[2]) * DEG));
    const pitch = Math.max(-35, Math.min(35, Math.atan2(d[1], Math.hypot(d[0], d[2])) * DEG));
    return {
        ...actor.character,
        rig: { pose: { ...pose, headLook: { yaw: Math.round(yaw), pitch: Math.round(pitch) } } },
    };
}
