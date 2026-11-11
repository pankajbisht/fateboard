/**
 * Pen tool (P) and Laser pointer (K). The Pencil (Shift + P) is the brush slice in drawing mode.
 *
 * Pen (Figma / Illustrator): click = corner point, drag = smooth point (symmetric handles), click
 * the first point again = closed shape, Enter / Escape / double-click = finish an open path,
 * Backspace = remove the last point. The finished path is ONE object (one undo step, autosaved),
 * selected in the Select tool so the Node tool can edit it. Changing tool keeps a path that has
 * two points or more.
 *
 * Laser (Excalidraw / FigJam): drag to draw a red trail that fades within `LASER_LIFE_MS`. It is
 * painted on the top canvas only: never part of the document, the history or an export.
 *
 * Both preview on `canvas.contextTop` (no helper objects on the canvas). Sizes are SCREEN px
 * (`screenScale`: viewport zoom × the design board's CSS fit). Listeners are attached while the
 * tool is active and removed when it changes or the canvas is replaced.
 */
import * as fabric from 'fabric';
import type { SliceCreator } from '../types';
import { BRAND } from '@/lib/theme';
import { PAINT_DEFAULTS } from '@/lib/paintToggle';
import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { mirrorHandle, penPathData, type PenNode, type PenPoint } from '@/lib/canvas/penPath';
import {
    LASER_LIFE_MS,
    laserAlpha,
    liveLaserStrokes,
    type LaserStroke,
} from '@/lib/canvas/laserTrail';
import { screenScale } from './createNodeEditorSlice';

export interface DrawingToolsSlice {
    /** Points placed so far in the Pen path being drawn (0 = none). */
    penPointCount: number;
    /** Laser strokes still visible (they fade out). */
    laserStrokeCount: number;
    /** Ends the Pen path: closed (back to the first point) or open. Under two points it cancels. */
    finishPenPath: (options?: { close?: boolean }) => void;
    /** Drops the Pen path being drawn. */
    cancelPenPath: () => void;
}

/* screen px */
const CLOSE_RADIUS = 8;
const DRAG_MIN = 3;
const ANCHOR_SIZE = 7;
const HANDLE_RADIUS = 3.5;
const PREVIEW_WIDTH = 1.5;
const LASER_WIDTH = 4;
const LASER_COLOR = '255, 59, 48';

/** Same "no fill" as open shapes (createShapeSlice). */
const NO_FILL = 'rgba(0,0,0,0)';

type Pointer = { e?: { button?: number }; scenePoint?: PenPoint; absolutePointer?: PenPoint };
const scenePointOf = (opt: Pointer): PenPoint | null => {
    const p = opt?.scenePoint ?? opt?.absolutePointer;
    return p ? { x: p.x, y: p.y } : null;
};
const isPrimary = (opt: Pointer) => !opt?.e?.button;
const distance = (a: PenPoint, b: PenPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** A key the editor should leave alone: a modal is open, or the user is typing in a field. */
const keyIsNotOurs = (e: KeyboardEvent) => {
    if (canvasKeysBlocked()) return true;
    const t = e.target as HTMLElement | null;
    return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
};

/** Fabric's top canvas, in scene coordinates. Null when there is nothing to paint on. */
const withSceneContext = (
    canvas: fabric.Canvas,
    paint: (ctx: CanvasRenderingContext2D) => void,
) => {
    const ctx = (canvas as unknown as { contextTop?: CanvasRenderingContext2D }).contextTop;
    if (!ctx) return;
    canvas.clearContext(ctx);
    const v = canvas.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    paint(ctx);
    ctx.restore();
};

const traceNodes = (ctx: CanvasRenderingContext2D, nodes: readonly PenNode[]) => {
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1];
        const b = nodes[i];
        if (a.out || b.in) {
            const c1 = a.out ?? a;
            const c2 = b.in ?? b;
            ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
        } else ctx.lineTo(b.x, b.y);
    }
};

export const createDrawingToolsSlice: SliceCreator<DrawingToolsSlice> = (set, get, store) => {
    type Peers = DrawingToolsSlice & {
        canvas?: fabric.Canvas | null;
        activeTool?: string;
        setActiveTool?: (tool: string) => void;
        setToolbar?: (e: { target: fabric.Object }) => void;
    };
    const peers = () => get() as unknown as Peers;

    /* ------------------------------- Pen ------------------------------- */

    let nodes: PenNode[] = [];
    let dragging = false;
    let hover: PenPoint | null = null;
    let detachPen: (() => void) | null = null;

    const setPointCount = () => {
        if (get().penPointCount !== nodes.length)
            set({ penPointCount: nodes.length }, false, 'pen/points');
    };

    const nearFirst = (canvas: fabric.Canvas, p: PenPoint) =>
        nodes.length >= 2 && distance(p, nodes[0]) <= CLOSE_RADIUS / screenScale(canvas);

    const paintPen = (canvas: fabric.Canvas) =>
        withSceneContext(canvas, (ctx) => {
            if (!nodes.length) return;
            const z = screenScale(canvas);
            const closing = !!hover && nearFirst(canvas, hover);
            const rubber = hover && !dragging ? [...nodes, closing ? nodes[0] : hover] : nodes;

            ctx.lineWidth = PREVIEW_WIDTH / z;
            ctx.strokeStyle = BRAND.primary;
            ctx.lineJoin = 'round';
            if (rubber.length > 1) {
                traceNodes(ctx, rubber);
                ctx.stroke();
            }

            // handles of the point being dragged
            const last = nodes[nodes.length - 1];
            ctx.fillStyle = '#ffffff';
            for (const h of [last.in, last.out]) {
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
            nodes.forEach((n, i) => {
                const size = (i === 0 && closing ? ANCHOR_SIZE * 1.5 : ANCHOR_SIZE) / z;
                ctx.fillStyle = i === 0 && closing ? BRAND.primary : '#ffffff';
                ctx.fillRect(n.x - size / 2, n.y - size / 2, size, size);
                ctx.strokeRect(n.x - size / 2, n.y - size / 2, size, size);
            });
        });

    const resetPen = () => {
        nodes = [];
        dragging = false;
        hover = null;
        setPointCount();
        const canvas = peers().canvas;
        if (canvas) withSceneContext(canvas, () => undefined); // clear the preview
    };

    /** Builds the path; `keepTool` = the tool is already changing (don't switch to Select). */
    const finish = (close: boolean, keepTool: boolean) => {
        const canvas = peers().canvas;
        const placed = nodes;
        if (!canvas || placed.length < 2) {
            resetPen();
            return;
        }
        const d = penPathData(placed, close);
        resetPen();
        try {
            const k = creationScaleOf(get() as never);
            const path = new fabric.Path(d, {
                originX: 'left',
                originY: 'top',
                fill: NO_FILL,
                stroke: PAINT_DEFAULTS.shape.stroke,
                strokeWidth: PAINT_DEFAULTS.shape.strokeWidth * k,
                strokeUniform: true,
                strokeLineJoin: 'round',
                strokeLineCap: 'round',
                objectCaching: false,
            });
            Object.assign(path, { customType: 'shape', name: 'Path' });
            canvas.add(path); // history + autosave + layers follow object:added
            if (!keepTool) peers().setActiveTool?.('select');
            canvas.setActiveObject(path);
            peers().setToolbar?.({ target: path });
            canvas.requestRenderAll();
        } catch (error) {
            console.error('[pen] could not create the path', error);
        }
    };

    const attachPen = (canvas: fabric.Canvas) => {
        detachPen?.();

        const onDown = (opt: Pointer) => {
            if (!isPrimary(opt)) return;
            const p = scenePointOf(opt);
            if (!p) return;
            if (nearFirst(canvas, p)) {
                finish(true, false);
                return;
            }
            nodes = [...nodes, { x: p.x, y: p.y }];
            dragging = true;
            setPointCount();
            paintPen(canvas);
        };
        const onMove = (opt: Pointer) => {
            const p = scenePointOf(opt);
            if (!p) return;
            hover = p;
            const last = nodes[nodes.length - 1];
            if (dragging && last && distance(p, last) > DRAG_MIN / screenScale(canvas)) {
                // drag = smooth point: the handle follows the pointer, its twin mirrors it
                nodes = [...nodes.slice(0, -1), { ...last, out: p, in: mirrorHandle(last, p) }];
            }
            paintPen(canvas);
        };
        const onUp = () => {
            dragging = false;
            paintPen(canvas);
        };
        const onDblClick = () => {
            // a double-click placed the same point twice: drop the copy, finish the open path
            const [a, b] = nodes.slice(-2);
            if (a && b && distance(a, b) <= CLOSE_RADIUS / screenScale(canvas))
                nodes = nodes.slice(0, -1);
            finish(false, false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (keyIsNotOurs(e)) return;
            const handled = () => {
                e.preventDefault();
                e.stopImmediatePropagation(); // e.g. Backspace must not also delete the selection
            };
            if (e.key === 'Enter' && nodes.length) {
                handled();
                finish(false, false);
            } else if (e.key === 'Escape') {
                handled();
                if (nodes.length) finish(false, false);
                else peers().setActiveTool?.('select');
            } else if ((e.key === 'Backspace' || e.key === 'Delete') && nodes.length) {
                handled();
                nodes = nodes.slice(0, -1);
                setPointCount();
                paintPen(canvas);
            }
        };

        const offs = [
            canvas.on('mouse:down', onDown as never),
            canvas.on('mouse:move', onMove as never),
            canvas.on('mouse:up', onUp),
            canvas.on('mouse:dblclick', onDblClick),
        ];
        window.addEventListener('keydown', onKey, true); // before the shortcut hook
        detachPen = () => {
            offs.forEach((off) => off());
            window.removeEventListener('keydown', onKey, true);
            detachPen = null;
        };
    };

    /* ------------------------------ Laser ------------------------------ */

    let strokes: LaserStroke[] = [];
    let laserDown = false;
    let frame = 0;
    let detachLaser: (() => void) | null = null;

    const setStrokeCount = () => {
        if (get().laserStrokeCount !== strokes.length)
            set({ laserStrokeCount: strokes.length }, false, 'laser/strokes');
    };

    const paintLaser = (canvas: fabric.Canvas, now: number) =>
        withSceneContext(canvas, (ctx) => {
            const z = screenScale(canvas);
            ctx.lineWidth = LASER_WIDTH / z;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = `rgba(${LASER_COLOR}, 0.6)`;
            ctx.shadowBlur = 8;
            for (const stroke of strokes) {
                for (let i = 1; i < stroke.length; i++) {
                    const a = stroke[i - 1];
                    const b = stroke[i];
                    ctx.strokeStyle = `rgba(${LASER_COLOR}, ${laserAlpha(now - b.t)})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        });

    const tick = () => {
        frame = 0;
        const canvas = peers().canvas;
        const now = performance.now();
        strokes = liveLaserStrokes(strokes, now);
        setStrokeCount();
        if (canvas) paintLaser(canvas, now);
        if (strokes.length || laserDown) frame = requestAnimationFrame(tick);
    };
    const keepFading = () => {
        if (!frame) frame = requestAnimationFrame(tick);
    };

    const attachLaser = (canvas: fabric.Canvas) => {
        detachLaser?.();
        const add = (p: PenPoint, newStroke: boolean) => {
            const point = { x: p.x, y: p.y, t: performance.now() };
            strokes = newStroke
                ? [...strokes, [point]]
                : [...strokes.slice(0, -1), [...(strokes[strokes.length - 1] ?? []), point]];
            setStrokeCount();
            keepFading();
        };
        const onDown = (opt: Pointer) => {
            const p = scenePointOf(opt);
            if (!isPrimary(opt) || !p) return;
            laserDown = true;
            add(p, true);
        };
        const onMove = (opt: Pointer) => {
            const p = scenePointOf(opt);
            if (laserDown && p) add(p, false);
        };
        const onUp = () => {
            laserDown = false;
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || keyIsNotOurs(e)) return;
            peers().setActiveTool?.('select');
        };
        const offs = [
            canvas.on('mouse:down', onDown as never),
            canvas.on('mouse:move', onMove as never),
            canvas.on('mouse:up', onUp),
        ];
        window.addEventListener('keydown', onKey);
        detachLaser = () => {
            offs.forEach((off) => off());
            window.removeEventListener('keydown', onKey);
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            strokes = [];
            laserDown = false;
            setStrokeCount();
            withSceneContext(canvas, () => undefined);
            detachLaser = null;
        };
    };

    /* ------------------- follow the tool and the canvas ------------------- */

    store?.subscribe?.((state, prevState) => {
        const next = state as unknown as Peers;
        const prev = prevState as unknown as Peers;
        if (next.activeTool === prev.activeTool && next.canvas === prev.canvas) return;

        // Pen: leaving the tool keeps a path of two points or more
        if (
            prev.activeTool === 'pen' &&
            (next.activeTool !== 'pen' || next.canvas !== prev.canvas)
        ) {
            if (next.canvas === prev.canvas && nodes.length >= 2) finish(false, true);
            else resetPen();
            detachPen?.();
        }
        if (next.activeTool === 'pen' && next.canvas && !detachPen) attachPen(next.canvas);

        if (prev.activeTool === 'laser' || next.canvas !== prev.canvas) detachLaser?.();
        if (next.activeTool === 'laser' && next.canvas && !detachLaser) attachLaser(next.canvas);
    });

    return {
        penPointCount: 0,
        laserStrokeCount: 0,
        finishPenPath: ({ close = false } = {}) => finish(close, false),
        cancelPenPath: () => resetPen(),
    };
};

/** Fade time of the laser trail, for the Help text and tests. */
export const LASER_TRAIL_MS = LASER_LIFE_MS;
