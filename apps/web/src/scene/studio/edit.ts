import type { KeyName, Stance } from '@/character/combat/types';
import type { Character, StyleId } from '@/character/schema/types';
import { VIEWS, viewCtx } from '../camera/views';
import { align, applyFormation, distribute } from '../layout/arrange';
import {
    MAX_ACTORS,
    MAX_SCENE_PROPS,
    SCENE_PROP_HEIGHT,
    type Scene,
    type SceneActor,
    type SceneCamera,
    type SceneFrame,
    type SceneFight,
    type SceneProp,
    type SceneSet,
} from '../schema/types';
import { ENVIRONMENTS } from '../sets/registry';
import { applyPairPose } from '../layout/pairPoses';
import { placeExchange } from '../combat/fight';
import { applyTemplate } from '../templates/apply';

/**
 * Every change the Scene Studio can make, as data (docs/CHARACTER_STUDIO.md §9.1). `applySceneEdit` is pure,
 * so the store only keeps history; tests run without React or a canvas.
 */
export type SceneEdit =
    | { kind: 'rename'; name: string }
    | { kind: 'camera'; patch: Partial<SceneCamera> }
    | { kind: 'view'; view: string; subject?: string | null }
    | { kind: 'set'; patch: Partial<SceneSet> }
    | { kind: 'frame'; patch: Partial<SceneFrame> }
    | { kind: 'addActor'; actor: SceneActor }
    | { kind: 'removeActor'; id: string }
    | { kind: 'moveActor'; id: string; x: number; z: number }
    | { kind: 'turnActor'; id: string; facing: number }
    | { kind: 'actorCharacter'; id: string; character: Character }
    | { kind: 'lookAt'; id: string; target: string | null }
    | { kind: 'formation'; formation: string }
    | { kind: 'align'; ids: string[]; how: 'left' | 'center' | 'right' | 'front' | 'back' }
    | { kind: 'distribute'; ids: string[] }
    /** one art style for every actor */
    | { kind: 'style'; style: StyleId }
    /** on: everyone takes the first actor's style and stays in step with later changes */
    | { kind: 'styleLock'; on: boolean }
    /** replace the place, cast, camera and frame with a ready scene (templates/) */
    | { kind: 'template'; id: string }
    /** replace the scene with a saved one (the library): it keeps its own id, so saving again updates it */
    | { kind: 'load'; scene: Scene }
    /** two actors in contact (hug, handshake …): placed, posed and their hands solved (layout/pairPoses.ts) */
    | { kind: 'pairPose'; a: string; b: string; pair: string }
    /** a fight exchange (jab → slip …): spaced, faced and the strike aimed at the defender (combat/fight.ts) */
    | {
          kind: 'fight';
          a: string;
          b: string;
          exchange: string;
          stanceA?: Stance;
          stanceB?: Stance;
          key?: KeyName;
      }
    /** the fight effects' strength and which ones show (scene.fight) */
    | {
          kind: 'fightFx';
          intensity?: SceneFight['intensity'];
          effects?: Partial<SceneFight['effects']>;
      }
    /** Scene Objects props standing in the place (schema v2) */
    | { kind: 'addProp'; prop: SceneProp }
    | { kind: 'removeProp'; id: string }
    | { kind: 'moveProp'; id: string; x: number; z: number }
    | { kind: 'updateProp'; id: string; patch: Partial<Pick<SceneProp, 'variant' | 'height'>> };

const clampHeight = (h: number) =>
    Math.round(Math.min(SCENE_PROP_HEIGHT.max, Math.max(SCENE_PROP_HEIGHT.min, h)));

const mapProp = (s: Scene, id: string, fn: (p: SceneProp) => SceneProp): Scene => ({
    ...s,
    props: s.props.map((p) => (p.id === id ? fn(p) : p)),
});

const mapActor = (s: Scene, id: string, fn: (a: SceneActor) => SceneActor): Scene => ({
    ...s,
    actors: s.actors.map((a) => (a.id === id ? fn(a) : a)),
});

/** Everyone in one art style (actors already in it keep their object). */
const withStyle = (s: Scene, style: StyleId): Scene => ({
    ...s,
    actors: s.actors.map((a) =>
        a.character.style === style ? a : { ...a, character: { ...a.character, style } },
    ),
});

const wrap = (d: number) => ((d % 360) + 360) % 360;

export function applySceneEdit(s: Scene, e: SceneEdit): Scene {
    const stage = ENVIRONMENTS.get(s.set.environment).stage;
    switch (e.kind) {
        case 'rename':
            // as typed (spaces, even empty while typing); cleanScene tidies it for the draft and the page
            return { ...s, name: e.name.slice(0, 80) };
        case 'camera':
            return { ...s, camera: { ...s.camera, ...e.patch } };
        case 'view':
            return { ...s, camera: VIEWS.get(e.view).make(viewCtx(s, e.subject ?? null, stage)) };
        case 'set': {
            const next = { ...s.set, ...e.patch };
            if (!e.patch.environment || e.patch.environment === s.set.environment)
                return { ...s, set: next };
            // a new place: its first look, its camera, and the actors moved onto its stage (layout kept)
            const env = ENVIRONMENTS.get(e.patch.environment);
            const old = ENVIRONMENTS.get(s.set.environment).stage;
            const dx = env.stage.x - old.x;
            const dz = env.stage.z - old.z;
            return {
                ...s,
                set: { ...next, variant: e.patch.variant ?? '' },
                camera: {
                    ...s.camera,
                    position: [...env.camera.position],
                    yaw: env.camera.yaw,
                    pitch: env.camera.pitch,
                    roll: 0,
                },
                actors: s.actors.map((a) => ({ ...a, x: a.x + dx, z: a.z + dz })),
                props: s.props.map((p) => ({ ...p, x: p.x + dx, z: p.z + dz })),
            };
        }
        case 'frame':
            return { ...s, frame: { ...s.frame, ...e.patch } };
        case 'addActor': {
            if (s.actors.length >= MAX_ACTORS || s.actors.some((a) => a.id === e.actor.id))
                return s;
            const style = s.styleLock ? s.actors[0]?.character.style : undefined;
            const actor = style
                ? { ...e.actor, character: { ...e.actor.character, style } }
                : e.actor;
            return { ...s, actors: [...s.actors, actor] };
        }
        case 'removeActor':
            return {
                ...s,
                actors: s.actors
                    .filter((a) => a.id !== e.id)
                    .map((a) => (a.lookAt === e.id ? { ...a, lookAt: null } : a)),
            };
        case 'moveActor':
            return mapActor(s, e.id, (a) => ({ ...a, x: e.x, z: e.z }));
        case 'turnActor':
            return mapActor(s, e.id, (a) => ({ ...a, facing: wrap(e.facing) }));
        case 'actorCharacter': {
            const next = mapActor(s, e.id, (a) => ({ ...a, character: e.character }));
            // locked: the style just chosen is everyone's
            return s.styleLock ? withStyle(next, e.character.style) : next;
        }
        case 'lookAt':
            if (e.target === e.id || (e.target && !s.actors.some((a) => a.id === e.target)))
                return s;
            return mapActor(s, e.id, (a) => ({ ...a, lookAt: e.target }));
        case 'formation':
            return { ...s, actors: applyFormation(s.actors, e.formation, stage) };
        case 'align':
            return { ...s, actors: align(s.actors, e.ids, e.how) };
        case 'distribute':
            return { ...s, actors: distribute(s.actors, e.ids) };
        case 'style':
            return withStyle(s, e.style);
        case 'template': {
            // a ready scene brings its own place: props from the old one would stand anywhere (undo keeps them)
            const next = applyTemplate(s, e.id);
            return next === s ? s : { ...next, props: [] };
        }
        case 'load':
            return e.scene;
        case 'pairPose':
            return applyPairPose(s, e.a, e.b, e.pair).scene;
        case 'fight':
            return placeExchange(s, e.a, e.b, e.exchange, e).scene;
        case 'fightFx':
            return s.fight
                ? {
                      ...s,
                      fight: {
                          ...s.fight,
                          intensity: e.intensity ?? s.fight.intensity,
                          effects: { ...s.fight.effects, ...e.effects },
                      },
                  }
                : s;
        case 'addProp': {
            const taken =
                s.props.some((p) => p.id === e.prop.id) || s.actors.some((a) => a.id === e.prop.id);
            if (s.props.length >= MAX_SCENE_PROPS || taken) return s;
            return { ...s, props: [...s.props, { ...e.prop, height: clampHeight(e.prop.height) }] };
        }
        case 'removeProp':
            return s.props.some((p) => p.id === e.id)
                ? { ...s, props: s.props.filter((p) => p.id !== e.id) }
                : s;
        case 'moveProp':
            return mapProp(s, e.id, (p) => ({ ...p, x: e.x, z: e.z }));
        case 'updateProp':
            return mapProp(s, e.id, (p) => ({
                ...p,
                ...(e.patch.variant !== undefined
                    ? { variant: Math.max(0, Math.round(e.patch.variant)) }
                    : {}),
                ...(e.patch.height !== undefined ? { height: clampHeight(e.patch.height) } : {}),
            }));
        case 'styleLock':
            return {
                ...s,
                styleLock: e.on,
                actors:
                    e.on && s.actors[0]
                        ? withStyle(s, s.actors[0].character.style).actors
                        : s.actors,
            };
    }
}
