// @vitest-environment node
/** Render plan for document layers: which layers draw straight, which in a buffer, which are clipped. */
import { describe, expect, it } from 'vitest';
import { makeLayer, type DocLayer } from '../docLayers';
import { planLayers, splitForCache, stepLeaves } from '../layerPlan';

const L = (id: string, patch: Partial<DocLayer> = {}) => makeLayer({ name: id, ...patch }, id);
const F = (id: string, patch: Partial<DocLayer> = {}) => L(id, { kind: 'folder', ...patch });

describe('planLayers', () => {
    it('plain layers draw straight onto the canvas (no buffers), bottom-first', () => {
        expect(planLayers([L('a'), L('b')])).toEqual([
            { kind: 'leaf', id: 'a' },
            { kind: 'leaf', id: 'b' },
        ]);
    });

    it('hidden and fully transparent layers are skipped', () => {
        expect(planLayers([L('a', { visible: false }), L('b', { opacity: 0 }), L('c')])).toEqual([
            { kind: 'leaf', id: 'c' },
        ]);
    });

    it('layer opacity or blend mode = one buffer for the whole layer', () => {
        expect(planLayers([L('a', { opacity: 0.5, blend: 'multiply' })])).toEqual([
            {
                kind: 'group',
                id: 'a',
                opacity: 0.5,
                blend: 'multiply',
                steps: [{ kind: 'leaf', id: 'a' }],
            },
        ]);
    });

    it('a plain folder passes through; a folder with opacity / blend is one buffer; a hidden one hides all', () => {
        const pass = [F('f'), L('a', { parentId: 'f' })];
        expect(planLayers(pass)).toEqual([{ kind: 'leaf', id: 'a' }]);
        const iso = [F('f', { opacity: 0.4 }), L('a', { parentId: 'f' })];
        expect(planLayers(iso)[0]).toMatchObject({ kind: 'group', id: 'f', opacity: 0.4 });
        const hidden = [F('f', { visible: false }), L('a', { parentId: 'f' }), L('b')];
        expect(planLayers(hidden)).toEqual([{ kind: 'leaf', id: 'b' }]);
    });

    it('clipping: layers above a base draw only inside it; a hidden base hides them', () => {
        const layers = [
            L('base', { opacity: 0.8 }),
            L('c1', { clip: true, blend: 'multiply' }),
            L('c2', { clip: true, visible: false }),
            L('top'),
        ];
        expect(planLayers(layers)).toEqual([
            {
                kind: 'clip',
                id: 'base',
                base: 'base',
                opacity: 0.8,
                blend: 'normal',
                clipped: [{ id: 'c1', opacity: 1, blend: 'multiply' }],
            },
            { kind: 'leaf', id: 'top' },
        ]);
        const hiddenBase = [L('base', { visible: false }), L('c1', { clip: true }), L('top')];
        expect(planLayers(hiddenBase)).toEqual([{ kind: 'leaf', id: 'top' }]);
    });

    it('a clip layer with no layer below it (bottom, or a folder below) draws normally', () => {
        expect(planLayers([L('c', { clip: true })])).toEqual([{ kind: 'leaf', id: 'c' }]);
        const overFolder = [F('f'), L('x', { parentId: 'f' }), L('c', { clip: true })];
        expect(planLayers(overFolder)).toEqual([
            { kind: 'leaf', id: 'x' },
            { kind: 'leaf', id: 'c' },
        ]);
    });
});

describe('splitForCache (drag on one layer: the rest is cached)', () => {
    const steps = planLayers([L('a'), L('b'), L('c', { blend: 'multiply' }), L('d')]);

    it('splits into below / live / above around the layers being edited', () => {
        const split = splitForCache(steps, new Set(['b']))!;
        expect(split.below.flatMap(stepLeaves)).toEqual(['a']);
        expect(split.live.flatMap(stepLeaves)).toEqual(['b']);
        expect(split.above.flatMap(stepLeaves)).toEqual(['c', 'd']);
        // a multiply layer above blends with the live layer, so "above" cannot be one cached picture
        expect(split.aboveSafe).toBe(false);
        expect(splitForCache(steps, new Set(['c']))!.aboveSafe).toBe(true);
    });

    it('nothing being edited in any layer = no split', () => {
        expect(splitForCache(steps, new Set(['zzz']))).toBeNull();
    });
});
