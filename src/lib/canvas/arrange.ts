/**
 * Rules shared by the arrange tools (lock / unlock, group / ungroup, align / distribute) and the UI that
 * shows them (header bars, context menu, keyboard commands). Store actions call these; nothing here
 * touches the store.
 */
import * as fabric from 'fabric';

/** A canvas object with the lock flag this app adds (saved through CUSTOM_PROPS). */
type Obj = fabric.FabricObject & { _locked?: boolean };

/** The canvas calls used here: the real `fabric.Canvas`, or the test fake. */
export interface ArrangeCanvas {
    getActiveObject(): unknown;
    getActiveObjects(): unknown[];
    getObjects(): unknown[];
    remove(...objects: unknown[]): unknown;
    insertAt(index: number, ...objects: unknown[]): unknown;
    getWidth(): number;
    getHeight(): number;
    viewportTransform?: fabric.TMat2D | number[];
}

const isLocked = (o: unknown) => (o as Obj | null | undefined)?._locked === true;

// fabric v6+ types are PascalCase ("ActiveSelection"), so compare with instanceof.
export const isSelection = (o: unknown): boolean => o instanceof fabric.ActiveSelection;
export const isGroup = (o: unknown): boolean => o instanceof fabric.Group && !isSelection(o);

/** The Fabric flags a lock sets: no move, scale, rotate, skew, no handles. */
const lockFlags = (locked: boolean) => ({
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    lockSkewingX: locked,
    lockSkewingY: locked,
    hasControls: !locked,
});

/** Single lock implementation used by every lock / unlock action. Locked objects stay selectable. */
export function setLocked(objs: unknown[], locked: boolean) {
    (objs as Obj[]).forEach((o) => {
        // null = back to the canvas default cursor (Fabric types only allow strings)
        const cursor = (locked ? 'not-allowed' : null) as string;
        o.set({ ...lockFlags(locked), hoverCursor: cursor, moveCursor: cursor });
        o._locked = locked;
    });
}

/**
 * A multi-selection is dragged, nudged and resized as one box: the box must carry the lock of the
 * objects inside it, or moving it moves locked objects (BUG-188). Call after any lock change.
 */
export function syncSelectionLock(canvas: ArrangeCanvas | null | undefined) {
    const sel = canvas?.getActiveObject();
    if (!(sel instanceof fabric.ActiveSelection)) return;
    sel.set(lockFlags(sel.getObjects().some(isLocked)));
}

/** True when the panel / tools must not move, resize, rotate or flip `obj` (BUG-189). */
export const isLockedTarget = (obj: unknown): boolean =>
    isLocked(obj) || (obj instanceof fabric.ActiveSelection && obj.getObjects().some(isLocked));

export interface Rect {
    l: number;
    t: number;
    r: number;
    b: number;
    w: number;
    h: number;
}

/**
 * Frame a single object aligns to: the part of the scene the canvas shows. Design: the viewport is the
 * identity and the canvas is the page, so this is the page. Whiteboard: the visible area, whatever the
 * pan and zoom (BUG-191: the old frame ignored the pan).
 */
export function viewRect(canvas: ArrangeCanvas): Rect {
    const vpt = (canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as fabric.TMat2D;
    const inv = fabric.util.invertTransform(vpt);
    const a = fabric.util.transformPoint(new fabric.Point(0, 0), inv);
    const b = fabric.util.transformPoint(
        new fabric.Point(canvas.getWidth(), canvas.getHeight()),
        inv,
    );
    const l = Math.min(a.x, b.x);
    const t = Math.min(a.y, b.y);
    const r = Math.max(a.x, b.x);
    const bottom = Math.max(a.y, b.y);
    return { l, t, r, b: bottom, w: r - l, h: bottom - t };
}

/**
 * Takes `group` apart in place: its children go back on the canvas at its stack index with the group
 * transform baked in (they look exactly the same). The group must not be inside a selection.
 */
export function ungroupInto(canvas: ArrangeCanvas, group: fabric.Group): fabric.FabricObject[] {
    const index = canvas.getObjects().indexOf(group);
    const groupMatrix = group.calcTransformMatrix();
    const children = group.getObjects().map((o) => ({
        o,
        m: fabric.util.multiplyTransformMatrices(groupMatrix, o.calcOwnMatrix()),
    }));
    group.removeAll();
    canvas.remove(group);
    children.forEach(({ o, m }) => {
        fabric.util.applyTransformToObject(o, m);
        o.setCoords();
    });
    const parts = children.map((c) => c.o);
    canvas.insertAt(index, ...parts);
    return parts;
}

/**
 * The groups of a selection that Ungroup takes apart: unlocked ones (BUG-190). Built-in composites (text
 * shapes, sticky notes) only when selected alone, as before; a multi-selection takes apart plain groups only,
 * until the owner decides BUG-194.
 */
export function ungroupable(objs: unknown[]): fabric.Group[] {
    return objs.filter(
        (o) =>
            isGroup(o) &&
            !isLocked(o) &&
            (objs.length === 1 || !(o as { isTextShape?: boolean }).isTextShape),
    ) as fabric.Group[];
}

/** What the arrange tools can do with the current selection. */
export interface SelectionState {
    /** Selected objects (a multi-selection counts its objects). */
    count: number;
    unlocked: number;
    locked: number;
    /** Groups that can be taken apart (not locked). */
    groups: number;
}

export function readSelection(canvas: ArrangeCanvas | null | undefined): SelectionState {
    const objs = canvas?.getActiveObjects() ?? [];
    const locked = objs.filter(isLocked).length;
    return {
        count: objs.length,
        unlocked: objs.length - locked,
        locked,
        groups: ungroupable(objs).length,
    };
}

/** When each arrange command can run. One source for the header, the context menu and the keys. */
export const ARRANGE_RULES = {
    align: (s: SelectionState) => s.unlocked >= 1,
    distribute: (s: SelectionState) => s.unlocked >= 3,
    group: (s: SelectionState) => s.unlocked >= 2,
    ungroup: (s: SelectionState) => s.groups >= 1,
    lock: (s: SelectionState) => s.unlocked >= 1,
    unlock: (s: SelectionState) => s.locked >= 1,
};
