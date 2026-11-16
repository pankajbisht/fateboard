/**
 * The stamp engine's live brush (Fabric free drawing). While you draw it walks the pointer samples into dabs
 * (`DabWalker`) and paints them into an offscreen layer, shown on the top canvas with the stroke opacity and
 * textures. A spray keeps emitting while the pointer is held still. On release it adds one `StampStroke`
 * through Fabric's `before:path:created` / `path:created` events, so the brush slice styles it (opacity, blend,
 * symmetry copies) and history records it like any other stroke.
 */
import { BaseBrush, Shadow, type Canvas, type Point, type TBrushEventData } from 'fabric';
import { DabWalker, dabBounds, strokeDabs, type StrokePoint } from './dabs';
import { newSeed } from './rng';
import { applyStrokeTexture, renderDabs } from './renderDabs';
import { StampStroke, packPoints } from './StampStroke';
import type { StampParams } from './stampParams';

export type StampBrushOptions = {
    params: StampParams;
    brushId: string;
    /** Layer name of the finished stroke (the brush's name). */
    label: string;
    /** Stroke opacity 0.05 … 1 (dabs build up to it). */
    opacity: number;
    /** Stabiliser 0 (raw) … 10 (smoothest). */
    smoothing: number;
};

type PointerLike = { pointerType?: string; pressure?: number } | undefined;
type M = { a: number; b: number; c: number; d: number; e: number; f: number };

/** Scene → device pixels of a context: its base transform (retina, deep zoom window) × the viewport. */
function sceneToDevice(ctx: CanvasRenderingContext2D, v: number[]): M {
    const t = (ctx.getTransform?.() as M | undefined) ?? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    return {
        a: t.a * v[0] + t.c * v[1],
        b: t.b * v[0] + t.d * v[1],
        c: t.a * v[2] + t.c * v[3],
        d: t.b * v[2] + t.d * v[3],
        e: t.a * v[4] + t.c * v[5] + t.e,
        f: t.b * v[4] + t.d * v[5] + t.f,
    };
}

export class StampBrush extends BaseBrush {
    declare params: StampParams;
    declare brushId: string;
    declare label: string;
    declare opacity: number;
    declare smoothing: number;

    private points: StrokePoint[] = [];
    private walker: DabWalker | null = null;
    private seed = 1;
    private start = 0;
    private down = false;
    private raf = 0;
    private smoothed: { x: number; y: number } | null = null;
    private pressure = 1;
    private layer: HTMLCanvasElement | null = null;

    constructor(canvas: Canvas, options: StampBrushOptions) {
        super(canvas);
        Object.assign(this, options);
    }

    private pressureOf(e: PointerLike) {
        return e && e.pointerType === 'pen' && (e.pressure ?? 0) > 0 ? (e.pressure as number) : 1;
    }

    /** Layer in the top canvas's device pixels; its transform maps scene units like the canvas. */
    private layerContext(): CanvasRenderingContext2D | null {
        const top = this.canvas.contextTop;
        if (!top) return null;
        const w = top.canvas.width;
        const h = top.canvas.height;
        if (!this.layer) this.layer = document.createElement('canvas');
        if (this.layer.width !== w || this.layer.height !== h) {
            this.layer.width = w;
            this.layer.height = h;
        }
        const ctx = this.layer.getContext('2d');
        if (!ctx) return null;
        // the top context's own transform (retina, and the deep zoom window on the design board) × viewport
        const m = sceneToDevice(top, this.canvas.viewportTransform);
        ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
        return ctx;
    }

    onMouseDown(pointer: Point, ev: TBrushEventData): void {
        this.down = true;
        this.points = [];
        this.seed = newSeed();
        this.start = performance.now();
        this.smoothed = null;
        this.walker = new DabWalker(this.params, this.width, this.color, this.seed);
        const ctx = this.layerContext();
        if (ctx) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
        this.add(pointer, ev?.e as PointerLike);
        if (this.params.spray) this.raf = requestAnimationFrame(this.keepSpraying);
    }

    onMouseMove(pointer: Point, ev: TBrushEventData): void {
        if (this.down) this.add(pointer, ev?.e as PointerLike);
    }

    onMouseUp(): boolean {
        this.down = false;
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.finish();
        return false;
    }

    /** Spray: emit with time while the pointer is held still. */
    private keepSpraying = () => {
        this.raf = 0;
        // another brush took over (size keys, a tool switch): Fabric sends it the mouse-up, not us; stop here
        if (this.canvas.freeDrawingBrush !== this || !this.canvas.isDrawingMode) this.down = false;
        if (!this.down) return;
        const last = this.points[this.points.length - 1];
        const now = performance.now() - this.start;
        if (last && now - last.t >= 16) this.push({ ...last, t: Math.round(now) });
        this.raf = requestAnimationFrame(this.keepSpraying);
    };

    private add(pointer: Point, e: PointerLike) {
        const k = 1 - Math.min(10, Math.max(0, this.smoothing)) / 12;
        const s = this.smoothed;
        this.smoothed = s
            ? { x: s.x + (pointer.x - s.x) * k, y: s.y + (pointer.y - s.y) * k }
            : { x: pointer.x, y: pointer.y };
        this.pressure = this.pressureOf(e);
        // stored precision (packPoints) from the start, so the saved stroke redraws the dabs of the preview
        this.push({
            x: Math.round(this.smoothed.x * 100) / 100,
            y: Math.round(this.smoothed.y * 100) / 100,
            p: Math.round(this.pressure * 1000) / 1000,
            t: Math.round(performance.now() - this.start),
        });
    }

    private push(pt: StrokePoint) {
        this.points.push(pt);
        const dabs = this.walker?.push(pt) ?? [];
        const ctx = this.layerContext();
        if (!ctx || !dabs.length) return;
        renderDabs(ctx, dabs, this.params, this.canvas.getRetinaScaling() * this.canvas.getZoom());
        this._render();
    }

    /** Show the layer on the top canvas with the stroke opacity and textures. */
    _render(): void {
        const top = this.canvas.contextTop;
        if (!top || !this.layer) return;
        this.canvas.clearContext(top);
        top.save();
        top.setTransform(1, 0, 0, 1, 0, 0);
        top.globalAlpha = this.opacity;
        top.drawImage(this.layer, 0, 0);
        top.restore();
        if (this.params.grain > 0 || this.params.screentone > 0) {
            const m = sceneToDevice(top, this.canvas.viewportTransform);
            const inv = (x: number, y: number) => ({ x: (x - m.e) / m.a, y: (y - m.f) / m.d });
            const a = inv(0, 0);
            const b = inv(top.canvas.width, top.canvas.height);
            top.save();
            top.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
            applyStrokeTexture(
                top,
                this.params,
                { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y },
                m.a,
            );
            top.restore();
        }
    }

    private finish() {
        const canvas = this.canvas;
        const points = this.points;
        this.points = [];
        this.walker = null;
        if (!points.length) return;
        const dabs = strokeDabs(points, this.params, this.width, this.color, this.seed);
        const box = dabBounds(dabs, this.params.glow);
        if (!box) return canvas.clearContext(canvas.contextTop);
        // a whole-pixel origin keeps the local points exact at the stored precision (same dabs when redrawn)
        const ox = Math.floor(box.minX);
        const oy = Math.floor(box.minY);
        const local = points.map((p) => ({ ...p, x: p.x - ox, y: p.y - oy }));
        const stroke = new StampStroke({
            left: ox,
            top: oy,
            width: Math.ceil(box.maxX) - ox,
            height: Math.ceil(box.maxY) - oy,
            originX: 'left',
            originY: 'top',
            name: this.label,
            stampPoints: packPoints(local),
            stampParams: this.params,
            stampColor: this.color,
            stampSize: this.width,
            stampSeed: this.seed,
            brushId: this.brushId,
        });
        if (this.shadow) stroke.set('shadow', new Shadow(this.shadow));
        canvas.fire('before:path:created', { path: stroke as never });
        canvas.add(stroke);
        canvas.fire('path:created', { path: stroke as never });
        canvas.clearContext(canvas.contextTop);
        canvas.requestRenderAll();
    }
}
