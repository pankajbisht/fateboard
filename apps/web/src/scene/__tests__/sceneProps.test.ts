import { describe, expect, it } from 'vitest';
import { PROPS } from '@/props/catalog';
import { sceneHeightOf, sceneReady } from '@/props/sceneSize';
import { renderScene } from '../render/renderScene';
import { sceneSvg } from '../render/toSvg';
import { newScene, parseScene } from '../schema/parse';
import { MAX_SCENE_PROPS, SCENE_SCHEMA_VERSION, type Scene, type SceneProp } from '../schema/types';
import { applySceneEdit } from '../studio/edit';
import { TEMPLATES } from '../templates/registry';

const prop = (o: Partial<SceneProp> = {}): SceneProp => ({
    id: 'p1',
    propId: 'tree-round',
    variant: 0,
    x: 0,
    z: 0,
    height: 500,
    ...o,
});
const withProps = (...props: SceneProp[]): Scene => ({ ...newScene(), props });

describe('scene props: schema v2', () => {
    it('reads a v1 scene as one without props, at the current version', () => {
        const v1 = { ...newScene(), schemaVersion: 1 } as Partial<Scene>;
        delete v1.props;
        const s = parseScene(v1)!;
        expect(s.schemaVersion).toBe(SCENE_SCHEMA_VERSION);
        expect(s.props).toEqual([]);
    });

    it('repairs props: bad ones dropped, numbers clamped, ids unique, capped', () => {
        const raw = {
            ...newScene(),
            props: [
                prop({ height: 1e9 }),
                { ...prop(), propId: 'Bad Id!' },
                prop(),
                ...Array.from({ length: 50 }, (_, i) => prop({ id: `q${i}` })),
            ],
        };
        const s = parseScene(raw)!;
        expect(s.props).toHaveLength(MAX_SCENE_PROPS);
        expect(s.props[0].height).toBe(6000);
        expect(new Set(s.props.map((p) => p.id)).size).toBe(s.props.length);
    });

    it('keeps a prop the catalogue does not know (not drawn) and survives a round trip', () => {
        const s = withProps(prop({ propId: 'from-a-newer-catalogue' }));
        expect(parseScene(JSON.parse(JSON.stringify(s)))!.props).toEqual(s.props);
        expect(renderScene(s).props).toEqual([]);
    });
});

describe('scene props: edits', () => {
    it('adds, moves, resizes, changes variant and removes', () => {
        let s = applySceneEdit(newScene(), { kind: 'addProp', prop: prop({ height: 1 }) });
        expect(s.props[0].height).toBe(5); // clamped
        s = applySceneEdit(s, { kind: 'moveProp', id: 'p1', x: 40, z: -20 });
        s = applySceneEdit(s, { kind: 'updateProp', id: 'p1', patch: { height: 320, variant: 2 } });
        expect(s.props[0]).toMatchObject({ x: 40, z: -20, height: 320, variant: 2 });
        s = applySceneEdit(s, { kind: 'removeProp', id: 'p1' });
        expect(s.props).toEqual([]);
    });

    it('refuses a duplicate id and a full scene', () => {
        const one = applySceneEdit(newScene(), { kind: 'addProp', prop: prop() });
        expect(applySceneEdit(one, { kind: 'addProp', prop: prop() })).toBe(one);
        const full = withProps(
            ...Array.from({ length: MAX_SCENE_PROPS }, (_, i) => prop({ id: `f${i}` })),
        );
        expect(applySceneEdit(full, { kind: 'addProp', prop: prop({ id: 'new' }) })).toBe(full);
    });

    it('moves props with the stage when the place changes, and a template clears them', () => {
        const s = withProps(prop({ x: 10, z: 10 }));
        const moved = applySceneEdit(s, { kind: 'set', patch: { environment: 'street' } });
        const a0 = s.actors[0];
        const dx = moved.actors[0] && a0 ? moved.actors[0].x - a0.x : null;
        if (dx !== null) expect(moved.props[0].x - 10).toBeCloseTo(dx);
        expect(moved.props).toHaveLength(1);
        expect(applySceneEdit(s, { kind: 'template', id: 'nope' })).toBe(s);
        const t = applySceneEdit(s, { kind: 'template', id: TEMPLATES.all[0].id });
        expect(t.props).toEqual([]);
    });
});

describe('scene props: rendering', () => {
    it('draws a prop in the frame, tagged for picking, with a box', () => {
        const m = renderScene(withProps(prop()));
        const mine = m.items.filter((d) => d.prop === 'p1');
        expect(mine.length).toBeGreaterThan(3);
        expect(m.props).toHaveLength(1);
        const [x0, y0, x1, y1] = m.props[0].bounds;
        expect(x1).toBeGreaterThan(x0);
        expect(y1).toBeGreaterThan(y0);
        expect(sceneSvg(m)).toContain('<path');
    });

    it('a far prop is drawn smaller and before a near one (depth sorted)', () => {
        const m = renderScene(
            withProps(prop({ id: 'near', z: 300 }), prop({ id: 'far', x: 20, z: -1500 })),
        );
        const h = (id: string) => {
            const b = m.props.find((p) => p.id === id)!.bounds;
            return b[3] - b[1];
        };
        expect(h('far')).toBeLessThan(h('near'));
        const first = (id: string) => m.items.findIndex((d) => d.prop === id);
        expect(first('far')).toBeLessThan(first('near'));
    });

    it('outlines stay as thin as the set lines, near or far', () => {
        const m = renderScene(withProps(prop({ id: 'near', z: 500 })));
        const widths = m.items.filter((d) => d.prop && d.stroke).map((d) => d.strokeWidth);
        expect(Math.max(...widths)).toBeLessThan(40); // limbs are geometry; outlines are ~2
        expect(widths.some((w) => w > 0.2 && w < 4)).toBe(true);
    });

    it('every scene-ready catalogue prop renders finite paths at its default height', () => {
        const ready = PROPS.filter(sceneReady);
        expect(ready.length).toBeGreaterThan(200);
        for (let i = 0; i < ready.length; i += MAX_SCENE_PROPS) {
            const chunk = ready.slice(i, i + MAX_SCENE_PROPS);
            const m = renderScene({
                ...newScene(),
                props: chunk.map((d, j) =>
                    prop({
                        id: `r${j}`,
                        propId: d.id,
                        x: (j % 8) * 80 - 300,
                        z: -Math.floor(j / 8) * 120,
                        height: sceneHeightOf(d),
                    }),
                ),
            });
            for (const d of m.items) if (d.prop) expect(d.d, d.key).not.toMatch(/NaN|Infinity/);
        }
    });
});
