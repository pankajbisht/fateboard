// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { poseById } from '@/character/data/poses';
import { RECIPES } from '@/character/data/recipes';
import { FORMATIONS } from '../layout/formations';
import { VIEWS } from '../camera/views';
import { renderScene } from '../render/renderScene';
import { newScene } from '../schema/parse';
import { MAX_ACTORS } from '../schema/types';
import { ENVIRONMENTS } from '../sets/registry';
import { applyTemplate } from '../templates/apply';
import { TEMPLATES } from '../templates/registry';
import { applySceneEdit } from '../studio/edit';

/** Every template: its references exist, it builds a scene that renders, with everyone in the picture. */
describe('scene templates', () => {
    it('are 30 with unique ids, names and tags; search finds them', () => {
        expect(TEMPLATES.all.length).toBeGreaterThanOrEqual(30);
        expect(new Set(TEMPLATES.all.map((t) => t.id)).size).toBe(TEMPLATES.all.length);
        expect(new Set(TEMPLATES.all.map((t) => t.name)).size).toBe(TEMPLATES.all.length);
        expect(TEMPLATES.search('picnic').map((t) => t.id)).toEqual(['picnic']);
        expect(TEMPLATES.search('school').length).toBeGreaterThanOrEqual(4);
    });

    it('cover the places: every environment is used by at least one template', () => {
        const used = new Set(TEMPLATES.all.map((t) => t.place.environment));
        for (const e of ENVIRONMENTS.all) expect(used.has(e.id), e.id).toBe(true);
    });

    for (const t of TEMPLATES.all)
        describe(t.id, () => {
            it('refers only to things that exist', () => {
                const env = ENVIRONMENTS.get(t.place.environment);
                expect(env.id, 'environment').toBe(t.place.environment);
                if (t.place.variant)
                    expect(
                        env.variants.map((v) => v.id),
                        'variant',
                    ).toContain(t.place.variant);
                expect(FORMATIONS.has(t.formation), 'formation').toBe(true);
                expect(VIEWS.has(t.view), 'view').toBe(true);
                expect(t.cast.length).toBeGreaterThanOrEqual(1);
                expect(t.cast.length).toBeLessThanOrEqual(MAX_ACTORS);
                for (const r of t.cast)
                    expect(
                        RECIPES.some((x) => x.id === r),
                        r,
                    ).toBe(true);
                for (const p of t.poses ?? []) if (p) expect(poseById(p), p).toBeTruthy();
                expect(t.poses?.length ?? t.cast.length).toBe(t.cast.length);
                expect(t.tags.length).toBeGreaterThanOrEqual(3);
            });

            it('builds a scene that renders with every character in the picture', () => {
                const s = applyTemplate(newScene(), t.id);
                expect(s.name).toBe(t.name);
                expect(s.actors).toHaveLength(t.cast.length);
                const m = renderScene(s);
                expect(m.actors.map((a) => a.id)).toEqual(s.actors.map((a) => a.id));
                for (const a of m.actors) {
                    expect(a.anchor[0], `${t.id} ${a.id}`).toBeGreaterThan(0);
                    expect(a.anchor[0]).toBeLessThan(m.width);
                    expect(a.anchor[1]).toBeGreaterThan(0);
                    expect(a.anchor[1]).toBeLessThan(m.height);
                }
                for (const d of m.items) expect(/NaN|Infinity/.test(d.d), d.key).toBe(false);
            });
        });

    it('applying is deterministic, keeps the scene id and frame border, and goes through the edit (one undo step)', () => {
        const base = {
            ...newScene('Mine'),
            frame: { ...newScene().frame, border: 9, borderColor: '#ff0000' },
        };
        const a = applyTemplate(base, 'picnic');
        expect(applyTemplate(base, 'picnic')).toEqual(a);
        expect(a.id).toBe(base.id);
        expect(a.frame).toMatchObject({ border: 9, borderColor: '#ff0000', aspect: '16:9' });
        expect(applySceneEdit(base, { kind: 'template', id: 'picnic' })).toEqual(a);
        expect(applyTemplate(base, 'no-such-template')).toBe(base);
    });

    it('a template with a style of its own uses it; others keep the scene style', () => {
        expect(
            applyTemplate(newScene(), 'neon-city').actors.every(
                (x) => x.character.style === 'cyberpunk',
            ),
        ).toBe(true);
        const noir = applySceneEdit(
            { ...newScene(), actors: applyTemplate(newScene(), 'picnic').actors },
            { kind: 'style', style: 'manga' },
        );
        expect(
            applyTemplate(noir, 'class-photo').actors.every((x) => x.character.style === 'manga'),
        ).toBe(true);
    });
});
