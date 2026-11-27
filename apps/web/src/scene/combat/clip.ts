import { apply, rotY, type V3 } from '@/character/rig/math';
import type { Pose } from '@/character/schema/types';
import { distanceOf, makeView, project, type P2, type View } from '../camera/projection';
import {
    FX_ALL_ON,
    FX_LEVELS,
    impactShapes,
    shakeOffset,
    type FxIntensity,
    type FxShape,
    type FxToggles,
} from '../fx/impact';
import type { Scene, SceneActor } from '../schema/types';
import { koZoom } from './camera';
import { bakeCombo, type BakedStep, type FightCombo } from './choreo';
import { EXCHANGES } from './exchanges';

/**
 * A fight clip (docs/COMBAT_PACK.md, timeline playback; owner decision Q1: baked, cached drawings): a combo baked
 * into one scene per drawn frame. The place is drawn once (`base`: the set, props and everyone else); each frame
 * holds only the two fighters, their impact effects and the camera shake. Fighter `a` stays on the left: when `b`
 * attacks, the exchange is turned half round the centre (positions and facing), which keeps both stances true.
 * Pure: the page side (`scene/board.ts`) turns it into Fabric drawings once, the timeline only picks one.
 */
export interface ClipFrame {
    /** only the fighters; with `full`, the whole picture through its own (zooming) camera */
    scene: Scene;
    full?: boolean;
    fx: FxShape[];
    /** camera shake offset in frame units */
    shake: [number, number];
}

export interface FightClip {
    base: Scene;
    frames: ClipFrame[];
    /** drawings per second (24, or less for long combos: every n-th frame is drawn) */
    fps: number;
    /** impact frames (indexes into `frames`) */
    hits: number[];
    /** set pieces nearer the camera than this (cm) draw over the fighters (front ropes, foreground) */
    near: number;
    /** first frame drawn whole (the knockout's slow zoom); = frames.length when none */
    fullFrom: number;
}

export interface ClipOptions {
    intensity?: FxIntensity | 'off';
    effects?: Partial<FxToggles>;
    /** at most this many drawings (memory on a 4 GB phone): longer combos are drawn at a lower frame rate */
    maxDrawings?: number;
}

const BAKE_FPS = 24;

interface Placed {
    a: { x: number; z: number; facing: number };
    b: { x: number; z: number; facing: number };
    attacker: 'a' | 'b';
}

/** Where both fighters stand for one exchange, `a` always on the left. */
function placement(st: BakedStep, cx: number, cz: number): Placed {
    const atk = { x: cx - st.gap / 2, z: cz, facing: 90 };
    const def = { x: cx + st.gap / 2, z: cz + st.dz, facing: 270 };
    if (st.by === 'a') return { a: atk, b: def, attacker: 'a' };
    const turn = (p: typeof atk) => ({
        x: 2 * cx - p.x,
        z: 2 * cz - p.z,
        facing: (p.facing + 180) % 360,
    });
    return { a: turn(def), b: turn(atk), attacker: 'b' };
}

const withPose = (actor: SceneActor, at: Placed['a'], pose: Pose, other: string): SceneActor => ({
    ...actor,
    ...at,
    lookAt: other,
    character: {
        ...actor.character,
        body: {
            ...actor.character.body,
            overridden: [...new Set([...actor.character.body.overridden, 'posture'])],
        },
        rig: { pose: { ...pose, id: 'fight-clip', name: 'Fight clip' } },
    },
});

/** The scene with these actors and no single-exchange effects (the clip draws its own). */
function bare(scene: Scene, actors: SceneActor[]): Scene {
    const out: Scene = { ...scene, actors };
    delete out.fight;
    return out;
}

function toWorld(at: Placed['a'], p: V3): V3 {
    const w = apply(rotY(at.facing), p);
    return [at.x + w[0], w[1], at.z + w[2]];
}

function stepFx(
    v: View,
    st: BakedStep,
    at: Placed,
    k: number,
    intensity: FxIntensity,
    on: FxToggles,
    seed: number,
): FxShape[] {
    const atk = at.attacker === 'a' ? at.a : at.b;
    const hit = project(v, toWorld(atk, st.impact));
    if (!hit) return [];
    const trail = st.trail
        .map((p) => project(v, toWorld(atk, p)))
        .filter((q): q is V3 => q !== null)
        .map((q): P2 => [q[0], q[1]]);
    const from = trail[0] ?? [hit[0], hit[1]];
    const angle = Math.atan2(hit[1] - from[1], hit[0] - from[0]);
    return impactShapes({
        k,
        at: [hit[0], hit[1]],
        angle,
        trail,
        frameH: v.height,
        intensity,
        on,
        contact: st.contact,
        seed,
    }).map((s) => ({ ...s, key: `${s.key}-${seed}` }));
}

export function buildFightClip(
    scene: Scene,
    aId: string,
    bId: string,
    combo: FightCombo,
    o: ClipOptions = {},
): FightClip | null {
    const a0 = scene.actors.find((x) => x.id === aId);
    const b0 = scene.actors.find((x) => x.id === bId);
    if (!a0 || !b0 || a0.id === b0.id) return null;
    const on: FxToggles = { ...FX_ALL_ON, ...o.effects };
    const baked = bakeCombo(a0.character.body, b0.character.body, combo, { hitStop: on.hitStop });
    if (!baked.a.length || !baked.steps.length) return null;
    const max = Math.max(12, o.maxDrawings ?? 72);
    const every = Math.ceil(baked.a.length / max);
    const cx = (a0.x + b0.x) / 2;
    const cz = (a0.z + b0.z) / 2;
    const v = makeView(scene.camera, scene.frame.aspect);
    const intensity = o.intensity ?? 'normal';
    const lv = intensity === 'off' ? null : FX_LEVELS[intensity];
    const stepAt = (i: number) => {
        let s = baked.steps[0];
        for (const st of baked.steps) if (st.from <= i) s = st;
        return s;
    };
    /** the effects and shake of baked frame i, seen through view `vw` */
    const fxAt = (vw: View, i: number) => {
        const fx: FxShape[] = [];
        let shake: [number, number] = [0, 0];
        if (lv && intensity !== 'off')
            baked.steps.forEach((s, n) => {
                const k = Math.round((i - s.hit) / every);
                if (k < -2 || k > lv.hitStop + 6) return;
                fx.push(...stepFx(vw, s, placement(s, cx, cz), k, intensity, on, n + 1));
                if (on.shake && s.contact !== 'miss') {
                    const [dx, dy] = shakeOffset(k, vw.height, lv);
                    shake = [shake[0] + dx, shake[1] + dy];
                }
            });
        return { fx, shake };
    };
    const frames: ClipFrame[] = [];
    const hits: number[] = [];
    for (let i = 0; i < baked.a.length; i += every) {
        const st = stepAt(i);
        const at = placement(st, cx, cz);
        const actors = [
            withPose(a0, at.a, baked.a[i], b0.id),
            withPose(b0, at.b, baked.b[i], a0.id),
        ];
        const { fx, shake } = fxAt(v, i);
        if (baked.steps.some((s) => s.hit >= i && s.hit < i + every)) hits.push(frames.length);
        frames.push({ scene: bare(scene, actors), fx, shake });
    }
    // a knockout ends on a slow push-in: from its impact on, frames are drawn whole through a zooming camera
    const others = scene.actors.filter((x) => x.id !== aId && x.id !== bId);
    const koStep = baked.steps.find(
        (st) => EXCHANGES.all.find((x) => x.id === st.exchange)?.defend === 'cs-knockdown',
    );
    const koFrom = koStep ? frames.findIndex((_, i) => i * every >= koStep.hit) : -1;
    if (koStep && koFrom >= 0) {
        const at = placement(koStep, cx, cz);
        const point = toWorld(at.attacker === 'a' ? at.a : at.b, koStep.impact);
        const cams = koZoom(scene.camera, point, frames.length - koFrom);
        for (let j = koFrom; j < frames.length; j++) {
            const f = frames[j];
            const camera = cams[j - koFrom];
            f.scene = { ...f.scene, actors: [...others, ...f.scene.actors], camera };
            f.full = true;
            // the effects follow the zooming camera
            const zoomed = fxAt(makeView(camera, scene.frame.aspect), j * every);
            f.fx = zoomed.fx;
            f.shake = zoomed.shake;
        }
    }
    // the nearest the fighters ever come to the camera, less a body depth: set pieces nearer than that are in front
    let near = Infinity;
    for (const f of frames)
        for (const x of f.scene.actors) near = Math.min(near, distanceOf(v, [x.x, 100, x.z]));
    near = Number.isFinite(near) ? near - 40 : 0;
    return {
        base: bare(scene, others),
        frames,
        fps: BAKE_FPS / every,
        hits,
        near,
        fullFrom: koStep && koFrom >= 0 ? koFrom : frames.length,
    };
}
