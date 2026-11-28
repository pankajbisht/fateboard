/**
 * Linked symmetry copies: each copy keeps `symmetryLink` (saved, CUSTOM_PROPS) = its source's id, its matrix,
 * its place k of n and how it was made (readable text, variation). Editing the source (move, scale, turn, node
 * edit, text) rebuilds its copies; moving / scaling / turning a copy moves the source the matching way (so
 * every copy follows). A copy whose shape or style is edited directly mirrors that change back to the source when
 * it can (no variation), else it stands on its own. Break link / bake / merge into one group are actions.
 * Rebuilds run one at a time per source (async clones) and never while undo / redo or a page switch loads.
 */
import * as fabric from 'fabric';
import type { Matrix, Pt } from '@/lib/canvas/symmetryMath';
import { multiply } from '@/lib/canvas/symmetryMath';
import { hasVariation, type VariationSettings } from '@/lib/canvas/symmetryVariation';
import { copyAt, transformBy, type CopyOptions } from '../../brushes/symmetryCopies';
import { absoluteClone, ensureObjectId } from './symmetryObjects';

export const LINK = 'symmetryLink';

export type SymmetryLink = {
    src: string;
    m: Matrix;
    k: number;
    n: number;
    text?: 'readable' | 'mirror';
    v?: VariationSettings | null;
    c: Pt;
};

type Obj = fabric.FabricObject & Record<string, unknown>;

const isMatrix = (m: unknown): m is Matrix =>
    Array.isArray(m) &&
    m.length === 6 &&
    m.every((v) => typeof v === 'number' && Number.isFinite(v));

export function linkOf(obj: fabric.FabricObject | null | undefined): SymmetryLink | null {
    const l = (obj as Obj | null | undefined)?.[LINK] as Partial<SymmetryLink> | undefined;
    if (!l || typeof l.src !== 'string' || !isMatrix(l.m)) return null;
    return {
        src: l.src,
        m: l.m,
        k: Number(l.k) || 1,
        n: Number(l.n) || 1,
        text: l.text === 'mirror' ? 'mirror' : 'readable',
        v: l.v ?? null,
        c: l.c && Number.isFinite(l.c.x) ? l.c : { x: 0, y: 0 },
    };
}

const optionsOf = (l: SymmetryLink): CopyOptions => ({ textMode: l.text, variation: l.v });

/** Marks fresh copies of `source` as linked to it. */
export function linkCopies(
    source: fabric.FabricObject,
    copies: fabric.FabricObject[],
    matrices: Matrix[],
    options: CopyOptions,
    center: Pt,
): void {
    const src = ensureObjectId(source);
    copies.forEach((copy, i) => {
        const link: SymmetryLink = {
            src,
            m: matrices[i],
            k: i + 1,
            n: matrices.length,
            text: options.textMode ?? 'readable',
            v: hasVariation(options.variation) ? { ...options.variation } : null,
            c: { ...center },
        };
        (copy as Obj)[LINK] = link;
    });
}

export const sourceId = (obj: fabric.FabricObject) => {
    const id = (obj as Obj).id;
    return typeof id === 'string' ? id : null;
};

/** The linked copies of a source on the canvas. */
export function copiesOf(canvas: fabric.Canvas, src: string): fabric.FabricObject[] {
    return canvas.getObjects().filter((o) => linkOf(o)?.src === src);
}

export const findById = (canvas: fabric.Canvas, id: string) =>
    canvas.getObjects().find((o) => (o as Obj).id === id) ?? null;

const invert = (m: Matrix): Matrix => fabric.util.invertTransform(m) as Matrix;

/** Rebuilds every linked copy of `source` in place (same stacking, same layer). */
export async function rebuildCopies(
    canvas: fabric.Canvas,
    source: fabric.FabricObject,
): Promise<number> {
    const src = sourceId(source);
    if (!src) return 0;
    const olds = copiesOf(canvas, src);
    if (!olds.length) return 0;
    const base = await absoluteClone(source);
    const fresh = await Promise.all(
        olds.map((old) => {
            const l = linkOf(old)!;
            return copyAt(base, l.m, l.k, l.n, optionsOf(l));
        }),
    );
    if (!canvas.getObjects().includes(source)) return 0; // removed (or the page changed) meanwhile
    const active = canvas.getActiveObjects();
    if (olds.some((o) => active.includes(o))) canvas.discardActiveObject();
    const before = canvas.renderOnAddRemove;
    canvas.renderOnAddRemove = false;
    try {
        olds.forEach((old, i) => {
            const at = canvas.getObjects().indexOf(old);
            if (at < 0) return;
            const next = fresh[i] as Obj;
            next[LINK] = (old as Obj)[LINK];
            for (const key of ['layerId', 'name', 'id'])
                if ((old as Obj)[key] !== undefined) next[key] = (old as Obj)[key];
            canvas.remove(old);
            canvas.insertAt(at, next);
        });
    } finally {
        canvas.renderOnAddRemove = before;
    }
    canvas.requestRenderAll();
    return olds.length;
}

/** The matrix `obj` had before the current transform (from Fabric's `transform.original`). */
export function previousMatrix(
    obj: fabric.FabricObject,
    original: Record<string, unknown> | undefined,
): Matrix | null {
    if (!original) return null;
    const keys = [
        'left',
        'top',
        'scaleX',
        'scaleY',
        'angle',
        'skewX',
        'skewY',
        'flipX',
        'flipY',
    ] as const;
    const now: Record<string, unknown> = {};
    for (const k of keys) now[k] = obj[k];
    obj.set(Object.fromEntries(keys.filter((k) => k in original).map((k) => [k, original[k]])));
    const m = obj.calcTransformMatrix() as Matrix;
    obj.set(now);
    obj.setCoords();
    return m;
}

/**
 * A linked copy was edited. Transform only (`before` known): the source takes the same change seen through
 * the copy's matrix (M⁻¹ · D · M). Otherwise its shape / style goes back to the source when nothing varies per
 * copy; with variation the copy is unlinked. Returns the source to rebuild, or null.
 */
export async function copyEdited(
    canvas: fabric.Canvas,
    copy: fabric.FabricObject,
    before: Matrix | null,
): Promise<fabric.FabricObject | null> {
    const l = linkOf(copy);
    const source = l ? findById(canvas, l.src) : null;
    if (!l || !source) return null;
    if (before) {
        const d = multiply(copy.calcTransformMatrix() as Matrix, invert(before));
        const ds = multiply(multiply(invert(l.m), d), l.m);
        fabric.util.applyTransformToObject(
            source,
            multiply(ds, source.calcTransformMatrix() as Matrix),
        );
        source.setCoords();
        return source;
    }
    if (hasVariation(l.v) || (l.text === 'readable' && copy instanceof fabric.FabricText)) {
        delete (copy as Obj)[LINK];
        return null;
    }
    const next = (await absoluteClone(copy)) as Obj;
    transformBy(next, invert(l.m));
    next.id = (source as Obj).id;
    for (const key of ['layerId', 'name', LINK])
        if ((source as Obj)[key] !== undefined) next[key] = (source as Obj)[key];
    const at = canvas.getObjects().indexOf(source);
    if (at < 0) return null;
    canvas.remove(source);
    canvas.insertAt(at, next);
    return next;
}

/** Break the link of these copies (and of every copy of these sources). Returns how many. */
export function unlink(canvas: fabric.Canvas, objects: fabric.FabricObject[]): number {
    const srcs = new Set(objects.map(sourceId).filter((x): x is string => !!x));
    let n = 0;
    for (const o of canvas.getObjects()) {
        const l = linkOf(o);
        if (l && (objects.includes(o) || srcs.has(l.src))) {
            delete (o as Obj)[LINK];
            n++;
        }
    }
    return n;
}

/** The source + linked copies of what is selected (whole families). */
export function familiesOf(
    canvas: fabric.Canvas,
    objects: fabric.FabricObject[],
): fabric.FabricObject[] {
    const srcs = new Set<string>();
    for (const o of objects) {
        const l = linkOf(o);
        if (l) srcs.add(l.src);
        const id = sourceId(o);
        if (id && copiesOf(canvas, id).length) srcs.add(id);
    }
    return canvas.getObjects().filter((o) => {
        const id = sourceId(o);
        return (id && srcs.has(id)) || srcs.has(linkOf(o)?.src ?? '');
    });
}

/** Merges whole families into one group named "Symmetry" (links removed). Returns the group or null. */
export async function mergeFamilies(
    canvas: fabric.Canvas,
    objects: fabric.FabricObject[],
): Promise<fabric.Group | null> {
    const members = familiesOf(canvas, objects);
    if (members.length < 2) return null;
    canvas.discardActiveObject();
    const at = Math.min(...members.map((o) => canvas.getObjects().indexOf(o)));
    for (const o of members) delete (o as Obj)[LINK];
    const before = canvas.renderOnAddRemove;
    canvas.renderOnAddRemove = false;
    try {
        canvas.remove(...members);
        const group = new fabric.Group(members, { originX: 'left', originY: 'top' });
        (group as unknown as Obj).name = 'Symmetry';
        canvas.insertAt(Math.max(0, at), group);
        canvas.setActiveObject(group);
        return group;
    } finally {
        canvas.renderOnAddRemove = before;
        canvas.requestRenderAll();
    }
}
