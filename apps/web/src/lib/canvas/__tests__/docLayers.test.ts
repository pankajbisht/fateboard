/**
 * Document layers (2026-11-17): real layers / folders that hold objects, per page. The model is pure data
 * (`canvas.docLayers`, bottom-first); objects point at a leaf layer with `layerId`.
 */
import { describe, expect, it } from 'vitest';
import {
    defaultLayers,
    insertLayer,
    isLayerLocked,
    isLayerVisible,
    leafOrder,
    makeLayer,
    mergeTarget,
    nextName,
    normalizeLayers,
    placeLayer,
    rankMap,
    referenceFilter,
    removeLayer,
    resolveLayerId,
    shiftLayer,
    sortByRank,
    topEditableLeaf,
    type DocLayer,
} from '../docLayers';

const L = (id: string, patch: Partial<DocLayer> = {}) => makeLayer({ name: id, ...patch }, id);
const F = (id: string, patch: Partial<DocLayer> = {}) => L(id, { kind: 'folder', ...patch });
const ids = (layers: DocLayer[]) => layers.map((l) => l.id);

// bottom-first: a, folder f (b, c), d
const doc = () => [L('a'), F('f'), L('b', { parentId: 'f' }), L('c', { parentId: 'f' }), L('d')];

describe('normalizeLayers', () => {
    it('anything that is not a layer list becomes one "Layer 1"', () => {
        for (const bad of [undefined, null, 'x', {}, [], [{ nope: 1 }]]) {
            const out = normalizeLayers(bad);
            expect(out).toHaveLength(1);
            expect(out[0]).toMatchObject({ kind: 'layer', name: 'Layer 1', visible: true });
        }
    });

    it('repairs values from a file: ids, parents, cycles, ranges, blend', () => {
        const out = normalizeLayers([
            { id: 'a', name: 'A', opacity: 4, blend: 'nope' },
            { id: 'a', name: 'dup' },
            { id: 'x', name: 'X', parentId: 'missing' },
            { id: 'p', name: 'P', kind: 'folder', parentId: 'q' },
            { id: 'q', name: 'Q', kind: 'folder', parentId: 'p' },
        ]);
        expect(ids(out)).toEqual(['a', 'x', 'p', 'q']);
        expect(out[0]).toMatchObject({ opacity: 1, blend: 'normal' });
        expect(out[1].parentId).toBeNull();
        // the p <-> q cycle is broken: at least one of them sits at the root
        expect(out.filter((l) => l.kind === 'folder').some((l) => l.parentId === null)).toBe(true);
    });

    it('keeps at least one drawable layer (folders alone are not enough)', () => {
        const out = normalizeLayers([{ id: 'f', name: 'F', kind: 'folder' }]);
        expect(out.some((l) => l.kind === 'layer')).toBe(true);
    });
});

describe('tree order', () => {
    it('leaf order is bottom-first, folders in place', () => {
        expect(leafOrder(doc())).toEqual(['a', 'b', 'c', 'd']);
        expect([...rankMap(doc()).entries()]).toEqual([
            ['a', 0],
            ['b', 1],
            ['c', 2],
            ['d', 3],
        ]);
    });

    it('a hidden or locked folder hides / locks everything inside', () => {
        const layers = doc().map((l) =>
            l.id === 'f' ? { ...l, visible: false, locked: true } : l,
        );
        expect(isLayerVisible(layers, 'b')).toBe(false);
        expect(isLayerLocked(layers, 'c')).toBe(true);
        expect(isLayerVisible(layers, 'a')).toBe(true);
        expect(topEditableLeaf(layers)).toBe('d');
    });

    it('names count up per kind', () => {
        expect(nextName(doc(), 'layer')).toBe('Layer 5');
        expect(nextName(doc(), 'folder')).toBe('Folder 2');
        expect(defaultLayers()[0].name).toBe('Layer 1');
    });
});

describe('editing the tree', () => {
    it('a new layer goes just above the active one, in the same folder', () => {
        const out = insertLayer(doc(), L('n'), 'b');
        expect(leafOrder(out)).toEqual(['a', 'b', 'n', 'c', 'd']);
        expect(out.find((l) => l.id === 'n')!.parentId).toBe('f');
    });

    it('with a folder active, the new layer goes inside it, on top', () => {
        const out = insertLayer(doc(), L('n'), 'f');
        expect(leafOrder(out)).toEqual(['a', 'b', 'c', 'n', 'd']);
    });

    it('places a layer into a folder at an index, never a folder into itself', () => {
        expect(leafOrder(placeLayer(doc(), 'd', 'f', 0))).toEqual(['a', 'd', 'b', 'c']);
        expect(leafOrder(placeLayer(doc(), 'a', null, 99))).toEqual(['b', 'c', 'd', 'a']);
        const nested = [...doc(), F('g', { parentId: 'f' })];
        expect(placeLayer(nested, 'f', 'g', 0)).toBe(nested);
    });

    it('shifts among siblings and stops at the ends', () => {
        expect(leafOrder(shiftLayer(doc(), 'b', 1))).toEqual(['a', 'c', 'b', 'd']);
        expect(leafOrder(shiftLayer(doc(), 'a', 1))).toEqual(['b', 'c', 'a', 'd']); // over the folder
        expect(shiftLayer(doc(), 'd', 1)).toEqual(doc());
    });

    it('removing a folder removes what is inside; one layer always stays', () => {
        const { layers, removed } = removeLayer(doc(), 'f');
        expect(ids(layers)).toEqual(['a', 'd']);
        expect([...removed].sort()).toEqual(['b', 'c', 'f']);
        const last = removeLayer([L('only')], 'only');
        expect(last.layers).toHaveLength(1);
        expect(last.layers[0].id).not.toBe('only');
    });

    it('merge down targets the sibling layer below, not a folder', () => {
        expect(mergeTarget(doc(), 'c')).toBe('b');
        expect(mergeTarget(doc(), 'd')).toBeNull(); // folder below
        expect(mergeTarget(doc(), 'a')).toBeNull(); // nothing below
    });
});

describe('objects', () => {
    it('an object with no or an unknown layer belongs to the fallback layer', () => {
        const layers = doc();
        expect(resolveLayerId({ layerId: 'c' }, layers, 'a')).toBe('c');
        expect(resolveLayerId({ layerId: 'f' }, layers, 'a')).toBe('a'); // a folder holds no objects
        expect(resolveLayerId({}, layers, 'a')).toBe('a');
    });

    it('sorts objects by layer, stable inside a layer; null when already in order', () => {
        const rank: Record<string, number> = { a: 0, b: 1 };
        const objs = [
            { n: 1, l: 'b' },
            { n: 2, l: 'a' },
            { n: 3, l: 'b' },
            { n: 4, l: 'a' },
        ];
        const sorted = sortByRank(objs, (o) => rank[o.l]);
        expect(sorted!.map((o) => o.n)).toEqual([2, 4, 1, 3]);
        expect(sortByRank(sorted!, (o) => rank[o.l])).toBeNull();
    });
});

describe('reference layers (paint bucket)', () => {
    it('no reference layer: the bucket sees everything', () => {
        expect(referenceFilter(doc())).toBeNull();
    });

    it('with a shown reference layer the bucket sees only its objects (unknown layers fall to the bottom)', () => {
        const layers = doc().map((l) => (l.id === 'c' ? { ...l, reference: true } : l));
        const sees = referenceFilter(layers)!;
        expect(sees({ layerId: 'c' })).toBe(true);
        expect(sees({ layerId: 'b' })).toBe(false);
        expect(sees({})).toBe(false);
        const hidden = layers.map((l) => (l.id === 'c' ? { ...l, visible: false } : l));
        expect(referenceFilter(hidden)).toBeNull();
    });
});
