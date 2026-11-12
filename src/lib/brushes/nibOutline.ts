/**
 * Calligraphy pen geometry (Inkscape's Calligraphy tool): a flat nib dragged along the stroke. Pure, no Fabric.
 * - width: nib length; each sample's `f` scales it (thinning by speed, stylus pressure)
 * - angle: nib angle in degrees (0 = horizontal)
 * - fixation: 1 = the nib keeps `angle` (thick / thin by direction), 0 = it turns across the stroke (even width)
 * - caps: round ends, 0 (flat) … 5, in nib half-widths beyond the first / last point
 */
export type NibSample = { x: number; y: number; f: number };
export type NibOptions = { width: number; angle: number; fixation: number; caps: number };
type Pt = { x: number; y: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Width share for one sample: `speed` in screen px per ms; thinning -1 … 1. */
export function nibWidthFactor({
    speed,
    thinning,
    pressure,
}: {
    speed: number;
    thinning: number;
    pressure?: number;
}): number {
    const bySpeed = clamp(1 - thinning * Math.min(speed, 4) * 0.25, 0.1, 2);
    return bySpeed * (pressure !== undefined && pressure > 0 ? pressure : 1);
}

export function nibOutline(samples: readonly NibSample[], opts: NibOptions): Pt[] {
    if (!samples.length) return [];
    const pts =
        samples.length === 1 ? [samples[0], { ...samples[0], x: samples[0].x + 0.01 }] : samples;
    const rad = (opts.angle * Math.PI) / 180;
    const fixed = { x: Math.cos(rad), y: Math.sin(rad) };
    const fix = clamp(opts.fixation, 0, 1);
    const half = opts.width / 2;

    const left: Pt[] = [];
    const right: Pt[] = [];
    const dirs: Pt[] = [];
    pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
        // across the stroke, on the same side as the fixed nib so the blend never flips
        let across = { x: -dir.y, y: dir.x };
        if (across.x * fixed.x + across.y * fixed.y < 0) across = { x: -across.x, y: -across.y };
        let nx = fix * fixed.x + (1 - fix) * across.x;
        let ny = fix * fixed.y + (1 - fix) * across.y;
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl;
        ny /= nl;
        const r = half * p.f;
        dirs.push(dir);
        left.push({ x: p.x + nx * r, y: p.y + ny * r });
        right.push({ x: p.x - nx * r, y: p.y - ny * r });
    });

    /** Half-ellipse from `from` round to the opposite side of `c`, bulging `reach` px along `dir`. */
    const cap = (c: Pt, from: Pt, dir: Pt, reach: number): Pt[] => {
        if (reach <= 0) return [];
        const ux = from.x - c.x;
        const uy = from.y - c.y;
        return Array.from({ length: 7 }, (_, k) => {
            const t = (Math.PI * (k + 1)) / 8;
            return {
                x: c.x + ux * Math.cos(t) + dir.x * reach * Math.sin(t),
                y: c.y + uy * Math.cos(t) + dir.y * reach * Math.sin(t),
            };
        });
    };

    const last = pts.length - 1;
    const reach = (i: number) => clamp(opts.caps, 0, 5) * half * pts[i].f;
    return [
        ...left,
        ...cap(pts[last], left[last], dirs[last], reach(last)),
        ...[...right].reverse(),
        ...cap(pts[0], right[0], { x: -dirs[0].x, y: -dirs[0].y }, reach(0)),
    ];
}
