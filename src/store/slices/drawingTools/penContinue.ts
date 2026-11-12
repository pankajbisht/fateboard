/**
 * Pen: continue an existing open path. Clicking one of its ends with the Pen loads its anchors (in
 * scene space) so the user keeps drawing it; on finish the SAME object gets the new geometry (keeps
 * its id, style, z-order and custom props) and one `object:modified` = one undo step + autosave.
 */
import * as fabric from 'fabric';
import { pathToPenNodes, reversePenNodes, type PenNode, type PenPoint } from '@/lib/canvas/penPath';
import { distance } from './shared';

type Cmd = (string | number)[];

/** The anchors of an unlocked open path whose end (or start, reversed) is within `radius` of `p`. */
export function findContinuable(
    canvas: fabric.Canvas,
    p: PenPoint,
    radius: number,
): { target: fabric.Path; nodes: PenNode[] } | null {
    const objects = canvas.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i] as fabric.Object & { excludeFromExport?: boolean };
        if (!(o instanceof fabric.Path) || o.excludeFromExport || !o.visible) continue;
        if (o.selectable === false || o.lockMovementX) continue; // locked
        const m = o.calcTransformMatrix();
        const nodes = pathToPenNodes(o.path as unknown as Cmd[], (q) => {
            const s = new fabric.Point(q.x - o.pathOffset.x, q.y - o.pathOffset.y).transform(m);
            return { x: s.x, y: s.y };
        });
        if (!nodes) continue;
        if (distance(p, nodes[nodes.length - 1]) <= radius) return { target: o, nodes };
        if (distance(p, nodes[0]) <= radius) return { target: o, nodes: reversePenNodes(nodes) };
    }
    return null;
}

/** Gives `target` the scene-space path `d` (its transform is reset: the points already include it). */
export function replacePathGeometry(
    canvas: fabric.Canvas,
    target: fabric.Path,
    d: string,
    extra: Partial<fabric.Path> = {},
) {
    const geo = new fabric.Path(d, { originX: 'left', originY: 'top' });
    Object.assign(target, { path: geo.path });
    target.set({
        width: geo.width,
        height: geo.height,
        pathOffset: new fabric.Point(geo.pathOffset.x, geo.pathOffset.y),
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        ...extra,
    });
    target.setPositionByOrigin(geo.getCenterPoint(), 'center', 'center');
    target.dirty = true;
    target.setCoords();
    canvas.fire('object:modified', { target }); // one history step + autosave
}
