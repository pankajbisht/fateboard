/**
 * Geometry of the colour wheel (ColorPickerPopover "Wheel" view): hue runs clockwise from the top
 * (0° red at 12 o'clock, 120° green at 4, 240° blue at 8), matching CSS `conic-gradient` with no offset.
 * Saturation / brightness live in the square inside the ring. Pure functions, no DOM.
 */
import type { HSV } from './colorMath';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Hue (0 … 360) of a point at offset (dx, dy) from the wheel centre, screen axes (y down). */
export function hueFromPoint(dx: number, dy: number): number {
    if (dx === 0 && dy === 0) return 0;
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return (deg + 360) % 360;
}

/** Offset from the centre of the point on a circle of `radius` at hue `h`. */
export function pointFromHue(h: number, radius: number): { x: number; y: number } {
    const a = (h * Math.PI) / 180;
    return { x: Math.sin(a) * radius, y: -Math.cos(a) * radius };
}

/** Is the offset on the ring between `inner` and `outer` radius? */
export const onRing = (dx: number, dy: number, inner: number, outer: number) => {
    const d = Math.hypot(dx, dy);
    return d >= inner && d <= outer;
};

/** Side of the largest square that fits inside a circle of `radius` (the S / V square). */
export const inscribedSquare = (radius: number) => radius * Math.SQRT2;

/** Arrow keys on the S / V square: left / right = saturation, up / down = brightness (Shift = 10). */
export function svFromKey(hsv: HSV, key: string, shift: boolean): HSV | null {
    const d = shift ? 10 : 1;
    const move: Record<string, [number, number]> = {
        ArrowLeft: [-d, 0],
        ArrowRight: [d, 0],
        ArrowUp: [0, d],
        ArrowDown: [0, -d],
    };
    if (!move[key]) return null;
    const [ds, dv] = move[key];
    return { ...hsv, s: clamp(hsv.s + ds, 0, 100), v: clamp(hsv.v + dv, 0, 100) };
}

/** Arrow / Home / End keys on a hue slider or ring (Shift = 10°). The ring wraps around; the bar does not. */
export function hueFromKey(hsv: HSV, key: string, shift: boolean, wrap = false): HSV | null {
    const d = shift ? 10 : 1;
    const to: Record<string, number> = {
        ArrowLeft: hsv.h - d,
        ArrowDown: hsv.h - d,
        ArrowRight: hsv.h + d,
        ArrowUp: hsv.h + d,
        Home: 0,
        End: wrap ? 359 : 360,
    };
    if (!(key in to)) return null;
    const h = wrap ? (to[key] + 360) % 360 : clamp(to[key], 0, 360);
    return { ...hsv, h };
}
