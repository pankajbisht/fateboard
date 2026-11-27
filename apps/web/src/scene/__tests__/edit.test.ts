import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { buildSkeleton } from '@/character/rig/skeleton';
import { makeView, project } from '../camera/projection';
import { VIEWS } from '../camera/views';
import { FORMATIONS } from '../layout/formations';
import { renderScene } from '../render/renderScene';
import { newScene } from '../schema/parse';
import { MAX_ACTORS, type Scene, type SceneActor } from '../schema/types';
import { ENVIRONMENTS } from '../sets/registry';
import { applySceneEdit } from '../studio/edit';

const actor = (id: string, recipe: number, x = 0, z = 0): SceneActor => ({
    id,
    character: fromRecipe(RECIPES[recipe], id),
    x,
    z,
    facing: 0,
    lookAt: null,
});
/** aarav 124, kabir 170, ananya 157, kenji 189, meera 111 */
const group = (): Scene => ({
    ...newScene(),
    actors: [0, 2, 3, 8, 1].map((r, i) => actor(`a${i}`, r, i * 40)),
});
const height = (a: SceneActor) => buildSkeleton(a.character.body).height;

describe('applySceneEdit', () => {
    it('a new place moves the camera to it and the group onto its stage, layout kept', () => {
        const s = group();
        const gaps = s.actors.map((a) => a.x - s.actors[0].x);
        const t = applySceneEdit(s, {
            kind: 'set',
            patch: { environment: 'classroom', variant: 'whiteboard' },
        });
        const env = ENVIRONMENTS.get('classroom');
        expect(t.set).toMatchObject({ environment: 'classroom', variant: 'whiteboard' });
        expect(t.camera.position).toEqual(env.camera.position);
        expect(t.actors.map((a) => a.x - t.actors[0].x)).toEqual(gaps);
        // only the look changes: same place, same camera
        const u = applySceneEdit(t, { kind: 'set', patch: { time: 'night' } });
        expect(u.camera).toBe(t.camera);
        expect(u.set.variant).toBe('whiteboard');
    });

    it('adds at most MAX_ACTORS actors, never the same id twice; removing one clears looks at it', () => {
        let s = newScene();
        for (let i = 0; i < MAX_ACTORS + 2; i++)
            s = applySceneEdit(s, {
                kind: 'addActor',
                actor: actor(`x${i % (MAX_ACTORS + 1)}`, 0),
            });
        expect(s.actors).toHaveLength(MAX_ACTORS);
        s = applySceneEdit(s, { kind: 'lookAt', id: 'x0', target: 'x1' });
        expect(applySceneEdit(s, { kind: 'lookAt', id: 'x0', target: 'x0' })).toBe(s);
        expect(applySceneEdit(s, { kind: 'lookAt', id: 'x0', target: 'nobody' })).toBe(s);
        s = applySceneEdit(s, { kind: 'removeActor', id: 'x1' });
        expect(s.actors.find((a) => a.id === 'x0')!.lookAt).toBeNull();
    });

    it('class photo: the tallest stand in the back row, nobody shares a spot', () => {
        const s = applySceneEdit(group(), { kind: 'formation', formation: 'two-rows' });
        const back = s.actors.filter((a) => a.z < 0);
        const front = s.actors.filter((a) => a.z >= 0);
        expect(Math.min(...back.map(height))).toBeGreaterThan(Math.max(...front.map(height)));
        const spots = new Set(s.actors.map((a) => `${Math.round(a.x)},${Math.round(a.z)}`));
        expect(spots.size).toBe(5);
    });

    it('every formation gives distinct spots for 2–5 actors; talking ones set eye lines', () => {
        for (const f of FORMATIONS.all)
            for (let n = 2; n <= 5; n++) {
                const s = applySceneEdit(
                    { ...group(), actors: group().actors.slice(0, n) },
                    { kind: 'formation', formation: f.id },
                );
                const spots = s.actors.map((a) => [a.x, a.z]);
                for (let i = 0; i < n; i++)
                    for (let j = i + 1; j < n; j++)
                        expect(
                            Math.hypot(spots[i][0] - spots[j][0], spots[i][1] - spots[j][1]),
                            `${f.id} ${n}`,
                        ).toBeGreaterThan(45);
                if (f.talk) expect(s.actors.every((a) => a.lookAt && a.lookAt !== a.id)).toBe(true);
            }
    });

    it('align and distribute', () => {
        const s = group();
        const ids = ['a0', 'a1', 'a2'];
        const left = applySceneEdit(s, { kind: 'align', ids, how: 'left' });
        expect(new Set(left.actors.filter((a) => ids.includes(a.id)).map((a) => a.x)).size).toBe(1);
        const spread = {
            ...s,
            actors: s.actors.map((a, i) => ({ ...a, x: [0, 10, 200, 210, 400][i] })),
        };
        const even = applySceneEdit(spread, { kind: 'distribute', ids: s.actors.map((a) => a.id) });
        expect(even.actors.map((a) => a.x)).toEqual([0, 100, 200, 300, 400]);
    });

    it('framing views keep every actor in the picture, in every place', () => {
        const framing = [
            'front',
            'three-quarter',
            'side',
            'back',
            'high',
            'birds-eye',
            'worms-eye',
            'isometric',
        ];
        for (const env of ['studio', 'park', 'classroom'])
            for (const view of framing) {
                let s = applySceneEdit(group(), { kind: 'set', patch: { environment: env } });
                s = applySceneEdit(s, { kind: 'formation', formation: 'two-rows' });
                s = applySceneEdit(s, { kind: 'view', view });
                const m = renderScene(s);
                expect(m.actors.length, `${env} ${view}`).toBe(5);
                for (const a of m.actors) {
                    expect(a.anchor[0], `${env} ${view} ${a.id}`).toBeGreaterThan(0);
                    expect(a.anchor[0], `${env} ${view} ${a.id}`).toBeLessThan(m.width);
                    expect(a.anchor[1], `${env} ${view} ${a.id}`).toBeGreaterThan(0);
                    expect(a.anchor[1], `${env} ${view} ${a.id}`).toBeLessThan(m.height);
                }
            }
        expect(VIEWS.all.length).toBeGreaterThanOrEqual(10);
    });
});

describe('view edge cases (fate-reviewer P3)', () => {
    it('over the shoulder and POV stay level when two actors stand on the same spot', () => {
        const s = { ...newScene(), actors: [actor('a', 0), actor('b', 2, 5, 0)] };
        for (const view of ['over-shoulder', 'pov']) {
            const cam = applySceneEdit(s, { kind: 'view', view, subject: 'a' }).camera;
            expect(Math.abs(cam.pitch), view).toBeLessThanOrEqual(89);
        }
    });
});

describe('Style Lock (phase 9)', () => {
    const styleOf = (a: SceneActor) => a.character.style;
    it("a new scene is locked; adding an actor takes the scene style; an edited character sets everyone's", () => {
        let s = { ...newScene(), actors: [actor('a', 0), actor('b', 1)] };
        expect(s.styleLock).toBe(true);
        s = applySceneEdit(s, { kind: 'style', style: 'noir' });
        s = applySceneEdit(s, { kind: 'addActor', actor: actor('c', 2) });
        expect(s.actors.map(styleOf)).toEqual(['noir', 'noir', 'noir']);
        s = applySceneEdit(s, {
            kind: 'actorCharacter',
            id: 'b',
            character: { ...s.actors[1].character, style: 'chibi' },
        });
        expect(s.actors.map(styleOf)).toEqual(['chibi', 'chibi', 'chibi']);
    });

    it('unlocked: each actor keeps its own style (a per-actor override); locking again unifies them', () => {
        let s = { ...newScene(), actors: [actor('a', 0), actor('b', 1)] };
        s = applySceneEdit(s, { kind: 'styleLock', on: false });
        s = applySceneEdit(s, {
            kind: 'actorCharacter',
            id: 'b',
            character: { ...s.actors[1].character, style: 'sketch' },
        });
        s = applySceneEdit(s, {
            kind: 'addActor',
            actor: { ...actor('c', 2), character: { ...actor('c', 2).character, style: 'flat' } },
        });
        // actor a keeps the style new characters get (anime)
        expect(s.actors.map(styleOf)).toEqual(['anime', 'sketch', 'flat']);
        s = applySceneEdit(s, { kind: 'styleLock', on: true });
        expect(s.actors.map(styleOf)).toEqual(['anime', 'anime', 'anime']);
    });
});

describe('close-up and bust views (2026-11-27: shots on the page)', () => {
    /** the subject's head and the actors' feet, in the frame (0..1 of its width / height) */
    const framing = (view: string, subject: string) => {
        const s = { ...newScene(), actors: [actor('a', 2, -60, 0), actor('b', 3, 60, 0)] };
        const t = applySceneEdit(s, { kind: 'view', view, subject });
        const v = makeView(t.camera, t.frame.aspect);
        const at = (a: SceneActor, y: number) => {
            const p = project(v, [a.x, y, a.z])!;
            return p && { x: p[0] / v.width, y: p[1] / v.height };
        };
        const a = t.actors.find((x) => x.id === subject)!;
        return { head: at(a, height(a) * 0.93), feet: at(a, 0), chest: at(a, height(a) * 0.72) };
    };

    it.each(['a', 'b'])('a close-up fills the frame with the face of actor %s', (id) => {
        const f = framing('closeup', id);
        expect(f.head.x).toBeGreaterThan(0.3);
        expect(f.head.x).toBeLessThan(0.7);
        expect(f.head.y).toBeGreaterThan(0.2);
        expect(f.head.y).toBeLessThan(0.65);
        // the chest and the feet are below the frame
        expect(f.chest.y).toBeGreaterThan(1);
        expect(!f.feet || f.feet.y > 1).toBe(true);
    });

    it('a bust shows head and chest, not the feet', () => {
        const f = framing('bust', 'b');
        expect(f.head.y).toBeGreaterThan(0.05);
        expect(f.chest.y).toBeLessThan(1);
        expect(!f.feet || f.feet.y > 1).toBe(true);
    });
});
