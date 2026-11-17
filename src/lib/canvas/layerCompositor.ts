/**
 * Layer compositor (2026-11-17): makes one Fabric canvas draw, hit-test and export by document layers
 * (lib/canvas/docLayers). Installed once per editor canvas by the Page layers slice; `uninstall` restores
 * plain Fabric. It patches four instance methods (the prototype is untouched):
 * - `_renderObjects`: objects grouped by layer and drawn by the render plan (lib/canvas/layerPlan). Plain
 *   layers draw straight onto the canvas; a layer / folder with opacity, a blend mode or clipped layers uses one
 *   pooled buffer. One plain layer (every old document) takes Fabric's own path: no cost.
 * - drag cache: while an object is transformed, the layers below it are drawn once into a cached picture (and
 *   the ones above too, when none of them blends), so each drag frame redraws only the edited layers.
 * - `_checkTarget` + a selection guard: objects on hidden or locked layers cannot be clicked or kept selected.
 * - `_setSVGObjects`: SVG export leaves out hidden layers and wraps layer opacity / blend in `<g>`. Clipping is
 *   not exported to SVG (the clipped layer is written whole; BUG-231).
 * It also keeps `canvas._objects` in layer order (hit testing walks that array), helpers always on top.
 */
import { ActiveSelection, type FabricObject, type Point, type StaticCanvas } from 'fabric';
import {
    isLayerHelper,
    isLayerLocked,
    isLayerVisible,
    leafOrder,
    sortByRank,
    type DocLayer,
    type LayerBlend,
} from './docLayers';
import { planLayers, splitForCache, stepLeaves, type Step } from './layerPlan';

export interface LayerCompositorHost {
    /** The page's layers (`canvas.docLayers`); a new array means they changed. */
    getLayers: () => DocLayer[];
    /** Called after the canvas stack was re-sorted to follow the layers. */
    onReorder?: () => void;
    /** Offscreen buffers (tests pass fakes); default: a canvas from the editor canvas's own document. */
    createBuffer?: () => HTMLCanvasElement;
    /** Objects drawn under every layer (a master page): not in the stack, never hit, in exports too. */
    underlay?: () => FabricObject[];
    /** Board-only marks drawn over everything (page guides); never in exports or thumbnails. */
    paintOverlay?: (ctx: CanvasRenderingContext2D) => void;
}

type Obj = FabricObject & Record<string, unknown> & { parent?: FabricObject };
type Ctx = CanvasRenderingContext2D;
type Internals = StaticCanvas & {
    _renderObjects: (ctx: Ctx, objects: FabricObject[]) => void;
    _checkTarget?: (obj: FabricObject, pointer: Point) => boolean;
    _setSVGObjects: (markup: string[], reviver?: unknown) => void;
    _setSVGObject: (markup: string[], obj: FabricObject, reviver?: unknown) => void;
    _objects: FabricObject[];
    _currentTransform?: { target?: FabricObject } | null;
};
type View = {
    layers: DocLayer[];
    rank: Map<string, number>;
    fallback: string;
    open: Map<string, boolean>;
    steps: Step[];
    trivial: boolean;
};
type Buffer = { el: HTMLCanvasElement; ctx: Ctx };

/** Below this many objects outside the dragged layers, a drag frame is cheap enough without a cache. */
export const CACHE_MIN_OBJECTS = 20;
const POOL_MAX = 6;

const op = (b: LayerBlend): GlobalCompositeOperation => (b === 'normal' ? 'source-over' : b);
const isSelection = (o: unknown): o is ActiveSelection => o instanceof ActiveSelection;
const topLevel = (o: Obj): Obj => {
    let t = o;
    while (t.parent) t = t.parent as unknown as Obj;
    return t;
};

function blit(ctx: Ctx, el: CanvasImageSource, alpha: number, mode: GlobalCompositeOperation) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = mode;
    ctx.drawImage(el, 0, 0);
    ctx.restore();
}

export function installLayerCompositor(
    canvas: StaticCanvas,
    host: LayerCompositorHost,
): () => void {
    const c = canvas as Internals;
    const own = Object.prototype.hasOwnProperty;
    const had = {
        render: own.call(c, '_renderObjects'),
        check: own.call(c, '_checkTarget'),
        svg: own.call(c, '_setSVGObjects'),
    };
    const origRender = c._renderObjects;
    const origCheck = c._checkTarget;
    const origSVG = c._setSVGObjects;
    const pool: HTMLCanvasElement[] = [];
    let view: View | null = null;
    let cache: {
        key: string;
        layers: DocLayer[];
        target: FabricObject;
        below: HTMLCanvasElement;
        above: HTMLCanvasElement | null;
    } | null = null;

    const derive = (): View => {
        const layers = host.getLayers();
        if (view?.layers === layers) return view;
        const leaves = leafOrder(layers);
        const only = layers.length === 1 ? layers[0] : null;
        view = {
            layers,
            rank: new Map(leaves.map((id, i) => [id, i])),
            fallback: leaves[0] ?? '',
            open: new Map(
                leaves.map((id) => [id, isLayerVisible(layers, id) && !isLayerLocked(layers, id)]),
            ),
            steps: planLayers(layers),
            trivial: !!only && only.visible && only.opacity === 1 && only.blend === 'normal',
        };
        return view;
    };
    const leafOf = (v: View, o: Obj) => {
        const id = o.layerId;
        return typeof id === 'string' && v.rank.has(id) ? id : v.fallback;
    };
    const allowed = (o: FabricObject) => {
        const t = topLevel(o as Obj);
        if (isSelection(t) || isLayerHelper(t)) return true;
        const v = derive();
        return v.open.get(leafOf(v, t)) !== false;
    };

    const take = (like: Ctx): Buffer => {
        const el =
            pool.pop() ??
            host.createBuffer?.() ??
            (c.getElement().ownerDocument ?? document).createElement('canvas');
        const { width, height } = like.canvas;
        if (el.width !== width || el.height !== height) Object.assign(el, { width, height });
        const ctx = el.getContext('2d') as Ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const m = like.getTransform();
        ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
        ctx.imageSmoothingEnabled = like.imageSmoothingEnabled;
        return { el, ctx };
    };
    const give = (el: HTMLCanvasElement | null | undefined) => {
        if (el && pool.length < POOL_MAX) pool.push(el);
    };
    const dropCache = () => {
        give(cache?.below);
        give(cache?.above);
        cache = null;
    };

    type Draw = (target: Ctx, leafId: string) => void;
    const run = (target: Ctx, steps: Step[], draw: Draw) => {
        for (const s of steps) {
            if (s.kind === 'leaf') draw(target, s.id);
            else if (s.kind === 'group') {
                const b = take(target);
                run(b.ctx, s.steps, draw);
                blit(target, b.el, s.opacity, op(s.blend));
                give(b.el);
            } else {
                const base = take(target);
                draw(base.ctx, s.base);
                const mask = take(target);
                blit(mask.ctx, base.el, 1, 'copy');
                for (const k of s.clipped) {
                    const t = take(target);
                    draw(t.ctx, k.id);
                    blit(t.ctx, mask.el, 1, 'destination-in');
                    blit(base.ctx, t.el, k.opacity, op(k.blend));
                    give(t.el);
                }
                blit(base.ctx, mask.el, 1, 'destination-in'); // keep the base's own coverage
                give(mask.el);
                blit(target, base.el, s.opacity, op(s.blend));
                give(base.el);
            }
        }
    };

    /** Drag frame: cached layers below / above, only the edited layers drawn. False = draw normally. */
    const runCached = (
        ctx: Ctx,
        v: View,
        buckets: Map<string, Obj[]>,
        draw: Draw,
        under: () => void,
    ): boolean => {
        const target = c._currentTransform?.target;
        if (!target || ctx.canvas !== c.getElement()) return false;
        const moving = isSelection(target) ? target.getObjects() : [target];
        const live = new Set(moving.map((o) => leafOf(v, topLevel(o as Obj))));
        // connectors follow the dragged shape, so their layers redraw too
        for (const [id, list] of buckets) if (list.some((o) => o.connectorData)) live.add(id);
        const split = splitForCache(v.steps, live);
        if (!split) return false;
        const outside = [...split.below, ...split.above]
            .flatMap(stepLeaves)
            .reduce((n, id) => n + (buckets.get(id)?.length ?? 0), 0);
        if (outside < CACHE_MIN_OBJECTS) return false;
        const m = ctx.getTransform();
        const key = [ctx.canvas.width, ctx.canvas.height, m.a, m.b, m.c, m.d, m.e, m.f].join();
        if (cache?.key !== key || cache.layers !== v.layers || cache.target !== target) {
            dropCache();
            under();
            run(ctx, split.below, draw);
            const below = take(ctx);
            blit(below.ctx, ctx.canvas, 1, 'copy');
            const plain = (s: Step) =>
                s.kind !== 'leaf' ||
                (buckets.get(s.id) ?? []).every(
                    (o) =>
                        !o.globalCompositeOperation || o.globalCompositeOperation === 'source-over',
                );
            let above: Buffer | null = null;
            if (split.aboveSafe && split.above.length && split.above.every(plain)) {
                above = take(ctx);
                run(above.ctx, split.above, draw);
            }
            cache = { key, layers: v.layers, target, below: below.el, above: above?.el ?? null };
        } else blit(ctx, cache.below, 1, 'copy');
        run(ctx, split.live, draw);
        if (cache.above) blit(ctx, cache.above, 1, 'source-over');
        else run(ctx, split.above, draw);
        return true;
    };

    const reorder = (v: View) => {
        let last = 0;
        const sorted = sortByRank(c._objects as Obj[], (o) => {
            if (isLayerHelper(o)) return Infinity;
            return (last = v.rank.get(leafOf(v, o)) ?? last);
        });
        if (!sorted) return;
        c._objects.splice(0, c._objects.length, ...sorted);
        host.onReorder?.();
    };

    const bucket = (v: View, objects: FabricObject[]) => {
        const buckets = new Map<string, Obj[]>();
        const helpers: Obj[] = [];
        for (const o of objects as Obj[]) {
            if (!o) continue;
            if (isLayerHelper(o)) {
                helpers.push(o);
                continue;
            }
            const id = leafOf(v, o);
            const list = buckets.get(id);
            if (list) list.push(o);
            else buckets.set(id, [o]);
        }
        return { buckets, helpers };
    };

    c._renderObjects = function (ctx: Ctx, objects: FabricObject[]) {
        const v = derive();
        const under = () => {
            for (const o of host.underlay?.() ?? []) o.render(ctx);
        };
        const overlay = () => {
            if (host.paintOverlay && ctx.canvas === c.getElement()) host.paintOverlay(ctx);
        };
        if (v.trivial) {
            dropCache();
            under();
            origRender.call(c, ctx, objects);
            overlay();
            return;
        }
        reorder(v);
        const { buckets, helpers } = bucket(v, objects);
        const draw: Draw = (target, id) => {
            for (const o of buckets.get(id) ?? []) o.render(target);
        };
        if (!runCached(ctx, v, buckets, draw, under)) {
            dropCache();
            under();
            run(ctx, v.steps, draw);
        }
        for (const h of helpers) h.render(ctx);
        overlay();
    };

    if (origCheck)
        c._checkTarget = function (obj: FabricObject, pointer: Point) {
            return allowed(obj) && origCheck.call(c, obj, pointer);
        };

    c._setSVGObjects = function (markup: string[], reviver?: unknown) {
        const v = derive();
        for (const o of host.underlay?.() ?? []) c._setSVGObject(markup, o, reviver);
        if (v.trivial) return origSVG.call(c, markup, reviver);
        const { buckets, helpers } = bucket(
            v,
            c._objects.filter((o) => !o.excludeFromExport),
        );
        const open = (opacity: number, blend: LayerBlend) =>
            markup.push(
                `<g opacity="${opacity}"${blend === 'normal' ? '' : ` style="mix-blend-mode: ${blend}"`}>\n`,
            );
        const leaf = (id: string) => {
            for (const o of buckets.get(id) ?? []) c._setSVGObject(markup, o, reviver);
        };
        const emit = (steps: Step[]) => {
            for (const s of steps) {
                if (s.kind === 'leaf') leaf(s.id);
                else if (s.kind === 'group') {
                    open(s.opacity, s.blend);
                    emit(s.steps);
                    markup.push('</g>\n');
                } else {
                    open(s.opacity, s.blend);
                    leaf(s.base);
                    for (const k of s.clipped) {
                        open(k.opacity, k.blend);
                        leaf(k.id);
                        markup.push('</g>\n');
                    }
                    markup.push('</g>\n');
                }
            }
        };
        emit(v.steps);
        for (const h of helpers) c._setSVGObject(markup, h, reviver);
    };

    /** Selecting by other routes (select all, the object list, a marquee): drop what is not allowed. */
    const guard = () => {
        // a StaticCanvas (export, tests) has no selection
        const sel = c as unknown as Partial<{
            getActiveObject: () => FabricObject | undefined;
            discardActiveObject: () => void;
            setActiveObject: (o: FabricObject) => void;
        }>;
        const active = sel.getActiveObject?.();
        if (!active || !sel.discardActiveObject || !sel.setActiveObject) return;
        const objs = isSelection(active) ? active.getObjects() : [active];
        const keep = objs.filter(allowed);
        if (keep.length === objs.length) return;
        if (!keep.length) sel.discardActiveObject();
        else if (keep.length === 1) sel.setActiveObject(keep[0]);
        else sel.setActiveObject(new ActiveSelection(keep, { canvas: c as never }));
        c.requestRenderAll();
    };
    const offs = [c.on('selection:created', guard), c.on('selection:updated', guard)];

    return () => {
        offs.forEach((off) => off());
        dropCache();
        pool.length = 0;
        const restore = (
            key: '_renderObjects' | '_checkTarget' | '_setSVGObjects',
            was: boolean,
            fn: unknown,
        ) => {
            if (was) (c as unknown as Record<string, unknown>)[key] = fn;
            else delete (c as unknown as Record<string, unknown>)[key];
        };
        restore('_renderObjects', had.render, origRender);
        restore('_checkTarget', had.check, origCheck);
        restore('_setSVGObjects', had.svg, origSVG);
    };
}
