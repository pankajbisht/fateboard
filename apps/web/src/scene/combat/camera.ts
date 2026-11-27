import { apply, rotY } from '@/character/rig/math';
import type { Scene, SceneCamera, V3 } from '../schema/types';

/**
 * Fight camera (docs/COMBAT_PACK.md, Stage 5). Wide and over-the-shoulder shots are the existing views (`front`,
 * `side`, `over-shoulder`); these add the two fight-specific moves: a close-up on the impact point and a slow
 * push-in for a knockout. Same placement as the views' orbit camera (yaw 0 looks toward −z, pitch + looks down).
 */
const DEG = Math.PI / 180;

/** A perspective camera looking at `look` from `yaw` / `pitch`, framing about `size` cm of height. */
export function shotAt(
    look: V3,
    yaw: number,
    pitch: number,
    size: number,
    focalMm = 50,
): SceneCamera {
    const halfH = (18 * 9) / 16 / focalMm;
    const d = (size / 2 / halfH) * 1.1;
    return {
        position: [
            look[0] + Math.sin(yaw * DEG) * Math.cos(pitch * DEG) * d,
            Math.max(5, look[1] + Math.sin(pitch * DEG) * d),
            look[2] + Math.cos(yaw * DEG) * Math.cos(pitch * DEG) * d,
        ],
        yaw,
        pitch,
        roll: 0,
        lens: { kind: 'perspective', focalMm },
    };
}

/**
 * Close-up on an impact: side-on to the line between the fighters (they stand along x), a little low for drama
 * (manga), with a slight Dutch roll when `dramatic`.
 */
export function impactCloseup(point: V3, dramatic = false): SceneCamera {
    const cam = shotAt(point, 90 - 18, dramatic ? -6 : 2, 70, 65);
    return { ...cam, roll: dramatic ? 6 : 0 };
}

/**
 * The slow zoom for a knockout: `frames` cameras from `from` to a close shot of `point` (easing in and out, so
 * it starts and stops softly). Cameras are made once and reused by the baked frames.
 */
export function koZoom(from: SceneCamera, point: V3, frames: number): SceneCamera[] {
    const to = shotAt(point, from.yaw, Math.max(from.pitch, 6), 110, 60);
    const fFrom = from.lens.kind === 'perspective' ? from.lens.focalMm : 35;
    const fTo = to.lens.kind === 'perspective' ? to.lens.focalMm : 60;
    const n = Math.max(2, Math.round(frames));
    return Array.from({ length: n }, (_, i) => {
        const t0 = i / (n - 1);
        const t = t0 * t0 * (3 - 2 * t0);
        const mix = (a: number, b: number) => a + (b - a) * t;
        return {
            position: [
                mix(from.position[0], to.position[0]),
                mix(from.position[1], to.position[1]),
                mix(from.position[2], to.position[2]),
            ],
            yaw: mix(from.yaw, to.yaw),
            pitch: mix(from.pitch, to.pitch),
            roll: mix(from.roll, 0),
            lens: { kind: 'perspective', focalMm: mix(fFrom, fTo) },
        };
    });
}

/** Where the placed exchange's strike lands, in the world (null without one, or when the attacker is gone). */
export function impactPoint(scene: Scene): V3 | null {
    const f = scene.fight;
    const a = f && scene.actors.find((x) => x.id === f.attacker);
    if (!f || !a) return null;
    const w = apply(rotY(a.facing), f.impact);
    return [a.x + w[0], w[1], a.z + w[2]];
}
