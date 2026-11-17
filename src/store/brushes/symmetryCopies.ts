/**
 * Symmetry copies (brush slice, Paint tools "Reflect selection"): a clone of an object placed by a symmetry
 * matrix (lib/canvas/symmetry.ts). Works for every object type (paths, stamp strokes, shapes, groups): the
 * matrix is composed with the object's own transform, and a mirror's negative scale becomes a flip so W / H
 * stay positive in the UI.
 */
import * as fabric from 'fabric';
import { symmetryMatrices, type Matrix, type SymmetryMode } from '@/lib/canvas/symmetry';

/** Props a copy keeps that `clone()` would drop (also Copy spray's snapshot, paintTools/copySprayTool). */
export const CLONE_PROPS = [
    'perPixelTargetFind',
    'targetFindTolerance',
    'isFreehand',
    'name',
    'layerBlur',
];

/** Moves / turns / mirrors `obj` (in place) by `m`, in scene coordinates. */
export function transformBy(obj: fabric.FabricObject, m: Matrix): void {
    const next = fabric.util.multiplyTransformMatrices(m, obj.calcTransformMatrix());
    fabric.util.applyTransformToObject(obj, next);
    if (obj.scaleX < 0) obj.set({ scaleX: -obj.scaleX, flipX: !obj.flipX });
    if (obj.scaleY < 0) obj.set({ scaleY: -obj.scaleY, flipY: !obj.flipY });
    obj.setCoords();
}

/** Clones of `obj`, one per matrix, not added to any canvas. */
export async function symmetryClones(
    obj: fabric.FabricObject,
    matrices: Matrix[],
): Promise<fabric.FabricObject[]> {
    const out: fabric.FabricObject[] = [];
    for (const m of matrices) {
        const copy = await obj.clone(CLONE_PROPS);
        transformBy(copy, m);
        out.push(copy);
    }
    return out;
}

type DrawingSymmetry = {
    symmetry: SymmetryMode;
    symmetryCenter: { x: number; y: number } | null;
    symmetryAngle?: number;
    symmetryCount?: number;
};

/** After a stroke: add its symmetry copies around the symmetry centre (`fallback` when none is set). */
export async function addSymmetryCopies(
    canvas: fabric.Canvas,
    stroke: fabric.FabricObject | undefined,
    s: DrawingSymmetry,
    fallback: { x: number; y: number },
): Promise<void> {
    if (!stroke || !s.symmetry || s.symmetry === 'none') return;
    const c = s.symmetryCenter ?? fallback;
    const copies = await symmetryClones(
        stroke,
        symmetryMatrices(s.symmetry, c, s.symmetryAngle ?? 90, s.symmetryCount ?? 6),
    );
    if (!copies.length) return;
    canvas.add(...copies);
    canvas.requestRenderAll();
}
