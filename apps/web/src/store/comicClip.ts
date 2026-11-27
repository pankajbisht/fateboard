import { Point, Polygon, Rect, util, type FabricObject } from 'fabric';
import { frameClip } from '@/lib/canvas/frameGroup';
import { panelClipPolygon, type Mat } from '@/lib/comic/panelClip';

/**
 * A scene or picture in a comic panel is cut to THAT panel (2026-11-27, owner review): the Art layer cuts content to
 * all panels together, so a filled scene showed in its neighbours. The object carries the panel's `panelId`
 * (CUSTOM_PROPS) and a `clipPath` of the panel's outline in its own plane (lib/comic/panelClip), redone while it is
 * dragged, scaled or rotated, so it can be adjusted inside its panel. Also the panel lock: frames stay selectable (to
 * fill or split them) but do not move, scale or turn. Called by the comic slice and comicBind.ts only.
 */
type Obj = FabricObject & Record<string, unknown>;

/** A frame's corners on the page (its geometry; the stroke is drawn over the edge). */
function corners(frame: FabricObject) {
    const m = frame.calcTransformMatrix();
    const w = (frame.width ?? 0) / 2;
    const h = (frame.height ?? 0) / 2;
    return [
        [-w, -h],
        [w, -h],
        [w, h],
        [-w, h],
    ].map(([x, y]) => util.transformPoint(new Point(x, y), m));
}

/** A scene or character group's own frame (a fixed-size group clipped to it, lib/canvas/frameGroup), if any. */
function ownFrame(o: Obj) {
    return o.sceneData || o.characterData ? { width: o.width ?? 0, height: o.height ?? 0 } : null;
}

/** Content bound to a panel (not a frame or a panel area). */
export const isInPanel = (o: FabricObject): boolean => {
    const x = o as Obj;
    return typeof x.panelId === 'string' && !x.comicPanel && !x.comicPanelArea;
};

/** Bind `o` to `frame` and cut it to the frame (and its own frame); nothing shows when they do not meet. */
export function clipToPanel(obj: FabricObject, frame: FabricObject) {
    const o = obj as Obj;
    o.panelId = (frame as Obj).panelId;
    const toLocal = util.invertTransform(o.calcTransformMatrix()) as Mat;
    const pts = panelClipPolygon(corners(frame), toLocal, ownFrame(o));
    o.clipPath = pts
        ? new Polygon(pts, { originX: 'center', originY: 'center', strokeWidth: 0 })
        : new Rect({ width: 0, height: 0, originX: 'center', originY: 'center' });
    o.set({ dirty: true });
}

/** Out of its panel: no panel, and only its own frame cuts it. */
export function releaseFromPanel(obj: FabricObject) {
    const o = obj as Obj;
    delete o.panelId;
    const f = ownFrame(o);
    o.clipPath = f ? frameClip(f.width, f.height) : undefined;
    o.set({ dirty: true });
}

/** Redo the cut of bound content after it (or its panel) moved; released when its panel is gone. */
export function reclip(obj: FabricObject, frames: FabricObject[]) {
    const frame = frames.find((f) => (f as Obj).panelId === (obj as Obj).panelId);
    if (frame) clipToPanel(obj, frame);
    else releaseFromPanel(obj);
}

/** The frame whose box holds `p` (page coordinates), if any. */
export function frameAt(frames: FabricObject[], p: Point): FabricObject | undefined {
    return frames.find((f) => {
        const local = util.transformPoint(p, util.invertTransform(f.calcTransformMatrix()));
        return Math.abs(local.x) <= (f.width ?? 0) / 2 && Math.abs(local.y) <= (f.height ?? 0) / 2;
    });
}

/**
 * Lock or unlock a frame: still selectable, but no move / scale / turn handles. Locked, only its border line is hit
 * (per pixel): the frames lie on top, so a click inside a panel took the frame and the scene under it could not be
 * dragged. Unlocked (editing the layout), a click anywhere in the panel takes the frame.
 */
export function lockFrame(frame: FabricObject, locked: boolean) {
    frame.set({
        perPixelTargetFind: locked,
        lockMovementX: locked,
        lockMovementY: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        lockRotation: locked,
        lockSkewingX: locked,
        lockSkewingY: locked,
        hasControls: !locked,
    });
}
