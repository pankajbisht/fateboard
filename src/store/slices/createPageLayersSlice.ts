/**
 * Page layers (2026-11-17): real layers and folders that hold objects (Photoshop / Clip Studio model), one
 * list per page. Not the Layers slice: that one lists objects (`layers`, one row per object) and stays as is.
 *
 * The canvas owns the list: `canvas.docLayers` (an accessor installed by `bindPageLayers`, serialized through
 * `CUSTOM_PROPS`, so undo, page switches and autosave carry it). Its setter normalizes the value and mirrors it
 * here (`pageLayers`, bottom-first). Objects point at a leaf layer with `layerId` (also in `CUSTOM_PROPS`).
 * `bindPageLayers` also installs the compositor (lib/canvas/layerCompositor): drawing, hit testing and SVG by
 * layer. Model helpers: lib/canvas/docLayers.
 */
import { ActiveSelection, type Canvas, type FabricObject } from 'fabric';
import type { SliceCreator } from '../types';
import {
    ancestors,
    childrenOf,
    defaultLayers,
    insertLayer,
    isLayerEditable,
    isLayerHelper,
    isLayerVisible,
    leafOrder,
    makeLayer,
    mergeTarget,
    nextName,
    normalizeLayers,
    placeLayer,
    removeLayer,
    resolveLayerId,
    shiftLayer,
    topEditableLeaf,
    type DocLayer,
    type LayerBlend,
    type LayerKind,
} from '@/lib/canvas/docLayers';
import { installLayerCompositor } from '@/lib/canvas/layerCompositor';

export type PageLayerPatch = Partial<
    Pick<
        DocLayer,
        'name' | 'visible' | 'locked' | 'opacity' | 'blend' | 'clip' | 'reference' | 'collapsed'
    >
>;

export interface PageLayersSlice {
    /** The current page's layers and folders, bottom-first (mirror of `canvas.docLayers`). */
    pageLayers: DocLayer[];
    /** Where new objects go (a leaf), or the folder new layers go into. */
    activeLayerId: string | null;
    /** Install the layer model on the editor canvas; returns the uninstaller. */
    bindPageLayers: (canvas: Canvas) => () => void;
    setActiveLayer: (id: string) => void;
    /** New layer / folder above the active one (inside it when a folder is active). Returns its id. */
    addPageLayer: (kind?: LayerKind) => string | null;
    updatePageLayer: (id: string, patch: PageLayerPatch) => void;
    /** Delete a layer or folder with everything in it (one undo step, Undo toast). */
    removePageLayer: (id: string) => void;
    movePageLayer: (id: string, parentId: string | null, index: number) => void;
    shiftPageLayer: (id: string, delta: number) => void;
    /** Move the selected objects to the top of a layer. Returns how many moved. */
    moveSelectionToLayer: (id: string) => number;
    mergeLayerDown: (id: string) => boolean;
    /** Merge every shown layer into one (hidden layers stay). */
    flattenLayers: () => boolean;
}

type Obj = FabricObject & { layerId?: string };
type LayerCanvas = Canvas & { docLayers?: DocLayer[] };
type Peers = PageLayersSlice & {
    canvas?: LayerCanvas | null;
    saveState?: (immediate?: boolean) => void;
    syncLayers?: () => void;
    undo?: () => Promise<void>;
    showToast?: (o: { message: string; actionLabel?: string; onAction?: () => void }) => void;
    pageUnderlay?: () => FabricObject[];
    paintPageOverlay?: (ctx: CanvasRenderingContext2D) => void;
};

const PATCH_KEYS = [
    'name',
    'visible',
    'locked',
    'opacity',
    'blend',
    'clip',
    'reference',
    'collapsed',
] as const;

/** Bake a layer's look into an object (merge / flatten): opacity multiplies, a blend mode is kept. */
function bake(o: Obj, opacity: number, blend: LayerBlend) {
    if (opacity < 1) o.set('opacity', (o.opacity ?? 1) * opacity);
    const own = o.globalCompositeOperation;
    if (blend !== 'normal' && (!own || own === 'source-over'))
        o.set('globalCompositeOperation', blend);
}

export const createPageLayersSlice: SliceCreator<PageLayersSlice> = (set, get) => {
    const peers = () => get() as Peers;
    const leafOf = (layers: DocLayer[], o: Obj) =>
        resolveLayerId(o, layers, leafOrder(layers)[0] ?? '');
    const content = (c: LayerCanvas) => (c.getObjects() as Obj[]).filter((o) => !isLayerHelper(o));

    const mirror = (layers: DocLayer[]) => {
        const active = get().activeLayerId;
        const keep = !!active && layers.some((l) => l.id === active);
        set(
            {
                pageLayers: layers,
                activeLayerId: keep
                    ? active
                    : (topEditableLeaf(layers) ?? leafOrder(layers).at(-1) ?? null),
            },
            false,
            'pageLayers/sync',
        );
    };

    /** Store the new list on the canvas (its setter mirrors it), repaint, record one undo step. */
    const commit = (c: LayerCanvas, layers: DocLayer[], history = true) => {
        c.docLayers = layers;
        c.requestRenderAll();
        peers().syncLayers?.(); // object list: counts per layer, order
        if (history) peers().saveState?.();
    };

    /** Keep only selected objects on layers you can edit. */
    const restrictSelection = (c: LayerCanvas) => {
        const layers = c.docLayers ?? [];
        const objs = c.getActiveObjects() as Obj[];
        const keep = objs.filter((o) => isLayerEditable(layers, leafOf(layers, o)));
        if (keep.length === objs.length) return;
        if (!keep.length) c.discardActiveObject();
        else if (keep.length === 1) c.setActiveObject(keep[0]);
        else c.setActiveObject(new ActiveSelection(keep, { canvas: c }));
    };

    /** Run an action on the bound canvas; never throws to React. */
    const act = <T>(
        name: string,
        fallback: T,
        fn: (c: LayerCanvas, layers: DocLayer[]) => T,
    ): T => {
        const c = peers().canvas;
        if (!c) return fallback;
        try {
            return fn(c, c.docLayers ?? get().pageLayers);
        } catch (err) {
            console.error(`[pageLayers] ${name} failed`, err);
            return fallback;
        }
    };

    /** Where a new object goes: the active layer when you can draw on it, else the top editable one. */
    const targetLeaf = (layers: DocLayer[]) => {
        const a = get().activeLayerId;
        if (a && isLayerEditable(layers, a)) return a;
        return topEditableLeaf(layers) ?? leafOrder(layers).at(-1) ?? '';
    };

    return {
        pageLayers: defaultLayers(),
        activeLayerId: null,

        bindPageLayers: (canvas) => {
            const c = canvas as LayerCanvas;
            let stored = normalizeLayers(c.docLayers);
            Object.defineProperty(c, 'docLayers', {
                configurable: true,
                get: () => stored,
                set: (v: unknown) => {
                    stored = normalizeLayers(v);
                    mirror(stored);
                },
            });
            mirror(stored);
            const uninstall = installLayerCompositor(c, {
                getLayers: () => stored,
                onReorder: () => queueMicrotask(() => peers().syncLayers?.()),
                // master page under the layers, page guides over them (createDocumentSlice)
                underlay: () => peers().pageUnderlay?.() ?? [],
                paintOverlay: (ctx) => peers().paintPageOverlay?.(ctx),
            });

            // A new object without a layer gets the target layer at once (tools select it in the same tick, and
            // the selection makes its layer active). Unknown ids are checked a microtask later: while a page loads,
            // objects are added before Fabric sets the saved `docLayers`, and their own ids must survive that.
            const pending = new Set<Obj>();
            const flush = () => {
                const leaves = new Set(leafOrder(stored));
                for (const o of pending)
                    if (o.canvas === c && !(typeof o.layerId === 'string' && leaves.has(o.layerId)))
                        o.layerId = targetLeaf(stored);
                pending.clear();
                c.requestRenderAll();
            };
            const onAdded = ({ target }: { target: FabricObject }) => {
                const o = target as Obj;
                if (!o || isLayerHelper(o)) return;
                if (typeof o.layerId !== 'string') o.layerId = targetLeaf(stored);
                if (!pending.size) queueMicrotask(flush);
                pending.add(o);
            };
            // clear() (new board, clear page, every load) starts from one layer; a load then sets the saved list
            const onCleared = () => {
                stored = defaultLayers();
                mirror(stored);
            };
            // picking objects on one layer makes it the active layer
            const onSelect = () => {
                const ids = new Set((c.getActiveObjects() as Obj[]).map((o) => leafOf(stored, o)));
                const [id] = ids;
                if (ids.size === 1 && id !== get().activeLayerId)
                    set({ activeLayerId: id }, false, 'pageLayers/active');
            };
            const offs = [
                c.on('object:added', onAdded),
                c.on('canvas:cleared', onCleared),
                c.on('selection:created', onSelect),
                c.on('selection:updated', onSelect),
            ];
            return () => {
                offs.forEach((off) => off());
                uninstall();
                pending.clear();
                Object.defineProperty(c, 'docLayers', {
                    configurable: true,
                    writable: true,
                    enumerable: true,
                    value: stored,
                });
            };
        },

        setActiveLayer: (id) => {
            if (get().pageLayers.some((l) => l.id === id))
                set({ activeLayerId: id }, false, 'pageLayers/active');
        },

        addPageLayer: (kind = 'layer') =>
            act('add', null, (c, layers) => {
                const layer = makeLayer({ name: nextName(layers, kind), kind });
                commit(c, insertLayer(layers, layer, get().activeLayerId));
                set({ activeLayerId: layer.id }, false, 'pageLayers/add');
                return layer.id;
            }),

        updatePageLayer: (id, patch) =>
            act('update', undefined, (c, layers) => {
                const clean: PageLayerPatch = {};
                for (const k of PATCH_KEYS)
                    if (patch[k] !== undefined) Object.assign(clean, { [k]: patch[k] });
                if (typeof clean.name === 'string' && !clean.name.trim()) delete clean.name;
                const keys = Object.keys(clean);
                if (!keys.length) return;
                const history = keys.some((k) => k !== 'collapsed');
                commit(
                    c,
                    layers.map((l) => (l.id === id ? { ...l, ...clean } : l)),
                    history,
                );
                if ('visible' in clean || 'locked' in clean) restrictSelection(c);
            }),

        removePageLayer: (id) =>
            act('remove', undefined, (c, layers) => {
                const gone = layers.find((l) => l.id === id);
                if (!gone) return;
                const { layers: next, removed } = removeLayer(layers, id);
                const doomed = content(c).filter((o) => removed.has(leafOf(layers, o)));
                if (doomed.some((o) => c.getActiveObjects().includes(o))) c.discardActiveObject();
                if (doomed.length) c.remove(...doomed);
                commit(c, next);
                peers().showToast?.({
                    message: `Deleted “${gone.name}”`,
                    actionLabel: 'Undo',
                    onAction: () => void peers().undo?.(),
                });
            }),

        movePageLayer: (id, parentId, index) =>
            act('move', undefined, (c, layers) => {
                const next = placeLayer(layers, id, parentId, index);
                if (next !== layers) commit(c, next);
            }),

        shiftPageLayer: (id, delta) =>
            act('shift', undefined, (c, layers) => {
                const next = shiftLayer(layers, id, delta);
                if (next !== layers) commit(c, next);
            }),

        moveSelectionToLayer: (id) =>
            act('moveSelection', 0, (c, layers) => {
                if (!layers.some((l) => l.id === id && l.kind === 'layer')) return 0;
                const objs = (c.getActiveObjects() as Obj[]).filter((o) => !isLayerHelper(o));
                // keep their stacking among themselves; they land on top of the new layer
                const stack = c.getObjects();
                objs.sort((a, b) => stack.indexOf(a) - stack.indexOf(b));
                for (const o of objs) {
                    o.layerId = id;
                    c.bringObjectToFront(o);
                }
                if (!objs.length) return 0;
                set({ activeLayerId: id }, false, 'pageLayers/active');
                commit(c, layers);
                restrictSelection(c);
                return objs.length;
            }),

        mergeLayerDown: (id) =>
            act('mergeDown', false, (c, layers) => {
                const target = mergeTarget(layers, id);
                const src = layers.find((l) => l.id === id);
                if (!target || !src) return false;
                for (const o of content(c))
                    if (leafOf(layers, o) === id) {
                        bake(o, src.opacity, src.blend);
                        o.layerId = target;
                    }
                commit(
                    c,
                    layers.filter((l) => l.id !== id),
                );
                set({ activeLayerId: target }, false, 'pageLayers/active');
                return true;
            }),

        flattenLayers: () =>
            act('flatten', false, (c, layers) => {
                const shown = leafOrder(layers).filter((id) => isLayerVisible(layers, id));
                if (shown.length < 2) return false;
                const base = shown[0];
                const merged = new Set(shown);
                const look = (id: string) => {
                    const chain = [layers.find((l) => l.id === id)!, ...ancestors(layers, id)];
                    return {
                        opacity: chain.reduce((p, l) => p * l.opacity, 1),
                        blend: chain.find((l) => l.blend !== 'normal')?.blend ?? 'normal',
                    };
                };
                for (const o of content(c)) {
                    const id = leafOf(layers, o);
                    if (!merged.has(id)) continue;
                    const { opacity, blend } = look(id);
                    bake(o, opacity, blend);
                    o.layerId = base;
                }
                // the flattened layer sits at the top level, where its top-level folder (or itself) was
                const rootOf = (id: string) => ancestors(layers, id).at(-1)?.id ?? id;
                const roots = childrenOf(layers, null).map((l) => l.id);
                let next = layers.filter((l) => l.id === base || !merged.has(l.id));
                const hasLayer = (fid: string): boolean =>
                    next.some((l) => l.parentId === fid && (l.kind === 'layer' || hasLayer(l.id)));
                next = next
                    .filter((l) => l.kind !== 'folder' || hasLayer(l.id))
                    .map((l) =>
                        l.id === base
                            ? { ...l, opacity: 1, blend: 'normal' as const, clip: false }
                            : l,
                    );
                const before = roots.slice(0, roots.indexOf(rootOf(base)));
                const slot = childrenOf(next, null).filter((l) => before.includes(l.id)).length;
                commit(c, placeLayer(next, base, null, slot));
                set({ activeLayerId: base }, false, 'pageLayers/active');
                return true;
            }),
    };
};
