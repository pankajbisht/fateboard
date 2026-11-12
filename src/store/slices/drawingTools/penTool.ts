/**
 * Pen tool (P), Figma / Illustrator style, in three modes (`penMode`, the Pen options bar):
 * - Pen: click = corner point, drag = smooth point (symmetric handles). Shift = 45° steps (segment
 *   and handle); Alt while dragging = move only the outgoing handle (a sharp curve corner).
 *   Clicking an end of an open path continues that path (edited in place, `penContinue.ts`).
 * - Curvature: click points, the curve bends smoothly through them (`smoothNodes`); Alt + click =
 *   a sharp corner; Shift = 45° steps.
 * - Freeform: drag by hand; the stroke is simplified into a smooth path, closed when it ends near
 *   its start.
 * Pen / Curvature: click the first point again = closed shape, Enter / Escape / double-click =
 * finish an open path, Backspace = remove the last point. The result is ONE object (one undo step,
 * autosaved), selected in the Select tool so the Node tool can edit it; its look comes from
 * `penStyle` (`penStyle.ts`).
 *
 * State lives in this closure (createDrawingToolsSlice owns one per store). The preview is painted
 * on `canvas.contextTop`: no helper objects on the canvas.
 */
import * as fabric from 'fabric';
import { BRAND } from '@/lib/theme';
import {
    constrainAngle,
    mirrorHandle,
    penPathData,
    simplifyPoints,
    smoothNodes,
    type CurvePoint,
    type PenNode,
    type PenPoint,
} from '@/lib/canvas/penPath';
import { screenScale } from '@/lib/canvas/screenScale';
import { findContinuable, replacePathGeometry } from './penContinue';
import { penArrowData, penStrokeProps, type PenMode, type PenStyle } from './penStyle';
import { shapedOutline } from '@/lib/canvas/penShape';
import {
    distance,
    isPrimary,
    keyIsNotOurs,
    scenePointOf,
    traceNodes,
    withSceneContext,
    type Pointer,
} from './shared';

/* screen px */
const CLOSE_RADIUS = 8;
const DRAG_MIN = 3;
const ANCHOR_SIZE = 7;
const HANDLE_RADIUS = 3.5;
const PREVIEW_WIDTH = 1.5;
/** Freeform: how far the simplified path may stray from the hand-drawn stroke. */
const FREEFORM_TOLERANCE = 2.5;

/** Same "no fill" as open shapes (createShapeSlice). */
const NO_FILL = 'rgba(0,0,0,0)';

export type PenToolDeps = {
    canvas: () => fabric.Canvas | null | undefined;
    /** Points placed so far changed (the slice mirrors it in `penPointCount`). */
    onCount: (count: number) => void;
    /** Creation scale of new objects (design board fit), see `creationScaleOf`. */
    creationScale: () => number;
    setActiveTool: (tool: string) => void;
    setToolbar: (target: fabric.Object) => void;
    style: () => PenStyle;
    mode: () => PenMode;
};

export function createPenTool(deps: PenToolDeps) {
    /** Pen mode anchors (with handles). */
    let nodes: PenNode[] = [];
    /** Curvature mode points (handles are derived). */
    let curve: CurvePoint[] = [];
    /** Freeform stroke being dragged (null = not dragging). */
    let free: PenPoint[] | null = null;
    let dragging = false;
    let hover: PenPoint | null = null;
    let detach: (() => void) | null = null;
    /** An existing open path being continued (edited in place on finish). */
    let continuing: fabric.Path | null = null;
    /** Its anchors as loaded: finishing with these unchanged must not touch the object. */
    let loaded: PenNode[] | null = null;
    /** Freeform repaints at most once per frame. */
    let frame = 0;

    const curvature = () => deps.mode() === 'curvature';
    /** The clicked anchors of the current mode. */
    const anchors = (): PenPoint[] => (curvature() ? curve : nodes);
    const count = () => anchors().length;
    const setPointCount = () => deps.onCount(count());
    const dropLast = () => {
        if (curvature()) curve = curve.slice(0, -1);
        else nodes = nodes.slice(0, -1);
    };

    const nearFirst = (canvas: fabric.Canvas, p: PenPoint) =>
        count() >= 2 && distance(p, anchors()[0]) <= CLOSE_RADIUS / screenScale(canvas);

    /** What the preview draws: the placed path plus the rubber band to the pointer. */
    const preview = (closing: boolean): PenNode[] => {
        if (free) return free;
        if (curvature()) {
            if (closing) {
                const closed = smoothNodes(curve, true);
                return [...closed, closed[0]];
            }
            return smoothNodes(hover ? [...curve, hover] : curve);
        }
        return hover && !dragging ? [...nodes, closing ? nodes[0] : hover] : nodes;
    };

    const paint = (canvas: fabric.Canvas) =>
        withSceneContext(canvas, (ctx) => {
            const placed = free ?? anchors();
            if (!placed.length) return;
            const z = screenScale(canvas);
            const closing = !!hover && nearFirst(canvas, hover);
            const path = preview(closing);

            ctx.lineWidth = PREVIEW_WIDTH / z;
            ctx.strokeStyle = BRAND.primary;
            ctx.lineJoin = 'round';
            if (path.length > 1) {
                traceNodes(ctx, path);
                ctx.stroke();
            }
            if (free) return;

            // Pen: handles of the point being dragged
            const last = nodes[nodes.length - 1];
            ctx.fillStyle = '#ffffff';
            for (const h of curvature() || !last ? [] : [last.in, last.out]) {
                if (!h) continue;
                ctx.beginPath();
                ctx.moveTo(last.x, last.y);
                ctx.lineTo(h.x, h.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(h.x, h.y, HANDLE_RADIUS / z, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // anchors; the first one is drawn bigger and filled when a click would close the shape
            placed.forEach((n, i) => {
                const size = (i === 0 && closing ? ANCHOR_SIZE * 1.5 : ANCHOR_SIZE) / z;
                ctx.fillStyle = i === 0 && closing ? BRAND.primary : '#ffffff';
                ctx.fillRect(n.x - size / 2, n.y - size / 2, size, size);
                ctx.strokeRect(n.x - size / 2, n.y - size / 2, size, size);
            });
        });

    const reset = () => {
        nodes = [];
        curve = [];
        free = null;
        dragging = false;
        hover = null;
        continuing = null;
        loaded = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        setPointCount();
        const canvas = deps.canvas();
        if (canvas) withSceneContext(canvas, () => undefined); // clear the preview
    };

    const select = (canvas: fabric.Canvas, target: fabric.Object, keepTool: boolean) => {
        if (!keepTool) deps.setActiveTool('select');
        canvas.setActiveObject(target);
        deps.setToolbar(target);
        canvas.requestRenderAll();
    };

    /** Builds the path from `placed` anchors; `keepTool` = the tool is already changing. */
    const build = (placed: PenNode[], close: boolean, keepTool: boolean) => {
        const canvas = deps.canvas();
        // a path that left the canvas meanwhile (undo, another page) is not edited
        const target = continuing && canvas?.getObjects().includes(continuing) ? continuing : null;
        const unchanged = !!target && placed === loaded && !close;
        reset();
        if (!canvas || placed.length < 2) return;
        if (unchanged) {
            select(canvas, target, keepTool); // clicked its end, added nothing: leave it as it was
            return;
        }
        try {
            const style = deps.style();
            const fill = close && style.fillEnabled ? style.fill : NO_FILL;
            if (target) {
                replacePathGeometry(canvas, target, penPathData(placed, close), {
                    ...(close && style.fillEnabled && { fill }),
                });
                select(canvas, target, keepTool);
                return;
            }
            const width = style.strokeWidth * deps.creationScale();
            // Shape (Inkscape): an open path becomes one filled outline, thin / thick along its length
            const outline =
                !close && style.shape !== 'none'
                    ? shapedOutline(placed, style.shape, style.shapeWidth * deps.creationScale())
                    : '';
            const d =
                outline ||
                penPathData(placed, close) + (close ? '' : penArrowData(placed, style, width));
            const path = new fabric.Path(d, {
                originX: 'left',
                originY: 'top',
                fill,
                stroke: style.stroke,
                strokeWidth: width,
                strokeUniform: true,
                ...penStrokeProps(style, width),
                objectCaching: false,
                ...(outline && {
                    fill: style.stroke,
                    stroke: null,
                    strokeWidth: 0,
                    strokeDashArray: null,
                }),
            });
            Object.assign(path, { customType: 'shape', name: 'Path' });
            canvas.add(path); // history + autosave + layers follow object:added
            select(canvas, path, keepTool);
        } catch (error) {
            console.error('[pen] could not create the path', error);
        }
    };

    /** Ends the Pen / Curvature path: closed (back to the first point) or open. */
    const finish = (close: boolean, keepTool: boolean) =>
        build(curvature() ? smoothNodes(curve, close) : nodes, close, keepTool);

    /** Freeform: the dragged stroke -> a smooth path (closed when it ends near its start). */
    const finishFreeform = (canvas: fabric.Canvas, keepTool = false) => {
        const z = screenScale(canvas);
        const pts = simplifyPoints(free ?? [], FREEFORM_TOLERANCE / z);
        const first = pts[0];
        const last = pts[pts.length - 1];
        const closed = pts.length >= 4 && distance(first, last) <= (CLOSE_RADIUS * 2) / z;
        build(smoothNodes(closed ? pts.slice(0, -1) : pts, closed), closed, keepTool);
    };

    const attach = (canvas: fabric.Canvas) => {
        detach?.();
        const constrained = (opt: Pointer, raw: PenPoint) => {
            const last = anchors()[count() - 1];
            return opt.e?.shiftKey && last ? constrainAngle(last, raw) : raw;
        };

        const onDown = (opt: Pointer) => {
            if (!isPrimary(opt)) return;
            const raw = scenePointOf(opt);
            if (!raw) return;
            if (deps.mode() === 'freeform') {
                free = [raw];
                paint(canvas);
                return;
            }
            if (nearFirst(canvas, raw)) {
                finish(true, false);
                return;
            }
            if (!count() && deps.mode() === 'pen') {
                const found = findContinuable(canvas, raw, CLOSE_RADIUS / screenScale(canvas));
                if (found) {
                    continuing = found.target;
                    nodes = found.nodes;
                    loaded = nodes;
                    setPointCount();
                    paint(canvas);
                    return;
                }
            }
            const p = constrained(opt, raw);
            if (curvature()) curve = [...curve, { x: p.x, y: p.y, corner: !!opt.e?.altKey }];
            else {
                nodes = [...nodes, { x: p.x, y: p.y }];
                dragging = true;
            }
            setPointCount();
            paint(canvas);
        };
        const onMove = (opt: Pointer) => {
            const raw = scenePointOf(opt);
            if (!raw) return;
            if (free) {
                if (distance(raw, free[free.length - 1]) > 1 / screenScale(canvas)) free.push(raw);
                if (!frame)
                    frame = requestAnimationFrame(() => {
                        frame = 0;
                        paint(canvas);
                    });
                return;
            }
            const p = constrained(opt, raw);
            hover = p;
            const last = nodes[nodes.length - 1];
            if (dragging && last && distance(p, last) > DRAG_MIN / screenScale(canvas)) {
                // drag = smooth point: the handle follows the pointer, its twin mirrors it;
                // Alt = only the outgoing handle moves (the incoming one stays: a cusp)
                const moved = opt.e?.altKey
                    ? { ...last, out: p }
                    : { ...last, out: p, in: mirrorHandle(last, p) };
                nodes = [...nodes.slice(0, -1), moved];
            }
            paint(canvas);
        };
        const onUp = () => {
            if (free) {
                finishFreeform(canvas);
                return;
            }
            dragging = false;
            paint(canvas);
        };
        const onDblClick = () => {
            if (deps.mode() === 'freeform') return;
            // a double-click placed the same point twice: drop the copy, finish the open path
            const [a, b] = anchors().slice(-2);
            if (a && b && distance(a, b) <= CLOSE_RADIUS / screenScale(canvas)) dropLast();
            finish(false, false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (keyIsNotOurs(e)) return;
            const handled = () => {
                e.preventDefault();
                e.stopImmediatePropagation(); // e.g. Backspace must not also delete the selection
            };
            if (e.key === 'Enter' && count()) {
                handled();
                finish(false, false);
            } else if (e.key === 'Escape') {
                handled();
                if (count()) finish(false, false);
                else deps.setActiveTool('select');
            } else if ((e.key === 'Backspace' || e.key === 'Delete') && count()) {
                handled();
                dropLast();
                setPointCount();
                paint(canvas);
            }
        };

        const offs = [
            canvas.on('mouse:down', onDown as never),
            canvas.on('mouse:move', onMove as never),
            canvas.on('mouse:up', onUp),
            canvas.on('mouse:dblclick', onDblClick),
        ];
        window.addEventListener('keydown', onKey, true); // before the shortcut hook
        detach = () => {
            offs.forEach((off) => off());
            window.removeEventListener('keydown', onKey, true);
            detach = null;
        };
    };

    return {
        attach,
        detach: () => detach?.(),
        isAttached: () => !!detach,
        finish,
        reset,
        pointCount: count,
        /** Mode or tool changes: keep a path of two points or more (or a Freeform drag). */
        commit: () => {
            const canvas = deps.canvas();
            if (free && canvas) finishFreeform(canvas, true);
            else if (count() >= 2) finish(false, true);
            else reset();
        },
    };
}
