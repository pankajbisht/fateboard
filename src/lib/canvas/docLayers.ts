/**
 * Document layers (2026-11-17): real layers and folders that hold objects, one list per page (Photoshop /
 * Clip Studio model). Pure data and helpers, no Fabric:
 * - the list lives on the canvas as `canvas.docLayers` (serialized through `CUSTOM_PROPS`, so undo, pages and
 *   autosave carry it) and is mirrored in the store (`pageLayers`, createPageLayersSlice);
 * - the array is in no tree order; a node's place among its siblings is its array order, bottom-first;
 * - every object points at a leaf layer with `layerId` (a folder never holds objects directly);
 * - rendering (lib/canvas/layerPlan + layerCompositor) walks the tree bottom-first.
 */

export const LAYER_BLENDS = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
] as const;
export type LayerBlend = (typeof LAYER_BLENDS)[number];
export type LayerKind = 'layer' | 'folder';

export interface DocLayer {
    id: string;
    name: string;
    kind: LayerKind;
    /** The folder it sits in, or null at the top level. */
    parentId: string | null;
    visible: boolean;
    locked: boolean;
    /** Whole-layer opacity, 0 … 1 (applied to the composited layer, not to each object). */
    opacity: number;
    blend: LayerBlend;
    /** Clip to the layer below: shows only where that layer has paint. */
    clip: boolean;
    /** Reference layer: the paint bucket reads only reference layers when any exist. */
    reference: boolean;
    /** Folder closed in the panel. */
    collapsed: boolean;
}

/** Anything that may carry a `layerId` (a Fabric object). */
export type LayerOwner = object;
const layerIdOf = (o: LayerOwner) => (o as { layerId?: unknown }).layerId;

export const newLayerId = () =>
    `L${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function makeLayer(
    patch: Partial<DocLayer> & { name: string },
    id = newLayerId(),
): DocLayer {
    return {
        kind: 'layer',
        parentId: null,
        visible: true,
        locked: false,
        opacity: 1,
        blend: 'normal',
        clip: false,
        reference: false,
        collapsed: false,
        ...patch,
        id,
    };
}

export const defaultLayers = (): DocLayer[] => [makeLayer({ name: 'Layer 1' })];

const clamp01 = (n: unknown) =>
    Number.isFinite(Number(n)) ? Math.min(1, Math.max(0, Number(n))) : 1;

/** A safe layer list from anything (a file, an old document without layers, a bad value). */
export function normalizeLayers(input: unknown): DocLayer[] {
    if (!Array.isArray(input)) return defaultLayers();
    const seen = new Set<string>();
    const out: DocLayer[] = [];
    for (const raw of input) {
        if (!raw || typeof raw !== 'object') continue;
        const r = raw as Record<string, unknown>;
        if (typeof r.id !== 'string' || !r.id || seen.has(r.id)) continue;
        seen.add(r.id);
        out.push(
            makeLayer(
                {
                    name: typeof r.name === 'string' && r.name ? r.name.slice(0, 120) : 'Layer',
                    kind: r.kind === 'folder' ? 'folder' : 'layer',
                    parentId: typeof r.parentId === 'string' ? r.parentId : null,
                    visible: r.visible !== false,
                    locked: r.locked === true,
                    opacity: clamp01(r.opacity ?? 1),
                    blend: LAYER_BLENDS.includes(r.blend as LayerBlend)
                        ? (r.blend as LayerBlend)
                        : 'normal',
                    clip: r.clip === true,
                    reference: r.reference === true,
                    collapsed: r.collapsed === true,
                },
                r.id,
            ),
        );
    }
    const folders = new Set(out.filter((l) => l.kind === 'folder').map((l) => l.id));
    for (const l of out) if (l.parentId && !folders.has(l.parentId)) l.parentId = null;
    // break parent cycles: walk up from each node; a loop puts that node at the top level
    const byId = new Map(out.map((l) => [l.id, l]));
    for (const l of out) {
        const path = new Set<string>([l.id]);
        for (let p = l.parentId; p; p = byId.get(p)?.parentId ?? null) {
            if (path.has(p)) {
                l.parentId = null;
                break;
            }
            path.add(p);
        }
    }
    if (!out.some((l) => l.kind === 'layer')) out.push(makeLayer({ name: nextName(out, 'layer') }));
    return out;
}

export const childrenOf = (layers: DocLayer[], parentId: string | null) =>
    layers.filter((l) => l.parentId === parentId);

/** Leaf layer ids bottom-first (the order their objects are drawn in). */
export function leafOrder(layers: DocLayer[]): string[] {
    const out: string[] = [];
    const walk = (parent: string | null) => {
        for (const l of childrenOf(layers, parent)) {
            if (l.kind === 'folder') walk(l.id);
            else out.push(l.id);
        }
    };
    walk(null);
    return out;
}

/** Leaf id → draw rank (0 = bottom). */
export const rankMap = (layers: DocLayer[]) => new Map(leafOrder(layers).map((id, i) => [id, i]));

/** Folders above a node, nearest first. */
export function ancestors(layers: DocLayer[], id: string): DocLayer[] {
    const byId = new Map(layers.map((l) => [l.id, l]));
    const out: DocLayer[] = [];
    for (let p = byId.get(id)?.parentId ?? null; p; p = byId.get(p)?.parentId ?? null) {
        const f = byId.get(p);
        if (!f || out.includes(f)) break;
        out.push(f);
    }
    return out;
}

const self = (layers: DocLayer[], id: string) => layers.find((l) => l.id === id);

/** Shown, counting its folders. */
export const isLayerVisible = (layers: DocLayer[], id: string) =>
    !!self(layers, id)?.visible && ancestors(layers, id).every((f) => f.visible);

/** Locked, counting its folders. */
export const isLayerLocked = (layers: DocLayer[], id: string) =>
    !!self(layers, id)?.locked || ancestors(layers, id).some((f) => f.locked);

export const isLayerEditable = (layers: DocLayer[], id: string) =>
    self(layers, id)?.kind === 'layer' && isLayerVisible(layers, id) && !isLayerLocked(layers, id);

/** The highest leaf you can draw on (shown and unlocked), or null. */
export function topEditableLeaf(layers: DocLayer[]): string | null {
    const leaves = leafOrder(layers);
    for (let i = leaves.length - 1; i >= 0; i--)
        if (isLayerEditable(layers, leaves[i])) return leaves[i];
    return null;
}

/** "Layer 5" / "Folder 2": one more than the count, skipping names in use. */
export function nextName(layers: DocLayer[], kind: LayerKind): string {
    const base = kind === 'folder' ? 'Folder' : 'Layer';
    const names = new Set(layers.map((l) => l.name));
    let n = layers.filter((l) => l.kind === kind).length + 1;
    while (names.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
}

/** Insert a new node just above `activeId` in its folder, or on top inside it when it is a folder. */
export function insertLayer(
    layers: DocLayer[],
    layer: DocLayer,
    activeId: string | null,
): DocLayer[] {
    const active = activeId ? self(layers, activeId) : undefined;
    if (!active) return [...layers, { ...layer, parentId: null }];
    if (active.kind === 'folder' && layer.id !== active.id)
        return [...layers, { ...layer, parentId: active.id }];
    const i = layers.indexOf(active);
    return [
        ...layers.slice(0, i + 1),
        { ...layer, parentId: active.parentId },
        ...layers.slice(i + 1),
    ];
}

const isInside = (layers: DocLayer[], id: string, folderId: string | null) =>
    !!folderId && (folderId === id || ancestors(layers, folderId).some((f) => f.id === id));

/**
 * Move a node into `parentId` (null = top level) at `index` among its new siblings, bottom-first (clamped).
 * A folder never moves into itself or its own sub-folders (the same list comes back).
 */
export function placeLayer(
    layers: DocLayer[],
    id: string,
    parentId: string | null,
    index: number,
): DocLayer[] {
    const node = self(layers, id);
    if (!node || isInside(layers, id, parentId)) return layers;
    if (parentId !== null && self(layers, parentId)?.kind !== 'folder') return layers;
    const rest = layers.filter((l) => l !== node);
    const siblings = childrenOf(rest, parentId);
    const moved = { ...node, parentId };
    const at = Math.max(0, Math.min(siblings.length, Math.round(index)));
    if (!siblings.length) return [...rest, moved];
    const anchor = at === 0 ? siblings[0] : siblings[at - 1];
    const ai = rest.indexOf(anchor);
    const pos = at === 0 ? ai : ai + 1;
    return [...rest.slice(0, pos), moved, ...rest.slice(pos)];
}

/** Move a node up (+1) or down (-1) among its siblings; unchanged at the ends. */
export function shiftLayer(layers: DocLayer[], id: string, delta: number): DocLayer[] {
    const node = self(layers, id);
    if (!node) return layers;
    const siblings = childrenOf(layers, node.parentId);
    const to = siblings.indexOf(node) + delta;
    if (to < 0 || to >= siblings.length) return layers;
    return placeLayer(layers, id, node.parentId, to);
}

/** Remove a node and everything inside it. `removed` = every id that went (to delete their objects). */
export function removeLayer(
    layers: DocLayer[],
    id: string,
): { layers: DocLayer[]; removed: Set<string> } {
    const removed = new Set<string>([id]);
    let grew = true;
    while (grew) {
        grew = false;
        for (const l of layers)
            if (l.parentId && removed.has(l.parentId) && !removed.has(l.id)) {
                removed.add(l.id);
                grew = true;
            }
    }
    let out = layers.filter((l) => !removed.has(l.id));
    if (!out.some((l) => l.kind === 'layer'))
        out = [...out, makeLayer({ name: nextName(out, 'layer') })];
    return { layers: out, removed };
}

/** The layer a layer merges into: its sibling just below, when that is a layer (not a folder). */
export function mergeTarget(layers: DocLayer[], id: string): string | null {
    const node = self(layers, id);
    if (!node || node.kind !== 'layer') return null;
    const siblings = childrenOf(layers, node.parentId);
    const below = siblings[siblings.indexOf(node) - 1];
    return below && below.kind === 'layer' ? below.id : null;
}

/** The leaf an object belongs to: its own `layerId` when that is a leaf here, else `fallback`. */
export function resolveLayerId(obj: LayerOwner, layers: DocLayer[], fallback: string): string {
    const id = layerIdOf(obj);
    return typeof id === 'string' && layers.some((l) => l.id === id && l.kind === 'layer')
        ? id
        : fallback;
}

/** Objects sorted by layer rank, keeping their order inside a layer; null when already in order. */
export function sortByRank<T>(objects: T[], rankOf: (o: T) => number): T[] | null {
    let sorted = true;
    for (let i = 1; i < objects.length; i++)
        if (rankOf(objects[i]) < rankOf(objects[i - 1])) {
            sorted = false;
            break;
        }
    if (sorted) return null;
    return objects
        .map((o, i) => ({ o, i, r: rankOf(o) }))
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .map((x) => x.o);
}

/**
 * Reference layers (Clip Studio): when a shown layer is marked `reference`, tools that read the drawing (the
 * paint bucket) see only objects on reference layers. Null when there is none (they see everything).
 */
export function referenceFilter(layers: DocLayer[]): ((o: LayerOwner) => boolean) | null {
    const refs = new Set(
        leafOrder(layers).filter(
            (id) => layers.find((l) => l.id === id)?.reference && isLayerVisible(layers, id),
        ),
    );
    if (!refs.size) return null;
    const fallback = leafOrder(layers)[0] ?? '';
    return (o) => refs.has(resolveLayerId(o, layers, fallback));
}

/**
 * Editor helpers on the canvas (handles, guides, previews): they belong to no layer, draw above every layer
 * and keep their place on top of the stack.
 */
export const isLayerHelper = (o: object) => {
    const r = o as Record<string, unknown>;
    return !!(r.excludeFromExport || r.excludeFromLayers || r._isHelper || r.isHelper);
};
