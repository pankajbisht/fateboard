/**
 * Linked clones (Affinity "symbols" / Inkscape clones): objects that share a `linkId` share their
 * LOOK and SHAPE (fill, stroke, opacity, shadow, size, path / points, text, image filters, a group's
 * parts); each keeps its OWN place (position, rotation, flip, skew). Editing any of them updates
 * the others.
 *
 * The link is a saved property (`linkId`, in CUSTOM_PROPS), not a memory reference, so it survives
 * undo / redo, page switches, project files and reload.
 */
import * as fabric from 'fabric';

export const LINK_PROP = 'linkId';

/** Look: always shared. */
const LOOK = [
    'fill',
    'stroke',
    'strokeWidth',
    'strokeDashArray',
    'strokeDashOffset',
    'strokeLineCap',
    'strokeLineJoin',
    'strokeMiterLimit',
    'strokeUniform',
    'paintFirst',
    'fillRule',
    'opacity',
    'shadow',
    'globalCompositeOperation',
    'backgroundColor',
] as const;

/** Shape and size. */
const SHAPE = [
    'scaleX',
    'scaleY',
    'width',
    'height',
    'rx',
    'ry',
    'radius',
    'startAngle',
    'endAngle',
    'points',
    'path',
    'pathOffset',
    'x1',
    'y1',
    'x2',
    'y2',
] as const;

/** Text content and type settings. */
const TEXT = [
    'text',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'underline',
    'overline',
    'linethrough',
    'textAlign',
    'lineHeight',
    'charSpacing',
    'styles',
    'textBackgroundColor',
    'direction',
    'splitByGrapheme',
    'textInset',
    'filterState',
] as const;

/** A part's place INSIDE a group belongs to the shape, so it is shared too. */
const PLACE = [
    'left',
    'top',
    'angle',
    'flipX',
    'flipY',
    'skewX',
    'skewY',
    'originX',
    'originY',
] as const;

type Obj = fabric.FabricObject;

const read = (o: Obj, k: string): unknown => (o as unknown as Record<string, unknown>)[k];
const linkOf = (o: Obj | null | undefined) =>
    o ? (read(o, LINK_PROP) as string | undefined) : undefined;

/** Deep copy for plain data (arrays, path commands, styles); Fabric instances get their own copy. */
function copyValue(v: unknown): unknown {
    if (v instanceof fabric.Shadow) return new fabric.Shadow(v.toObject());
    if (v instanceof fabric.Point) return new fabric.Point(v.x, v.y);
    if (v && typeof v === 'object') return JSON.parse(JSON.stringify(v));
    return v;
}

const same = (a: unknown, b: unknown) => {
    if (a === b) return true;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
};

/** Copies `keys` from `src` to `dst` where they differ. Returns true when something changed. */
function copyProps(src: Obj, dst: Obj, keys: readonly string[]): boolean {
    let changed = false;
    for (const k of keys) {
        const v = read(src, k);
        if (v === undefined || same(v, read(dst, k))) continue;
        dst.set(k as keyof Obj, copyValue(v) as never);
        changed = true;
    }
    return changed;
}

const isGroupLike = (o: Obj): o is fabric.Group => o instanceof fabric.Group;

/** Same kind of object, and for groups the same parts in the same order. */
export function sameStructure(a: Obj, b: Obj): boolean {
    if (a.constructor !== b.constructor) return false;
    if (!isGroupLike(a) || !isGroupLike(b)) return true;
    const pa = a.getObjects();
    const pb = b.getObjects();
    return pa.length === pb.length && pa.every((p, i) => sameStructure(p, pb[i]!));
}

/** Image filters: copied as new instances, re-applied only when they differ. */
function syncFilters(src: Obj, dst: Obj): boolean {
    if (!(src instanceof fabric.FabricImage) || !(dst instanceof fabric.FabricImage)) return false;
    const describe = (img: fabric.FabricImage) =>
        JSON.stringify((img.filters ?? []).map((f) => f.toObject()));
    if (describe(src) === describe(dst)) return false;
    dst.filters = (src.filters ?? []).map((f) => {
        const Filter = f.constructor as new (options: object) => typeof f;
        return new Filter(JSON.parse(JSON.stringify(f.toObject())));
    });
    dst.applyFilters();
    return true;
}

/** Look + shape (+ for parts of a group: their place in the group). */
function syncObject(src: Obj, dst: Obj, isPart: boolean): boolean {
    let changed = copyProps(src, dst, LOOK);
    changed = copyProps(src, dst, SHAPE) || changed;
    changed = copyProps(src, dst, TEXT) || changed;
    if (isPart) changed = copyProps(src, dst, PLACE) || changed;
    changed = syncFilters(src, dst) || changed;

    if (isGroupLike(src) && isGroupLike(dst)) {
        const parts = dst.getObjects();
        src.getObjects().forEach((p, i) => {
            if (syncObject(p, parts[i]!, true)) changed = true;
        });
        if (changed) dst.triggerLayout?.();
    }
    if (changed) {
        (dst as unknown as { initDimensions?: () => void }).initDimensions?.(); // text re-wraps
        dst.set('dirty', true);
        dst.setCoords();
    }
    return changed;
}

/** Every top-level object on the canvas in the link of `obj` (excluding `obj`). */
export function linkedWith(canvas: { getObjects: () => Obj[] }, obj: Obj): Obj[] {
    const id = linkOf(obj);
    if (!id) return [];
    return canvas.getObjects().filter((o) => o !== obj && linkOf(o) === id);
}

/**
 * Makes every object linked with `source` look like it. Same kind: props are copied in place
 * (synchronous). A different kind (e.g. the node tool turned the rect into a path): the copy is
 * replaced by a clone of `source` at the copy's own place and layer; `onReplaced` runs afterwards
 * (the caller records it in history).
 */
export function syncLinked(
    canvas: {
        getObjects: () => Obj[];
        insertAt: (index: number, ...objects: Obj[]) => unknown;
        remove: (...objects: Obj[]) => unknown;
        requestRenderAll: () => void;
    },
    source: Obj,
    cloneProps: string[],
    onReplaced?: () => void,
): boolean {
    let changed = false;
    const replacements: Promise<void>[] = [];

    for (const member of linkedWith(canvas, source)) {
        if (sameStructure(source, member)) {
            if (syncObject(source, member, false)) changed = true;
            continue;
        }
        replacements.push(
            source.clone(cloneProps).then((copy: Obj) => {
                const index = canvas.getObjects().indexOf(member);
                if (index === -1) return; // removed meanwhile
                const own = (k: string) => read(member, k);
                copy.set({
                    angle: own('angle'),
                    flipX: own('flipX'),
                    flipY: own('flipY'),
                    skewX: own('skewX'),
                    skewY: own('skewY'),
                } as Partial<Obj>);
                for (const k of [
                    'id',
                    'name',
                    '_locked',
                    'selectable',
                    'evented',
                    'lockMovementX',
                    'lockMovementY',
                ])
                    if (own(k) !== undefined) copy.set(k as keyof Obj, own(k) as never);
                copy.setPositionByOrigin(member.getCenterPoint(), 'center', 'center');
                copy.setCoords();
                canvas.remove(member);
                canvas.insertAt(index, copy);
            }),
        );
    }

    if (changed) canvas.requestRenderAll();
    if (replacements.length) {
        void Promise.all(replacements).then(() => {
            canvas.requestRenderAll();
            onReplaced?.();
        });
    }
    return changed || replacements.length > 0;
}

/** Objects can be linked when they are the same kind (and groups have the same parts). */
export function canLink(objects: Obj[]): boolean {
    return objects.length > 1 && objects.every((o) => sameStructure(objects[0]!, o));
}

export const newLinkId = () =>
    `link_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
