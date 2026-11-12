import * as fabric from 'fabric';
import { closeIfNearStart } from '@/lib/canvas/autoClose';
import { drawingState } from '../pencilStyle';
import { screenScale } from '@/lib/canvas/screenScale';
import {
    BLEND_MODES,
    DEFAULT_BRUSH_STATE,
    buildBrushCursor,
    clamp,
    getPreset,
    isStrokeBrush,
    makeTexture,
    mixWithWhite,
    toHex6,
    toRgba,
    usesRgbaColor,
} from '../brushConfig';

/*
 * Brush slice for the Fabric (v6+) canvas editor.
 *
 * - Every setter updates the store first, then the canvas (works before mount).
 * - All brush configuration lives in buildBrush(), so nothing can drift.
 * - Strokes are styled in `before:path:created`, so undo/redo snapshots already
 *   contain blend mode, opacity, fill and shadow.
 */

import { VariableWidthBrush, type Pt } from '../brushes/variableWidthBrush';
import { createNibBrush } from '../brushes/nibBrush';

const ERASER_PREVIEW = 'rgba(110, 110, 110, 0.45)';
const HOOK_FLAG = '__fbBrushHooks';

/* ------------------------------------------------------------------ */
/* geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function distToSegment(p: Pt, a: Pt, b: Pt) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1) : 0;
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function pointInPolygon(p: Pt, poly: Pt[]) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
            inside = !inside;
    }
    return inside;
}

function isStrokeEraseTarget(obj: any) {
    if (!obj || obj.visible === false || obj.selectable === false) return false;
    if (obj.globalCompositeOperation === 'destination-out') return false; // pixel-eraser marks
    // freehand paths, or anything our brushes created this session
    return obj.isFreehand === true || (obj instanceof fabric.Path && !obj.fill);
}

function hitsObject(obj: any, pt: Pt, radius: number): boolean {
    const ac = obj.aCoords;
    if (ac) {
        const xs = [ac.tl.x, ac.tr.x, ac.bl.x, ac.br.x];
        const ys = [ac.tl.y, ac.tr.y, ac.bl.y, ac.br.y];
        const m = radius + (obj.strokeWidth || 0);
        if (
            pt.x < Math.min(...xs) - m ||
            pt.x > Math.max(...xs) + m ||
            pt.y < Math.min(...ys) - m ||
            pt.y > Math.max(...ys) + m
        ) {
            return false;
        }
    }
    if (!(obj instanceof fabric.Path) || !Array.isArray(obj.path)) {
        return obj.containsPoint(new fabric.Point(pt.x, pt.y));
    }

    const matrix = obj.calcTransformMatrix();
    const off = obj.pathOffset || { x: 0, y: 0 };
    const scale = Math.max(Math.abs(obj.scaleX || 1), Math.abs(obj.scaleY || 1));
    const tol = radius + ((obj.strokeWidth || 0) / 2) * scale;

    const pts: Pt[] = [];
    for (const cmd of obj.path as any[]) {
        if (cmd.length < 3) continue; // 'Z'
        const p = new fabric.Point(
            cmd[cmd.length - 2] - off.x,
            cmd[cmd.length - 1] - off.y,
        ).transform(matrix);
        pts.push({ x: p.x, y: p.y });
    }
    if (!pts.length) return false;

    // filled shapes (ink / calligraphy / filled pen strokes): inside counts as a hit
    if (obj.fill && pts.length > 2 && pointInPolygon(pt, pts)) return true;

    if (Math.hypot(pt.x - pts[0].x, pt.y - pts[0].y) <= tol) return true;
    for (let i = 1; i < pts.length; i++) {
        if (distToSegment(pt, pts[i - 1], pts[i]) <= tol) return true;
    }
    return false;
}

/* ------------------------------------------------------------------ */
/* "Whole stroke" eraser: a brush that deletes what it touches         */
/* ------------------------------------------------------------------ */

class StrokeEraserBrush extends (fabric.PencilBrush as any) {
    constructor(canvas: any) {
        super(canvas);
    }
    onMouseDown(...args: any[]) {
        const r = super.onMouseDown(...args);
        this.eraseAt(args[0]);
        return r;
    }
    onMouseMove(...args: any[]) {
        const r = super.onMouseMove(...args);
        this.eraseAt(args[0]);
        return r;
    }
    // never add a path, only clear the grey preview trail
    _finalizeAndAddPath() {
        const c = this.canvas;
        c.clearContext(c.contextTop);
        c.requestRenderAll();
    }
    eraseAt(pointer: Pt) {
        if (!pointer) return;
        const canvas = this.canvas;
        const radius = Math.max(this.width / 2, 2);
        const hit = canvas
            .getObjects()
            .filter((o: any) => isStrokeEraseTarget(o) && hitsObject(o, pointer, radius));
        if (!hit.length) return;
        hit.forEach((o: any) => canvas.remove(o));
        canvas.requestRenderAll();
    }
}

/* ------------------------------------------------------------------ */
/* brush factory                                                       */
/* ------------------------------------------------------------------ */

function buildShadow(s: any) {
    if (!(s.shadowBlur > 0 || s.shadowOffsetX || s.shadowOffsetY)) return null;
    const base = s.shadowMatchColor ? s.color : s.brushShadowColor;
    return new fabric.Shadow({
        color: toRgba(base, s.shadowOpacity),
        blur: s.shadowBlur,
        offsetX: s.shadowOffsetX,
        offsetY: s.shadowOffsetY,
    });
}

function buildBrush(canvas: any, s: any) {
    const preset = getPreset(s.brush);
    const engine = preset.engine;
    const eraser = engine === 'eraser';
    let brush: any;

    if (eraser && s.eraserMode === 'stroke') brush = new StrokeEraserBrush(canvas);
    else if (engine === 'nib') brush = createNibBrush(canvas, s);
    else if (engine === 'ink' || engine === 'calligraphy') {
        brush = new (VariableWidthBrush as any)(canvas);
        brush.mode = engine;
        brush.smoothing = s.smoothing;
        brush.taper = s.taper;
        brush.nibAngle = (s.nibAngle * Math.PI) / 180;
        brush.speedWidth = s.speedWidth !== false;
    } else if (engine === 'circle') brush = new fabric.CircleBrush(canvas);
    else if (engine === 'spray') brush = new fabric.SprayBrush(canvas);
    else if (engine === 'pattern' || engine === 'texture') {
        brush = new fabric.PatternBrush(canvas);
        if (engine === 'texture' && preset.texture)
            brush.source = makeTexture(preset.texture, s.color);
    } else brush = new fabric.PencilBrush(canvas); // pencil, marker, highlighter, neon, pixel eraser

    brush.width = s.width;

    if (eraser) brush.color = ERASER_PREVIEW;
    else if (engine === 'neon') brush.color = toRgba(mixWithWhite(s.color, 0.7), s.brushOpacity);
    else if (usesRgbaColor(s.brush))
        brush.color = toRgba(s.color, s.brushOpacity); // live preview shows real opacity
    else brush.color = s.color; // textures / spray / dots: opacity is applied on the finished object

    if (brush instanceof fabric.PencilBrush) {
        brush.decimate = 0.4 + s.smoothing * 0.76; // higher = smoother, fewer points
        brush.strokeLineJoin = eraser ? 'round' : s.lineJoin;
        brush.strokeLineCap =
            eraser || s.lineStyle === 'dotted' || s.lineStyle === 'dashdot' ? 'round' : s.lineCap;
        brush.drawStraightLine = !!s.straightLine && !eraser; // Shift also works by default
        brush.straightLineKey = 'shiftKey';
        const w = s.width;
        brush.strokeDashArray = eraser
            ? null
            : s.lineStyle === 'dashed'
              ? [w * 2, w * 1.5]
              : s.lineStyle === 'dotted'
                ? [0.1, w * 2]
                : s.lineStyle === 'dashdot'
                  ? [w * 3, w * 1.5, 0.1, w * 1.5]
                  : null;
    }

    if (engine === 'spray') {
        const kind = preset.spray ?? 'spray';
        if (kind === 'airbrush') {
            brush.density = clamp(Math.round(s.width * 4), 40, 220);
            brush.dotWidth = 1;
            brush.dotWidthVariance = 0;
            brush.randomOpacity = true;
            brush.optimizeOverlapping = false;
        } else if (kind === 'splatter') {
            brush.density = clamp(Math.round(s.width * 0.6), 6, 40);
            brush.dotWidth = Math.max(2, Math.round(s.width / 5));
            brush.dotWidthVariance = Math.max(
                1,
                Math.min(brush.dotWidth - 1, Math.round(brush.dotWidth * 0.9)),
            );
            brush.randomOpacity = false;
        } else {
            brush.density = clamp(Math.round(s.width * 1.5), 12, 90);
            brush.dotWidth = Math.max(1, Math.round(s.width / 14));
            brush.dotWidthVariance = Math.round(brush.dotWidth / 2);
            brush.randomOpacity = true;
        }
    }

    // shadow / glow
    if (eraser) brush.shadow = null;
    else if (engine === 'neon') {
        // neon always glows; a user-defined shadow overrides the default glow
        brush.shadow =
            buildShadow(s) ??
            new fabric.Shadow({
                color: toRgba(s.color, 0.95),
                blur: 12 + s.width * 1.5,
                offsetX: 0,
                offsetY: 0,
            });
    } else brush.shadow = buildShadow(s);

    return brush;
}

/* ------------------------------------------------------------------ */
/* canvas hooks (style every finished stroke, mirror for symmetry)     */
/* ------------------------------------------------------------------ */

function sceneCenter(canvas: any): Pt {
    const inv = fabric.util.invertTransform(canvas.viewportTransform);
    const p = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2).transform(inv);
    return { x: p.x, y: p.y };
}

// Runs BEFORE the stroke is added, so undo/redo snapshots already contain these props.
function styleNewPath(path: any, s: any) {
    if (!path) return;
    const engine = getPreset(s.brush).engine;

    if (engine === 'eraser') {
        path.set({
            stroke: '#000',
            opacity: 1,
            globalCompositeOperation: 'destination-out',
            selectable: false,
            evented: false,
        });
        return;
    }

    path.set({ perPixelTargetFind: true, targetFindTolerance: 4, isFreehand: true });
    if (s.autoClose && path instanceof fabric.Path && s.canvas)
        closeIfNearStart(path as never, Math.max(12 / screenScale(s.canvas), s.width * 1.5));
    if (!usesRgbaColor(s.brush)) path.set('opacity', s.brushOpacity); // textures, spray, dots, pattern

    const blend = s.blend && s.blend !== 'source-over' ? s.blend : undefined;
    if (blend) path.set('globalCompositeOperation', blend);

    if (s.fillEnabled && isStrokeBrush(s.brush) && path instanceof fabric.Path) {
        path.set('fill', toRgba(s.fillColor, s.fillOpacity));
    }
}

async function mirrorPath(canvas: any, path: any, s: any) {
    if (!path || s.symmetry === 'none' || s.brush === 'eraser') return;
    const c: Pt = s.symmetryCenter ?? sceneCenter(canvas);
    const variants: Array<[boolean, boolean]> =
        s.symmetry === 'x'
            ? [[true, false]]
            : s.symmetry === 'y'
              ? [[false, true]]
              : [
                    [true, false],
                    [false, true],
                    [true, true],
                ];
    const center = path.getCenterPoint();

    for (const [fx, fy] of variants) {
        const clone = await path.clone(['perPixelTargetFind', 'targetFindTolerance', 'isFreehand']);
        clone.set({
            flipX: fx ? !path.flipX : path.flipX,
            flipY: fy ? !path.flipY : path.flipY,
        });
        clone.setPositionByOrigin(
            new fabric.Point(
                fx ? 2 * c.x - center.x : center.x,
                fy ? 2 * c.y - center.y : center.y,
            ),
            'center',
            'center',
        );
        clone.setCoords();
        canvas.add(clone);
    }
    canvas.requestRenderAll();
}

function ensureHooks(canvas: any, get: any) {
    if (canvas[HOOK_FLAG]) return;
    canvas[HOOK_FLAG] = true; // a re-created canvas is a new object, so it gets hooked again
    canvas.on('before:path:created', (opt: any) => styleNewPath(opt?.path, drawingState(get())));
    canvas.on('path:created', (opt: any) => {
        mirrorPath(canvas, opt?.path, drawingState(get())).catch((e) =>
            console.error('[brush] mirror failed', e),
        );
    });
}

/* ------------------------------------------------------------------ */
/* input sanitising                                                    */
/* ------------------------------------------------------------------ */

const num = (v: any, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

function sanitize(p: any) {
    const o: any = {};
    if (p.brush !== undefined && p.brush in DEFAULT_PRESET_KEYS) o.brush = p.brush;
    if (p.color !== undefined) o.color = toHex6(p.color);
    if (p.width !== undefined) o.width = clamp(Math.round(num(p.width, 1)), 1, 200);
    if (p.brushOpacity !== undefined) o.brushOpacity = clamp(num(p.brushOpacity, 1), 0.05, 1);
    if (p.smoothing !== undefined) o.smoothing = clamp(num(p.smoothing, 0), 0, 10);
    if (p.taper !== undefined) o.taper = clamp(num(p.taper, 0), 0, 10);
    if (p.nibAngle !== undefined) o.nibAngle = clamp(num(p.nibAngle, 45), 0, 180);
    if (['round', 'butt', 'square'].includes(p.lineCap)) o.lineCap = p.lineCap;
    if (['round', 'bevel', 'miter'].includes(p.lineJoin)) o.lineJoin = p.lineJoin;
    if (['solid', 'dashed', 'dotted', 'dashdot'].includes(p.lineStyle)) o.lineStyle = p.lineStyle;
    if (BLEND_MODES.some((b) => b.value === p.blend)) o.blend = p.blend;

    if (p.shadowBlur !== undefined) o.shadowBlur = clamp(Math.round(num(p.shadowBlur, 0)), 0, 60);
    if (p.shadowOffsetX !== undefined)
        o.shadowOffsetX = clamp(Math.round(num(p.shadowOffsetX, 0)), -60, 60);
    if (p.shadowOffsetY !== undefined)
        o.shadowOffsetY = clamp(Math.round(num(p.shadowOffsetY, 0)), -60, 60);
    if (p.brushShadowColor !== undefined) o.brushShadowColor = toHex6(p.brushShadowColor);
    if (p.shadowOpacity !== undefined) o.shadowOpacity = clamp(num(p.shadowOpacity, 1), 0.05, 1);
    if (p.shadowMatchColor !== undefined) o.shadowMatchColor = !!p.shadowMatchColor;

    if (p.fillEnabled !== undefined) o.fillEnabled = !!p.fillEnabled;
    if (p.fillColor !== undefined) o.fillColor = toHex6(p.fillColor);
    if (p.fillOpacity !== undefined) o.fillOpacity = clamp(num(p.fillOpacity, 1), 0.05, 1);

    if (['pixel', 'stroke'].includes(p.eraserMode)) o.eraserMode = p.eraserMode;
    if (['none', 'x', 'y', 'both'].includes(p.symmetry)) o.symmetry = p.symmetry;
    if (p.symmetryCenter !== undefined) o.symmetryCenter = p.symmetryCenter;
    if (p.straightLine !== undefined) o.straightLine = !!p.straightLine;
    return o;
}

// quick membership check without importing the whole preset table by name
const DEFAULT_PRESET_KEYS: Record<string, true> = {
    pencil: true,
    marker: true,
    ink: true,
    calligraphy: true,
    nib: true,
    highlighter: true,
    neon: true,
    chalk: true,
    crayon: true,
    pattern: true,
    spray: true,
    airbrush: true,
    splatter: true,
    circle: true,
    eraser: true,
};

/* ------------------------------------------------------------------ */
/* slice                                                               */
/* ------------------------------------------------------------------ */

export const createBrushSlice = (set: any, get: any, _store: any) => {
    const apply = () => {
        const s = get();
        const canvas = s.canvas;
        if (!canvas) return;
        ensureHooks(canvas, get);
        canvas.freeDrawingBrush = buildBrush(canvas, drawingState(s));
        canvas.freeDrawingCursor = s.cursor;
        canvas.requestRenderAll();
    };

    // single entry point: merge -> store -> canvas
    const patch = (partial: any, label = 'canvas/brush') => {
        const s = get();
        const next: any = sanitize(partial ?? {});
        const merged = { ...s, ...next };
        next.cursor =
            partial?.cursor ??
            buildBrushCursor(
                drawingState(merged).width * (s.canvas?.getZoom?.() ?? 1),
                drawingState(merged).brush === 'eraser',
            );
        set(next, false, label);
        apply();
    };

    const presetDefaults = (type: string) => {
        const p = getPreset(type);
        return {
            width: p.width,
            brushOpacity: p.opacity,
            lineCap: p.lineCap,
            smoothing: p.smoothing,
            blend: p.blend ?? 'source-over',
        };
    };

    return {
        ...DEFAULT_BRUSH_STATE,

        /** Re-apply the current settings to the canvas (call on mount / after zoom). */
        initBrush: () => patch({}, 'canvas/brush-init'),
        refreshBrushCursor: () => patch({}, 'canvas/brush-cursor'),

        /** Backwards compatible: setBrush({ brush, color, width, ... }) */
        setBrush: (options: any = {}) => {
            const s = get();
            const type = options.brush;
            const switching = type && type in DEFAULT_PRESET_KEYS && type !== s.brush;
            if (switching) patch({ ...presetDefaults(type), ...options }, 'canvas/brush-type');
            else patch(options);
        },

        /** Generic updater: updateBrush({ brushOpacity: 0.5, lineStyle: 'dashed', shadowBlur: 10 }) */
        updateBrush: (partial: any) => patch(partial),

        setBrushWidth: (o: any = {}) =>
            patch({ width: typeof o === 'number' ? o : (o?.width ?? get().width) }),
        setBrushColor: (o: any = {}) =>
            patch({ color: typeof o === 'string' ? o : (o?.color ?? get().color) }),

        setSymmetry: (mode: string) => {
            const s = get();
            const center =
                mode === 'none'
                    ? null
                    : (s.symmetryCenter ?? (s.canvas ? sceneCenter(s.canvas) : null));
            patch({ symmetry: mode, symmetryCenter: center });
        },
        /** Move the mirror axis to the middle of what the user is currently looking at. */
        recenterSymmetry: () => {
            const canvas = get().canvas;
            if (canvas) patch({ symmetryCenter: sceneCenter(canvas) });
        },

        commitRecentColor: (color: string) => {
            const hex = toHex6(color);
            const list = [hex, ...(get().recentColors as string[]).filter((c) => c !== hex)].slice(
                0,
                8,
            );
            set({ recentColors: list }, false, 'canvas/brush-recent');
        },

        resetBrush: () => {
            patch({
                ...presetDefaults(get().brush),
                lineJoin: 'round',
                lineStyle: 'solid',
                taper: 4,
                nibAngle: 45,
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowMatchColor: true,
                shadowOpacity: 0.6,
                fillEnabled: false,
                straightLine: false,
            });
        },
    };
};
