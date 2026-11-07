/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Path node editor for Fabric.js v6.
 *
 * Features
 *  - Works on Path, Rect (incl. rounded), Circle, Ellipse, Triangle, Polygon, Polyline, Line.
 *    The shape is converted to cubic-bezier anchors LOSSLESSLY (a circle stays a circle).
 *  - Drag anchors (handles travel with them), drag bezier handles, smooth/corner nodes.
 *  - Add a node: double-click on the outline. The segment is split with de Casteljau,
 *    so the shape does not change by a single pixel.
 *  - Delete a node: double-click it, or press Delete / Backspace.
 *  - Alt+click an anchor (or toggleSelectedType()) converts smooth <-> corner.
 *  - Alt+drag a handle breaks the tangent. Shift constrains axis / 45deg.
 *  - Arrow keys nudge the selected node (Shift = 10px).
 *  - Enter / Escape / click outside = commit. cancel() reverts everything.
 *  - The source object is hidden while editing by skipping its render (not `visible`), so an
 *    autosave / page capture taken mid-edit still saves it as visible.
 *  - Handle sizes and hit radii are in SCREEN px: they follow viewport zoom AND the CSS fit
 *    scale of the design board (`screenScale`).
 *  - Handles, outline and markers are painted in `after:render`, so NO helper objects are
 *    added to the canvas (no layer-panel / history / JSON pollution). Only one temporary
 *    working path exists; use `isNodeEditorObject(obj)` to ignore it in your
 *    object:added / object:removed listeners.
 *  - The visual transform (angle, scale, skew, flip, origin, z-index, custom props) is preserved.
 *  - Works on an object inside a Group too (the outline of a text shape): the working path gets the
 *    child's full scene transform, and on commit the result goes back into the same group at the
 *    same index (Fabric converts it into the group plane) and the group re-fits its bounds.
 */
import { BRAND } from '@/lib/theme';
import * as fabric from 'fabric';
import { fitTextShape } from './createShapeSlice';
import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';

/* ============================================================
   Types & constants
============================================================ */
type Pt = { x: number; y: number };
type HandleKind = 'in' | 'out';

interface SubPath {
    nodes: Anchor[];
    closed: boolean;
}

interface Anchor {
    x: number;
    y: number;
    inH: Pt | null; // handle controlling the segment BEFORE this anchor
    outH: Pt | null; // handle controlling the segment AFTER this anchor
    smooth: boolean; // true => handles are kept collinear
    parent: SubPath;
}

export interface NodeSelectionInfo {
    index: number;
    subPathIndex: number;
    type: 'corner' | 'smooth';
    hasHandles: boolean;
    nodeCount: number;
    /** Node position in canvas (scene) px, rounded to 0.01. */
    x: number;
    y: number;
    /** Is the node's sub-path closed? */
    closed: boolean;
    /** Deleting keeps a valid path (closed >= 3 nodes, open >= 2). */
    canDelete: boolean;
    /** Break is possible: any node of a closed path, a middle node of an open one. */
    canBreak: boolean;
}

export type NodeType = 'corner' | 'smooth';
export type SegmentKind = 'line' | 'curve';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface NodeEditorOptions {
    /** Custom props copied onto the new Path when a primitive (rect, circle...) is converted. */
    extraProps?: string[];
    onChange?: () => void;
    onSelectionChange?: (info: NodeSelectionInfo | null) => void;
    /**
     * `point` (scene coords) is set when editing ended by a click outside the shape, so the caller
     * can act on that click (the node tool starts editing the shape under it).
     */
    onExit?: (result: fabric.FabricObject | null, committed: boolean, point?: Pt) => void;
    /** Outside click selects the object under the pointer (default true). The node tool turns it off. */
    selectOnOutsideClick?: boolean;
}

interface ExitOptions {
    commit: boolean;
    select: boolean;
    event?: Event;
    point?: Pt;
}

const EPS = 1e-6;
const KAPPA = 0.5522847498307936;
const ACCENT = BRAND.primary;
const ANCHOR_SIZE = 8; // screen px
const HANDLE_RADIUS = 4; // screen px
const HIT_RADIUS = 9; // screen px
const SEGMENT_TOLERANCE = 6; // screen px

const STYLE_PROPS = [
    'fill',
    'stroke',
    'strokeWidth',
    'strokeDashArray',
    'strokeDashOffset',
    'strokeLineCap',
    'strokeLineJoin',
    'strokeMiterLimit',
    'strokeUniform',
    'fillRule',
    'paintFirst',
    'opacity',
    'shadow',
    'backgroundColor',
    'globalCompositeOperation',
] as const;

const INTERACTION_PROPS = [
    'selectable',
    'evented',
    'hasControls',
    'hasBorders',
    'lockMovementX',
    'lockMovementY',
    'lockRotation',
    'lockScalingX',
    'lockScalingY',
    'lockSkewingX',
    'lockSkewingY',
    'lockScalingFlip',
    'hoverCursor',
    'moveCursor',
    'objectCaching',
] as const;

/**
 * Screen px per scene px: viewport zoom × the CSS scale of the canvas element (the design board
 * shows the page scaled to fit, so 1 scene px can be 0.5 screen px).
 */
export function screenScale(canvas: fabric.Canvas): number {
    const zoom = canvas.getZoom() || 1;
    const rect = (canvas as any).upperCanvasEl?.getBoundingClientRect?.();
    const width = canvas.getWidth();
    const css = rect?.width && width ? rect.width / width : 1;
    return zoom * (css > 0 && Number.isFinite(css) ? css : 1);
}

/** Objects created by the editor (so app-level listeners can ignore them). */
const editorObjects = new WeakSet<object>();
export const isNodeEditorObject = (obj: unknown): boolean =>
    !!obj && editorObjects.has(obj as object);

/* ============================================================
   Small math helpers
============================================================ */
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: Pt, b: Pt, t: number): Pt => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
});
const cloneCommands = (c: any[]): any[] => c.map((s) => [...s]);
const nz = (anchor: Pt, h: Pt): Pt | null => (dist(anchor, h) < EPS ? null : h);

function copyProps(from: any, to: any, keys: readonly string[]) {
    for (const k of keys) if (from[k] !== undefined) to.set(k, from[k]);
}

function cubicPt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
        x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    };
}

function cubicExtremaT(p0: number, p1: number, p2: number, p3: number): number[] {
    const d0 = p1 - p0;
    const d1 = p2 - p1;
    const d2 = p3 - p2;
    const a = d0 - 2 * d1 + d2;
    const b = 2 * (d1 - d0);
    const c = d0;
    const ts: number[] = [];
    if (Math.abs(a) < 1e-12) {
        if (Math.abs(b) > 1e-12) ts.push(-c / b);
    } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
            const s = Math.sqrt(disc);
            ts.push((-b + s) / (2 * a), (-b - s) / (2 * a));
        }
    }
    return ts.filter((t) => t > 0 && t < 1);
}

/* ============================================================
   Model <-> path commands
============================================================ */
function makeAnchor(parent: SubPath, x: number, y: number): Anchor {
    return { x, y, inH: null, outH: null, smooth: false, parent };
}

const isCurve = (a: Anchor, b: Anchor) => !!(a.outH || b.inH);

function segPts(a: Anchor, b: Anchor): [Pt, Pt, Pt, Pt] {
    return [a, a.outH ?? a, b.inH ?? b, b];
}

/** Parse any fabric path data into anchors + handles (Q is elevated to C exactly). */
function parseCommands(raw: any[]): SubPath[] {
    const util: any = fabric.util;
    const simple: any[] =
        typeof util.makePathSimpler === 'function' ? util.makePathSimpler(raw) : raw;

    const subs: SubPath[] = [];
    let cur: SubPath | null = null;
    let start: Pt | null = null;

    for (const seg of simple) {
        const cmd = String(seg[0]).toUpperCase();

        if (cmd === 'M') {
            cur = { nodes: [], closed: false };
            subs.push(cur);
            cur.nodes.push(makeAnchor(cur, seg[1], seg[2]));
            start = { x: seg[1], y: seg[2] };
            continue;
        }

        if (cmd === 'Z') {
            if (cur) {
                cur.closed = true;
                const f = cur.nodes[0];
                const l = cur.nodes[cur.nodes.length - 1];
                if (cur.nodes.length > 1 && dist(f, l) < EPS) {
                    f.inH = l.inH; // closing curve ended exactly on the start point
                    cur.nodes.pop();
                }
            }
            cur = null; // a following drawing command implicitly starts at `start`
            continue;
        }

        if (!cur) {
            if (!start) continue;
            cur = { nodes: [], closed: false };
            subs.push(cur);
            cur.nodes.push(makeAnchor(cur, start.x, start.y));
        }

        const prev = cur.nodes[cur.nodes.length - 1];

        if (cmd === 'L') {
            cur.nodes.push(makeAnchor(cur, seg[1], seg[2]));
        } else if (cmd === 'C') {
            prev.outH = { x: seg[1], y: seg[2] };
            const n = makeAnchor(cur, seg[5], seg[6]);
            n.inH = { x: seg[3], y: seg[4] };
            cur.nodes.push(n);
        } else if (cmd === 'Q') {
            const q = { x: seg[1], y: seg[2] };
            const e = { x: seg[3], y: seg[4] };
            prev.outH = {
                x: prev.x + (2 / 3) * (q.x - prev.x),
                y: prev.y + (2 / 3) * (q.y - prev.y),
            };
            const n = makeAnchor(cur, e.x, e.y);
            n.inH = { x: e.x + (2 / 3) * (q.x - e.x), y: e.y + (2 / 3) * (q.y - e.y) };
            cur.nodes.push(n);
        }
    }

    // Normalise degenerate handles and detect smooth nodes.
    for (const sub of subs) {
        for (const a of sub.nodes) {
            if (a.inH) a.inH = nz(a, a.inH);
            if (a.outH) a.outH = nz(a, a.outH);
            if (a.inH && a.outH) {
                const v1 = { x: a.inH.x - a.x, y: a.inH.y - a.y };
                const v2 = { x: a.outH.x - a.x, y: a.outH.y - a.y };
                const l1 = Math.hypot(v1.x, v1.y);
                const l2 = Math.hypot(v2.x, v2.y);
                const cross = (v1.x * v2.y - v1.y * v2.x) / (l1 * l2);
                const dot = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2);
                a.smooth = Math.abs(cross) < 0.01 && dot < 0;
            }
        }
    }
    return subs;
}

function buildCommands(subs: SubPath[]): any[] {
    const out: any[] = [];
    for (const sub of subs) {
        const n = sub.nodes.length;
        if (n < 2) continue;
        out.push(['M', sub.nodes[0].x, sub.nodes[0].y]);
        const count = sub.closed ? n : n - 1;
        for (let i = 0; i < count; i++) {
            const a = sub.nodes[i];
            const b = sub.nodes[(i + 1) % n];
            if (isCurve(a, b)) {
                const c1 = a.outH ?? a;
                const c2 = b.inH ?? b;
                out.push(['C', c1.x, c1.y, c2.x, c2.y, b.x, b.y]);
            } else if (!(sub.closed && i === n - 1)) {
                out.push(['L', b.x, b.y]); // closing straight segment is implied by Z
            }
        }
        if (sub.closed) out.push(['Z']);
    }
    return out;
}

function computeBounds(subs: SubPath[]) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const ext = (p: Pt) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    };
    for (const sub of subs) {
        const n = sub.nodes.length;
        if (n < 2) continue;
        sub.nodes.forEach(ext);
        const count = sub.closed ? n : n - 1;
        for (let i = 0; i < count; i++) {
            const a = sub.nodes[i];
            const b = sub.nodes[(i + 1) % n];
            if (!isCurve(a, b)) continue;
            const [p0, p1, p2, p3] = segPts(a, b);
            const ts = [
                ...cubicExtremaT(p0.x, p1.x, p2.x, p3.x),
                ...cubicExtremaT(p0.y, p1.y, p2.y, p3.y),
            ];
            ts.forEach((t) => ext(cubicPt(p0, p1, p2, p3, t)));
        }
    }
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
}

/* ============================================================
   Geometry extraction (any supported object -> path commands)
   Local coordinates follow Fabric's convention:
   canvasPoint = objectMatrix * (P - pathOffset)
============================================================ */
function ellipseCommands(rx: number, ry: number): any[] {
    const kx = KAPPA * rx;
    const ky = KAPPA * ry;
    return [
        ['M', rx, 0],
        ['C', rx, ky, kx, ry, 0, ry],
        ['C', -kx, ry, -rx, ky, -rx, 0],
        ['C', -rx, -ky, -kx, -ry, 0, -ry],
        ['C', kx, -ry, rx, -ky, rx, 0],
        ['Z'],
    ];
}

function rectCommands(w: number, h: number, rxIn: number, ryIn: number): any[] {
    const x = -w / 2;
    const y = -h / 2;
    const rx = rxIn ? Math.min(rxIn, w / 2) : 0;
    const ry = ryIn ? Math.min(ryIn, h / 2) : 0;
    if (!rx && !ry) {
        return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
    }
    const kx = KAPPA * rx;
    const ky = KAPPA * ry;
    return [
        ['M', x + rx, y],
        ['L', x + w - rx, y],
        ['C', x + w - rx + kx, y, x + w, y + ry - ky, x + w, y + ry],
        ['L', x + w, y + h - ry],
        ['C', x + w, y + h - ry + ky, x + w - rx + kx, y + h, x + w - rx, y + h],
        ['L', x + rx, y + h],
        ['C', x + rx - kx, y + h, x, y + h - ry + ky, x, y + h - ry],
        ['L', x, y + ry],
        ['C', x, y + ry - ky, x + rx - kx, y, x + rx, y],
        ['Z'],
    ];
}

function extractGeometry(obj: any): { commands: any[]; offset: Pt } | null {
    if (obj instanceof fabric.Path) {
        return {
            commands: cloneCommands(obj.path as any[]),
            offset: { x: obj.pathOffset.x, y: obj.pathOffset.y },
        };
    }
    const zero = { x: 0, y: 0 };
    if (obj instanceof fabric.Rect) {
        return {
            commands: rectCommands(obj.width, obj.height, obj.rx || 0, obj.ry || 0),
            offset: zero,
        };
    }
    if (obj instanceof fabric.Circle) {
        return { commands: ellipseCommands(obj.radius, obj.radius), offset: zero };
    }
    if (obj instanceof fabric.Ellipse) {
        return { commands: ellipseCommands(obj.rx, obj.ry), offset: zero };
    }
    if (obj instanceof fabric.Triangle) {
        const w = obj.width / 2;
        const h = obj.height / 2;
        return { commands: [['M', -w, h], ['L', 0, -h], ['L', w, h], ['Z']], offset: zero };
    }
    if (obj instanceof fabric.Polyline) {
        // Polygon extends Polyline
        const pts: Pt[] = (obj as any).points || [];
        if (pts.length < 2) return null;
        const cmds: any[] = pts.map((p, i) => [i === 0 ? 'M' : 'L', p.x, p.y]);
        if (obj instanceof fabric.Polygon) cmds.push(['Z']);
        const off = (obj as any).pathOffset || zero;
        return { commands: cmds, offset: { x: off.x, y: off.y } };
    }
    if (obj instanceof fabric.Line) {
        const p = (obj as any).calcLinePoints();
        return {
            commands: [
                ['M', p.x1, p.y1],
                ['L', p.x2, p.y2],
            ],
            offset: zero,
        };
    }
    return null; // text, image, group... not supported
}

/* ============================================================
   Editor
============================================================ */
interface DragState {
    anchor: Anchor;
    kind: 'anchor' | HandleKind;
    grab: Pt; // scene-space offset between pointer and the dragged point
    startScene: Pt; // anchor position in scene space when drag began
    moved: boolean;
}

export class PathNodeEditor {
    readonly workingPath: fabric.Path;

    private canvas: fabric.Canvas;
    private src: fabric.FabricObject;
    private subs: SubPath[];
    private opts: NodeEditorOptions;
    private extraProps: string[];

    private selected: Anchor | null = null;
    private drag: DragState | null = null;
    private dirty = false;
    private disposed = false;
    private srcRender: { own: boolean; fn: unknown };

    // cached local<->scene mapping of the working path
    private m: number[] = [1, 0, 0, 1, 0, 0];
    private off: Pt = { x: 0, y: 0 };

    private disposers: Array<() => void> = [];
    private prevSelection: boolean;
    private prevSkipTargetFind: boolean;
    private prevDefaultCursor: string;

    /** Returns null when the object type is not supported. */
    static start(
        canvas: fabric.Canvas,
        source: fabric.FabricObject,
        options: NodeEditorOptions = {},
    ): PathNodeEditor | null {
        const parent = (source as any).group;
        if (source instanceof fabric.ActiveSelection || parent instanceof fabric.ActiveSelection)
            return null;
        const geom = extractGeometry(source);
        if (!geom) return null;
        const subs = parseCommands(geom.commands);
        if (!subs.some((s) => s.nodes.length >= 2)) return null;
        return new PathNodeEditor(canvas, source, geom, subs, options);
    }

    private constructor(
        canvas: fabric.Canvas,
        source: fabric.FabricObject,
        geom: { commands: any[]; offset: Pt },
        subs: SubPath[],
        options: NodeEditorOptions,
    ) {
        this.canvas = canvas;
        this.src = source;
        this.subs = subs;
        this.opts = options;
        this.extraProps = options.extraProps ?? ['id', 'name', 'data'];
        this.srcRender = {
            own: Object.prototype.hasOwnProperty.call(source, 'render'),
            fn: (source as any).render,
        };

        this.prevSelection = canvas.selection;
        this.prevSkipTargetFind = canvas.skipTargetFind;
        this.prevDefaultCursor = canvas.defaultCursor;

        canvas.discardActiveObject();

        // Working copy: same transform & style, local coords = source local coords.
        // Inside a group, the source's own props are relative to the group: use its scene matrix.
        const scene = (source as any).group
            ? (() => {
                  const d = fabric.util.qrDecompose(source.calcTransformMatrix());
                  return {
                      scaleX: d.scaleX,
                      scaleY: d.scaleY,
                      angle: d.angle,
                      skewX: d.skewX,
                      skewY: d.skewY,
                      flipX: false,
                      flipY: false,
                      left: d.translateX,
                      top: d.translateY,
                  };
              })()
            : (() => {
                  const center = source.getCenterPoint();
                  return {
                      scaleX: source.scaleX,
                      scaleY: source.scaleY,
                      angle: source.angle,
                      skewX: source.skewX,
                      skewY: source.skewY,
                      flipX: source.flipX,
                      flipY: source.flipY,
                      left: center.x,
                      top: center.y,
                  };
              })();
        const wp = new fabric.Path(buildCommands(subs) as any, { objectCaching: false } as any);
        copyProps(source, wp, STYLE_PROPS);
        wp.set({
            originX: 'center',
            originY: 'center',
            ...scene,
            pathOffset: new fabric.Point(geom.offset.x, geom.offset.y),
            objectCaching: false,
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
            excludeFromExport: true,
        } as any);
        this.workingPath = wp;
        editorObjects.add(wp);

        let top: any = source;
        while (top.group) top = top.group;
        const index = canvas.getObjects().indexOf(top);
        this.hideSource();
        canvas.insertAt(index + 1, wp);

        // Recompute bbox / pivot so the model is the single source of truth.
        this.applyModel(false);

        canvas.selection = false;
        canvas.skipTargetFind = true;

        this.disposers.push(
            canvas.on('mouse:down', (e: any) => this.onMouseDown(e)),
            canvas.on('mouse:move', (e: any) => this.onMouseMove(e)),
            canvas.on('mouse:up', () => this.onMouseUp()),
            canvas.on('mouse:dblclick', (e: any) => this.onDoubleClick(e)),
            canvas.on('after:render', (e: any) =>
                this.draw(e?.ctx ?? (canvas as any).getContext()),
            ),
        );
        window.addEventListener('keydown', this.onKeyDown, true);

        this.select(this.subs.find((s) => s.nodes.length)?.nodes[0] ?? null);
        canvas.requestRenderAll();
    }

    /* ---------------- public API ---------------- */

    /** The object being edited (still on the canvas, not drawn until the edit ends). */
    get source(): fabric.FabricObject {
        return this.src;
    }

    commit() {
        this.finish({ commit: true, select: true });
    }

    cancel() {
        this.finish({ commit: false, select: true });
    }

    get selectedType(): 'corner' | 'smooth' | null {
        return this.selected ? (this.selected.smooth ? 'smooth' : 'corner') : null;
    }

    deleteSelected(): boolean {
        return this.selected ? this.deleteAnchor(this.selected) : false;
    }

    toggleSelectedType(): boolean {
        const a = this.selected;
        if (!a) return false;
        if (a.smooth) {
            a.smooth = false;
            a.inH = null;
            a.outH = null;
        } else if (!this.makeSmooth(a)) {
            return false;
        }
        this.afterEdit();
        return true;
    }

    /** Splits the segment after the selected node (before it, at the end of an open path) in two. */
    addNodeAfterSelected(): boolean {
        const a = this.selected;
        if (!a) return false;
        const { prev, next } = this.neighbours(a);
        const from = next ? a : prev;
        if (!from) return false;
        return this.insertNode({ sub: a.parent, index: a.parent.nodes.indexOf(from), t: 0.5 });
    }

    /** Corner = the two handles move independently; Smooth = they stay in line (adds handles). */
    setSelectedType(type: NodeType): boolean {
        const a = this.selected;
        if (!a) return false;
        if (type === 'smooth') {
            if (!this.makeSmooth(a)) return false;
        } else {
            a.smooth = false;
        }
        this.afterEdit();
        return true;
    }

    /**
     * The two segments next to the selected node: 'line' removes their handles (straight lines),
     * 'curve' turns straight ones into curves with handles at 1/3 and 2/3 (the shape stays the same).
     */
    setSelectedSegments(kind: SegmentKind): boolean {
        const a = this.selected;
        if (!a) return false;
        const { prev, next } = this.neighbours(a);
        const segments: Array<[Anchor, Anchor]> = [];
        if (prev) segments.push([prev, a]);
        if (next) segments.push([a, next]);
        if (!segments.length) return false;

        for (const [p, q] of segments) {
            if (kind === 'line') {
                p.outH = null;
                q.inH = null;
                p.smooth = false;
                q.smooth = false;
            } else if (!isCurve(p, q)) {
                p.outH = lerp(p, q, 1 / 3);
                q.inH = lerp(p, q, 2 / 3);
            }
        }
        this.afterEdit();
        return true;
    }

    /**
     * Close: joins the two ends of the selected node's open sub-path.
     * Open: cuts a closed sub-path at the selected node (the node becomes both ends).
     */
    setSelectedPathClosed(closed: boolean): boolean {
        const a = this.selected;
        if (!a) return false;
        const sub = a.parent;
        if (sub.closed === closed) return false;

        if (closed) {
            if (sub.nodes.length < 2) return false;
            const first = sub.nodes[0];
            const last = sub.nodes[sub.nodes.length - 1];
            if (sub.nodes.length > 2 && dist(first, last) < EPS) {
                first.inH = last.inH; // ends already touch: merge them
                sub.nodes.pop();
                if (this.selected === last) this.selected = first;
            }
            if (sub.nodes.length < 3 && !isCurve(sub.nodes[0], sub.nodes[sub.nodes.length - 1]))
                return false; // two nodes and a straight line: nothing to close
            sub.closed = true;
        } else {
            this.openAt(a);
        }
        this.afterEdit();
        return true;
    }

    /** Closed path: open it at the node. Open path: split it in two at a middle node. */
    breakAtSelected(): boolean {
        const a = this.selected;
        if (!a) return false;
        const sub = a.parent;
        if (sub.closed) return this.setSelectedPathClosed(false);

        const i = sub.nodes.indexOf(a);
        if (i <= 0 || i >= sub.nodes.length - 1) return false; // an end node: nothing to break

        const tail: SubPath = { nodes: [], closed: false };
        const end = makeAnchor(sub, a.x, a.y); // end of the first part
        end.inH = a.inH;
        tail.nodes = [a, ...sub.nodes.slice(i + 1)];
        sub.nodes = [...sub.nodes.slice(0, i), end];
        a.inH = null;
        a.smooth = false;
        tail.nodes.forEach((n) => (n.parent = tail));
        this.subs.splice(this.subs.indexOf(sub) + 1, 0, tail);
        this.afterEdit();
        return true;
    }

    /** Moves the selected node (its handles follow) to canvas (scene) coordinates. */
    moveSelectedTo(scene: Pt): boolean {
        const a = this.selected;
        if (!a || !Number.isFinite(scene.x) || !Number.isFinite(scene.y)) return false;
        this.moveAnchor(a, this.tl(scene));
        this.afterEdit();
        return true;
    }

    /** x / y are canvas (scene) coordinates. Returns false if the point is not on the outline. */
    addNodeAtPoint(scene: Pt): boolean {
        const hit = this.findNearestSegment(scene);
        if (!hit || hit.dist > this.segmentTolerance()) return false;
        return this.insertNode(hit);
    }

    /* ---------------- mapping ---------------- */

    private refreshMatrix() {
        const wp = this.workingPath;
        this.m = [...(wp.calcTransformMatrix() as number[])];
        this.off = { x: wp.pathOffset.x, y: wp.pathOffset.y };
    }

    /** local (path space) -> scene */
    private tc(p: Pt): Pt {
        const m = this.m;
        const x = p.x - this.off.x;
        const y = p.y - this.off.y;
        return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
    }

    /** scene -> local (path space) */
    private tl(c: Pt): Pt {
        const m = this.m;
        const det = m[0] * m[3] - m[1] * m[2];
        if (Math.abs(det) < 1e-12) return { ...c };
        const dx = c.x - m[4];
        const dy = c.y - m[5];
        return {
            x: (m[3] * dx - m[2] * dy) / det + this.off.x,
            y: (-m[1] * dx + m[0] * dy) / det + this.off.y,
        };
    }

    /**
     * Push the model into the Fabric path. Recomputes width/height/pathOffset and moves the
     * object centre so that every point keeps EXACTLY the same position on the canvas.
     */
    private applyModel(markDirty = true) {
        const wp = this.workingPath;
        const oldOff = wp.pathOffset;
        const oldCenter = wp.getCenterPoint();
        const m = wp.calcTransformMatrix() as number[];

        const b = computeBounds(this.subs);
        const width = b.maxX - b.minX;
        const height = b.maxY - b.minY;
        const newOff = new fabric.Point(b.minX + width / 2, b.minY + height / 2);

        const dx = newOff.x - oldOff.x;
        const dy = newOff.y - oldOff.y;
        const newCenter = new fabric.Point(
            oldCenter.x + m[0] * dx + m[2] * dy,
            oldCenter.y + m[1] * dx + m[3] * dy,
        );

        (wp as any).path = buildCommands(this.subs);
        wp.set({ width, height, pathOffset: newOff } as any);
        wp.setPositionByOrigin(newCenter, 'center', 'center');
        wp.dirty = true;
        wp.setCoords();

        this.refreshMatrix();
        if (markDirty) this.dirty = true;
    }

    private afterEdit() {
        this.applyModel();
        this.emitSelection();
        this.canvas.requestRenderAll();
        this.opts.onChange?.();
    }

    /* ---------------- selection ---------------- */

    private select(a: Anchor | null) {
        this.selected = a;
        this.emitSelection();
        this.canvas.requestRenderAll();
    }

    private emitSelection() {
        const a = this.selected;
        if (!a) return this.opts.onSelectionChange?.(null);
        const sub = a.parent;
        const index = sub.nodes.indexOf(a);
        const n = sub.nodes.length;
        const scene = this.tc(a);
        this.opts.onSelectionChange?.({
            index,
            subPathIndex: this.subs.indexOf(sub),
            type: a.smooth ? 'smooth' : 'corner',
            hasHandles: !!(a.inH || a.outH),
            nodeCount: n,
            x: round2(scene.x),
            y: round2(scene.y),
            closed: sub.closed,
            canDelete: n > (sub.closed ? 3 : 2),
            canBreak: sub.closed || (index > 0 && index < n - 1),
        });
    }

    /** Cut a closed sub-path at `a`: it becomes the first node and a copy of it the last. */
    private openAt(a: Anchor) {
        const sub = a.parent;
        const i = sub.nodes.indexOf(a);
        const end = makeAnchor(sub, a.x, a.y);
        end.inH = a.inH; // the closing segment now ends on the copy
        a.inH = null;
        a.smooth = false;
        sub.nodes = [...sub.nodes.slice(i), ...sub.nodes.slice(0, i), end];
        sub.closed = false;
    }

    private neighbours(a: Anchor) {
        const sub = a.parent;
        const n = sub.nodes.length;
        const i = sub.nodes.indexOf(a);
        const prev = i > 0 ? sub.nodes[i - 1] : sub.closed ? sub.nodes[n - 1] : null;
        const next = i < n - 1 ? sub.nodes[i + 1] : sub.closed ? sub.nodes[0] : null;
        return { prev: prev === a ? null : prev, next: next === a ? null : next, index: i };
    }

    /** Handles shown: the selected node's own + the facing handles of its neighbours. */
    private visibleHandles(): Array<{ anchor: Anchor; kind: HandleKind; pt: Pt }> {
        const s = this.selected;
        if (!s) return [];
        const out: Array<{ anchor: Anchor; kind: HandleKind; pt: Pt }> = [];
        if (s.inH) out.push({ anchor: s, kind: 'in', pt: s.inH });
        if (s.outH) out.push({ anchor: s, kind: 'out', pt: s.outH });
        const { prev, next } = this.neighbours(s);
        if (prev?.outH) out.push({ anchor: prev, kind: 'out', pt: prev.outH });
        if (next?.inH) out.push({ anchor: next, kind: 'in', pt: next.inH });
        return out;
    }

    /* ---------------- hit testing ---------------- */

    /** Screen px per scene px (viewport zoom × design fit scale). */
    private zoom() {
        return screenScale(this.canvas);
    }

    private segmentTolerance() {
        const wp = this.workingPath;
        const stroke =
            ((wp.strokeWidth || 0) * Math.max(Math.abs(wp.scaleX), Math.abs(wp.scaleY))) / 2;
        return Math.max(SEGMENT_TOLERANCE / this.zoom(), stroke);
    }

    private hitTest(scene: Pt): { anchor: Anchor; kind: 'anchor' | HandleKind } | null {
        const r = HIT_RADIUS / this.zoom();
        for (const h of this.visibleHandles()) {
            if (dist(this.tc(h.pt), scene) <= r) return { anchor: h.anchor, kind: h.kind };
        }
        let best: Anchor | null = null;
        let bestD = r;
        for (const sub of this.subs) {
            for (const a of sub.nodes) {
                const d = dist(this.tc(a), scene);
                if (d <= bestD) {
                    bestD = d;
                    best = a;
                }
            }
        }
        return best ? { anchor: best, kind: 'anchor' } : null;
    }

    private findNearestSegment(
        scene: Pt,
    ): { sub: SubPath; index: number; t: number; dist: number } | null {
        const N = 24;
        let best: { sub: SubPath; index: number; t: number; dist: number } | null = null;

        for (const sub of this.subs) {
            const n = sub.nodes.length;
            if (n < 2) continue;
            const count = sub.closed ? n : n - 1;
            for (let i = 0; i < count; i++) {
                const a = sub.nodes[i];
                const b = sub.nodes[(i + 1) % n];
                const curve = isCurve(a, b);
                const [p0, p1, p2, p3] = segPts(a, b).map((p) => this.tc(p));
                const f = (t: number) => (curve ? cubicPt(p0, p1, p2, p3, t) : lerp(p0, p3, t));

                let bestT = 0;
                let bestD = Infinity;
                for (let k = 0; k <= N; k++) {
                    const d = dist(f(k / N), scene);
                    if (d < bestD) {
                        bestD = d;
                        bestT = k / N;
                    }
                }
                let lo = Math.max(0, bestT - 1 / N);
                let hi = Math.min(1, bestT + 1 / N);
                for (let it = 0; it < 20; it++) {
                    const m1 = lo + (hi - lo) / 3;
                    const m2 = hi - (hi - lo) / 3;
                    if (dist(f(m1), scene) < dist(f(m2), scene)) hi = m2;
                    else lo = m1;
                }
                const t = (lo + hi) / 2;
                const d = dist(f(t), scene);
                if (d < bestD) {
                    bestD = d;
                    bestT = t;
                }
                if (!best || bestD < best.dist) best = { sub, index: i, t: bestT, dist: bestD };
            }
        }
        return best;
    }

    /* ---------------- node operations ---------------- */

    /** Split a segment at t (de Casteljau) - the outline does not change. */
    private insertNode(hit: { sub: SubPath; index: number; t: number }): boolean {
        const { sub, index, t } = hit;
        if (t < 0.001 || t > 0.999) return false;
        const n = sub.nodes.length;
        const a = sub.nodes[index];
        const b = sub.nodes[(index + 1) % n];
        const na = makeAnchor(sub, 0, 0);

        if (isCurve(a, b)) {
            const [p0, p1, p2, p3] = segPts(a, b);
            const p01 = lerp(p0, p1, t);
            const p12 = lerp(p1, p2, t);
            const p23 = lerp(p2, p3, t);
            const p012 = lerp(p01, p12, t);
            const p123 = lerp(p12, p23, t);
            const p = lerp(p012, p123, t);
            a.outH = nz(a, p01);
            b.inH = nz(b, p23);
            na.x = p.x;
            na.y = p.y;
            na.inH = nz(na, p012);
            na.outH = nz(na, p123);
            na.smooth = !!(na.inH && na.outH);
        } else {
            const p = lerp(a, b, t);
            na.x = p.x;
            na.y = p.y;
        }

        sub.nodes.splice(index + 1, 0, na);
        this.selected = na;
        this.afterEdit();
        return true;
    }

    private deleteAnchor(a: Anchor): boolean {
        const sub = a.parent;
        const min = sub.closed ? 3 : 2;
        if (sub.nodes.length <= min) return false;
        const idx = sub.nodes.indexOf(a);
        sub.nodes.splice(idx, 1);
        this.selected = sub.nodes[Math.min(idx, sub.nodes.length - 1)] ?? null;
        this.afterEdit();
        return true;
    }

    private makeSmooth(a: Anchor): boolean {
        const { prev, next } = this.neighbours(a);

        if (a.inH && a.outH) {
            // keep both lengths, make them collinear along the average travel direction
            const li = dist(a.inH, a);
            const lo = dist(a.outH, a);
            const u1 = { x: (a.outH.x - a.x) / lo, y: (a.outH.y - a.y) / lo };
            const u2 = { x: (a.x - a.inH.x) / li, y: (a.y - a.inH.y) / li };
            let dx = u1.x + u2.x;
            let dy = u1.y + u2.y;
            let l = Math.hypot(dx, dy);
            if (l < EPS) {
                dx = u1.x;
                dy = u1.y;
                l = 1;
            }
            dx /= l;
            dy /= l;
            a.inH = { x: a.x - dx * li, y: a.y - dy * li };
            a.outH = { x: a.x + dx * lo, y: a.y + dy * lo };
        } else if (prev && next && prev !== next) {
            const t = { x: (next.x - prev.x) / 6, y: (next.y - prev.y) / 6 };
            a.inH = nz(a, { x: a.x - t.x, y: a.y - t.y });
            a.outH = nz(a, { x: a.x + t.x, y: a.y + t.y });
        } else if (next) {
            a.outH = nz(a, { x: a.x + (next.x - a.x) / 3, y: a.y + (next.y - a.y) / 3 });
            a.inH = null;
        } else if (prev) {
            a.inH = nz(a, { x: a.x + (prev.x - a.x) / 3, y: a.y + (prev.y - a.y) / 3 });
            a.outH = null;
        } else {
            return false;
        }
        a.smooth = !!(a.inH && a.outH);
        return true;
    }

    private moveAnchor(a: Anchor, local: Pt) {
        const dx = local.x - a.x;
        const dy = local.y - a.y;
        a.x = local.x;
        a.y = local.y;
        if (a.inH) a.inH = { x: a.inH.x + dx, y: a.inH.y + dy };
        if (a.outH) a.outH = { x: a.outH.x + dx, y: a.outH.y + dy };
    }

    private moveHandle(a: Anchor, kind: HandleKind, local: Pt, breakTangent: boolean) {
        if (kind === 'in') a.inH = local;
        else a.outH = local;

        const other = kind === 'in' ? a.outH : a.inH;
        if (breakTangent) {
            a.smooth = false;
            return;
        }
        if (a.smooth && other) {
            const vx = local.x - a.x;
            const vy = local.y - a.y;
            const l = Math.hypot(vx, vy);
            if (l > EPS) {
                const ol = dist(other, a);
                const mirrored = { x: a.x - (vx / l) * ol, y: a.y - (vy / l) * ol };
                if (kind === 'in') a.outH = mirrored;
                else a.inH = mirrored;
            }
        }
    }

    /* ---------------- pointer events ---------------- */

    private scenePoint(opt: any): Pt {
        const p = opt?.scenePoint ?? opt?.absolutePointer;
        if (p) return { x: p.x, y: p.y };
        const c: any = this.canvas;
        const q = c.getScenePoint ? c.getScenePoint(opt.e) : c.getPointer(opt.e);
        return { x: q.x, y: q.y };
    }

    private onMouseDown(opt: any) {
        if (this.disposed) return;
        const e: MouseEvent = opt.e;
        if (e && e.button) return; // only primary button
        const p = this.scenePoint(opt);

        const hit = this.hitTest(p);
        if (hit) {
            this.select(hit.anchor);
            if (hit.kind === 'anchor' && e.altKey) {
                this.toggleSelectedType();
                return;
            }
            const current =
                hit.kind === 'anchor'
                    ? this.tc(hit.anchor)
                    : this.tc((hit.kind === 'in' ? hit.anchor.inH : hit.anchor.outH) as Pt);
            this.drag = {
                anchor: hit.anchor,
                kind: hit.kind,
                grab: { x: p.x - current.x, y: p.y - current.y },
                startScene: this.tc(hit.anchor),
                moved: false,
            };
            return;
        }

        const seg = this.findNearestSegment(p);
        if (seg && seg.dist <= this.segmentTolerance()) return; // clicking the outline keeps editing

        // clicked elsewhere -> leave node mode (and pass the click on to whatever is below)
        this.finish({ commit: true, select: false, event: e, point: p });
    }

    private onMouseMove(opt: any) {
        if (this.disposed) return;
        const p = this.scenePoint(opt);
        const e: MouseEvent = opt.e;

        if (!this.drag) {
            const hit = this.hitTest(p);
            this.canvas.defaultCursor = hit
                ? hit.kind === 'anchor'
                    ? 'move'
                    : 'crosshair'
                : this.prevDefaultCursor;
            return;
        }

        const d = this.drag;
        let target = { x: p.x - d.grab.x, y: p.y - d.grab.y };

        if (e?.shiftKey) {
            if (d.kind === 'anchor') {
                if (Math.abs(target.x - d.startScene.x) > Math.abs(target.y - d.startScene.y))
                    target.y = d.startScene.y;
                else target.x = d.startScene.x;
            } else {
                const ac = this.tc(d.anchor);
                const vx = target.x - ac.x;
                const vy = target.y - ac.y;
                const len = Math.hypot(vx, vy);
                const ang = Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) * (Math.PI / 4);
                target = { x: ac.x + Math.cos(ang) * len, y: ac.y + Math.sin(ang) * len };
            }
        }

        const local = this.tl(target);
        if (d.kind === 'anchor') this.moveAnchor(d.anchor, local);
        else this.moveHandle(d.anchor, d.kind, local, !!e?.altKey);

        d.moved = true;
        this.applyModel();
        this.canvas.requestRenderAll();
    }

    private onMouseUp() {
        if (!this.drag) return;
        const moved = this.drag.moved;
        this.drag = null;
        if (moved) {
            this.emitSelection();
            this.opts.onChange?.();
        }
    }

    private onDoubleClick(opt: any) {
        if (this.disposed) return;
        const p = this.scenePoint(opt);
        const hit = this.hitTest(p);
        if (hit) {
            if (hit.kind === 'anchor') this.deleteAnchor(hit.anchor);
            return;
        }
        this.addNodeAtPoint(p);
    }

    /* ---------------- keyboard ---------------- */

    private onKeyDown = (e: KeyboardEvent) => {
        if (this.disposed || canvasKeysBlocked()) return; // a modal owns the keyboard (BUG-062)
        const t = e.target as HTMLElement | null;
        if (
            t &&
            (t.tagName === 'INPUT' ||
                t.tagName === 'TEXTAREA' ||
                t.tagName === 'SELECT' ||
                t.isContentEditable)
        )
            return;

        const swallow = () => {
            e.preventDefault();
            e.stopImmediatePropagation();
        };

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                swallow(); // never let the app delete the whole object while editing nodes
                this.deleteSelected();
                break;
            case 'Escape':
            case 'Enter':
                swallow();
                this.commit();
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown': {
                if (!this.selected) return;
                swallow();
                const step = e.shiftKey ? 10 : 1;
                const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
                const c = this.tc(this.selected);
                this.moveAnchor(this.selected, this.tl({ x: c.x + dx, y: c.y + dy }));
                this.afterEdit();
                break;
            }
            default:
        }
    };

    /* ---------------- overlay rendering ---------------- */

    private tracePath(ctx: CanvasRenderingContext2D) {
        for (const sub of this.subs) {
            const n = sub.nodes.length;
            if (n < 2) continue;
            const s = this.tc(sub.nodes[0]);
            ctx.moveTo(s.x, s.y);
            const count = sub.closed ? n : n - 1;
            for (let i = 0; i < count; i++) {
                const a = sub.nodes[i];
                const b = sub.nodes[(i + 1) % n];
                const pb = this.tc(b);
                if (isCurve(a, b)) {
                    const c1 = this.tc(a.outH ?? a);
                    const c2 = this.tc(b.inH ?? b);
                    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, pb.x, pb.y);
                } else {
                    ctx.lineTo(pb.x, pb.y);
                }
            }
            if (sub.closed) ctx.closePath();
        }
    }

    private draw(ctx: CanvasRenderingContext2D) {
        if (this.disposed || !ctx) return;
        const z = this.zoom();
        const v = this.canvas.viewportTransform!;
        ctx.save();
        ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
        ctx.lineWidth = 1 / z;
        ctx.strokeStyle = ACCENT;
        ctx.lineJoin = 'round';

        // outline
        ctx.beginPath();
        this.tracePath(ctx);
        ctx.stroke();

        // handle lines
        const handles = this.visibleHandles();
        ctx.beginPath();
        for (const h of handles) {
            const a = this.tc(h.anchor);
            const p = this.tc(h.pt);
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // handle knobs
        ctx.fillStyle = '#fff';
        for (const h of handles) {
            const p = this.tc(h.pt);
            ctx.beginPath();
            ctx.arc(p.x, p.y, HANDLE_RADIUS / z, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // anchors (square = corner, circle = smooth)
        const size = ANCHOR_SIZE / z;
        for (const sub of this.subs) {
            for (const a of sub.nodes) {
                const p = this.tc(a);
                ctx.fillStyle = a === this.selected ? ACCENT : '#fff';
                ctx.beginPath();
                if (a.smooth) ctx.arc(p.x, p.y, size * 0.6, 0, Math.PI * 2);
                else ctx.rect(p.x - size / 2, p.y - size / 2, size, size);
                ctx.fill();
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    /* ---------------- teardown / write-back ---------------- */

    private finish(opts: ExitOptions) {
        if (this.disposed) return;
        this.disposed = true;
        this.drag = null;

        this.disposers.forEach((off) => off());
        this.disposers = [];
        window.removeEventListener('keydown', this.onKeyDown, true);

        const canvas = this.canvas;
        canvas.selection = this.prevSelection;
        canvas.skipTargetFind = this.prevSkipTargetFind;
        canvas.defaultCursor = this.prevDefaultCursor;

        const src = this.src;
        const wp = this.workingPath;
        let result: fabric.FabricObject = src;

        const parent: fabric.Group | undefined = (src as any).group;

        if (opts.commit && this.dirty) {
            const center = wp.getCenterPoint();

            if (src instanceof fabric.Path) {
                // Edit the original in place: keeps id, z-index, custom props, group data...
                (src as any).path = cloneCommands((wp as any).path);
                src.set({
                    width: wp.width,
                    height: wp.height,
                    pathOffset: new fabric.Point(wp.pathOffset.x, wp.pathOffset.y),
                } as any);
                // a group child is positioned in the group's plane
                const local = parent
                    ? center.transform(fabric.util.invertTransform(parent.calcTransformMatrix()))
                    : center;
                src.setPositionByOrigin(local, 'center', 'center');
                this.showSource();
                src.dirty = true;
                src.setCoords();
                canvas.remove(wp);
                if (parent) result = this.refitGroup(parent);
            } else {
                // Primitive -> becomes a Path at the same z-index.
                copyProps(src, wp, INTERACTION_PROPS);
                copyProps(src, wp, this.extraProps);
                wp.set({
                    originX: src.originX,
                    originY: src.originY,
                    excludeFromExport: !!(src as any).excludeFromExport,
                    visible: src.visible,
                } as any);
                wp.setPositionByOrigin(center, 'center', 'center');
                wp.dirty = true;
                wp.setCoords();
                editorObjects.delete(wp);
                this.showSource();
                if (parent) {
                    // swap inside the group; insertAt converts wp from the canvas plane
                    canvas.remove(wp);
                    const i = parent.getObjects().indexOf(src);
                    parent.remove(src);
                    parent.insertAt(Math.max(0, i), wp);
                    if ((parent as any).__box === src) (parent as any).__box = wp;
                    result = this.refitGroup(parent);
                } else {
                    canvas.remove(src);
                    result = wp;
                }
            }
            canvas.fire('object:modified', { target: result } as any);
        } else {
            // nothing changed (or cancelled): original stays exactly as it was
            this.showSource();
            canvas.remove(wp);
            if (parent) result = this.topLevel(parent);
        }

        if (opts.select) canvas.setActiveObject(result);
        else if (opts.event && this.opts.selectOnOutsideClick !== false)
            this.selectUnderPointer(opts.event);

        canvas.requestRenderAll();
        this.opts.onSelectionChange?.(null);
        this.opts.onExit?.(result, opts.commit && this.dirty, opts.point);
    }

    /** Skip drawing the source without changing any serialized property. */
    private hideSource() {
        (this.src as any).render = () => undefined;
        this.markParentsDirty();
    }

    private showSource() {
        if (this.srcRender.own) (this.src as any).render = this.srcRender.fn;
        else delete (this.src as any).render;
        this.markParentsDirty();
    }

    /** A cached group would keep drawing the old child. */
    private markParentsDirty() {
        for (let g: any = (this.src as any).group; g; g = g.group) g.set('dirty', true);
    }

    /** The outermost group (what sits on the canvas, gets selected and is saved). */
    private topLevel(obj: fabric.FabricObject): fabric.FabricObject {
        let top: any = obj;
        while (top.group) top = top.group;
        return top;
    }

    /** After a child changed: the group(s) re-fit their bounds (children keep their place). */
    private refitGroup(parent: fabric.Group): fabric.FabricObject {
        for (let g: any = parent; g; g = g.group) {
            g.triggerLayout?.();
            g.set('dirty', true);
            g.setCoords();
            g.getObjects().forEach((o: fabric.FabricObject) => o.setCoords()); // stale after layout
        }
        return this.topLevel(parent);
    }

    /** After an outside click we skipped target finding, so replay the selection ourselves. */
    private selectUnderPointer(e: Event) {
        try {
            const res: any = (this.canvas as any).findTarget(e);
            const target: any = res && res.target !== undefined ? res.target : res;
            if (target && target.selectable !== false) this.canvas.setActiveObject(target);
            else this.canvas.discardActiveObject();
        } catch {
            this.canvas.discardActiveObject();
        }
    }
}

/* ============================================================
   Node tool helpers
============================================================ */

/** Props a shape keeps when it becomes a path (identity, layers, links, animation). */
const CARRY_PROPS = ['id', 'name', 'data', 'customId', 'customType', 'shapeId', 'animId', 'linkId'];

/** Objects whose geometry must not be rewritten: connectors and their handles. */
const NOT_EDITABLE_TYPES = new Set(['connector', 'connector-handle']);

/**
 * What the node tool edits for a clicked object: a text shape (shape + text group) edits its
 * outline (`__box`), anything else edits itself. Null for a locked text shape.
 */
function nodeTarget(obj: any): any {
    if (!obj?.isTextShape) return obj;
    if (obj._locked) return null;
    return (
        obj.__box ??
        obj.getObjects?.().find((o: any) => o !== obj.__text && !(o instanceof fabric.Textbox)) ??
        null
    );
}

/** Can the node tool edit this object? (Unsupported geometry is rejected later by `start`.) */
function isEditable(obj: any): boolean {
    return (
        !!obj &&
        obj.visible !== false &&
        obj.evented !== false &&
        !obj.excludeFromExport &&
        !obj._locked &&
        (!obj.group || !!obj.group.isTextShape) &&
        !NOT_EDITABLE_TYPES.has(obj.customType) &&
        !isNodeEditorObject(obj) &&
        extractGeometry(obj) !== null
    );
}

/**
 * The editable object under a scene point: the TOPMOST object hit, or null when the topmost hit
 * cannot be edited (a click on text never edits the shape behind it).
 */
function editableAt(canvas: fabric.Canvas, point: Pt, skip?: unknown): fabric.FabricObject | null {
    const p = new fabric.Point(point.x, point.y);
    const objects = canvas.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj: any = objects[i];
        if (obj === skip || isNodeEditorObject(obj) || obj.visible === false) continue;
        if (obj.excludeFromExport) continue;
        if (!obj.containsPoint?.(p)) continue;
        if (obj.evented === false) return null;
        const target = nodeTarget(obj);
        return isEditable(target) ? target : null;
    }
    return null;
}

/** Text shape after its outline changed: centre the text on the outline, then re-wrap it. */
function refitText(group: any) {
    const box = group.__box;
    const text = group.__text;
    if (box && text) {
        const c = box.getRelativeCenterPoint(); // group plane, like the text's left / top
        text.setPositionByOrigin(c, 'center', 'center');
        text.setCoords();
    }
    fitTextShape(group);
}

/** The topmost selectable object under a scene point (for selecting after an edit). */
function objectAt(canvas: fabric.Canvas, point: Pt): fabric.FabricObject | null {
    const p = new fabric.Point(point.x, point.y);
    const objects = canvas.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj: any = objects[i];
        if (isNodeEditorObject(obj) || obj.visible === false || obj.excludeFromExport) continue;
        if (obj.selectable === false || obj.evented === false) continue;
        if (obj.containsPoint?.(p)) return obj;
    }
    return null;
}

const scenePointOf = (opt: any): Pt | null => {
    const p = opt?.scenePoint ?? opt?.absolutePointer ?? opt?.pointer;
    return p ? { x: p.x, y: p.y } : null;
};

const NODE_TOOL_CURSOR = 'crosshair';
const EDITABLE_HOVER_CURSOR = 'pointer';

/* ============================================================
   Zustand slice
   (set / get are the usual zustand setters; `canvas` lives in the store)

   Node tool (activeTool === 'node'): the canvas slice turns off Fabric selection; this slice
   listens for clicks: click a shape / path to edit its nodes, click another one to switch,
   click empty canvas to finish, Escape (nothing in edit) = back to Select. Leaving the tool
   commits the edit.

   From Select: double-click a shape = node tool on it; the edit then ends back in Select
   (Enter / Escape / Done keep it selected; a click away selects what is under the pointer).
============================================================ */
export const createNodeEditorSlice = (set: any, get: any, store?: any) => {
    /** The current edit was opened by a double-click in Select: finishing it returns to Select. */
    let returnToSelect = false;

    /** Starts editing `obj` (commits any edit in progress). Returns true when editing started. */
    const startEditing = (obj: fabric.FabricObject | null | undefined): boolean => {
        const { canvas, nodeEditor } = get();
        if (!canvas) return false;
        nodeEditor?.commit();
        obj = nodeTarget(obj);
        if (!obj || obj instanceof fabric.ActiveSelection || !isEditable(obj)) return false;

        const inTool = get().activeTool === 'node';
        if (inTool) canvas.defaultCursor = NODE_TOOL_CURSOR; // what the editor restores on exit

        const editor = PathNodeEditor.start(canvas, obj, {
            extraProps: CARRY_PROPS,
            selectOnOutsideClick: !inTool,
            onSelectionChange: (info) => set({ selectedNode: info }),
            onExit: (result, committed, point) => {
                set({ nodeMode: false, activePath: null, nodeEditor: null, selectedNode: null });
                // text shape: the text re-centres on the new outline and re-wraps to its width
                if (committed && (result as any)?.isTextShape) refitText(result);

                const back = returnToSelect;
                returnToSelect = false;
                if (get().activeTool !== 'node') return; // the tool changed: nothing more to do

                if (back) {
                    // opened by a double-click in Select: go back there
                    get().setActiveTool?.('select');
                    if (point) {
                        const hit = objectAt(canvas, point);
                        if (hit) canvas.setActiveObject(hit);
                        else canvas.discardActiveObject();
                        canvas.requestRenderAll();
                    }
                    return;
                }
                // node tool: the click that ended the edit may land on another shape -> edit it
                if (point) startEditing(editableAt(canvas, point));
            },
        });
        if (!editor) return false; // unsupported object type (text, image, group...)

        set({ nodeMode: true, activePath: editor.workingPath, nodeEditor: editor });
        return true;
    };

    /* ---- node tool listeners (attached while activeTool === 'node') ---- */
    let detachTool: (() => void) | null = null;

    const attachTool = (canvas: fabric.Canvas) => {
        detachTool?.();

        const onDown = (opt: any) => {
            if (get().nodeEditor || opt?.e?.button) return; // the editor handles its own clicks
            const point = scenePointOf(opt);
            if (!point) return;
            if (!startEditing(editableAt(canvas, point))) canvas.discardActiveObject();
        };
        const onMove = (opt: any) => {
            if (get().nodeEditor) return;
            const point = scenePointOf(opt);
            canvas.defaultCursor =
                point && editableAt(canvas, point) ? EDITABLE_HOVER_CURSOR : NODE_TOOL_CURSOR;
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || get().nodeEditor || canvasKeysBlocked()) return;
            const t = e.target as HTMLElement | null;
            if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
            get().setActiveTool?.('select');
        };

        const offs = [canvas.on('mouse:down', onDown), canvas.on('mouse:move', onMove)];
        window.addEventListener('keydown', onKey);
        detachTool = () => {
            offs.forEach((off) => off());
            window.removeEventListener('keydown', onKey);
            detachTool = null;
        };
    };

    /* ---- double-click in Select = edit nodes (attached for the canvas' lifetime) ---- */
    let detachDblClick: (() => void) | null = null;
    const attachDblClick = (canvas: fabric.Canvas) => {
        detachDblClick?.();
        const onDblClick = (opt: any) => {
            if (get().activeTool !== 'select' || get().nodeEditor) return;
            const target = opt?.target;
            // text shapes: a double-click edits their text (canvas slice); plain text too
            if (!target || target.isTextShape || !isEditable(nodeTarget(target))) return;
            canvas.setActiveObject(target);
            returnToSelect = true;
            get().setActiveTool?.('node'); // edits the active object
            if (!get().nodeEditor) returnToSelect = false;
        };
        const off = canvas.on('mouse:dblclick', onDblClick);
        detachDblClick = () => {
            off();
            detachDblClick = null;
        };
    };

    // Follow the tool and the canvas (mode switches replace the canvas).
    store?.subscribe?.((state: any, prevState: any) => {
        if (state.canvas !== prevState.canvas) {
            if (state.canvas) attachDblClick(state.canvas);
            else detachDblClick?.();
        }
        if (state.activeTool === prevState.activeTool && state.canvas === prevState.canvas) return;
        const wasNode = prevState.activeTool === 'node';
        const isNode = state.activeTool === 'node' && !!state.canvas;

        if (wasNode && state.activeTool !== 'node') state.nodeEditor?.commit();
        if (!isNode) {
            detachTool?.();
            return;
        }
        if (!detachTool || state.canvas !== prevState.canvas) attachTool(state.canvas);
    });

    return {
        nodeMode: false,
        /** The temporary working path while editing (null otherwise). */
        activePath: null as fabric.Path | null,
        nodeEditor: null as PathNodeEditor | null,
        selectedNode: null as NodeSelectionInfo | null,

        /** Edits the selected object's nodes (no-op for text, images, groups, locked objects). */
        enterNodeMode: () => {
            const canvas = get().canvas;
            if (!canvas) return;
            startEditing(canvas.getActiveObject());
        },

        /** Kept for backwards compatibility: the canvas argument is no longer needed. */
        exitNodeMode: (_canvas?: fabric.Canvas) => {
            get().nodeEditor?.commit();
        },

        cancelNodeMode: () => {
            get().nodeEditor?.cancel();
        },

        addNodeAt: (_canvas: fabric.Canvas | undefined, x: number, y: number) =>
            get().nodeEditor?.addNodeAtPoint({ x, y }) ?? false,

        deleteSelectedNode: () => get().nodeEditor?.deleteSelected() ?? false,

        toggleSelectedNodeType: () => get().nodeEditor?.toggleSelectedType() ?? false,

        /* ---- node toolbar ---- */
        /** Adds a node in the middle of the segment after the selected node. */
        addNodeToPath: (): boolean => get().nodeEditor?.addNodeAfterSelected() ?? false,
        setSelectedNodeType: (type: NodeType): boolean =>
            get().nodeEditor?.setSelectedType(type) ?? false,
        /** Segments next to the selected node: straight lines or curves. */
        setSelectedSegments: (kind: SegmentKind): boolean =>
            get().nodeEditor?.setSelectedSegments(kind) ?? false,
        /** Close / open the selected node's sub-path. */
        setPathClosed: (closed: boolean): boolean =>
            get().nodeEditor?.setSelectedPathClosed(closed) ?? false,
        breakPathAtSelectedNode: (): boolean => get().nodeEditor?.breakAtSelected() ?? false,
        /** x / y in canvas (document) px. */
        moveSelectedNode: (x: number, y: number): boolean =>
            get().nodeEditor?.moveSelectedTo({ x, y }) ?? false,
    };
};
