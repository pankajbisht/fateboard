import type { EyeStyle } from '../schema/types';
import { fmt, type P2 } from './shapes';

/**
 * Eye shapes and the manga eye extras (docs/CHARACTER_STUDIO.md, manga look): how tall each eye style is, how far its
 * outer corner lifts (sharp = upturned tsurime, droopy = tareme), how big it is (sparkle = big shojo eyes), the lash
 * line with flicks, and the star highlight. Pure: face.ts places the results on the head.
 */
export interface EyeShape {
    /** height against a round eye */
    tall: number;
    /**
     * How far the outer corner rises (+) or drops (-), in eye half-heights. 0 = an ellipse; otherwise the eye is an
     * almond: two lid curves meeting at the corners.
     */
    lift: number;
    /** size against a round eye */
    size: number;
}

export const EYE_SHAPES: Record<EyeStyle, EyeShape> = {
    round: { tall: 1, lift: 0, size: 1 },
    almond: { tall: 0.66, lift: 0, size: 1 },
    sleepy: { tall: 1, lift: 0, size: 1 },
    sharp: { tall: 0.62, lift: 0.9, size: 1.08 },
    droopy: { tall: 0.8, lift: -0.75, size: 1.02 },
    sparkle: { tall: 1.12, lift: 0, size: 1.14 },
};

const dir = (deg: number): P2 => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const at = (c: P2, a: P2, s: number, n: P2, t: number): P2 => [
    c[0] + a[0] * s + n[0] * t,
    c[1] + a[1] * s + n[1] * t,
];
const pt = (p: P2) => `${fmt(p[0])} ${fmt(p[1])}`;

/**
 * The eye's frame on screen: `a` along the eye (pointing right), `n` across it (pointing up), and `side` = which way
 * along `a` the outer corner is. `tilt` is the head's sideways axis on screen; `outer` the screen direction from the
 * eye's centre toward its outer corner (the eye's side along that axis).
 */
function frame(tilt: number, outer: P2) {
    let a = dir(tilt);
    if (a[0] < 0) a = [-a[0], -a[1]];
    const n: P2 = [a[1], -a[0]];
    const side = a[0] * outer[0] + a[1] * outer[1] >= 0 ? 1 : -1;
    return { a, n, side };
}

/** An almond eye: inner corner, upper lid control, outer corner, lower lid control. */
function almond(c: P2, w: number, h: number, tilt: number, outer: P2, lift: number) {
    const { a, n, side } = frame(tilt, outer);
    const inner = at(c, a, -side * w, n, 0);
    const out = at(c, a, side * w, n, h * lift);
    // the upper lid peaks toward the outer corner on a sharp eye, toward the inner one on a droopy eye
    const up = at(c, a, side * w * 0.18 * Math.sign(lift), n, h * 2.1);
    const low = at(c, a, -side * w * 0.08, n, -h * 1.5 + h * lift * 0.3);
    return { inner, out, up, low, a, n, side };
}

/** The eye outline: an almond for a lifted or dropped outer corner, else null (face.ts draws an ellipse). */
export function eyeOutline(c: P2, w: number, h: number, tilt: number, outer: P2, lift: number) {
    if (!lift) return null;
    const e = almond(c, w, h, tilt, outer, lift);
    return `M${pt(e.inner)}Q${pt(e.up)} ${pt(e.out)}Q${pt(e.low)} ${pt(e.inner)}Z`;
}

/**
 * The upper lash line over the top of the eye and two flicks at the outer corner, as one open path. It follows the
 * almond's upper lid when the eye has one, else an arc of the ellipse. Arguments as `eyeOutline`.
 */
export function lashPath(c: P2, w: number, h: number, tilt: number, outer: P2, lift = 0): string {
    const { a, n, side } = frame(tilt, outer);
    let lid: string;
    let o: P2;
    let m: P2;
    if (lift) {
        const e = almond(c, w, h, tilt, outer, lift);
        lid = `M${pt(e.inner)}Q${pt(e.up)} ${pt(e.out)}`;
        o = e.out;
        // a point on the upper lid near the outer corner (t = 0.8 on the curve)
        const t = 0.8;
        const q = (k: 0 | 1) =>
            (1 - t) ** 2 * e.inner[k] + 2 * t * (1 - t) * e.up[k] + t * t * e.out[k];
        m = [q(0), q(1)];
    } else {
        const left = at(c, a, -w, n, 0);
        const right = at(c, a, w, n, 0);
        // SVG sweep 1 runs clockwise on screen: left to right over the top
        lid = `M${pt(left)}A${fmt(w)} ${fmt(h)} ${fmt(tilt)} 0 1 ${pt(right)}`;
        o = side > 0 ? right : left;
        m = at(c, a, side * w * 0.8, n, h * 0.6);
    }
    const f1 = at(o, a, side * w * 0.18, n, h * 0.2);
    const f2 = at(m, a, side * w * 0.1, n, h * 0.26);
    return `${lid}M${pt(o)}L${pt(f1)}M${pt(m)}L${pt(f2)}`;
}

/** A four-point star highlight (sparkle eyes), centre `c`, radius `r`. */
export function starPath(c: P2, r: number): string {
    const pts: P2[] = [];
    for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 - Math.PI / 2;
        const k = i % 2 ? r * 0.28 : r;
        pts.push([c[0] + Math.cos(ang) * k, c[1] + Math.sin(ang) * k]);
    }
    return `M${pts.map(pt).join('L')}Z`;
}
