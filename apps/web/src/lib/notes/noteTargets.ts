/**
 * Notes ↔ canvas objects (2026-11-17). A linked note stores the object's `shapeId` (the id connectors use too:
 * copies get a new one in the layers slice, node edits carry it over). No store import (BUG-048).
 */
import { Point, type Canvas, type FabricObject } from 'fabric';
import { nanoid } from 'nanoid';
import { isLayerHelper } from '@/lib/canvas/docLayers';
import type { PageNote } from './pageNotes';

type Pt = { x: number; y: number };
type WithId = FabricObject & { shapeId?: unknown; getObjects?: () => FabricObject[] };

/** The object's `shapeId`, given one first when it has none. */
export function ensureShapeId(o: FabricObject): string {
    const r = o as WithId;
    if (typeof r.shapeId !== 'string' || !r.shapeId) r.shapeId = nanoid(12);
    return r.shapeId as string;
}

/** Where a linked note's pin sits: the object's top-right corner (scene px). */
export function noteAnchorOf(o: FabricObject): Pt {
    const r = o.getBoundingRect();
    return { x: r.left + r.width, y: r.top };
}

/** The topmost visible object under `p` (scene px), never an editor helper; null on empty board. */
export function findNoteTarget(canvas: Canvas, p: Pt): FabricObject | null {
    const objects = canvas.getObjects();
    const point = new Point(p.x, p.y);
    for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i]!;
        if (o.visible === false || isLayerHelper(o)) continue;
        if (o.containsPoint(point)) return o;
    }
    return null;
}

/**
 * The object with this `shapeId` (also inside groups) and the top-level object that holds it (what a click
 * selects). Null when it is gone.
 */
export function findByShapeId(
    canvas: Canvas,
    shapeId: string,
): { object: FabricObject; top: FabricObject } | null {
    const visit = (list: FabricObject[], top: FabricObject | null) => {
        for (const o of list) {
            const owner = top ?? o;
            if ((o as WithId).shapeId === shapeId) return { object: o, top: owner };
            const kids = (o as WithId).getObjects?.();
            const found: { object: FabricObject; top: FabricObject } | null = kids
                ? visit(kids, owner)
                : null;
            if (found) return found;
        }
        return null;
    };
    return visit(canvas.getObjects(), null);
}

/** Every object with a `shapeId` in `list` and inside its groups (first one wins). */
export function collectShapeIds(
    list: FabricObject[],
    map = new Map<string, FabricObject>(),
): Map<string, FabricObject> {
    for (const o of list) {
        const id = (o as WithId).shapeId;
        if (typeof id === 'string' && id && !map.has(id)) map.set(id, o);
        const kids = (o as WithId).getObjects?.();
        if (kids) collectShapeIds(kids, map);
    }
    return map;
}

/** All objects by `shapeId` in one walk (pins look up many notes per frame). */
export const shapeIdIndex = (canvas: Canvas) => collectShapeIds(canvas.getObjects());

/** The pin's scene point: on its object while the object is there, else where it was last seen. */
export function notePoint(note: PageNote, index: Map<string, FabricObject>): Pt {
    const o = note.objectId ? index.get(note.objectId) : undefined;
    return o ? noteAnchorOf(o) : { x: note.x, y: note.y };
}
