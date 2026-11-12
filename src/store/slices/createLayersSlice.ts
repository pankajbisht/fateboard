import type { SliceCreator } from '../types';
import * as fabric from 'fabric';
import { Group } from 'fabric';
import { CUSTOM_PROPS } from '@/lib/serialization';
import { LINK_PROP, canLink, linkedWith, newLinkId, syncLinked } from '@/lib/linkedClones';
import {
    isGroup,
    isSelection,
    setLocked,
    syncSelectionLock,
    ungroupable,
    ungroupInto,
    viewRect,
    type Rect,
} from '@/lib/canvas/arrange';

/* ────────────────────────────────────────────────────────────────────────────
 * Same slice pattern, same file, same action names as before.
 * The Fabric canvas is the source of truth; `layers` is a snapshot that
 * syncLayers() rebuilds, so it can never drift from what is on the canvas.
 * ──────────────────────────────────────────────────────────────────────────── */

export type LayerId = string | number;
export type AlignKey =
    | 'align-left'
    | 'align-hcenter'
    | 'align-right'
    | 'align-top'
    | 'align-vcenter'
    | 'align-bottom'
    | 'distribute-h'
    | 'distribute-v';
export type AlignTarget = 'selection' | 'canvas';
export type ReorderPosition = 'above' | 'below';
export type SelectMode = 'replace' | 'toggle' | 'range';

export interface LayerItem {
    id: LayerId;
    name: string;
    type: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: string;
    parentId: LayerId | null;
    depth: number;
    isGroup: boolean;
    thumbRev: number;
    object: any;
}

export interface LayerSlice {
    layers: LayerItem[];
    selectedLayerIds: LayerId[];
    clipboard: any | null;
    setLayers: (layers: any[]) => void;
    addLayer: (shape: any, shapeType: string) => void;
    renameLayer: (id: LayerId, name: string) => void;
    removeLayer: (id?: LayerId) => void;
    toggleVisibility: (id: LayerId) => void;
    duplicateLayer: (id: LayerId) => void;
    toggleLayerLock: (id?: LayerId) => void;
    isActiveObjectLocked: () => boolean;
    toggleActiveObjectLock: () => void;
    toggleActiveObjectLock1: () => void;
    lock: () => void;
    unlock: () => void;
    bringForward: () => void;
    sendBackward: () => void;
    bringToFront: () => void;
    sendToBack: () => void;
    deleteObject: () => void;
    groupLayers: (ids?: LayerId[]) => void;
    ungroupSelected: () => void;
    groupLayers1: (ids: LayerId[]) => void;
    ungroupLayers1: (ids: LayerId[]) => void;
    alignLayers: (type: string, ids: LayerId[]) => void;
    distributeLayers: (direction: string, ids: LayerId[]) => void;
    copy: () => void;
    cut: () => void;
    paste: () => void;
    /** Independent copy exactly on top of each selected object (one layer above it). */
    duplicate: () => Promise<void>;
    cloneer: (offset?: number) => void;
    /** Linked copy on top of each selected object (see lib/linkedClones). */
    clone: (offset?: number) => Promise<void>;
    clone1: (offset?: number) => void;
    /** Selected objects leave their link (a lone remaining copy is unlinked too). */
    unlinkClone: () => boolean;
    /** Links the selection (same kind); it takes the look of the bottom-most object. */
    linkClones: () => boolean;
    /** Selects every object linked with the selected one. */
    selectLinked: () => boolean;
    /** Makes the linked copies of `sources` (default: the selection) match them. */
    syncLinkedClones: (sources?: unknown[]) => void;
    /** For menus: is something linked selected / can the selection be linked? */
    hasLinkedSelection: () => boolean;
    canLinkSelection: () => boolean;
    alignObjects: (key: string, to?: AlignTarget) => void;
    distributeObjects: (direction: string) => void;
    canPaste: () => boolean;
    isGroupSelected: () => boolean;

    // new
    syncLayers: () => void;
    syncSelection: () => void;
    bindLayerEvents: (canvas?: any) => () => void;
    handleLayerKeyDown: (e: KeyboardEvent) => boolean;
    selectLayer: (id: LayerId, mode?: SelectMode) => void;
    soloLayer: (id: LayerId) => void;
    showAllLayers: () => void;
    setAllLocked: (locked: boolean) => void;
    setLayerOpacity: (id: LayerId, opacity: number, commit?: boolean) => void;
    setLayerBlendMode: (id: LayerId, mode: string) => void;
    reorderLayer: (dragId: LayerId, targetId: LayerId, position: ReorderPosition) => void;
    /** Selects everything that can be selected. False when there is nothing to select. */
    selectAllObjects: () => boolean;
}

/* ───────────────────────────── helpers ───────────────────────────── */

type FObj = any;

/** Pass to clone()/toObject() so id, name and lock survive. */
export const LAYER_PROPS = ['id', 'name', '_locked'];

const PASTE_STEP = 12;
let idCounter = 0;
let pasteCount = 0;
let anchorId: LayerId | null = null;
const makeId = () => `l_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

const typeOf = (o: any) => String(o?.type ?? 'object').toLowerCase();
const same = (a: any, b: any) => String(a) === String(b);

/** Guides, rulers, node handles etc. stay out of the panel. Tweak to match your helpers. */
const isLayerObject = (o: FObj) => !(o.excludeFromLayers || o.excludeFromExport || o.isHelper);

const LABELS: Record<string, string> = {
    rect: 'Rectangle',
    circle: 'Circle',
    ellipse: 'Ellipse',
    triangle: 'Triangle',
    line: 'Line',
    path: 'Path',
    polygon: 'Polygon',
    polyline: 'Polyline',
    text: 'Text',
    itext: 'Text',
    'i-text': 'Text',
    textbox: 'Text',
    image: 'Image',
    group: 'Group',
};
const labelOf = (o: FObj) => LABELS[typeOf(o)] ?? 'Layer';

/** Padlock badge drawn on the canvas (replaces the old text-object icon, which leaked into
 *  exports, undo history and the z-order). Called from the after:render listener. */
function drawLockBadges(canvas: FObj, ctx: CanvasRenderingContext2D) {
    const vpt = canvas.viewportTransform;
    canvas.getObjects().forEach((o: FObj) => {
        if (!o._locked || o.visible === false || !o.aCoords) return;
        const p = fabric.util.transformPoint(o.aCoords.tr, vpt);
        const x = p.x - 14;
        const y = p.y + 14;
        ctx.save();
        ctx.fillStyle = 'rgba(24,24,27,0.88)';
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y - 2, 3, Math.PI, 0);
        ctx.stroke();
        ctx.fillRect(x - 4, y - 1.5, 8, 6);
        ctx.restore();
    });
}

function buildLayers(canvas: FObj): LayerItem[] {
    const counters = new Map<string, number>();
    const learn = (list: FObj[]) =>
        list.forEach((o) => {
            if (!isLayerObject(o)) return;
            const m = /^(.*) (\d+)$/.exec(o.name ?? '');
            if (m && m[1] === labelOf(o))
                counters.set(m[1], Math.max(counters.get(m[1]) ?? 0, Number(m[2])));
            if (isGroup(o)) learn(o.getObjects());
        });
    learn(canvas.getObjects());

    const seen = new Set<string>();
    const out: LayerItem[] = [];
    const walk = (list: FObj[], parentId: LayerId | null, depth: number) => {
        for (let i = list.length - 1; i >= 0; i--) {
            const o = list[i];
            if (!isLayerObject(o)) continue;

            if (o.id === undefined || o.id === null || o.id === '' || seen.has(String(o.id)))
                o.id = makeId();
            seen.add(String(o.id));

            if (!o.name) {
                const label = labelOf(o);
                const n = (counters.get(label) ?? 0) + 1;
                counters.set(label, n);
                o.name = `${label} ${n}`;
            }
            // fabric does not serialize lock flags: re-apply after loadFromJSON
            if (o._locked && !o.lockMovementX) setLocked([o], true);

            const group = isGroup(o);
            out.push({
                id: o.id,
                name: o.name,
                type: typeOf(o),
                visible: o.visible !== false,
                locked: o._locked === true,
                opacity: o.opacity ?? 1,
                blendMode: o.globalCompositeOperation || 'source-over',
                parentId,
                depth,
                isGroup: group,
                thumbRev: o.__thumbRev ?? 0,
                object: o,
            });
            if (group) walk(o.getObjects(), o.id, depth + 1);
        }
    };
    walk(canvas.getObjects(), null, 0);
    return out;
}

interface Located {
    obj: FObj;
    top: FObj;
    parent: FObj | null;
}

function locate(canvas: FObj, id: LayerId): Located | null {
    const walk = (list: FObj[], top: FObj | null, parent: FObj | null): Located | null => {
        for (const o of list) {
            const t = top ?? o;
            if (same(o.id, id)) return { obj: o, top: t, parent };
            if (isGroup(o)) {
                const hit = walk(o.getObjects(), t, o);
                if (hit) return hit;
            }
        }
        return null;
    };
    return walk(canvas.getObjects(), null, null);
}

function setSelection(canvas: FObj, objs: FObj[]) {
    canvas.discardActiveObject();
    if (objs.length === 1) canvas.setActiveObject(objs[0]);
    else if (objs.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
    canvas.requestRenderAll();
}

const sortByStack = (canvas: FObj, objs: FObj[]) => {
    const all = canvas.getObjects();
    return objs.filter((o) => all.includes(o)).sort((a, b) => all.indexOf(a) - all.indexOf(b));
};

function freshMeta(o: FObj, top = true) {
    o.id = makeId();
    if (top && o.name && !isSelection(o)) o.name = `${o.name} copy`;
    delete o.__master;
    delete o.__instances;
    delete o[LINK_PROP]; // a duplicate / paste is independent; `clone` re-links on purpose
    if (o.shapeId) o.shapeId = makeId(); // connectors attach by shapeId: a copy needs its own
    if (isSelection(o) || isGroup(o))
        o._objects?.forEach((c: FObj) => freshMeta(c, isSelection(o)));
}

/** Props a duplicate / clone keeps (layers + every saved custom prop: text shapes, filters...). */
const COPY_PROPS = [...new Set([...LAYER_PROPS, ...CUSTOM_PROPS])];

/**
 * Copies of the selected objects, each exactly on top of (and one layer above) its original;
 * `linked` keeps them in the original's link. The copies end up selected.
 */
async function copyInPlace(canvas: FObj, linked: boolean): Promise<FObj[]> {
    const sources = sortByStack(canvas, canvas.getActiveObjects()) as FObj[];
    if (!sources.length) return [];
    canvas.discardActiveObject(); // absolute coordinates for objects of a multi-selection
    const copies: FObj[] = [];
    // top-most first, so the indexes of the ones below do not move
    for (const src of [...sources].reverse()) {
        const copy = await src.clone(COPY_PROPS);
        freshMeta(copy);
        if (linked) {
            src[LINK_PROP] ??= newLinkId();
            copy[LINK_PROP] = src[LINK_PROP];
        }
        copy.set({ left: src.left, top: src.top, evented: true });
        copy.setCoords();
        canvas.insertAt(canvas.getObjects().indexOf(src) + 1, copy);
        copies.unshift(copy);
    }
    setSelection(canvas, copies);
    return copies;
}

function placeClone(canvas: FObj, clone: FObj, left: number, top: number) {
    canvas.discardActiveObject();
    freshMeta(clone);
    clone.set({ left, top, evented: true });
    if (isSelection(clone)) {
        clone.canvas = canvas;
        clone.forEachObject((o: FObj) => canvas.add(o));
        clone.setCoords();
    } else {
        canvas.add(clone);
    }
    canvas.setActiveObject(clone);
}

function rectOf(o: FObj): Rect {
    o.setCoords();
    const c = o.aCoords;
    const xs = [c.tl.x, c.tr.x, c.bl.x, c.br.x];
    const ys = [c.tl.y, c.tr.y, c.bl.y, c.br.y];
    const l = Math.min(...xs);
    const r = Math.max(...xs);
    const t = Math.min(...ys);
    const b = Math.max(...ys);
    return { l, t, r, b, w: r - l, h: b - t };
}

const unionRect = (rs: Rect[]): Rect => {
    const l = Math.min(...rs.map((r) => r.l));
    const t = Math.min(...rs.map((r) => r.t));
    const r = Math.max(...rs.map((r) => r.r));
    const b = Math.max(...rs.map((r) => r.b));
    return { l, t, r, b, w: r - l, h: b - t };
};

/* ───────────────────────────── slice ───────────────────────────── */

export const createLayersSlice: SliceCreator<LayerSlice> = (set, get, _store) => {
    const cv = () => (get() as any).canvas as FObj | null;
    /** Calls your undo slice if it exists. Delete the body if undo already listens to canvas events. */
    const commit = () => (get() as any).saveState?.();
    const touch = (o: FObj) => {
        o.__thumbRev = (o.__thumbRev ?? 0) + 1;
        o.set('dirty', true);
    };
    const refresh = (canvas: FObj) => {
        get().syncLayers();
        canvas.requestRenderAll();
    };

    return {
        layers: [],
        selectedLayerIds: [],
        clipboard: null,

        setLayers: (layers) => set({ layers }),

        selectAllObjects: () => {
            const canvas = cv();
            if (!canvas) return false;
            const objects = canvas
                .getObjects()
                .filter(
                    (o: FObj) =>
                        isLayerObject(o) && o.selectable && o.visible !== false && !o._locked,
                );
            if (!objects.length) return false;
            setSelection(canvas, objects);
            return true;
        },

        /* ───── sync (new) ───── */

        syncLayers: () => {
            const canvas = cv();
            if (!canvas) return set({ layers: [], selectedLayerIds: [] });
            set({
                layers: buildLayers(canvas),
                selectedLayerIds: canvas.getActiveObjects().map((o: FObj) => o.id),
            });
        },

        syncSelection: () => {
            const canvas = cv();
            if (!canvas) return;
            const ids = canvas.getActiveObjects().map((o: FObj) => o.id);
            const prev = get().selectedLayerIds;
            if (
                ids.length === prev.length &&
                ids.every((id: LayerId, i: number) => same(id, prev[i]))
            )
                return;
            set({ selectedLayerIds: ids });
        },

        /**
         * Optional, call once where you create the canvas (or let LayersPanel call it on mount).
         * Keeps `layers` in sync with the canvas and draws lock badges. Safe to call repeatedly.
         * Returns an unbind function.
         */
        bindLayerEvents: (target) => {
            const canvas = target ?? cv();
            if (!canvas) return () => {};
            canvas.__layerUnbind?.();

            let raf = 0;
            const schedule = () => {
                cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => get().syncLayers());
            };
            const onModified = (e: any) => {
                if (e?.target) e.target.__thumbRev = (e.target.__thumbRev ?? 0) + 1;
                schedule();
            };
            const onSelection = () => get().syncSelection();
            const onAfterRender = ({ ctx }: any) => drawLockBadges(canvas, ctx);

            canvas.on('object:added', schedule);
            canvas.on('object:removed', schedule);
            canvas.on('object:modified', onModified);
            canvas.on('selection:created', onSelection);
            canvas.on('selection:updated', onSelection);
            canvas.on('selection:cleared', onSelection);
            canvas.on('after:render', onAfterRender);
            schedule();

            const unbind = () => {
                cancelAnimationFrame(raf);
                canvas.off('object:added', schedule);
                canvas.off('object:removed', schedule);
                canvas.off('object:modified', onModified);
                canvas.off('selection:created', onSelection);
                canvas.off('selection:updated', onSelection);
                canvas.off('selection:cleared', onSelection);
                canvas.off('after:render', onAfterRender);
                delete canvas.__layerUnbind;
            };
            canvas.__layerUnbind = unbind;
            return unbind;
        },

        /** Optional: call from your existing keydown handler. Returns true when it handled the key. */
        handleLayerKeyDown: (e) => {
            const el = e.target as HTMLElement | null;
            if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))
                return false;
            if (cv()?.getActiveObject()?.isEditing) return false;

            const s = get();
            const mod = e.metaKey || e.ctrlKey;
            const run = (fn: () => void) => {
                e.preventDefault();
                fn();
                return true;
            };
            if (!mod)
                return e.key === 'Delete' || e.key === 'Backspace'
                    ? run(() => s.removeLayer())
                    : false;
            if (e.code === 'BracketRight') return run(e.shiftKey ? s.bringToFront : s.bringForward);
            if (e.code === 'BracketLeft') return run(e.shiftKey ? s.sendToBack : s.sendBackward);
            if (e.code === 'Slash') return run(() => s.toggleLayerLock());
            switch (e.key.toLowerCase()) {
                case 'c':
                    return run(s.copy);
                case 'x':
                    return run(s.cut);
                case 'v':
                    return s.canPaste() ? run(s.paste) : false;
                case 'd':
                    return run(s.duplicate);
                case 'g':
                    return run(e.shiftKey ? s.ungroupSelected : () => s.groupLayers());
            }
            return false;
        },

        /* ───── layers ───── */

        addLayer: (shape: any, shapeType: string) => {
            const canvas = cv();
            if (!canvas) return;
            if (shape.id === undefined || shape.id === null)
                shape.id = shape.toObject?.().id || Date.now();
            if (!shape.name && shapeType) shape.name = shapeType;
            if (!canvas.getObjects().includes(shape)) canvas.add(shape);
            refresh(canvas);
        },

        selectLayer: (id, mode = 'replace') => {
            const canvas = cv();
            if (!canvas) return;
            const hit = locate(canvas, id);
            if (!hit) return;

            if (mode === 'replace') {
                setSelection(canvas, [hit.top]);
                anchorId = hit.top.id;
            } else if (mode === 'toggle') {
                const current = canvas.getActiveObjects();
                const next = current.includes(hit.top)
                    ? current.filter((o: FObj) => o !== hit.top)
                    : [...current, hit.top];
                setSelection(canvas, sortByStack(canvas, next));
                anchorId = hit.top.id;
            } else {
                const top = get().layers.filter((l) => l.depth === 0);
                const a = top.findIndex((l) => same(l.id, anchorId ?? hit.top.id));
                const b = top.findIndex((l) => same(l.id, hit.top.id));
                if (a < 0 || b < 0) return setSelection(canvas, [hit.top]);
                const [from, to] = a < b ? [a, b] : [b, a];
                setSelection(
                    canvas,
                    top.slice(from, to + 1).map((l) => l.object),
                );
            }
            get().syncSelection();
        },

        renameLayer: (id, name) => {
            const canvas = cv();
            if (!canvas) return;
            const hit = locate(canvas, id);
            const clean = name.trim();
            if (!hit || !clean || clean === hit.obj.name) return;
            hit.obj.name = clean;
            get().syncLayers();
            commit();
        },

        removeLayer: (id) => {
            const canvas = cv();
            if (!canvas) return;
            const targets: Located[] =
                id !== undefined
                    ? ([locate(canvas, id)].filter(Boolean) as Located[])
                    : canvas
                          .getActiveObjects()
                          .map((o: FObj) => ({ obj: o, top: o, parent: null }));
            // locked layers are protected from deletion
            const removable = targets.filter((t) => !t.obj._locked && !t.top._locked);
            if (!removable.length) return;
            canvas.discardActiveObject();
            removable.forEach(({ obj, parent }) =>
                parent ? parent.remove(obj) : canvas.remove(obj),
            );
            refresh(canvas);
            commit();
        },

        toggleVisibility: (id) => {
            const canvas = cv();
            if (!canvas) return;
            const hit = locate(canvas, id);
            if (!hit) return;
            hit.obj.set('visible', hit.obj.visible === false);
            hit.top.set('dirty', true);
            if (hit.obj.visible === false && canvas.getActiveObjects().includes(hit.top))
                canvas.discardActiveObject();
            refresh(canvas);
            commit();
        },

        soloLayer: (id) => {
            const canvas = cv();
            if (!canvas) return;
            const all = canvas.getObjects().filter(isLayerObject);
            const target = all.find((o: FObj) => same(o.id, id));
            if (!target) return;
            const alreadySolo = all.every((o: FObj) =>
                o === target ? o.visible !== false : o.visible === false,
            );
            all.forEach((o: FObj) => o.set('visible', alreadySolo ? true : o === target));
            canvas.discardActiveObject();
            refresh(canvas);
            commit();
        },

        showAllLayers: () => {
            const canvas = cv();
            if (!canvas) return;
            canvas.getObjects().forEach((o: FObj) => o.set('visible', true));
            refresh(canvas);
            commit();
        },

        setLayerOpacity: (id, opacity, shouldCommit = true) => {
            const canvas = cv();
            if (!canvas) return;
            const hit = locate(canvas, id);
            if (!hit) return;
            hit.obj.set('opacity', Math.min(1, Math.max(0, opacity)));
            hit.top.set('dirty', true);
            canvas.requestRenderAll();
            if (shouldCommit) {
                touch(hit.obj);
                get().syncLayers();
                commit();
            }
        },

        setLayerBlendMode: (id, mode) => {
            const canvas = cv();
            if (!canvas) return;
            const hit = locate(canvas, id);
            if (!hit) return;
            hit.obj.set('globalCompositeOperation', mode);
            touch(hit.obj);
            refresh(canvas);
            commit();
        },

        duplicateLayer: async (id) => {
            const canvas = cv();
            if (!canvas) return;
            const hit = locate(canvas, id);
            if (!hit) return;
            setSelection(canvas, [hit.top]);
            await copyInPlace(canvas, false); // exactly on top, one layer above the original
            refresh(canvas);
            commit();
        },

        /* ───── lock ───── */

        toggleLayerLock: (id) => {
            const canvas = cv();
            if (!canvas) return;
            const targets: FObj[] =
                id !== undefined
                    ? ([locate(canvas, id)?.top].filter(Boolean) as FObj[])
                    : canvas.getActiveObjects();
            if (!targets.length) return;
            setLocked(targets, !targets.every((o) => o._locked));
            syncSelectionLock(canvas);
            refresh(canvas);
            commit();
        },

        isActiveObjectLocked: () => {
            const objs = cv()?.getActiveObjects() ?? [];
            return objs.length > 0 && objs.every((o: FObj) => o._locked === true);
        },

        toggleActiveObjectLock: () => get().toggleLayerLock(),
        toggleActiveObjectLock1: () => get().toggleLayerLock(), // kept for compatibility, same behaviour

        lock: () => {
            const canvas = cv();
            if (!canvas) return;
            setLocked(canvas.getActiveObjects(), true);
            syncSelectionLock(canvas);
            refresh(canvas);
            commit();
        },

        unlock: () => {
            const canvas = cv();
            if (!canvas) return;
            setLocked(canvas.getActiveObjects(), false);
            syncSelectionLock(canvas);
            refresh(canvas);
            commit();
        },

        setAllLocked: (locked) => {
            const canvas = cv();
            if (!canvas) return;
            setLocked(canvas.getObjects().filter(isLayerObject), locked);
            syncSelectionLock(canvas);
            refresh(canvas);
            commit();
        },

        /* ───── z-order ───── */

        bringForward: () => {
            const canvas = cv();
            if (!canvas) return;
            const objs = sortByStack(canvas, canvas.getActiveObjects()).reverse(); // top first
            let limit = canvas.getObjects().length - 1;
            objs.forEach((o) => {
                const target = Math.min(canvas.getObjects().indexOf(o) + 1, limit);
                canvas.moveObjectTo(o, target);
                limit = target - 1;
            });
            refresh(canvas);
            commit();
        },

        sendBackward: () => {
            const canvas = cv();
            if (!canvas) return;
            const objs = sortByStack(canvas, canvas.getActiveObjects()); // bottom first
            let limit = 0;
            objs.forEach((o) => {
                const target = Math.max(canvas.getObjects().indexOf(o) - 1, limit);
                canvas.moveObjectTo(o, target);
                limit = target + 1;
            });
            refresh(canvas);
            commit();
        },

        bringToFront: () => {
            const canvas = cv();
            if (!canvas) return;
            sortByStack(canvas, canvas.getActiveObjects()).forEach((o) =>
                canvas.moveObjectTo(o, canvas.getObjects().length - 1),
            );
            refresh(canvas);
            commit();
        },

        sendToBack: () => {
            const canvas = cv();
            if (!canvas) return;
            sortByStack(canvas, canvas.getActiveObjects())
                .reverse()
                .forEach((o) => canvas.moveObjectTo(o, 0));
            refresh(canvas);
            commit();
        },

        reorderLayer: (dragId, targetId, position) => {
            const canvas = cv();
            if (!canvas || same(dragId, targetId)) return;
            const drag = locate(canvas, dragId);
            const target = locate(canvas, targetId);
            if (!drag || !target || drag.parent || target.parent) return; // top level only
            const all = canvas.getObjects();
            const from = all.indexOf(drag.obj);
            const to = all.indexOf(target.obj);
            const dest = position === 'above' ? (from < to ? to : to + 1) : from < to ? to - 1 : to;
            if (dest === from) return;
            canvas.moveObjectTo(drag.obj, dest);
            refresh(canvas);
            commit();
        },

        deleteObject: () => get().removeLayer(),

        /* ───── group ───── */

        groupLayers: (ids) => {
            const canvas = cv();
            if (!canvas) return;
            const raw: FObj[] = ids
                ? (ids.map((id) => locate(canvas, id)?.top).filter(Boolean) as FObj[])
                : canvas.getActiveObjects();
            // locked layers stay out: a group around them would move them (BUG-190)
            const objs = sortByStack(canvas, [...new Set(raw)]).filter((o) => !o._locked);
            if (objs.length < 2) return;

            const index = canvas.getObjects().indexOf(objs[0]);
            canvas.discardActiveObject(); // objects return to scene coordinates
            canvas.remove(...objs);
            const group: FObj = new Group(objs);
            group.id = makeId();
            canvas.insertAt(index, group);
            canvas.setActiveObject(group);
            refresh(canvas);
            commit();
        },

        /** Takes apart every unlocked group of the selection (a locked one stays whole, BUG-190). */
        ungroupSelected: () => {
            const canvas = cv();
            if (!canvas) return;
            const selected: FObj[] = canvas.getActiveObjects();
            const groups = ungroupable(selected);
            if (!groups.length) return;

            canvas.discardActiveObject(); // objects of a multi-selection return to scene coordinates
            const parts = groups.flatMap((g) => ungroupInto(canvas, g));
            const others = selected.filter((o) => !groups.includes(o));
            setSelection(canvas, sortByStack(canvas, [...parts, ...others]));
            refresh(canvas);
            commit();
        },

        // The *1 / *Layers variants used to edit fake data fields (x, width, children) that never
        // existed on layers. They now drive the real canvas objects, same names and signatures.
        groupLayers1: (ids) => get().groupLayers(ids),

        ungroupLayers1: (ids) => {
            const canvas = cv();
            if (!canvas) return;
            ids.forEach((id) => {
                const hit = locate(canvas, id);
                if (!hit || !isGroup(hit.top)) return;
                setSelection(canvas, [hit.top]);
                get().ungroupSelected();
            });
        },

        alignLayers: (type, ids) => {
            const canvas = cv();
            if (!canvas || !ids.length) return;
            const key = (
                { left: 'align-left', center: 'align-hcenter', right: 'align-right' } as Record<
                    string,
                    AlignKey
                >
            )[type];
            if (!key) return;
            setSelection(
                canvas,
                ids.map((id) => locate(canvas, id)?.top).filter(Boolean) as FObj[],
            );
            get().alignObjects(key);
        },

        distributeLayers: (direction, ids) => {
            const canvas = cv();
            if (!canvas) return;
            setSelection(
                canvas,
                ids.map((id) => locate(canvas, id)?.top).filter(Boolean) as FObj[],
            );
            get().distributeObjects(direction);
        },

        isGroupSelected: () => ungroupable(cv()?.getActiveObjects() ?? []).length > 0,

        /* ───── clipboard & clones ───── */

        copy: async () => {
            const src = cv()?.getActiveObject();
            if (!src) return;
            pasteCount = 0;
            set({ clipboard: await src.clone(COPY_PROPS) }); // all saved custom data (text shapes...)
        },

        cut: async () => {
            await get().copy();
            get().removeLayer();
        },

        paste: async () => {
            const canvas = cv();
            const src = get().clipboard;
            if (!canvas || !src) return;
            pasteCount += 1;
            const clone = await src.clone(COPY_PROPS);
            const shift = PASTE_STEP * pasteCount;
            placeClone(canvas, clone, (src.left ?? 0) + shift, (src.top ?? 0) + shift);
            refresh(canvas);
            commit();
        },

        canPaste: () => !!get().clipboard,

        duplicate: async () => {
            const canvas = cv();
            if (!canvas?.getActiveObject()) return;
            await copyInPlace(canvas, false);
            refresh(canvas);
            commit();
        },

        /** Linked copy, on top of the original (Inkscape / Affinity). The offset is no longer used. */
        clone: async () => {
            const canvas = cv();
            if (!canvas?.getActiveObject()) return;
            await copyInPlace(canvas, true);
            refresh(canvas);
            commit();
        },

        cloneer: () => get().clone(), // same as clone, kept for compatibility

        clone1: async () => {
            // multi-selection is grouped first, then cloned as one object
            if (isSelection(cv()?.getActiveObject())) get().groupLayers();
            await get().clone();
        },

        unlinkClone: () => {
            const canvas = cv();
            if (!canvas) return false;
            const targets = canvas.getActiveObjects().filter((o: FObj) => o[LINK_PROP]);
            if (!targets.length) return false;
            for (const o of targets) {
                const rest = linkedWith(canvas, o);
                delete o[LINK_PROP];
                if (rest.length === 1) delete rest[0][LINK_PROP]; // a link of one is no link
            }
            commit();
            return true;
        },

        linkClones: () => {
            const canvas = cv();
            if (!canvas) return false;
            const objs = sortByStack(canvas, canvas.getActiveObjects()) as FObj[];
            if (!canLink(objs)) return false;
            const source = objs[0]; // bottom-most: the original look
            const id =
                source[LINK_PROP] ?? objs.find((o) => o[LINK_PROP])?.[LINK_PROP] ?? newLinkId();
            objs.forEach((o) => (o[LINK_PROP] = id));
            // in a multi-selection objects are relative to it: sync with absolute coordinates
            canvas.discardActiveObject();
            get().syncLinkedClones([source]);
            setSelection(canvas, objs);
            commit();
            return true;
        },

        selectLinked: () => {
            const canvas = cv();
            const obj = canvas?.getActiveObject();
            if (!canvas || !obj || !obj[LINK_PROP]) return false;
            setSelection(canvas, sortByStack(canvas, [obj, ...linkedWith(canvas, obj)]));
            return true;
        },

        syncLinkedClones: (sources) => {
            const canvas = cv();
            if (!canvas) return;
            const list = (sources ?? canvas.getActiveObjects()) as FObj[];
            for (const src of list) {
                if (!src?.[LINK_PROP]) continue;
                syncLinked(canvas, src, COPY_PROPS, () => {
                    refresh(canvas);
                    commit(); // the replaced copies become part of the history
                });
            }
        },

        hasLinkedSelection: () =>
            (cv()?.getActiveObjects() ?? []).some((o: FObj) => !!o[LINK_PROP]),

        canLinkSelection: () => canLink(cv()?.getActiveObjects() ?? []),

        /* ───── align / distribute ───── */

        alignObjects: (key, to) => {
            const canvas = cv();
            if (!canvas) return;
            const targets: FObj[] = canvas.getActiveObjects().filter((o: FObj) => !o._locked);
            if (!targets.length) return;
            const distribute = key.startsWith('distribute');
            if (distribute && targets.length < 3) return;

            // leave the ActiveSelection first: inside it, left/top are selection-relative
            canvas.discardActiveObject();
            const items = targets.map((o) => ({ o, r: rectOf(o) }));
            const sel = unionRect(items.map((i) => i.r));
            const frame =
                !distribute && (to === 'canvas' || targets.length === 1) ? viewRect(canvas) : sel;

            const move = (o: FObj, dx: number, dy: number) => {
                if (!dx && !dy) return;
                o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy });
                o.setCoords();
            };

            switch (key) {
                case 'align-left':
                    items.forEach(({ o, r }) => move(o, frame.l - r.l, 0));
                    break;
                case 'align-hcenter':
                    items.forEach(({ o, r }) =>
                        move(o, frame.l + frame.w / 2 - (r.l + r.w / 2), 0),
                    );
                    break;
                case 'align-right':
                    items.forEach(({ o, r }) => move(o, frame.r - r.r, 0));
                    break;
                case 'align-top':
                    items.forEach(({ o, r }) => move(o, 0, frame.t - r.t));
                    break;
                case 'align-vcenter':
                    items.forEach(({ o, r }) =>
                        move(o, 0, frame.t + frame.h / 2 - (r.t + r.h / 2)),
                    );
                    break;
                case 'align-bottom':
                    items.forEach(({ o, r }) => move(o, 0, frame.b - r.b));
                    break;
                case 'distribute-h': {
                    const s = [...items].sort((a, b) => a.r.l - b.r.l);
                    const gap = (sel.w - s.reduce((n, i) => n + i.r.w, 0)) / (s.length - 1);
                    let x = sel.l;
                    s.forEach(({ o, r }) => {
                        move(o, x - r.l, 0);
                        x += r.w + gap;
                    });
                    break;
                }
                case 'distribute-v': {
                    const s = [...items].sort((a, b) => a.r.t - b.r.t);
                    const gap = (sel.h - s.reduce((n, i) => n + i.r.h, 0)) / (s.length - 1);
                    let y = sel.t;
                    s.forEach(({ o, r }) => {
                        move(o, 0, y - r.t);
                        y += r.h + gap;
                    });
                    break;
                }
            }

            setSelection(canvas, targets);
            refresh(canvas);
            commit();
        },

        distributeObjects: (direction) =>
            get().alignObjects(
                direction === 'horizontal' || direction === 'distribute-h'
                    ? 'distribute-h'
                    : 'distribute-v',
            ),
    };
};
