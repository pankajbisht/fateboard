import * as fabric from 'fabric';
import { readProps, type FullProps } from './engine';

/** Rest props of an object in canvas coordinates, also inside a multi-selection (BUG-142). */
export function absoluteProps(obj: fabric.FabricObject): FullProps {
    const live = readProps(obj);
    if (!obj.group) return live;
    // children of an ActiveSelection hold group-relative values: decompose the full matrix onto a
    // stand-in with the same box so left / top follow the object's own origin
    const ghost = new fabric.Rect({
        width: obj.width,
        height: obj.height,
        strokeWidth: obj.strokeWidth,
        strokeUniform: obj.strokeUniform,
        originX: obj.originX,
        originY: obj.originY,
    });
    fabric.util.applyTransformToObject(ghost, obj.calcTransformMatrix());
    const abs = readProps(ghost);
    return { ...live, ...abs, fill: live.fill, stroke: live.stroke, opacity: live.opacity };
}
