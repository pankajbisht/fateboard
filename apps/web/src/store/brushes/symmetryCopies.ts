/**
 * Symmetry copies (brush slice, Paint tools "Reflect selection", Copy spray): a clone of an object placed by a
 * matrix (lib/canvas/symmetry.ts). Works for every object type (paths, stamp strokes, shapes, groups): the
 * matrix is composed with the object's own transform, and a mirror's negative scale becomes a flip so W / H
 * stay positive in the UI. Options: readable text (a mirrored text copy is flipped back so it reads normally)
 * and per-copy variation (hue, fade, shrink, seeded wobble; lib/canvas/symmetryVariation.ts).
 */
import * as fabric from 'fabric';
import { symmetryMatrices, type Matrix, type SymmetryMode } from '@/lib/canvas/symmetry';
import { isMirror, multiply, reflection } from '@/lib/canvas/symmetryMath';
import {
    hasVariation,
    turnHue,
    variationFor,
    type VariationSettings,
} from '@/lib/canvas/symmetryVariation';

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

export type CopyOptions = {
    /** 'readable' (default): mirrored text copies are flipped back about their own axis. */
    textMode?: 'readable' | 'mirror';
    variation?: VariationSettings | null;
};

const isText = (o: fabric.FabricObject) => o instanceof fabric.FabricText;

/** For readable text: mirror the copy back across its own vertical axis (net: no flip). */
function readableMatrix(obj: fabric.FabricObject, m: Matrix): Matrix {
    const c = obj.getCenterPoint();
    return multiply(m, reflection({ x: c.x, y: c.y }, (obj.angle ?? 0) + 90));
}

const shiftColor = (value: unknown, deg: number): unknown => {
    if (typeof value !== 'string' || !value || value === 'transparent') return value;
    try {
        const col = new fabric.Color(value);
        const [r, g, b, a] = col.getSource();
        const [nr, ng, nb] = turnHue(r, g, b, deg);
        return new fabric.Color([nr, ng, nb, a]).toRgba();
    } catch {
        return value;
    }
};

/** Applies copy k's variation in place (colours, opacity, size about its centre, wobble). */
function vary(copy: fabric.FabricObject, k: number, n: number, v: VariationSettings): void {
    const d = variationFor(k, n, v);
    if (d.hue)
        copy.set({
            fill: shiftColor(copy.fill, d.hue),
            stroke: shiftColor(copy.stroke, d.hue),
        } as never);
    if (d.opacity !== 1) copy.set({ opacity: (copy.opacity ?? 1) * d.opacity });
    const c = copy.getCenterPoint();
    if (d.scale !== 1 || d.turn) {
        const a = (d.turn * Math.PI) / 180;
        const s = d.scale;
        const m: Matrix = [
            s * Math.cos(a),
            s * Math.sin(a),
            -s * Math.sin(a),
            s * Math.cos(a),
            0,
            0,
        ];
        transformBy(copy, multiply(multiply([1, 0, 0, 1, c.x, c.y], m), [1, 0, 0, 1, -c.x, -c.y]));
    }
    if (d.dx || d.dy) {
        copy.set({ left: copy.left + d.dx, top: copy.top + d.dy });
        copy.setCoords();
    }
}

/** Copy `k` (1-based) of `n` of `obj`, placed by `m` (readable text, variation), not added. */
export async function copyAt(
    obj: fabric.FabricObject,
    m: Matrix,
    k: number,
    n: number,
    options: CopyOptions = {},
): Promise<fabric.FabricObject> {
    const copy = await obj.clone(CLONE_PROPS);
    const readable = options.textMode !== 'mirror' && isText(obj);
    transformBy(copy, readable && isMirror(m) ? readableMatrix(obj, m) : m);
    if (hasVariation(options.variation)) vary(copy, k, n, options.variation);
    return copy;
}

/** Clones of `obj`, one per matrix, not added to any canvas. */
export async function symmetryClones(
    obj: fabric.FabricObject,
    matrices: Matrix[],
    options: CopyOptions = {},
): Promise<fabric.FabricObject[]> {
    const out: fabric.FabricObject[] = [];
    for (const [i, m] of matrices.entries())
        out.push(await copyAt(obj, m, i + 1, matrices.length, options));
    return out;
}

/** What the Symmetry slice hands a stroke: the copies' matrices, how to make them, and hooks. */
export type CopyPlan = {
    matrices: Matrix[];
    options: CopyOptions;
    /** Curve axis (not affine): builds the one mirrored copy itself. */
    warp?: (obj: fabric.FabricObject) => Promise<fabric.FabricObject | null>;
    /** Called with the new copies before they are added (linking). */
    onCopies?: (source: fabric.FabricObject, copies: fabric.FabricObject[]) => void;
};

type DrawingSymmetry = {
    symmetry: SymmetryMode;
    symmetryCenter: { x: number; y: number } | null;
    symmetryAngle?: number;
    symmetryCount?: number;
    /** Symmetry slice: the full setup (source, newer modes, chain, curve) and copy options. */
    symmetryCopyPlan?: () => CopyPlan | null;
};

/** The copies of `source` for a plan (affine matrices, or the curve warp), linked when the plan says so. */
export async function copiesForPlan(
    source: fabric.FabricObject,
    plan: CopyPlan,
): Promise<fabric.FabricObject[]> {
    const copies = plan.warp
        ? [await plan.warp(source)].filter((c): c is fabric.FabricObject => !!c)
        : await symmetryClones(source, plan.matrices, plan.options);
    if (copies.length && !plan.warp) plan.onCopies?.(source, copies);
    return copies;
}

/** After a stroke: add its symmetry copies around the symmetry centre (`fallback` when none is set). */
export async function addSymmetryCopies(
    canvas: fabric.Canvas,
    stroke: fabric.FabricObject | undefined,
    s: DrawingSymmetry,
    fallback: { x: number; y: number },
): Promise<void> {
    if (!stroke || !s.symmetry || s.symmetry === 'none') return;
    const plan: CopyPlan = s.symmetryCopyPlan?.() ?? {
        matrices: symmetryMatrices(
            s.symmetry,
            s.symmetryCenter ?? fallback,
            s.symmetryAngle ?? 90,
            s.symmetryCount ?? 6,
        ),
        options: {},
    };
    const copies = await copiesForPlan(stroke, plan);
    if (!copies.length) return;
    if (stroke.canvas && stroke.canvas !== canvas) return; // the page changed while cloning
    const before = canvas.renderOnAddRemove;
    canvas.renderOnAddRemove = false;
    try {
        canvas.add(...copies);
    } finally {
        canvas.renderOnAddRemove = before;
    }
    canvas.requestRenderAll();
}
