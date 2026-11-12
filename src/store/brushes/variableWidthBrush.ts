/**
 * Ink + Calligraphy brush engines (moved out of createBrushSlice.ts unchanged, 2026-11-13, so the slice stays
 * under its size ceiling). A Fabric PencilBrush that draws a variable-width FILLED shape.
 */
import * as fabric from 'fabric';
import { clamp } from '../brushConfig';

export type Pt = { x: number; y: number };
export type Sample = { x: number; y: number; f: number };

/* ------------------------------------------------------------------ */
/* Ink + Calligraphy: variable-width brush producing a filled shape    */
/* ------------------------------------------------------------------ */

export function smoothSamples(pts: Sample[], passes: number): Sample[] {
    let cur = pts;
    for (let k = 0; k < passes; k++) {
        if (cur.length < 3) break;
        const prev = cur;
        cur = prev.map((p, i) =>
            i === 0 || i === prev.length - 1
                ? p
                : {
                      x: (prev[i - 1].x + 2 * p.x + prev[i + 1].x) / 4,
                      y: (prev[i - 1].y + 2 * p.y + prev[i + 1].y) / 4,
                      f: (prev[i - 1].f + 2 * p.f + prev[i + 1].f) / 4,
                  },
        );
    }
    return cur;
}

export class VariableWidthBrush extends (fabric.PencilBrush as any) {
    mode: 'ink' | 'calligraphy' = 'ink';
    smoothing = 2;
    taper = 4; // 0..10, ink only
    nibAngle = Math.PI / 4; // calligraphy only
    samples: Sample[] = [];
    lastT = 0;
    factor = 0.7;
    /** false = a mouse draws at a constant width (the Pencil's pressure mode: stylus only) */
    speedWidth = true;

    /** Pen pressure when a stylus is used, otherwise drawing speed (fast = thin). */
    addSample(p: Pt, e?: any): boolean {
        const last = this.samples[this.samples.length - 1];
        const zoom = this.canvas.getZoom?.() ?? 1;
        const now = performance.now();
        const pen = e && e.pointerType === 'pen' && e.pressure > 0;

        if (last) {
            const d = Math.hypot(p.x - last.x, p.y - last.y);
            if (d < 1.2 / zoom) return false;
            if (this.mode === 'ink') {
                const target = pen
                    ? 0.15 + 0.85 * e.pressure
                    : this.speedWidth
                      ? clamp(1.1 - ((d * zoom) / Math.max(now - this.lastT, 1)) * 0.4, 0.3, 1)
                      : 1;
                this.factor = this.factor * 0.7 + target * 0.3;
            }
        } else if (this.mode === 'ink') {
            this.factor = pen ? 0.15 + 0.85 * e.pressure : this.speedWidth ? 0.7 : 1;
        }

        this.lastT = now;
        this.samples.push({ x: p.x, y: p.y, f: this.mode === 'ink' ? this.factor : 1 });
        return true;
    }

    outline(final: boolean): Pt[] {
        let pts: Sample[] = this.samples.map((s: Sample) => ({ ...s }));
        if (!pts.length) return [];
        if (pts.length === 1) pts = [pts[0], { ...pts[0], x: pts[0].x + 0.01 }];
        pts = smoothSamples(pts, Math.round(this.smoothing / 2));

        const len: number[] = [0];
        for (let i = 1; i < pts.length; i++) {
            len[i] = len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        }
        const total = len[len.length - 1];
        const taperLen = this.mode === 'ink' ? this.taper * this.width * 1.5 : 0;
        const half = this.width / 2;

        const L: Pt[] = [];
        const R: Pt[] = [];
        const radii: number[] = [];
        const normals: Pt[] = [];

        for (let i = 0; i < pts.length; i++) {
            const a = pts[Math.max(0, i - 1)];
            const b = pts[Math.min(pts.length - 1, i + 1)];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            const dl = Math.hypot(dx, dy) || 1;
            dx /= dl;
            dy /= dl;

            let nx: number;
            let ny: number;
            let r: number;
            if (this.mode === 'calligraphy') {
                nx = Math.cos(this.nibAngle);
                ny = Math.sin(this.nibAngle);
                r = half;
            } else {
                nx = -dy;
                ny = dx;
                let f = pts[i].f;
                if (taperLen > 0) {
                    const t0 = len[i] / taperLen;
                    const t1 = final ? (total - len[i]) / taperLen : 1; // end taper only on release
                    f *= clamp(Math.min(t0, t1), 0.08, 1);
                }
                r = half * f;
            }
            normals.push({ x: nx, y: ny });
            radii.push(r);
            L.push({ x: pts[i].x + nx * r, y: pts[i].y + ny * r });
            R.push({ x: pts[i].x - nx * r, y: pts[i].y - ny * r });
        }

        const poly: Pt[] = [...L];
        const cap = (i: number, startAngle: number) => {
            const out: Pt[] = [];
            for (let k = 1; k < 8; k++) {
                const ang = startAngle - (Math.PI * k) / 8;
                out.push({
                    x: pts[i].x + Math.cos(ang) * radii[i],
                    y: pts[i].y + Math.sin(ang) * radii[i],
                });
            }
            return out;
        };
        const last = pts.length - 1;
        if (this.mode === 'ink')
            poly.push(...cap(last, Math.atan2(normals[last].y, normals[last].x)));
        for (let i = last; i >= 0; i--) poly.push(R[i]);
        if (this.mode === 'ink')
            poly.push(...cap(0, Math.atan2(normals[0].y, normals[0].x) + Math.PI));
        return poly;
    }

    drawPreview() {
        const canvas = this.canvas;
        const ctx = canvas.contextTop;
        canvas.clearContext(ctx);
        const poly = this.outline(false);
        if (poly.length < 3) return;

        const v = canvas.viewportTransform;
        ctx.save();
        ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
        if (this.shadow) {
            const z = canvas.getZoom() * (canvas.getRetinaScaling?.() ?? 1);
            ctx.shadowColor = this.shadow.color;
            ctx.shadowBlur = this.shadow.blur * z;
            ctx.shadowOffsetX = this.shadow.offsetX * z;
            ctx.shadowOffsetY = this.shadow.offsetY * z;
        }
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
        ctx.closePath();
        ctx.fill('nonzero');
        ctx.restore();
    }

    finalizePath() {
        const canvas = this.canvas;
        const poly = this.outline(true);
        if (poly.length < 3) return;
        const d =
            'M ' + poly.map((p) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`).join(' L ') + ' Z';
        const path = new fabric.Path(d, {
            fill: this.color,
            stroke: null,
            strokeWidth: 0,
            objectCaching: true,
            shadow: this.shadow
                ? new fabric.Shadow({
                      color: this.shadow.color,
                      blur: this.shadow.blur,
                      offsetX: this.shadow.offsetX,
                      offsetY: this.shadow.offsetY,
                  })
                : null,
        } as any);
        canvas.fire('before:path:created', { path });
        canvas.add(path);
        canvas.requestRenderAll();
        path.setCoords();
        canvas.fire('path:created', { path });
    }

    onMouseDown(_pointer: Pt, ctx?: any) {
        this.samples = [];
        if (ctx?.e && ctx.e.button > 0) return; // primary button only
        this.lastT = performance.now();
        this.factor = 0.7;
        this.addSample(_pointer, ctx?.e);
        this.drawPreview();
    }
    onMouseMove(pointer: Pt, ctx?: any) {
        if (!this.samples.length) return;
        if (ctx?.e?.shiftKey) this.samples = this.samples.slice(0, 1); // Shift = straight line
        if (this.addSample(pointer, ctx?.e)) this.drawPreview();
    }
    onMouseUp() {
        const canvas = this.canvas;
        try {
            if (this.samples.length) this.finalizePath();
        } finally {
            this.samples = [];
            canvas.clearContext(canvas.contextTop);
        }
        return false; // drawing finished
    }
    // the canvas calls this when it re-renders mid-stroke
    _render() {
        if (this.samples.length) this.drawPreview();
    }
}
