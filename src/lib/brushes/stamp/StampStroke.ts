/**
 * A stamp-brush stroke on the canvas (type `StampStroke`). It keeps what is needed to draw it again, not
 * pixels: the pointer samples, the resolved brush settings, the colour, the size and the random seed. Fabric
 * caches it at the current zoom, so it stays sharp when you zoom in and is redrawn the same after a reload,
 * an undo or an export (PNG / JPG / video through `render`, SVG as an embedded image).
 *
 * - Its own data (`STAMP_KEYS`) is part of the class, like a Path's `path` (it travels with clone / copy).
 * - Picking a colour for it (`fill` / `stroke` from the palette) recolours the stroke.
 * - Hit tests (`containsPoint`, used by the stroke eraser) follow the stroke, not its box.
 */
import { Color, FabricObject, Point, classRegistry, util } from 'fabric';
import { dabBounds, strokeDabs, type Dab, type StrokePoint } from './dabs';
import { resolveStamp, type StampParams } from './stampParams';
import { applyStrokeTexture, renderDabs } from './renderDabs';

export const STAMP_KEYS = [
    'stampPoints',
    'stampParams',
    'stampColor',
    'stampSize',
    'stampSeed',
    'brushId',
] as const;

type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };
type Ctx = CanvasRenderingContext2D & { getTransform?: () => Matrix };
type Box = { minX: number; minY: number; maxX: number; maxY: number };

const round = (v: number, d: number) => Math.round(v * d) / d;
/** Never allocate an isolation layer side larger than this (device px). */
const MAX_LAYER = 4096;

/** Pointer samples as a flat number list: x, y (0.01), pressure (0.001), time in ms. */
export function packPoints(points: StrokePoint[]): number[] {
    const out: number[] = [];
    for (const p of points)
        out.push(round(p.x, 100), round(p.y, 100), round(p.p, 1000), Math.round(p.t));
    return out;
}

export function unpackPoints(flat: unknown): StrokePoint[] {
    if (!Array.isArray(flat)) return [];
    const out: StrokePoint[] = [];
    for (let i = 0; i + 3 < flat.length; i += 4) {
        const [x, y, p, t] = [flat[i], flat[i + 1], flat[i + 2], flat[i + 3]].map(Number);
        if ([x, y, p, t].every(Number.isFinite)) out.push({ x, y, p, t });
    }
    return out;
}

const scaleOf = (m: Matrix) => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;

export type StampStrokeOptions = Partial<{
    stampPoints: number[];
    stampParams: Partial<StampParams>;
    stampColor: string;
    stampSize: number;
    stampSeed: number;
    brushId: string;
}> &
    Record<string, unknown>;

export class StampStroke extends FabricObject {
    static type = 'StampStroke';
    static cacheProperties = [...FabricObject.cacheProperties, ...STAMP_KEYS];

    declare stampPoints: number[];
    declare stampParams: StampParams;
    declare stampColor: string;
    declare stampSize: number;
    declare stampSeed: number;
    declare brushId: string;
    declare __ready: boolean;
    declare __dabs: { key: unknown[]; dabs: Dab[]; box: Box } | undefined;

    constructor(options: StampStrokeOptions = {}) {
        super({
            strokeWidth: 0,
            objectCaching: true,
            ...options,
            fill: null,
            stroke: null,
        } as never);
        this.stampParams = resolveStamp(options.stampParams);
        this.stampPoints = Array.isArray(options.stampPoints) ? options.stampPoints : [];
        this.stampColor = typeof options.stampColor === 'string' ? options.stampColor : '#000000';
        this.stampSize = Number(options.stampSize) > 0 ? Number(options.stampSize) : 10;
        this.stampSeed = Number(options.stampSeed) || 1;
        this.brushId = typeof options.brushId === 'string' ? options.brushId : 'stamp';
        this.__ready = true;
    }

    /** The palette paints a stamp stroke by recolouring it (it has no fill / stroke of its own). */
    _set(key: string, value: unknown): this {
        if ((key === 'fill' || key === 'stroke') && this.__ready) {
            if (typeof value === 'string' && value) {
                const c = new Color(value);
                if (c.getAlpha() > 0) {
                    this.stampColor = `#${c.toHex().toLowerCase()}`;
                    this.dirty = true;
                }
            }
            return this;
        }
        return super._set(key as never, value as never);
    }

    /** Dabs in local units (origin = the object's top-left), cached until a stamp key changes. */
    getDabs(): { dabs: Dab[]; box: Box } {
        const key = [
            this.stampPoints,
            this.stampParams,
            this.stampColor,
            this.stampSize,
            this.stampSeed,
        ];
        const hit = this.__dabs;
        if (hit && hit.key.every((k, i) => k === key[i])) return hit;
        const dabs = strokeDabs(
            unpackPoints(this.stampPoints),
            this.stampParams,
            this.stampSize,
            this.stampColor,
            this.stampSeed,
        );
        const box = dabBounds(dabs, this.stampParams.glow) ?? {
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
        };
        this.__dabs = { key, dabs, box };
        return this.__dabs;
    }

    _render(ctx: CanvasRenderingContext2D): void {
        const c = ctx as Ctx;
        const { dabs, box } = this.getDabs();
        const P = this.stampParams;
        const paint = (target: Ctx) => {
            target.translate(-this.width / 2, -this.height / 2);
            const t = target.getTransform?.();
            const k = t ? scaleOf(t) : 1;
            renderDabs(target, dabs, P, k);
            applyStrokeTexture(target, P, box, k);
        };
        const t = c.getTransform?.();
        const isolated = ctx === (this as unknown as { _cacheContext?: unknown })._cacheContext;
        if (isolated || !t || typeof document === 'undefined') {
            c.save();
            paint(c);
            c.restore();
            return;
        }
        // drawn straight on a shared context (export, a cached group): paint in a layer of our own first
        const xs: number[] = [];
        const ys: number[] = [];
        for (const [lx, ly] of [
            [box.minX, box.minY],
            [box.maxX, box.minY],
            [box.maxX, box.maxY],
            [box.minX, box.maxY],
        ]) {
            const x = lx - this.width / 2;
            const y = ly - this.height / 2;
            xs.push(t.a * x + t.c * y + t.e);
            ys.push(t.b * x + t.d * y + t.f);
        }
        // only the part inside the target canvas is ever seen (deep zoom: a stroke can be huge on screen)
        const W = c.canvas?.width ?? Infinity;
        const H = c.canvas?.height ?? Infinity;
        const bx = Math.max(0, Math.floor(Math.min(...xs)));
        const by = Math.max(0, Math.floor(Math.min(...ys)));
        const bw = Math.min(W, Math.ceil(Math.max(...xs))) - bx;
        const bh = Math.min(H, Math.ceil(Math.max(...ys))) - by;
        if (bw < 1 || bh < 1) return;
        const k = Math.min(1, MAX_LAYER / Math.max(bw, bh));
        const layer = document.createElement('canvas');
        layer.width = Math.max(1, Math.round(bw * k));
        layer.height = Math.max(1, Math.round(bh * k));
        const lctx = layer.getContext('2d') as Ctx | null;
        if (!lctx) return;
        lctx.setTransform(k, 0, 0, k, -bx * k, -by * k);
        lctx.transform(t.a, t.b, t.c, t.d, t.e, t.f);
        paint(lctx);
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(layer, bx, by, bw, bh);
        c.restore();
    }

    /** Is a scene point on the stroke (within its dab reach)? Used by the stroke eraser. */
    containsPoint(point: Point): boolean {
        const inv = util.invertTransform(this.calcTransformMatrix());
        const local = new Point(point.x, point.y).transform(inv);
        const x = local.x + this.width / 2;
        const y = local.y + this.height / 2;
        const pts = unpackPoints(this.stampPoints);
        const P = this.stampParams;
        const reach = (this.stampSize / 2) * (P.spray ? 1 + P.scatter : 1 + 2 * P.scatter) + 1;
        if (pts.length === 1) return Math.hypot(x - pts[0].x, y - pts[0].y) <= reach;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1];
            const b = pts[i];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len2 = dx * dx + dy * dy || 1;
            const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
            if (Math.hypot(x - (a.x + u * dx), y - (a.y + u * dy)) <= reach) return true;
        }
        return false;
    }

    toObject(propertiesToInclude: string[] = []): Record<string, unknown> {
        return (
            FabricObject.prototype.toObject as (
                this: unknown,
                p: string[],
            ) => Record<string, unknown>
        ).call(this, [...STAMP_KEYS, ...propertiesToInclude]);
    }

    /** SVG: the stroke as an embedded PNG at 2 × (vector tips would be thousands of elements). */
    _toSVG(): string[] {
        if (typeof document === 'undefined') return ['<g ', 'COMMON_PARTS', '></g>\n'];
        const k = 2;
        const w = Math.max(1, this.width);
        const h = Math.max(1, this.height);
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * k);
        c.height = Math.ceil(h * k);
        const ctx = c.getContext('2d');
        if (ctx) {
            ctx.scale(k, k);
            ctx.translate(w / 2, h / 2);
            this._render(ctx);
        }
        const href = c.toDataURL('image/png');
        return [
            '\t<image ',
            'COMMON_PARTS',
            `x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" href="${href}" xlink:href="${href}"></image>\n`,
        ];
    }
}

classRegistry.setClass(StampStroke);
