/**
 * Pen tool (P) and Laser pointer (K). The Pencil (Shift + P) is the brush slice in drawing mode.
 *
 * Pen (Figma / Illustrator): see `drawingTools/penTool.ts`. Changing tool keeps a path that has
 * two points or more.
 *
 * Laser (Excalidraw / FigJam): drag to draw a red trail that fades within `LASER_LIFE_MS`. It is
 * painted on the top canvas only: never part of the document, the history or an export.
 *
 * Both preview on `canvas.contextTop` (no helper objects on the canvas). Sizes are SCREEN px
 * (`screenScale`: viewport zoom × the design board's CSS fit). Listeners are attached while the
 * tool is active and removed when it changes or the canvas is replaced.
 */
import type * as fabric from 'fabric';
import type { SliceCreator } from '../types';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import type { PenPoint } from '@/lib/canvas/penPath';
import {
    LASER_LIFE_MS,
    laserAlpha,
    liveLaserStrokes,
    type LaserStroke,
} from '@/lib/canvas/laserTrail';
import { screenScale } from '@/lib/canvas/screenScale';
import { createPenTool } from './drawingTools/penTool';
import {
    DEFAULT_PEN_STYLE,
    isPenMode,
    sanitizePenStyle,
    type PenMode,
    type PenStyle,
} from './drawingTools/penStyle';
import { DEFAULT_PENCIL_STYLE, sanitizePencilStyle, type PencilStyle } from '../pencilStyle';
import { DEFAULT_NIB_STYLE, sanitizeNibStyle, type NibStyle } from '../nibStyle';
import {
    isPrimary,
    keyIsNotOurs,
    scenePointOf,
    withSceneContext,
    type Pointer,
} from './drawingTools/shared';

export interface DrawingToolsSlice {
    /** Points placed so far in the Pen path being drawn (0 = none). */
    penPointCount: number;
    /** Laser strokes still visible (they fade out). */
    laserStrokeCount: number;
    /** Ends the Pen path: closed (back to the first point) or open. Under two points it cancels. */
    finishPenPath: (options?: { close?: boolean }) => void;
    /** Drops the Pen path being drawn. */
    cancelPenPath: () => void;
    /** Stroke / fill of new Pen paths (the Pen options bar). */
    penStyle: PenStyle;
    setPenStyle: (patch: Partial<PenStyle>) => void;
    /** Pen (click / drag points), Curvature (click, smooth through) or Freeform (drag by hand). */
    penMode: PenMode;
    /** Switching keeps a path of two points or more that is being drawn. */
    setPenMode: (mode: PenMode) => void;
    /** Thickness, opacity, smoothing, pressure, auto-close of the Pencil (its options bar). */
    pencilStyle: PencilStyle;
    setPencilStyle: (patch: Partial<PencilStyle>) => void;
    /** Calligraphy pen (brush `nib`): thinning, angle, fixation, caps. Read by the Brush slice. */
    nibStyle: NibStyle;
    setNibStyle: (patch: Partial<NibStyle>) => void;
}

/* screen px */
const LASER_WIDTH = 4;
const LASER_COLOR = '255, 59, 48';

export const createDrawingToolsSlice: SliceCreator<DrawingToolsSlice> = (set, get, store) => {
    type Peers = DrawingToolsSlice & {
        canvas?: fabric.Canvas | null;
        activeTool?: string;
        setActiveTool?: (tool: string) => void;
        setToolbar?: (e: { target: fabric.Object }) => void;
        currentPageId?: string | null;
        isPageSwitching?: boolean;
    };
    const peers = () => get() as unknown as Peers;

    /* ------------------------------- Pen ------------------------------- */

    const pen = createPenTool({
        canvas: () => peers().canvas,
        onCount: (count) => {
            if (get().penPointCount !== count) set({ penPointCount: count }, false, 'pen/points');
        },
        creationScale: () => creationScaleOf(get() as never),
        setActiveTool: (tool) => peers().setActiveTool?.(tool),
        setToolbar: (target) => peers().setToolbar?.({ target }),
        style: () => get().penStyle,
        mode: () => get().penMode,
    });

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
        // another page is loading: a path in progress belongs to the page it was started on
        if (
            next.currentPageId !== prev.currentPageId ||
            (next.isPageSwitching && !prev.isPageSwitching)
        )
            pen.reset();
        if (next.activeTool === prev.activeTool && next.canvas === prev.canvas) return;

        // Pen: leaving the tool keeps a path of two points or more
        if (
            prev.activeTool === 'pen' &&
            (next.activeTool !== 'pen' || next.canvas !== prev.canvas)
        ) {
            if (next.canvas === prev.canvas) pen.commit();
            else pen.reset();
            pen.detach();
        }
        if (next.activeTool === 'pen' && next.canvas && !pen.isAttached()) pen.attach(next.canvas);

        if (prev.activeTool === 'laser' || next.canvas !== prev.canvas) detachLaser?.();
        if (next.activeTool === 'laser' && next.canvas && !detachLaser) attachLaser(next.canvas);
    });

    return {
        penPointCount: 0,
        laserStrokeCount: 0,
        finishPenPath: ({ close = false } = {}) => pen.finish(close, false),
        cancelPenPath: () => pen.reset(),
        penStyle: DEFAULT_PEN_STYLE,
        setPenStyle: (patch) =>
            set({ penStyle: sanitizePenStyle(get().penStyle, patch) }, false, 'pen/style'),
        penMode: 'pen',
        setPenMode: (mode) => {
            if (!isPenMode(mode) || mode === get().penMode) return;
            pen.commit();
            set({ penMode: mode }, false, 'pen/mode');
        },
        pencilStyle: DEFAULT_PENCIL_STYLE,
        setPencilStyle: (patch) => {
            set(
                { pencilStyle: sanitizePencilStyle(get().pencilStyle, patch) },
                false,
                'pencil/style',
            );
            // the open Pencil draws with it right away (brush slice rebuilds from drawingState)
            const s = get() as unknown as {
                activeTool?: string;
                updateBrush?: (p: object) => void;
            };
            if (s.activeTool === 'pencil') s.updateBrush?.({});
        },

        nibStyle: DEFAULT_NIB_STYLE,
        setNibStyle: (patch) => {
            set({ nibStyle: sanitizeNibStyle(get().nibStyle, patch) }, false, 'nib/style');
            const s = get() as unknown as { brush?: string; updateBrush?: (p: object) => void };
            if (s.brush === 'nib') s.updateBrush?.({}); // the open Calligraphy pen draws with it now
        },
    };
};

/** Fade time of the laser trail, for the Help text and tests. */
export const LASER_TRAIL_MS = LASER_LIFE_MS;
