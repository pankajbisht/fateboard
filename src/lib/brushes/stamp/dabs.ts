/**
 * The stamp engine's geometry: pointer samples in, dabs out (position, size, angle, opacity, colour). Pure and
 * seeded, so the live preview and every later redraw of the saved stroke place the same dabs. Drawing them is
 * `renderDabs.ts`; the settings are `stampParams.ts`.
 */
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from '@/lib/colorMath';
import { gaussian, mulberry32 } from './rng';
import type { StampParams } from './stampParams';

/** One pointer sample: position (object units), pressure 0 … 1 (a mouse is 1), time in ms from the start. */
export type StrokePoint = { x: number; y: number; p: number; t: number };

export type Dab = {
    x: number;
    y: number;
    /** Diameter in object units. */
    size: number;
    /** Radians. */
    angle: number;
    /** Tip height factor (roundness). */
    sy: number;
    alpha: number;
    /** #rrggbb */
    color: string;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Ease-out taper: 0 → 8 % of the size, 1 → full size. */
const taper = (x: number) => (x >= 1 ? 1 : 0.08 + 0.92 * Math.max(0, x) * (2 - Math.max(0, x)));

/** Mix two #rrggbb colours. */
export function mixHex(a: string, b: string, t: number): string {
    const A = hexToRgb(a) ?? { r: 0, g: 0, b: 0 };
    const B = hexToRgb(b) ?? A;
    return rgbToHex({ r: lerp(A.r, B.r, t), g: lerp(A.g, B.g, t), b: lerp(A.b, B.b, t) });
}

/** Fire palette by heat 0 … 1: the cool colour (color2) → the brush colour → yellow → white-hot. */
export function fireColor(base: string, cool: string, heat: number): string {
    const stops: [number, string][] = [
        [0, cool],
        [0.45, base],
        [0.8, '#ffcf3f'],
        [1, '#fff4d6'],
    ];
    const h = clamp(heat, 0, 1);
    for (let i = 1; i < stops.length; i++) {
        const [p1, c1] = stops[i];
        const [p0, c0] = stops[i - 1];
        if (h <= p1) return mixHex(c0, c1, (h - p0) / (p1 - p0));
    }
    return stops[stops.length - 1][1];
}

/** Fire's body colour: the drawing colour, or orange when it is a gray (black fire looks like soot). */
export function fireBody(hex: string): string {
    const rgb = hexToRgb(hex);
    return rgb && rgbToHsl(rgb).s >= 15 && rgbToHsl(rgb).l > 8 ? hex : '#ff6a00';
}

/** Turn the hue by `dh` degrees and the lightness by `dl` points. */
export function shiftHsl(hex: string, dh: number, dl: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const hsl = rgbToHsl(rgb);
    return rgbToHex(
        hslToRgb({ h: (hsl.h + dh + 360) % 360, s: hsl.s, l: clamp(hsl.l + dl, 0, 100) }),
    );
}

/**
 * Walks a stroke and emits dabs. Feed points in order with `push`; it keeps the spacing carry, the stroke
 * direction and the random sequence between calls, so incremental (live) and one-shot (saved) walks agree.
 * `totalLength` (known once the stroke ends) turns on the end taper.
 */
export class DabWalker {
    private readonly rnd: () => number;
    private prev: StrokePoint | null = null;
    private dist = 0;
    private carry = 0;
    private sprayCarry = 0;
    private dir = 0;
    /* jag: offsets at the last / next knot and their distances along the stroke (own random stream) */
    private readonly jagRnd: () => number;
    private jagFrom = 0;
    private jagTo = 0;
    private jagStart = 0;
    private jagEnd = 0;

    private readonly params: StampParams;
    private readonly size: number;
    private readonly color: string;
    private readonly totalLength: number;

    constructor(
        params: StampParams,
        size: number,
        color: string,
        seed: number,
        totalLength = Infinity,
    ) {
        this.params = params;
        this.size = size;
        this.color = color;
        this.totalLength = totalLength;
        this.rnd = mulberry32(seed);
        // a separate stream, so turning jag on never changes the other random dab settings
        this.jagRnd = mulberry32(seed ^ 0x9e3779b9);
    }

    /**
     * Lightning zigzag: the offset across the stroke at a distance along it. Knots every 2 … 6 brush sizes get
     * a random offset (up to 3 sizes × jag); between knots the trail runs straight, so the
     * dabs form one connected, sharply turning line.
     */
    private jagAt(dist: number): number {
        const amp = this.params.jag * this.size * 3;
        while (dist >= this.jagEnd) {
            this.jagStart = this.jagEnd;
            this.jagFrom = this.jagTo;
            this.jagEnd += Math.max(4, this.size * (2 + 4 * this.jagRnd()));
            this.jagTo = (this.jagRnd() * 2 - 1) * amp;
        }
        return lerp(
            this.jagFrom,
            this.jagTo,
            (dist - this.jagStart) / (this.jagEnd - this.jagStart),
        );
    }

    /** Diameter (before jitter) at a distance along the stroke, for a pressure and a speed (px / ms). */
    sizeAt(dist: number, pressure: number, speed: number): number {
        const P = this.params;
        let s = this.size * (1 - P.pressureSize + P.pressureSize * clamp(pressure, 0, 1));
        if (P.velocitySize)
            s *= clamp(1 - P.velocitySize * (Math.min(speed / 3, 1) - 0.15), 0.15, 2.5);
        if (P.taperStart > 0) s *= taper(dist / (P.taperStart * this.size));
        if (P.taperEnd > 0 && Number.isFinite(this.totalLength))
            s *= taper((this.totalLength - dist) / (P.taperEnd * this.size));
        if (P.grow) {
            const k = Math.min(1, dist / (this.size * 20));
            s *= Math.max(0.1, 1 + P.grow * k * (P.grow > 0 ? 2 : 0.9));
        }
        return Math.max(0.05, s);
    }

    push(pt: StrokePoint): Dab[] {
        const out: Dab[] = [];
        const a = this.prev;
        this.prev = pt;
        if (!a) {
            this.emit(pt, 0, out);
            return out;
        }
        const dx = pt.x - a.x;
        const dy = pt.y - a.y;
        const len = Math.hypot(dx, dy);
        const dt = Math.max(0, pt.t - a.t);
        const speed = dt > 0 ? len / dt : 0;
        if (len > 0) this.dir = Math.atan2(dy, dx);

        if (this.params.spray) {
            // a spray keeps emitting with time (also while still) and never leaves gaps when moving fast
            this.sprayCarry += (this.params.sprayRate * dt) / 1000;
            const byDistance = len / Math.max(0.5, this.params.spacing * this.size);
            const n = Math.min(400, Math.floor(Math.max(this.sprayCarry, byDistance)));
            this.sprayCarry = Math.max(0, this.sprayCarry - n);
            for (let i = 1; i <= n; i++) {
                const f = i / n;
                const q = {
                    ...pt,
                    x: lerp(a.x, pt.x, f),
                    y: lerp(a.y, pt.y, f),
                    p: lerp(a.p, pt.p, f),
                };
                this.emit(q, speed, out, this.dist + len * f);
            }
            this.dist += len;
            return out;
        }

        let travelled = 0;
        for (let guard = 0; guard < 100000; guard++) {
            const f0 = len > 0 ? travelled / len : 1;
            const step = Math.max(
                0.25,
                this.params.spacing *
                    this.sizeAt(this.dist + travelled, lerp(a.p, pt.p, f0), speed),
            );
            const need = step - this.carry;
            if (travelled + need > len) {
                this.carry += len - travelled;
                break;
            }
            travelled += need;
            this.carry = 0;
            const f = travelled / len;
            const q = {
                ...pt,
                x: lerp(a.x, pt.x, f),
                y: lerp(a.y, pt.y, f),
                p: lerp(a.p, pt.p, f),
            };
            this.emit(q, speed, out, this.dist + travelled);
        }
        this.dist += len;
        return out;
    }

    private emit(q: StrokePoint, speed: number, out: Dab[], dist = 0) {
        const P = this.params;
        const rnd = this.rnd;
        const base = this.sizeAt(dist, q.p, speed);
        const pressureAlpha = 1 - P.pressureOpacity + P.pressureOpacity * clamp(q.p, 0, 1);
        const jag = P.jag > 0 ? this.jagAt(dist) : 0;
        for (let i = 0; i < P.count; i++) {
            let x = q.x - Math.sin(this.dir) * jag;
            let y = q.y + Math.cos(this.dir) * jag;
            let size = base * (1 - P.sizeJitter * rnd());
            if (P.spray) {
                // particles inside the nozzle: hard spray = even disc, soft spray = denser in the middle
                const spread = (base / 2) * (1 + P.scatter);
                const r =
                    P.hardness >= 0.5
                        ? spread * Math.sqrt(rnd())
                        : spread * Math.min(1, Math.abs(gaussian(rnd)) / 2.5);
                const t = rnd() * Math.PI * 2;
                x += Math.cos(t) * r;
                y += Math.sin(t) * r;
                size = Math.max(0.05, size * P.particle);
            } else if (P.scatter > 0) {
                const across = (rnd() * 2 - 1) * P.scatter * base;
                const along = (rnd() * 2 - 1) * P.scatter * base * 0.5;
                x += -Math.sin(this.dir) * across + Math.cos(this.dir) * along;
                y += Math.cos(this.dir) * across + Math.sin(this.dir) * along;
            }
            if (P.drift > 0) y -= P.drift * rnd() * base * 2;
            const angle =
                (P.angle * Math.PI) / 180 +
                (P.followStroke ? this.dir : 0) +
                (rnd() * 2 - 1) * Math.PI * P.angleJitter;
            const alpha = clamp(P.flow * pressureAlpha * (1 - P.opacityJitter * rnd()), 0, 1);
            out.push({ x, y, size, angle, sy: P.roundness, alpha, color: this.colorAt(dist) });
        }
    }

    private colorAt(dist: number): string {
        const P = this.params;
        const rnd = this.rnd;
        let c = this.color;
        if (P.colorMode === 'fire') c = fireColor(fireBody(this.color), P.color2, rnd());
        else if (P.colorMode === 'gradient') {
            const t = (dist / (this.size * 30)) % 2;
            c = mixHex(this.color, P.color2, t > 1 ? 2 - t : t);
        } else if (P.colorMode === 'rainbow')
            c = shiftHsl(this.color, (dist / (this.size * 25)) * 360, 0);
        if (P.hueJitter > 0 || P.lightJitter > 0)
            c = shiftHsl(
                c,
                (rnd() * 2 - 1) * 180 * P.hueJitter,
                (rnd() * 2 - 1) * 40 * P.lightJitter,
            );
        return c;
    }
}

/** Total length of a polyline (object units). */
export function strokeLength(points: StrokePoint[]): number {
    let len = 0;
    for (let i = 1; i < points.length; i++)
        len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    return len;
}

/** Every dab of a finished stroke (end taper on). */
export function strokeDabs(
    points: StrokePoint[],
    params: StampParams,
    size: number,
    color: string,
    seed: number,
): Dab[] {
    const walker = new DabWalker(params, size, color, seed, strokeLength(points));
    const out: Dab[] = [];
    for (const p of points) out.push(...walker.push(p));
    return out;
}

/** How far a dab's ink reaches from its centre (tip box turned any way, plus the glow halo). */
export const dabReach = (d: Dab, glow: number) => d.size * 0.72 * (1 + 2 * glow);

/** Bounding box of the ink of a list of dabs. */
export function dabBounds(dabs: Dab[], glow: number) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const d of dabs) {
        const r = dabReach(d, glow);
        minX = Math.min(minX, d.x - r);
        minY = Math.min(minY, d.y - r);
        maxX = Math.max(maxX, d.x + r);
        maxY = Math.max(maxY, d.y + r);
    }
    if (!Number.isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
}
