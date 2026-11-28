/**
 * Fabric helpers for the symmetry tools: absolute clones (members of a selection), an object's outline as
 * scene points (paths are sampled along their length), rebuilding a stroke across a curve axis, and the
 * objects the analysis / tools work on (no helpers, no hidden or locked objects).
 */
import * as fabric from 'fabric';
import type { AnalysisItem } from '@/lib/canvas/symmetryAnalysis';
import {
    nearestOnPolyline,
    polylineData,
    reflectAcrossCurve,
    thin,
} from '@/lib/canvas/symmetryCurve';
import { reflection, type Matrix, type Pt } from '@/lib/canvas/symmetryMath';
import { CLONE_PROPS, transformBy } from '../../brushes/symmetryCopies';
import { isHelperObject } from '../paintTools/bucketFill';

type Obj = fabric.FabricObject & Record<string, unknown>;

/** A clone placed where `obj` is on the board (also for members of an ActiveSelection). */
export async function absoluteClone(obj: fabric.FabricObject): Promise<fabric.FabricObject> {
    const copy = await obj.clone(CLONE_PROPS);
    if (obj.group) {
        fabric.util.applyTransformToObject(copy, obj.calcTransformMatrix());
        copy.setCoords();
    }
    return copy;
}

/** Objects the symmetry tools act on: visible, unlocked, not helpers. */
export function workObjects(canvas: fabric.Canvas): fabric.FabricObject[] {
    return canvas.getObjects().filter((o) => {
        const r = o as Obj;
        return !isHelperObject(r) && o.visible !== false && !r.locked && !r._locked;
    });
}

/** Ids for objects that have none (saved prop `id`). Returns the id. */
export function ensureObjectId(obj: fabric.FabricObject): string {
    const r = obj as Obj;
    if (typeof r.id !== 'string' || !r.id) r.id = `obj-${Math.random().toString(36).slice(2, 10)}`;
    return r.id as string;
}

export function analysisItem(obj: fabric.FabricObject): AnalysisItem {
    const c = obj.getCenterPoint();
    return {
        id: ensureObjectId(obj),
        cx: c.x,
        cy: c.y,
        w: obj.getScaledWidth(),
        h: obj.getScaledHeight(),
        kind: obj.type,
    };
}

/** Local points of a path-like object (path / polyline / line), before its own transform. */
function localPoints(obj: fabric.FabricObject, step: number): Pt[] | null {
    if (obj instanceof fabric.Path) {
        const info = fabric.util.getPathSegmentsInfo(obj.path);
        const total = info[info.length - 1]?.length ?? 0;
        const n = Math.max(2, Math.min(4000, Math.ceil(total / step)));
        const pts: Pt[] = [];
        for (let i = 0; i <= n; i++) {
            const p = fabric.util.getPointOnPath(obj.path, (total * i) / n, info);
            if (p) pts.push({ x: p.x - obj.pathOffset.x, y: p.y - obj.pathOffset.y });
        }
        return pts;
    }
    if (obj instanceof fabric.Polyline)
        return obj.points.map((p) => ({ x: p.x - obj.pathOffset.x, y: p.y - obj.pathOffset.y }));
    if (obj instanceof fabric.Line) {
        const l = obj.calcLinePoints();
        return [
            { x: l.x1, y: l.y1 },
            { x: l.x2, y: l.y2 },
        ];
    }
    return null;
}

/** The object's outline as scene points: sampled paths, else its box edges. */
export function sceneOutline(obj: fabric.FabricObject, step = 6): Pt[] {
    const m = obj.calcTransformMatrix();
    const local = localPoints(obj, step);
    if (local) return local.map((p) => fabric.util.transformPoint(new fabric.Point(p.x, p.y), m));
    const w = obj.width / 2;
    const h = obj.height / 2;
    const box: Pt[] = [];
    for (let t = 0; t <= 1; t += 0.125)
        box.push(
            { x: -w + 2 * w * t, y: -h },
            { x: w, y: -h + 2 * h * t },
            { x: w - 2 * w * t, y: h },
            { x: -w, y: h - 2 * h * t },
        );
    return box.map((p) => fabric.util.transformPoint(new fabric.Point(p.x, p.y), m));
}

/** A path-like object as a curve axis (scene polyline), or null. */
export function curvePolyline(obj: fabric.FabricObject | null | undefined): Pt[] | null {
    if (!obj || !localPoints(obj, 4)) return null;
    return thin(sceneOutline(obj, 4), 2);
}

/** Copy of `obj` mirrored across the curve: strokes re-built point by point, others mirrored locally. */
export async function warpAcrossCurve(
    obj: fabric.FabricObject,
    poly: Pt[],
): Promise<fabric.FabricObject | null> {
    const hit = nearestOnPolyline(obj.getCenterPoint(), poly);
    if (!hit) return null;
    if (obj instanceof fabric.Path || obj instanceof fabric.Polyline) {
        const pts = thin(
            sceneOutline(obj, 2).map((p) => reflectAcrossCurve(p, poly)),
            1,
        );
        const copy = new fabric.Path(polylineData(pts), {
            originX: 'left',
            originY: 'top',
            fill: (obj as unknown as Obj).isFreehand === true ? null : obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            strokeLineCap: obj.strokeLineCap,
            strokeLineJoin: obj.strokeLineJoin,
            strokeDashArray: obj.strokeDashArray,
            opacity: obj.opacity,
            globalCompositeOperation: obj.globalCompositeOperation,
            shadow: obj.shadow,
            strokeUniform: obj.strokeUniform,
        });
        for (const key of CLONE_PROPS) (copy as unknown as Obj)[key] = (obj as unknown as Obj)[key];
        copy.setCoords();
        return copy;
    }
    const copy = await obj.clone(CLONE_PROPS);
    const m: Matrix = reflection(hit.q, hit.angle);
    transformBy(copy, m);
    return copy;
}
