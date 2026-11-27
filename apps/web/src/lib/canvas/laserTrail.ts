/**
 * Laser pointer trail (Excalidraw / FigJam laser): what the pointer drew in the last second, fading
 * out. Nothing here is part of the document.
 */
export const LASER_LIFE_MS = 1000;

export type LaserPoint = { x: number; y: number; t: number };
export type LaserStroke = LaserPoint[];

/** The strokes with only the points still alive at `now`; empty strokes are dropped. */
export function liveLaserStrokes(strokes: readonly LaserStroke[], now: number): LaserStroke[] {
    return strokes
        .map((stroke) => stroke.filter((p) => now - p.t <= LASER_LIFE_MS))
        .filter((stroke) => stroke.length > 0);
}

/** 1 when just drawn, 0 at the end of its life. */
export const laserAlpha = (age: number): number =>
    Math.min(1, Math.max(0, 1 - age / LASER_LIFE_MS));

/** Chaikin corner cutting (twice): turns the sampled polyline into a smooth curve, ends kept. */
export function smoothLaserLine(stroke: readonly LaserPoint[], passes = 2): LaserPoint[] {
    let pts = stroke.slice();
    for (let k = 0; k < passes && pts.length > 2; k++) {
        const next: LaserPoint[] = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            const mix = (f: number) => ({
                x: a.x + (b.x - a.x) * f,
                y: a.y + (b.y - a.y) * f,
                t: a.t + (b.t - a.t) * f,
            });
            next.push(mix(0.25), mix(0.75));
        }
        next.push(pts[pts.length - 1]);
        pts = next;
    }
    return pts;
}

export type LaserOutline = { left: { x: number; y: number }[]; right: { x: number; y: number }[] };

/**
 * The two edges of a stroke drawn as one filled shape: `width` wide at a point drawn just now, narrowing to
 * nothing as a point ages out, so the tail tapers instead of fading in separate, overlapping segments.
 */
export function laserOutline(
    stroke: readonly LaserPoint[],
    now: number,
    width: number,
): LaserOutline {
    const pts = smoothLaserLine(stroke);
    const left: LaserOutline['left'] = [];
    const right: LaserOutline['right'] = [];
    let nx = 0;
    let ny = 1;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len > 1e-6) {
            nx = -(b.y - a.y) / len;
            ny = (b.x - a.x) / len;
        }
        const r = (width / 2) * laserAlpha(now - pts[i].t);
        left.push({ x: pts[i].x + nx * r, y: pts[i].y + ny * r });
        right.push({ x: pts[i].x - nx * r, y: pts[i].y - ny * r });
    }
    return { left, right };
}
