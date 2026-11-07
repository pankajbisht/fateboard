import * as fabric from 'fabric';
import type { SliceCreator } from '../types';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export interface NotebookSlice {
    gridEnabled: boolean;
    gridSize: number;

    /** Master switch for all snapping (grid + objects). */
    snapEnabled: boolean;
    /** Snap to edges / centres of other objects ("smart guides"). */
    snapToObjects: boolean;
    /** Snap distance in SCREEN pixels (converted to canvas units using zoom). */
    snapThreshold: number;

    setGridEnabled: (enabled: boolean) => void;
    toggleGrid: () => void;
    setGridSize: (size: number) => void;

    setSnapEnabled: (enabled: boolean) => void;
    toggleSnap: () => void;
    setSnapToObjects: (enabled: boolean) => void;
    toggleSnapToObjects: () => void;
    setSnapThreshold: (px: number) => void;

    /** Force a redraw of the grid (kept for backwards compatibility). */
    drawGrid: () => void;
}

/** Set `excludeFromSnap = true` on any object that must never snap or be snapped to (node handles, helpers...). */
type SnapTarget = fabric.FabricObject & { excludeFromSnap?: boolean };

type Axis = 'x' | 'y';
type SnapKind = 'grid' | 'object';

interface AxisSnap {
    delta: number;
    line: number | null;
    kind: SnapKind | null;
}

interface Guide {
    axis: Axis;
    pos: number; // canvas (scene) coordinate of the line
    from: number | null; // segment start along the other axis; null = full length
    to: number | null;
    kind: SnapKind;
}

interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
    cx: number;
    cy: number;
}

interface Reference {
    boxes: Box[];
    xs: number[]; // every vertical snap line of every other object
    ys: number[]; // every horizontal snap line of every other object
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

/** Flip to true to log what the snapper sees in the browser console. */
const DEBUG_SNAP = false;

/**
 * true  => grid is painted behind your shapes (like Figma / Illustrator / Photoshop).
 * false => grid is painted on top of everything (use this if your page is a white Rect object
 *          that would otherwise hide the grid).
 */
const GRID_BEHIND_OBJECTS = true;

const DEFAULT_GRID_SIZE = 20;
const MIN_GRID_SIZE = 4;
const MAX_GRID_SIZE = 200;
const MAJOR_LINE_EVERY = 5; // darker line every 5 cells, like a notebook
const DEFAULT_SNAP_THRESHOLD = 8;
const MAX_SNAP_THRESHOLD = 50;
const MAX_REFERENCE_OBJECTS = 1000;
const MATCH_EPSILON = 1; // scene units: how close counts as "aligned" for drawing guides

const MIN_MINOR_SPACING_PX = 6; // hide minor lines when zoomed out this far
const MIN_MAJOR_SPACING_PX = 8; // hide the whole grid when zoomed out this far
const MAX_LINES_PER_AXIS = 1500; // safety cap

// Semi-transparent grey is visible on both light and dark canvases.
const MINOR_LINE_COLOR = 'rgba(128, 128, 128, 0.22)';
const MAJOR_LINE_COLOR = 'rgba(128, 128, 128, 0.45)';

// Industry-standard snap colour (Figma red). Magenta '#FF00FF'-style is the Illustrator / Canva look.
const GUIDE_COLOR = '#F24822';
const GRID_GUIDE_COLOR = 'rgba(242, 72, 34, 0.45)';
const GUIDE_MARK_SIZE = 3;

const LEFT_HANDLES = ['tl', 'ml', 'bl'];
const RIGHT_HANDLES = ['tr', 'mr', 'br'];
const TOP_HANDLES = ['tl', 'mt', 'tr'];
const BOTTOM_HANDLES = ['bl', 'mb', 'br'];
const CORNER_HANDLES = ['tl', 'tr', 'bl', 'br'];

const NO_SNAP: AxisSnap = { delta: 0, line: null, kind: null };
const EMPTY_REFERENCE: Reference = { boxes: [], xs: [], ys: [] };

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const snapToGrid = (value: number, size: number) => Math.round(value / size) * size;

const mod = (n: number, m: number) => ((n % m) + m) % m;

const hasKey = (event: unknown, key: 'altKey' | 'shiftKey'): boolean =>
    typeof event === 'object' &&
    event !== null &&
    key in event &&
    Boolean((event as MouseEvent)[key]);

const isAxisAligned = (target: fabric.FabricObject) =>
    mod(target.angle ?? 0, 360) === 0 && !target.skewX && !target.skewY;

/**
 * Best snap for a set of points (e.g. left / centre / right edge).
 * Other objects win over the grid when both are equally close.
 */
const bestSnap = (
    points: number[],
    objectLines: number[],
    gridSize: number | null,
    threshold: number,
): AxisSnap => {
    let best = NO_SNAP;
    let bestAbs = Infinity;

    for (const point of points) {
        for (const line of objectLines) {
            const delta = line - point;
            const abs = Math.abs(delta);
            if (abs <= threshold && abs < bestAbs) {
                best = { delta, line, kind: 'object' };
                bestAbs = abs;
            }
        }
    }

    if (gridSize !== null) {
        for (const point of points) {
            const line = snapToGrid(point, gridSize);
            const delta = line - point;
            const abs = Math.abs(delta);
            if (abs <= threshold && abs < bestAbs) {
                best = { delta, line, kind: 'grid' };
                bestAbs = abs;
            }
        }
    }

    return best;
};

/** Scale ratio that puts the moving edge of one axis on a snap line (null if nothing in range). */
const edgeSnap = (
    start: number,
    length: number,
    movesStartEdge: boolean,
    objectLines: number[],
    gridSize: number | null,
    threshold: number,
): { ratio: number; snap: AxisSnap } | null => {
    if (length <= 0) return null;
    const edge = movesStartEdge ? start : start + length;
    const snap = bestSnap([edge], objectLines, gridSize, threshold);
    if (snap.kind === null) return null;

    const newLength = movesStartEdge ? length - snap.delta : length + snap.delta;
    return newLength > 0 ? { ratio: newLength / length, snap } : null;
};

/** Segment guides ("this edge lines up with that object") merged per line position. */
const objectGuides = (axis: Axis, points: number[], rect: fabric.TBBox, boxes: Box[]): Guide[] => {
    const merged = new Map<number, Guide>();

    for (const box of boxes) {
        const lines = axis === 'x' ? [box.left, box.cx, box.right] : [box.top, box.cy, box.bottom];
        const from = axis === 'x' ? Math.min(rect.top, box.top) : Math.min(rect.left, box.left);
        const to =
            axis === 'x'
                ? Math.max(rect.top + rect.height, box.bottom)
                : Math.max(rect.left + rect.width, box.right);

        for (const line of lines) {
            if (!points.some((p) => Math.abs(p - line) <= MATCH_EPSILON)) continue;

            const key = Math.round(line * 100);
            const existing = merged.get(key);
            if (existing) {
                existing.from = Math.min(existing.from ?? from, from);
                existing.to = Math.max(existing.to ?? to, to);
            } else {
                merged.set(key, { axis, pos: line, from, to, kind: 'object' });
            }
        }
    }

    return [...merged.values()];
};

const axisGuides = (
    axis: Axis,
    points: number[],
    rect: fabric.TBBox,
    boxes: Box[],
    snap: AxisSnap,
): Guide[] => {
    if (snap.kind === 'grid' && snap.line !== null) {
        return [{ axis, pos: snap.line, from: null, to: null, kind: 'grid' }];
    }
    if (snap.kind === 'object') return objectGuides(axis, points, rect, boxes);
    return [];
};

/**
 * Fabric runs listeners in registration order. Other slices (transform panel, canvas events) also
 * listen to object:moving / object:scaling and copy x/y/size into the store. If they run BEFORE us
 * they store the un-snapped value and later write it back to the canvas, undoing the snap.
 * Moving our listener to the front makes everyone else see the snapped position.
 */
const runFirst = (canvas: fabric.Canvas, eventName: string, handler: unknown) => {
    const registry = (canvas as unknown as { __eventListeners?: Record<string, unknown[]> })
        .__eventListeners;
    const list = registry?.[eventName];
    if (!list) return;
    const index = list.indexOf(handler);
    if (index > 0) {
        list.splice(index, 1);
        list.unshift(handler);
    }
};

/* -------------------------------------------------------------------------- */
/*                                    Slice                                   */
/* -------------------------------------------------------------------------- */

export const createNotebookSlice: SliceCreator<NotebookSlice> = (set, get, store) => {
    // Non-serialisable runtime state lives in the closure, not in the store.
    let attachedCanvas: fabric.Canvas | null = null;
    let detachListeners: (() => void) | null = null;
    let gridPaintedInBackground = false;
    let guides: Guide[] = [];
    let reference: Reference | null = null; // other objects' snap lines, cached for the length of one drag

    /* ------------------------------ Overlay drawing --------------------------- */
    // Grid + guides are painted directly on the canvas context, never as canvas objects or
    // background, so they can't end up in canvas.toJSON() (undo, save, share) and no other
    // slice can overwrite them.

    /** Skip off-screen render passes (PNG/SVG export, thumbnails) so the grid never leaks into exports. */
    const isMainContext = (ctx: CanvasRenderingContext2D, canvas: fabric.Canvas) =>
        ctx.canvas === canvas.getElement();

    const paintGrid = (ctx: CanvasRenderingContext2D, canvas: fabric.Canvas) => {
        const size = get().gridSize;
        const vpt = canvas.viewportTransform;
        const zoom = vpt[0];
        const cell = size * zoom;

        if (cell * MAJOR_LINE_EVERY < MIN_MAJOR_SPACING_PX) return; // too dense to be useful
        const showMinor = cell >= MIN_MINOR_SPACING_PX;

        const width = canvas.getWidth();
        const height = canvas.getHeight();

        const firstX = Math.floor(-vpt[4] / zoom / size);
        const lastX = Math.ceil((width - vpt[4]) / zoom / size);
        const firstY = Math.floor(-vpt[5] / zoom / size);
        const lastY = Math.ceil((height - vpt[5]) / zoom / size);
        if (lastX - firstX > MAX_LINES_PER_AXIS || lastY - firstY > MAX_LINES_PER_AXIS) return;

        const minor = new Path2D();
        const major = new Path2D();

        for (let i = firstX; i <= lastX; i++) {
            const isMajor = mod(i, MAJOR_LINE_EVERY) === 0;
            if (!isMajor && !showMinor) continue;
            const x = Math.round(i * size * zoom + vpt[4]) + 0.5; // +0.5 => crisp 1px line
            const path = isMajor ? major : minor;
            path.moveTo(x, 0);
            path.lineTo(x, height);
        }
        for (let j = firstY; j <= lastY; j++) {
            const isMajor = mod(j, MAJOR_LINE_EVERY) === 0;
            if (!isMajor && !showMinor) continue;
            const y = Math.round(j * size * zoom + vpt[5]) + 0.5;
            const path = isMajor ? major : minor;
            path.moveTo(0, y);
            path.lineTo(width, y);
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = MINOR_LINE_COLOR;
        ctx.stroke(minor);
        ctx.strokeStyle = MAJOR_LINE_COLOR;
        ctx.stroke(major);
    };

    const paintGuides = (ctx: CanvasRenderingContext2D, canvas: fabric.Canvas) => {
        if (guides.length === 0) return;

        const vpt = canvas.viewportTransform;
        const zoom = vpt[0];
        const width = canvas.getWidth();
        const height = canvas.getHeight();

        const objectPath = new Path2D();
        const gridPath = new Path2D();
        const marks = new Path2D();

        const addMark = (x: number, y: number) => {
            marks.moveTo(x - GUIDE_MARK_SIZE, y - GUIDE_MARK_SIZE);
            marks.lineTo(x + GUIDE_MARK_SIZE, y + GUIDE_MARK_SIZE);
            marks.moveTo(x - GUIDE_MARK_SIZE, y + GUIDE_MARK_SIZE);
            marks.lineTo(x + GUIDE_MARK_SIZE, y - GUIDE_MARK_SIZE);
        };

        for (const guide of guides) {
            const path = guide.kind === 'grid' ? gridPath : objectPath;

            if (guide.axis === 'x') {
                const x = Math.round(guide.pos * zoom + vpt[4]) + 0.5;
                const y0 = guide.from === null ? 0 : guide.from * zoom + vpt[5];
                const y1 = guide.to === null ? height : guide.to * zoom + vpt[5];
                path.moveTo(x, y0);
                path.lineTo(x, y1);
                if (guide.kind === 'object') {
                    addMark(x, y0);
                    addMark(x, y1);
                }
            } else {
                const y = Math.round(guide.pos * zoom + vpt[5]) + 0.5;
                const x0 = guide.from === null ? 0 : guide.from * zoom + vpt[4];
                const x1 = guide.to === null ? width : guide.to * zoom + vpt[4];
                path.moveTo(x0, y);
                path.lineTo(x1, y);
                if (guide.kind === 'object') {
                    addMark(x0, y);
                    addMark(x1, y);
                }
            }
        }

        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = GRID_GUIDE_COLOR;
        ctx.stroke(gridPath);

        ctx.setLineDash([]);
        ctx.strokeStyle = GUIDE_COLOR;
        ctx.stroke(objectPath);
        ctx.stroke(marks);
    };

    /** Runs a paint function in plain CSS-pixel space, whatever the devicePixelRatio / zoom. */
    const withScreenSpace = (
        ctx: CanvasRenderingContext2D,
        canvas: fabric.Canvas,
        paint: () => void,
    ) => {
        ctx.save();
        const retina = canvas.getRetinaScaling();
        ctx.setTransform(retina, 0, 0, retina, 0, 0);
        paint();
        ctx.restore();
    };

    const onAfterRender = (e: fabric.CanvasEvents['after:render']) => {
        const { canvas, gridEnabled } = get();
        const ctx = e.ctx;
        if (!canvas || !ctx || !isMainContext(ctx, canvas)) return;

        withScreenSpace(ctx, canvas, () => {
            if (gridEnabled && !gridPaintedInBackground) paintGrid(ctx, canvas);
            paintGuides(ctx, canvas);
        });
    };

    /* ------------------------------- Snapping -------------------------------- */

    /** Snap lines of every other visible object. Built once per drag, then reused. */
    const getReference = (canvas: fabric.Canvas, target: fabric.FabricObject): Reference => {
        if (reference) return reference;

        const exclude = new Set<fabric.FabricObject>([target]);
        if (target instanceof fabric.ActiveSelection) {
            target.getObjects().forEach((obj) => exclude.add(obj));
        }

        const boxes: Box[] = [];
        for (const obj of canvas.getObjects() as SnapTarget[]) {
            if (boxes.length >= MAX_REFERENCE_OBJECTS) break;
            if (exclude.has(obj) || obj.visible === false || obj.excludeFromSnap) continue;

            const r = obj.getBoundingRect();
            if (![r.left, r.top, r.width, r.height].every(Number.isFinite)) continue;
            if (r.width === 0 && r.height === 0) continue;

            boxes.push({
                left: r.left,
                top: r.top,
                right: r.left + r.width,
                bottom: r.top + r.height,
                cx: r.left + r.width / 2,
                cy: r.top + r.height / 2,
            });
        }

        reference = {
            boxes,
            xs: boxes.flatMap((b) => [b.left, b.cx, b.right]),
            ys: boxes.flatMap((b) => [b.top, b.cy, b.bottom]),
        };
        return reference;
    };

    const clearGuides = () => {
        const hadGuides = guides.length > 0;
        guides = [];
        reference = null;
        if (hadGuides) get().canvas?.requestRenderAll();
    };

    const onMoving = (e: fabric.CanvasEvents['object:moving']) => {
        const state = get();
        const canvas = state.canvas;
        const target = e.target as SnapTarget | undefined;

        if (
            !canvas ||
            !target ||
            !state.snapEnabled ||
            target.excludeFromSnap ||
            hasKey(e.e, 'altKey')
        ) {
            guides = [];
            return;
        }

        const ref = state.snapToObjects ? getReference(canvas, target) : EMPTY_REFERENCE;
        const gridSize = state.gridEnabled ? state.gridSize : null;
        if (gridSize === null && ref.boxes.length === 0) {
            guides = [];
            return;
        }

        const threshold = state.snapThreshold / Math.max(canvas.getZoom(), 0.01);
        const rect = target.getBoundingRect();

        // Left edge, centre or right edge — whichever is closest to a snap line.
        const xs = [rect.left, rect.left + rect.width / 2, rect.left + rect.width];
        const ys = [rect.top, rect.top + rect.height / 2, rect.top + rect.height];
        const sx = bestSnap(xs, ref.xs, gridSize, threshold);
        const sy = bestSnap(ys, ref.ys, gridSize, threshold);

        if (DEBUG_SNAP)
            console.debug('[snap] moving', { rect, sx, sy, threshold, objects: ref.boxes.length });

        if (sx.delta !== 0 || sy.delta !== 0) {
            target.set({ left: target.left + sx.delta, top: target.top + sy.delta });
            target.setCoords();
        }

        const final: fabric.TBBox = {
            ...rect,
            left: rect.left + sx.delta,
            top: rect.top + sy.delta,
        };
        guides = [
            ...axisGuides(
                'x',
                xs.map((v) => v + sx.delta),
                final,
                ref.boxes,
                sx,
            ),
            ...axisGuides(
                'y',
                ys.map((v) => v + sy.delta),
                final,
                ref.boxes,
                sy,
            ),
        ];
    };

    const onScaling = (e: fabric.CanvasEvents['object:scaling']) => {
        const state = get();
        const canvas = state.canvas;
        const target = e.target as SnapTarget | undefined;
        const corner = e.transform?.corner;

        if (
            !canvas ||
            !target ||
            !corner ||
            !state.snapEnabled ||
            target.excludeFromSnap ||
            hasKey(e.e, 'altKey') ||
            canvas.centeredScaling ||
            !isAxisAligned(target) // rotated / skewed objects: skip (keeps the maths exact)
        ) {
            guides = [];
            return;
        }

        const ref = state.snapToObjects ? getReference(canvas, target) : EMPTY_REFERENCE;
        const gridSize = state.gridEnabled ? state.gridSize : null;
        if (gridSize === null && ref.boxes.length === 0) {
            guides = [];
            return;
        }

        const threshold = state.snapThreshold / Math.max(canvas.getZoom(), 0.01);
        const rect = target.getBoundingRect();

        const movesLeft = LEFT_HANDLES.includes(corner);
        const movesRight = RIGHT_HANDLES.includes(corner);
        const movesTop = TOP_HANDLES.includes(corner);
        const movesBottom = BOTTOM_HANDLES.includes(corner);

        let sx =
            movesLeft || movesRight
                ? edgeSnap(rect.left, rect.width, movesLeft, ref.xs, gridSize, threshold)
                : null;
        let sy =
            movesTop || movesBottom
                ? edgeSnap(rect.top, rect.height, movesTop, ref.ys, gridSize, threshold)
                : null;

        // Corner handles keep the aspect ratio (Shift flips it): the closer snap drives both axes.
        const uniform =
            CORNER_HANDLES.includes(corner) && canvas.uniformScaling !== hasKey(e.e, 'shiftKey');
        if (uniform) {
            if (sx && sy) {
                if (Math.abs(sx.ratio - 1) <= Math.abs(sy.ratio - 1))
                    sy = { ratio: sx.ratio, snap: NO_SNAP };
                else sx = { ratio: sy.ratio, snap: NO_SNAP };
            } else if (sx) {
                sy = { ratio: sx.ratio, snap: NO_SNAP };
            } else if (sy) {
                sx = { ratio: sy.ratio, snap: NO_SNAP };
            }
        }

        if (!sx && !sy) {
            guides = [];
            return;
        }

        target.set({
            scaleX: sx ? target.scaleX * sx.ratio : target.scaleX,
            scaleY: sy ? target.scaleY * sy.ratio : target.scaleY,
        });
        target.setCoords();

        // Keep the opposite edge pinned where it was.
        const next = target.getBoundingRect();
        let shiftX = 0;
        let shiftY = 0;
        if (sx)
            shiftX = movesLeft
                ? rect.left + rect.width - (next.left + next.width)
                : rect.left - next.left;
        if (sy)
            shiftY = movesTop
                ? rect.top + rect.height - (next.top + next.height)
                : rect.top - next.top;
        if (shiftX !== 0 || shiftY !== 0) {
            target.set({ left: target.left + shiftX, top: target.top + shiftY });
            target.setCoords();
        }

        const final = target.getBoundingRect();
        guides = [
            ...axisGuides(
                'x',
                [movesLeft ? final.left : final.left + final.width],
                final,
                ref.boxes,
                sx?.snap ?? NO_SNAP,
            ),
            ...axisGuides(
                'y',
                [movesTop ? final.top : final.top + final.height],
                final,
                ref.boxes,
                sy?.snap ?? NO_SNAP,
            ),
        ];
    };

    /* ---------------------------- Canvas lifecycle --------------------------- */

    const attach = (canvas: fabric.Canvas) => {
        if (attachedCanvas === canvas) return;
        detachListeners?.();

        canvas.on('object:moving', onMoving);
        canvas.on('object:scaling', onScaling);
        canvas.on('mouse:down', clearGuides);
        canvas.on('mouse:up', clearGuides);
        canvas.on('selection:cleared', clearGuides);
        canvas.on('after:render', onAfterRender);

        runFirst(canvas, 'object:moving', onMoving);
        runFirst(canvas, 'object:scaling', onScaling);

        // Paint the grid between the background and the objects, so shapes sit ON TOP of it.
        // _renderBackground is a Fabric internal; if it's missing we fall back to painting on top.
        const patchable = canvas as unknown as {
            _renderBackground?: (ctx: CanvasRenderingContext2D) => void;
        };
        const originalRenderBackground = patchable._renderBackground;
        gridPaintedInBackground = false;

        if (GRID_BEHIND_OBJECTS && typeof originalRenderBackground === 'function') {
            patchable._renderBackground = function (this: unknown, ctx: CanvasRenderingContext2D) {
                originalRenderBackground.call(this, ctx);
                if (get().gridEnabled && isMainContext(ctx, canvas)) {
                    withScreenSpace(ctx, canvas, () => paintGrid(ctx, canvas));
                }
            };
            gridPaintedInBackground = true;
        }

        if (DEBUG_SNAP)
            console.debug('[snap] attached', { canvas, gridInBackground: gridPaintedInBackground });

        attachedCanvas = canvas;
        detachListeners = () => {
            canvas.off('object:moving', onMoving);
            canvas.off('object:scaling', onScaling);
            canvas.off('mouse:down', clearGuides);
            canvas.off('mouse:up', clearGuides);
            canvas.off('selection:cleared', clearGuides);
            canvas.off('after:render', onAfterRender);
            if (gridPaintedInBackground) delete patchable._renderBackground; // fall back to the prototype method
            gridPaintedInBackground = false;
            attachedCanvas = null;
            guides = [];
            reference = null;
        };

        canvas.requestRenderAll();
    };

    /** Safe to call any time: attaches to the current canvas if we haven't yet. */
    const ensureAttached = () => {
        const canvas = get().canvas;
        if (canvas) attach(canvas);
        return canvas;
    };

    // Re-attach whenever the canvas is created / replaced / disposed (mode switches, page switches...).
    store.subscribe((state, prevState) => {
        if (state.canvas === prevState.canvas) return;
        if (state.canvas) {
            attach(state.canvas);
        } else {
            detachListeners?.();
            detachListeners = null;
        }
    });

    // Covers the case where the canvas already exists when this slice is created.
    queueMicrotask(ensureAttached);

    /* --------------------------------- State --------------------------------- */

    return {
        // off by default, like Figma / Canva: a clean page, objects move freely (top bar turns them on)
        gridEnabled: false,
        gridSize: DEFAULT_GRID_SIZE,
        snapEnabled: false,
        snapToObjects: true,
        snapThreshold: DEFAULT_SNAP_THRESHOLD,

        setGridEnabled: (enabled) => {
            if (get().gridEnabled !== enabled) set({ gridEnabled: enabled });
            ensureAttached()?.requestRenderAll();
        },

        toggleGrid: () => get().setGridEnabled(!get().gridEnabled),

        setGridSize: (size) => {
            if (!Number.isFinite(size)) return;
            const next = clamp(Math.round(size), MIN_GRID_SIZE, MAX_GRID_SIZE);
            if (next !== get().gridSize) set({ gridSize: next });
            ensureAttached()?.requestRenderAll();
        },

        setSnapEnabled: (enabled) => {
            if (get().snapEnabled !== enabled) set({ snapEnabled: enabled });
            ensureAttached();
        },

        toggleSnap: () => get().setSnapEnabled(!get().snapEnabled),

        setSnapToObjects: (enabled) => {
            if (get().snapToObjects !== enabled) set({ snapToObjects: enabled });
        },

        toggleSnapToObjects: () => get().setSnapToObjects(!get().snapToObjects),

        setSnapThreshold: (px) => {
            if (!Number.isFinite(px)) return;
            set({ snapThreshold: clamp(Math.round(px), 1, MAX_SNAP_THRESHOLD) });
        },

        drawGrid: () => {
            ensureAttached()?.requestRenderAll();
        },
    };
};
