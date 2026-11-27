import * as fabric from 'fabric';

/**
 * A drawing framed like a camera shot (a scene, or a character's close-up / bust): a group exactly the size of the
 * frame, with a fixed layout (it never refits to its children) and a clip of the frame's size, so what lies past the
 * frame (a close-up's body, a set beyond the shot) is not on the page. The loaded SVG shapes sit in 0..w × 0..h.
 * Moved here from scene/board.ts (2026-11-27) so the character board uses it too: a character group fitted to its
 * shapes put the whole figure on the page for a close-up.
 */
export function frameGroup(objects: fabric.FabricObject[], w: number, h: number): fabric.Group {
    const group = new fabric.Group(objects, {
        originX: 'center',
        originY: 'center',
        layoutManager: new fabric.LayoutManager(new fabric.FixedLayout()),
        width: w,
        height: h,
    });
    const c = group.getCenterPoint();
    const dx = c.x - w / 2;
    const dy = c.y - h / 2;
    for (const o of group.getObjects()) {
        o.set({ left: o.left + dx, top: o.top + dy });
        o.setCoords();
    }
    group.clipPath = frameClip(w, h);
    group.set({ width: w, height: h, dirty: true });
    group.setCoords();
    return group;
}

/** The frame's clip, in the group's own plane (centre 0, 0). */
export const frameClip = (w: number, h: number) =>
    new fabric.Rect({ width: w, height: h, originX: 'center', originY: 'center', left: 0, top: 0 });

/**
 * "Update on page": the fresh drawing goes into the SAME group (id, animation, notes, locks stay). The fresh group
 * first takes the target's transform; leaving it puts each shape in page coordinates and joining the target turns
 * them back into the same frame-relative place. The target becomes a fixed frame of the fresh size (a group placed
 * before frames, fitted to its shapes, would refit to the whole drawing again).
 */
export function swapFrameDrawing(target: fabric.Group, fresh: fabric.Group) {
    fresh.set({
        originX: target.originX,
        originY: target.originY,
        left: target.left,
        top: target.top,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        angle: target.angle,
        flipX: target.flipX,
        flipY: target.flipY,
        skewX: target.skewX,
        skewY: target.skewY,
    });
    fresh.setCoords();
    if (!(target.layoutManager?.strategy instanceof fabric.FixedLayout))
        target.layoutManager = new fabric.LayoutManager(new fabric.FixedLayout());
    const kids = [...fresh.getObjects()];
    fresh.remove(...kids);
    target.remove(...target.getObjects());
    target.add(...kids);
    target.set({ width: fresh.width, height: fresh.height });
    target.clipPath = frameClip(fresh.width, fresh.height);
    target.set({ dirty: true });
    target.setCoords();
}
