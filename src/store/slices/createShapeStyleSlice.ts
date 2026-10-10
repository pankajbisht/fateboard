/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fabric from 'fabric';
import paper from 'paper';
import { BooleanEngine, extractStyle } from '@/lib/utils/BooleanEngine';
import { createColorMethods } from './colorSystemFixes';

// Re-exported so existing imports (e.g. `import { cssColorToHex } from '.../shapeStyle'`) keep working
export {
    cssColorToHex,
    tailwindBgToHex,
    angleToCoords,
    createFabricGradient,
} from './colorSystemFixes';
export type { GradientStop, GradientConfig } from './colorSystemFixes';

const typeOf = (o: any) => (o?.type || '').toLowerCase();
const TEXT_TYPES = ['text', 'itext', 'textbox'];

const SHADOW_PRESETS: Record<string, any> = {
    soft: { blur: 12, offsetX: 0, offsetY: 6, color: 'rgba(0,0,0,0.2)' },
    medium: { blur: 20, offsetX: 0, offsetY: 10, color: 'rgba(0,0,0,0.25)' },
    strong: { blur: 40, offsetX: 0, offsetY: 20, color: 'rgba(0,0,0,0.3)' },
};

/* -------------------------------------------------------------------------- */
/* Gradient editor (on-canvas handles)                                        */
/* -------------------------------------------------------------------------- */

// canvas point -> object local (unscaled) point
function canvasPointToObjectLocal(obj: fabric.Object, point: fabric.Point) {
    const inverted = fabric.util.invertTransform(obj.calcTransformMatrix());
    return fabric.util.transformPoint(point, inverted);
}

type StopHandle = { stop: fabric.Circle; offset: number };
type StopData = { offset: number; color: string };

export class GradientEditor {
    canvas: fabric.Canvas;
    target: fabric.Object | null = null;
    mode: 'linear' | 'radial' = 'linear';

    line?: fabric.Line;
    start?: fabric.Circle;
    end?: fabric.Circle;
    center?: fabric.Circle;
    radius?: fabric.Circle;
    stops: StopHandle[] = [];

    private onTargetChange = () => this.syncHelpers();

    constructor(canvas: fabric.Canvas) {
        this.canvas = canvas;
    }

    /* ---------- ATTACH ---------- */
    attach(
        obj: fabric.Object,
        initialStops: StopData[] = [
            { offset: 0, color: '#ff0000' },
            { offset: 1, color: '#0000ff' },
        ],
    ) {
        this.detach();
        this.target = obj;

        if (this.mode === 'linear') this.createLinearHandles();
        else this.createRadialHandles();

        initialStops.forEach((s) => this.addColorStop(s.offset, s.color));

        // detach() removes these, so they never pile up
        obj.on('moving', this.onTargetChange);
        obj.on('scaling', this.onTargetChange);
        obj.on('rotating', this.onTargetChange);

        this.updateGradient();
    }

    /* ---------- HANDLES ---------- */
    createHandle(x: number, y: number, color: string) {
        const c = new fabric.Circle({
            left: x,
            top: y,
            radius: 6,
            fill: color,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            excludeFromExport: true,
        });
        (c as any)._isHelper = true;
        return c;
    }

    createLinearHandles() {
        if (!this.target) return;
        const b = this.target.getBoundingRect();

        this.start = this.createHandle(b.left, b.top + b.height / 2, '#2563eb');
        this.end = this.createHandle(b.left + b.width, b.top + b.height / 2, '#dc2626');

        this.line = new fabric.Line(
            [this.start.left!, this.start.top!, this.end.left!, this.end.top!],
            {
                stroke: '#6366f1',
                strokeWidth: 1,
                selectable: false,
                evented: false,
                excludeFromExport: true,
            },
        );

        const move = () => {
            this.snapAngle();
            this.updateGradient();
        };
        this.start.on('moving', move);
        this.end.on('moving', move);

        this.canvas.add(this.line, this.start, this.end);
    }

    createRadialHandles() {
        if (!this.target) return;
        const b = this.target.getBoundingRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;

        this.center = this.createHandle(cx, cy, '#16a34a');
        this.radius = this.createHandle(cx + b.width / 4, cy, '#9333ea');

        this.center.on('moving', () => this.updateGradient());
        this.radius.on('moving', () => this.updateGradient());

        this.canvas.add(this.center, this.radius);
    }

    /* ---------- AXIS (linear: start->end, radial: center->radius) ---------- */
    private axis() {
        if (this.mode === 'linear') {
            return {
                x1: this.start!.left!,
                y1: this.start!.top!,
                x2: this.end!.left!,
                y2: this.end!.top!,
            };
        }
        return {
            x1: this.center!.left!,
            y1: this.center!.top!,
            x2: this.radius!.left!,
            y2: this.radius!.top!,
        };
    }

    interpolate(t: number) {
        const a = this.axis();
        return { x: a.x1 + (a.x2 - a.x1) * t, y: a.y1 + (a.y2 - a.y1) * t };
    }

    /* ---------- COLOR STOPS ---------- */
    addColorStop(offset: number, color: string) {
        const p = this.interpolate(offset); // radial stops used to all sit on the center

        const stop = new fabric.Circle({
            left: p.x,
            top: p.y,
            radius: 5,
            fill: color,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            excludeFromExport: true,
        });
        (stop as any)._isHelper = true;

        stop.on('moving', () => {
            this.updateStopOffset(stop);
            this.updateGradient();
        });

        this.stops.push({ stop, offset });
        this.canvas.add(stop);
    }

    updateStopOffset(stop: fabric.Circle) {
        const a = this.axis();
        const dx = a.x2 - a.x1;
        const dy = a.y2 - a.y1;
        const len = dx * dx + dy * dy || 1;
        const t = ((stop.left! - a.x1) * dx + (stop.top! - a.y1) * dy) / len;

        const s = this.stops.find((x) => x.stop === stop);
        if (s) s.offset = Math.min(1, Math.max(0, t));
    }

    /* ---------- SNAP ---------- */
    snapAngle() {
        if (!this.start || !this.end) return;
        const dx = this.end.left! - this.start.left!;
        const dy = this.end.top! - this.start.top!;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const snaps = [0, 45, 90, 135, 180, -45, -90, -135];
        const snap = snaps.find((a) => Math.abs(a - angle) < 6);
        if (snap === undefined) return;

        const len = Math.hypot(dx, dy);
        const rad = (snap * Math.PI) / 180;

        this.end.set({
            left: this.start.left! + Math.cos(rad) * len,
            top: this.start.top! + Math.sin(rad) * len,
        });
        this.end.setCoords();
    }

    /* ---------- GRADIENT UPDATE ---------- */
    updateGradient() {
        if (!this.target) return;
        const obj = this.target;

        // Gradient coords are fractions of the UNSCALED width/height (the object's transform
        // already applies the scale). The old code divided by the scaled size.
        const w = obj.width || 1;
        const h = obj.height || 1;
        const toFraction = (x: number, y: number) => {
            const p = canvasPointToObjectLocal(obj, new fabric.Point(x, y));
            return { x: (p.x + w / 2) / w, y: (p.y + h / 2) / h };
        };

        const colorStops = this.stops
            .map((s) => ({ offset: s.offset, color: s.stop.fill as string }))
            .sort((a, b) => a.offset - b.offset);

        let gradient: any;

        if (this.mode === 'linear') {
            const p1 = toFraction(this.start!.left!, this.start!.top!);
            const p2 = toFraction(this.end!.left!, this.end!.top!);

            gradient = new fabric.Gradient({
                type: 'linear',
                gradientUnits: 'percentage', // 'objectBoundingBox' is treated as pixels by Fabric
                coords: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y },
                colorStops,
            } as any);

            this.line?.set({
                x1: this.start!.left!,
                y1: this.start!.top!,
                x2: this.end!.left!,
                y2: this.end!.top!,
            });
        } else {
            const c = toFraction(this.center!.left!, this.center!.top!);
            const rCanvas = Math.hypot(
                this.radius!.left! - this.center!.left!,
                this.radius!.top! - this.center!.top!,
            );
            const scale = Math.max(Math.abs(obj.scaleX || 1), Math.abs(obj.scaleY || 1));
            const r2 = rCanvas / scale / Math.max(w, h);

            gradient = new fabric.Gradient({
                type: 'radial',
                gradientUnits: 'percentage',
                coords: { x1: c.x, y1: c.y, r1: 0, x2: c.x, y2: c.y, r2 },
                colorStops,
            } as any);
        }

        obj.set('fill', gradient);
        obj.set('dirty', true);
        this.canvas.requestRenderAll();
    }

    /* ---------- SYNC ---------- */
    // Old version called attach() which reset the stops to red/blue on every move
    syncHelpers() {
        if (!this.target) return;
        const saved: StopData[] = this.stops.map((s) => ({
            offset: s.offset,
            color: s.stop.fill as string,
        }));
        this.attach(this.target, saved);
    }

    setMode(mode: 'linear' | 'radial') {
        this.mode = mode;
        if (!this.target) return;
        const saved: StopData[] = this.stops.map((s) => ({
            offset: s.offset,
            color: s.stop.fill as string,
        }));
        this.attach(this.target, saved.length ? saved : undefined);
    }

    /* ---------- DETACH ---------- */
    detach() {
        this.target?.off('moving', this.onTargetChange);
        this.target?.off('scaling', this.onTargetChange);
        this.target?.off('rotating', this.onTargetChange);

        [this.line, this.start, this.end, this.center, this.radius].forEach((o) => {
            if (o) this.canvas.remove(o);
        });
        this.stops.forEach((s) => this.canvas.remove(s.stop));

        this.line = this.start = this.end = this.center = this.radius = undefined;
        this.stops = [];
        this.target = null;
    }
}

/* -------------------------------------------------------------------------- */
/* Boolean-op helpers                                                         */
/* -------------------------------------------------------------------------- */

// Paper cannot outline strokes: this drops the stroke and treats the centre line as the shape.
// (Properties were `path.fill` before, which Paper ignores - it is `fillColor`.)
function convertStrokeToPath(path: any) {
    if (!path) return path;
    if (path.strokeWidth) {
        path.strokeColor = null;
        path.strokeWidth = 0;
        path.fillColor = 'black';
        path.closed = true;
    }
    return path;
}

/* -------------------------------------------------------------------------- */
/* Slice                                                                      */
/* -------------------------------------------------------------------------- */

// opacity preview: remembers each object's original opacity (was a single module variable)
const previewBase = new Map<any, number>();

export const createShapeStyleSlice = (set: any, get: any, _store?: any) => ({
    activePaint: 'fill', // 'fill' | 'stroke' | 'shadow'
    fill: 'rgba(0, 0, 0, 0)',
    stroke: '#000000',
    strokeWidth: 1,
    strokeStyle: 'solid',
    opacity: 1, // ALWAYS 0..1 now (setOpacity1 used to store 0..100 in the same key)
    activeObjectShadow: null,

    gradient: {
        type: 'linear',
        angle: 90,
        stops: [
            { offset: 0, color: '#ff0000' },
            { offset: 1, color: '#0000ff' },
        ],
    },

    setGradient: (g: any) => {
        set((state: any) => ({ gradient: { ...state.gradient, ...g } }));
    },

    // setFill, setStroke, applySolidColor, applyShadowColor, applyFillGradient,
    // handleColorChange, clearGradientSession, fillMode
    ...createColorMethods(set, get),

    strokeStyleList: [
        { value: 'solid', label: 'Solid', dash: null, supported: true },
        { value: 'dashed', label: 'Dashed', dash: [10, 5], supported: true },
        { value: 'dotted', label: 'Dotted', dash: [2, 5], supported: true },
        // CSS-style effects - not renderable in Fabric.js
        { value: 'double', label: 'Double', dash: null, supported: false },
        { value: 'groove', label: 'Groove', dash: null, supported: false },
        { value: 'ridge', label: 'Ridge', dash: null, supported: false },
        { value: 'inset', label: 'Inset', dash: null, supported: false },
        { value: 'outset', label: 'Outset', dash: null, supported: false },
    ],

    strokeStyleMap: {
        solid: { dashArray: null, lineCap: 'butt' },
        dashed: { dashArray: [10, 5], lineCap: 'butt' },
        dotted: { dashArray: [2, 5], lineCap: 'round' },
        double: { dashArray: [1, 3, 1, 3], lineCap: 'butt' },
        groove: { dashArray: [4, 2, 1, 2], lineCap: 'butt' },
        ridge: { dashArray: [1, 2, 4, 2], lineCap: 'butt' },
        inset: { dashArray: [1, 1], lineCap: 'butt' },
        outset: { dashArray: [2, 1], lineCap: 'butt' },
    },

    setActivePaint: (paint: 'fill' | 'stroke' | 'shadow') => set({ activePaint: paint }),

    setStrokeWidthN: (width: number) => {
        const canvas = get().canvas;
        if (!canvas) return;

        canvas
            .getActiveObjects()
            .forEach((obj: any) => obj.set({ strokeWidth: width, dirty: true }));
        canvas.requestRenderAll();
        set({ strokeWidth: width });
        get().saveState?.();
    },

    setStrokeStyle: (styleValue: string) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const cfg = get().strokeStyleMap[styleValue] || get().strokeStyleMap.solid;
        canvas.getActiveObjects().forEach((obj: any) => {
            obj.set({ strokeDashArray: cfg.dashArray, strokeLineCap: cfg.lineCap, dirty: true });
        });

        canvas.requestRenderAll();
        set({ strokeStyle: styleValue });
        get().saveState?.();
    },

    /* ---------- OPACITY (store value is 0..1) ---------- */
    setOpacity: (opacity: number) => {
        const canvas = get().canvas;
        if (!canvas) return;
        const objs = canvas.getActiveObjects();
        if (!objs.length) return;

        const safe = Math.min(1, Math.max(0.05, opacity));
        objs.forEach((o: any) => o.set('opacity', safe));
        canvas.requestRenderAll();
        set({ opacity: safe });
        get().saveState?.();
    },

    // kept for UIs that work in percent (0..100)
    setOpacity1: (value: number) => get().setOpacity(value / 100),

    previewOpacity: (value: number) => {
        const canvas = get().canvas;
        if (!canvas) return;
        canvas.getActiveObjects().forEach((o: any) => {
            if (!previewBase.has(o)) previewBase.set(o, o.opacity ?? 1);
            o.set('opacity', value / 100);
        });
        canvas.requestRenderAll();
    },

    // Restores the original opacity (call setOpacity afterwards to commit)
    endOpacityPreview: () => {
        const canvas = get().canvas;
        previewBase.forEach((base, o) => o.set('opacity', base));
        previewBase.clear();
        canvas?.requestRenderAll();
    },

    /* ---------- SHADOW ---------- */
    addShadow: (shadow: any) => {
        const canvas = get().canvas;
        if (!canvas) return;
        canvas.getActiveObjects().forEach((o: any) => o.set('shadow', new fabric.Shadow(shadow)));
        canvas.requestRenderAll();
        get().saveState?.();
    },

    applyShadowPreset: (key: string) => {
        const canvas = get().canvas;
        const preset = SHADOW_PRESETS[key];
        if (!canvas || !preset) return;

        let last: any = null;
        canvas.getActiveObjects().forEach((o: any) => {
            last = new fabric.Shadow({ ...preset });
            o.set('shadow', last);
        });
        canvas.requestRenderAll();
        set({ activeObjectShadow: last });
        get().saveState?.();
    },

    removeShadow: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        canvas.getActiveObjects().forEach((o: any) => o.set('shadow', null));
        canvas.requestRenderAll();
        set({ activeObjectShadow: null });
        get().saveState?.();
    },

    /* ---------- Fabric object -> Fabric.Path (only works for objects whose SVG has a `d`) ---------- */
    toFabricPath(obj: any) {
        if (typeOf(obj) === 'path') return obj;

        const svg = obj.toSVG();
        const match = svg.match(/d="([^"]+)"/);
        if (!match) return null;

        return new fabric.Path(match[1], {
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            angle: obj.angle,
            left: obj.left,
            top: obj.top,
        });
    },

    /* ---------- BOOLEAN OPERATIONS ---------- */
    booleanOperation: async (operation = 'union') => {
        const canvas = get().canvas;
        if (!canvas) return;

        try {
            const active = canvas.getActiveObject();
            if (!active || typeOf(active) !== 'activeselection') {
                alert('Select at least 2 objects');
                return;
            }

            if (!(BooleanEngine as any)[operation]) {
                console.error('Invalid boolean operation:', operation);
                return;
            }

            const objects: any[] = active.getObjects();

            // Text cannot be turned into a Paper path here (Fabric v6 has no text.toPath()),
            // so text is left untouched instead of being removed and re-added.
            const shapes = objects.filter((o) => !TEXT_TYPES.includes(typeOf(o)));
            if (shapes.length < 2) {
                alert('Select at least 2 shapes (text is not supported in boolean operations)');
                return;
            }

            // Back to absolute coordinates before reading toSVG()
            canvas.discardActiveObject();

            const style = extractStyle(shapes[0]);
            const stack = canvas.getObjects();
            const topIndex = Math.max(...shapes.map((o) => stack.indexOf(o)));

            const scope = new paper.PaperScope();
            scope.setup(new scope.Size(5000, 5000));
            scope.activate();

            // Flatten groups: every Path / CompoundPath inside an imported item
            const toPaths = (item: any): any[] => {
                if (!item) return [];
                if (item instanceof scope.Path || item instanceof scope.CompoundPath) return [item];
                return (item.children ?? []).flatMap(toPaths);
            };

            const isSplit = ['divide', 'cut', 'xorSplit'].includes(operation);
            let result: any[] = [];

            for (const obj of shapes) {
                const item = scope.project.importSVG(obj.toSVG(), {
                    expandShapes: true,
                    insert: false,
                });
                const paths = toPaths(item)
                    .map(convertStrokeToPath)
                    .filter((p) => p && typeof p.divide === 'function');

                for (const path of paths) {
                    if (result.length === 0) {
                        result.push(path);
                        continue;
                    }

                    if (isSplit) {
                        const next: any[] = [];
                        result.forEach((base) => {
                            let pieces = (BooleanEngine as any)[operation](base, path);
                            if (!pieces) return;
                            if (!Array.isArray(pieces)) pieces = [pieces];
                            pieces.forEach((p: any) => {
                                if (p && typeof p.divide === 'function') next.push(p);
                            });
                        });
                        result = next;
                    } else {
                        const reduced = (BooleanEngine as any)[operation](result[0], path);
                        if (reduced) result = [reduced];
                    }
                }
            }

            if (result.length === 0) {
                alert('The operation produced no shape');
                return;
            }

            // Export WITHOUT bounds:'content'. That option moved every piece to the origin, and the
            // old code then put ALL pieces on the selection centre (split results were stacked, and
            // intersect/subtract results landed in the wrong place). Coordinates are already absolute.
            const body = result.map((p) => p.exportSVG({ asString: true, precision: 3 })).join('');
            const { objects: parsed } = await fabric.loadSVGFromString(
                `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
            );
            const created = (parsed || []).filter(Boolean) as fabric.Object[];
            if (created.length === 0) return;

            created.forEach((o) => o.set({ ...style, strokeUniform: true }));

            // Keep the z-order of the originals (Fabric v6: insertAt(index, ...objects))
            canvas.remove(...shapes);
            canvas.insertAt(Math.max(0, topIndex - shapes.length + 1), ...created);

            if (created.length > 1) {
                canvas.setActiveObject(new fabric.ActiveSelection(created, { canvas }));
            } else {
                canvas.setActiveObject(created[0]);
            }

            canvas.requestRenderAll();
            get().saveState?.();
        } catch (err) {
            console.error('Boolean operation error:', err);
            alert('Boolean operation failed. Check console for details.');
        }
    },

    /* ---------- CLIP / MASK ---------- */
    clipSelectedObject: async () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active || typeOf(active) !== 'activeselection') {
            alert('Select 2 objects (target + clip shape)');
            return;
        }

        const objects: any[] = active.getObjects();
        if (objects.length !== 2) {
            alert('Select exactly 2 objects');
            return;
        }

        const [a, b] = objects;
        const [target, clipper] =
            typeOf(a) === 'image' ? [a, b] : typeOf(b) === 'image' ? [b, a] : [a, b];

        // Back to absolute coordinates BEFORE cloning/positioning
        canvas.discardActiveObject();

        // Wait for the image element if it is still loading
        const el = target.getElement?.();
        if (el && !el.complete) {
            await new Promise((resolve) => el.addEventListener('load', resolve, { once: true }));
        }

        // Fabric v6: clone() returns a Promise (the callback version was v5)
        const clip = await clipper.clone();
        clip.set({ absolutePositioned: true }); // stays where the shape was placed

        target.set({ clipPath: clip, dirty: true });
        canvas.remove(clipper);
        canvas.setActiveObject(target);
        canvas.requestRenderAll();
        get().saveState?.();
    },

    unionSelected: (opts?: any) => get().booleanOperation('union', opts),
    intersectSelected: (opts?: any) => get().booleanOperation('intersect', opts),
    subtractSelected: (opts?: any) => get().booleanOperation('subtract', opts),
    excludeSelected: (opts?: any) => get().booleanOperation('exclude', opts),
    divideSelected: (opts?: any) => get().booleanOperation('divide', opts),
    cutSelected: (opts?: any) => get().booleanOperation('cut', opts),
    punchSelected: (opts?: any) => get().booleanOperation('punch', opts),
    cropSelected: (opts?: any) => get().booleanOperation('crop', opts),
    smartUnionSelected: (opts?: any) => get().booleanOperation('smartUnion', opts),
    xorSplitSelected: (opts?: any) => get().booleanOperation('xorSplit', opts),
});
