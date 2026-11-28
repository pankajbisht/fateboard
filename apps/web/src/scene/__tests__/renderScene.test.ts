// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { renderScene } from '../render/renderScene';
import { sceneSvg } from '../render/toSvg';
import { newScene } from '../schema/parse';
import type { Scene, SceneActor } from '../schema/types';

const actor = (id: string, x: number, z: number, recipe = 0): SceneActor => ({
    id,
    character: fromRecipe(RECIPES[recipe], id),
    x,
    z,
    facing: 0,
    lookAt: null,
});
const scene = (patch: (s: Scene) => void = () => {}) => {
    const s = newScene();
    s.actors = [actor('near', 60, 0), actor('far', -60, -300, 2)];
    patch(s);
    return s;
};
const indexOf = (m: ReturnType<typeof renderScene>, test: (key: string) => boolean) =>
    m.items.findIndex((d) => test(d.key));

describe('renderScene', () => {
    it('draws the sky first, actors far to near, each over its contact shadow, the frame last', () => {
        const m = renderScene(scene((s) => (s.frame = { ...s.frame, border: 6 })));
        expect(m.items[0].key).toBe('sky');
        expect(m.items[m.items.length - 1].key).toBe('border');
        const lastFar = m.items.map((d) => d.actor).lastIndexOf('far');
        const firstNear = indexOf(m, (k) => k.startsWith('near:'));
        expect(lastFar).toBeLessThan(firstNear);
        expect(indexOf(m, (k) => k === 'near:shadow')).toBeLessThan(
            indexOf(m, (k) => k === 'near:torso'),
        );
        // every actor path says whose it is (selection on the stage)
        expect(
            m.items.filter((d) => d.key.startsWith('near:')).every((d) => d.actor === 'near'),
        ).toBe(true);
    });

    it('a round frame covers the corners with a mat (even-odd hole), not a clip path', () => {
        const m = renderScene(scene((s) => (s.frame.shape = 'circle')));
        const mat = m.items.find((d) => d.key === 'mat')!;
        expect(mat.evenOdd).toBe(true);
        expect(sceneSvg(m)).toContain('fill-rule="evenodd"');
        expect(sceneSvg(m)).not.toContain('clip');
    });

    it('weather falls outdoors only', () => {
        const rain = (env: string) =>
            renderScene(
                scene((s) => (s.set = { ...s.set, environment: env, weather: 'rain' })),
            ).items.some((d) => d.key === 'rain');
        expect(rain('park')).toBe(true);
        expect(rain('classroom')).toBe(false);
    });

    it('look-at turns the head toward the other actor (the drawing changes, the data does not)', () => {
        const ahead = renderScene(scene());
        const s = scene((x) => (x.actors[0].lookAt = 'far'));
        const turned = renderScene(s);
        const head = (m: typeof ahead) => m.items.find((d) => d.key === 'near:head')!.d;
        expect(head(turned)).not.toBe(head(ahead));
        expect(s.actors[0].character.rig.pose.headLook.yaw).toBe(0);
    });

    it('the time of day grades actors and set alike', () => {
        const torso = (time: Scene['set']['time']) =>
            renderScene(scene((s) => (s.set.time = time))).items.find(
                (d) => d.key === 'near:torso',
            )!.fill;
        expect(torso('night')).not.toEqual(torso('day'));
    });

    it('writes a valid standalone SVG with one path per drawable', () => {
        const m = renderScene(scene((s) => (s.set.environment = 'city')));
        const svg = sceneSvg(m, 800);
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
        expect(svg.match(/<path /g)!.length).toBe(m.items.length);
        expect(svg).toContain('width="800"');
    });
});

describe('render caches (fate-reviewer P3: a drag re-rendered everything)', () => {
    it('moving one actor reuses the set and the other actors as they were', () => {
        const s = scene((x) => (x.set.environment = 'city'));
        const a = renderScene(s);
        const moved = {
            ...s,
            actors: s.actors.map((x) => (x.id === 'near' ? { ...x, x: x.x + 30 } : x)),
        };
        const b = renderScene(moved);
        const pick = (m: typeof a, key: string) => m.items.find((d) => d.key === key)!;
        expect(pick(b, 'far:torso')).toBe(pick(a, 'far:torso'));
        expect(pick(b, 'set0')).toBe(pick(a, 'set0'));
        expect(pick(b, 'near:torso')).not.toBe(pick(a, 'near:torso'));
        // and the output is the same as without a cache
        expect(JSON.parse(JSON.stringify(b))).toEqual(
            JSON.parse(JSON.stringify(renderScene(structuredClone(moved)))),
        );
    });
});
