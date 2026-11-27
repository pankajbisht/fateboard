import { Point, util, type FabricObject } from 'fabric';
import { bestPanel, fitInto, type FitMode } from '@/lib/comic/fitToPanel';
import { isLayerHelper } from '@/lib/canvas/docLayers';
import type { Rect as Box } from '@/lib/document/pageSetup';

/**
 * The Fabric side of putting a picture or a scene into a comic panel (docs/CANVAS.md, comic panels): the geometry is
 * `lib/comic/fitToPanel`; this reads and sets the objects. Called by the comic slice's actions only.
 */

/** A frame's box on the page (its own size and position; rotation is ignored). */
export function boxOf(o: FabricObject): Box {
    const d = util.qrDecompose(o.calcTransformMatrix());
    const width = (o.width ?? 0) * Math.abs(d.scaleX);
    const height = (o.height ?? 0) * Math.abs(d.scaleY);
    return { left: d.translateX - width / 2, top: d.translateY - height / 2, width, height };
}

/**
 * Scale `obj` to `mode` and centre it on its panel: `panel` when given, else the panel it overlaps most. Turns it
 * upright (a rotated picture would not fill a rectangle). Returns that panel, or null when there is none.
 */
export function fitObjectToPanel(
    obj: FabricObject,
    panels: FabricObject[],
    mode: FitMode,
    panel?: FabricObject,
): FabricObject | null {
    const target = panel ?? panels[bestPanel(boxOf(obj), panels.map(boxOf))];
    if (!target) return null;
    const { scale, cx, cy } = fitInto(
        { width: obj.width ?? 0, height: obj.height ?? 0 },
        boxOf(target),
        mode,
    );
    obj.set({ angle: 0, skewX: 0, skewY: 0, scaleX: scale, scaleY: scale });
    obj.setPositionByOrigin(new Point(cx, cy), 'center', 'center');
    obj.setCoords();
    return target;
}

/** Zoom `obj` by `factor` about its own centre (a picture in a panel: look closer or further out). */
export function zoomObject(obj: FabricObject, factor: number) {
    const centre = obj.getCenterPoint();
    const next = Math.min(80, Math.max(0.02, (obj.scaleX ?? 1) * factor));
    obj.set({ scaleX: next, scaleY: next });
    obj.setPositionByOrigin(centre, 'center', 'center');
    obj.setCoords();
}

/** A scene or picture that can sit in a panel: not a frame, a panel area or a helper. */
export const pickable = (o?: FabricObject | null): o is FabricObject => {
    const x = o as (FabricObject & Record<string, unknown>) | null | undefined;
    return !!x && !x.comicPanel && !x.comicPanelArea && !isLayerHelper(x);
};
