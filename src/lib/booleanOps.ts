/**
 * Boolean operations on Fabric shapes, computed with Paper.js.
 * Rules (Figma / Illustrator): the STACKING order decides (pass shapes bottom -> top), never the
 * order they were clicked. Results are new Fabric paths in canvas coordinates.
 *
 *  union      merge everything                         style: top shape
 *  subtract   bottom minus every shape above it          style: bottom shape
 *  intersect  area common to all                         style: top shape
 *  exclude    remove overlaps (even-odd)                 style: top shape
 *  divide     every region becomes its own shape         style: the top shape covering it
 *  crop       shapes below are trimmed to the top shape  style: each own (top shape dropped)
 */
import * as fabric from 'fabric';
import paper from 'paper';

/** The look a result keeps from its source shape. */
export function extractStyle(obj: fabric.FabricObject): Record<string, unknown> {
    return {
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        strokeDashArray: obj.strokeDashArray,
        strokeLineCap: obj.strokeLineCap,
        strokeLineJoin: obj.strokeLineJoin,
        opacity: obj.opacity,
    };
}

export type BooleanOp = 'union' | 'subtract' | 'intersect' | 'exclude' | 'divide' | 'crop';

type Item = paper.PathItem;
type Piece = { item: Item; style: Record<string, unknown> };

const MIN_AREA = 0.5; // px²: anything smaller is rounding noise

/** Unsigned area: islands of a compound path can wind opposite ways and cancel out. */
const absArea = (item: paper.Item): number =>
    item.children?.length
        ? item.children.reduce((sum, c) => sum + absArea(c), 0)
        : Math.abs((item as paper.Path).area ?? 0);

const isEmpty = (item: Item | null | undefined) =>
    !item || item.isEmpty() || absArea(item) < MIN_AREA;

/** One Paper path item for a Fabric object (groups / compound shapes are merged). */
function toItem(scope: paper.PaperScope, obj: fabric.FabricObject): Item | null {
    // ids are dropped: app objects have numeric ids and Paper rejects numeric item names
    // ("Names consisting only of numbers are not supported"), which made every operation fail
    const svg = obj.toSVG().replace(/\s(id|clip-path)="[^"]*"/g, '');
    const imported = scope.project.importSVG(svg, { expandShapes: true, insert: false });
    const paths: Item[] = [];
    const walk = (it: paper.Item) => {
        if (it instanceof scope.Path || it instanceof scope.CompoundPath) {
            const p = it as Item;
            // geometry only: strokes are not outlined, the fill area is used
            p.strokeWidth = 0;
            if (p instanceof scope.Path) p.closed = true;
            paths.push(p);
        } else (it.children ?? []).forEach(walk);
    };
    walk(imported);
    if (!paths.length) return null;
    return paths.slice(1).reduce<Item>((acc, p) => acc.unite(p, { insert: false }), paths[0]);
}

async function toFabric(pieces: Piece[]): Promise<fabric.FabricObject[]> {
    const out: fabric.FabricObject[] = [];
    for (const { item, style } of pieces) {
        if (isEmpty(item)) continue;
        const svg = item.exportSVG({ asString: true, precision: 3 }) as string;
        const { objects } = await fabric.loadSVGFromString(
            `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
        );
        objects.filter(Boolean).forEach((o) => {
            o!.set({ ...style, strokeUniform: true });
            o!.setCoords();
            out.push(o as fabric.FabricObject);
        });
    }
    return out;
}

/** Run `op` on `shapes` (bottom -> top). Returns the new shapes; [] when nothing remains. */
export async function computeBoolean(
    op: BooleanOp,
    shapes: fabric.FabricObject[],
): Promise<fabric.FabricObject[]> {
    if (shapes.length < 2) return [];
    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(1, 1));

    const items = shapes.map((s) => ({ item: toItem(scope, s), style: extractStyle(s) }));
    const valid: Piece[] = items.flatMap((p) => (p.item ? [{ item: p.item, style: p.style }] : []));
    if (valid.length < 2) return [];
    const top = valid[valid.length - 1];
    const bottom = valid[0];
    const opts = { insert: false };

    let pieces: Piece[] = [];
    switch (op) {
        case 'union':
            pieces = [
                {
                    item: valid.slice(1).reduce((a, p) => a.unite(p.item, opts), bottom.item),
                    style: top.style,
                },
            ];
            break;
        case 'subtract':
            pieces = [
                {
                    item: valid.slice(1).reduce((a, p) => a.subtract(p.item, opts), bottom.item),
                    style: bottom.style,
                },
            ];
            break;
        case 'intersect':
            pieces = [
                {
                    item: valid.slice(1).reduce((a, p) => a.intersect(p.item, opts), bottom.item),
                    style: top.style,
                },
            ];
            break;
        case 'exclude':
            pieces = [
                {
                    item: valid.slice(1).reduce((a, p) => a.exclude(p.item, opts), bottom.item),
                    style: top.style,
                },
            ];
            break;
        case 'divide': {
            // each new (higher) shape splits the pieces below into inside / outside parts;
            // the part of it not over anything becomes a piece too
            pieces = [bottom];
            let covered: Item = bottom.item;
            for (const s of valid.slice(1)) {
                const next: Piece[] = [];
                for (const p of pieces) {
                    next.push({ item: p.item.subtract(s.item, opts), style: p.style });
                    next.push({ item: p.item.intersect(s.item, opts), style: s.style });
                }
                next.push({ item: s.item.subtract(covered, opts), style: s.style });
                covered = covered.unite(s.item, opts);
                pieces = next.filter((p) => !isEmpty(p.item));
            }
            break;
        }
        case 'crop':
            pieces = valid
                .slice(0, -1)
                .map((p) => ({ item: p.item.intersect(top.item, opts), style: p.style }));
            break;
    }

    const result = await toFabric(pieces.filter((p) => !isEmpty(p.item)));
    scope.project.remove();
    return result;
}
