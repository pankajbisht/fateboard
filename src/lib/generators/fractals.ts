/**
 * Fractal generators (pure, no Fabric). Each one builds polylines in its own coordinates; `fractalPath` scales
 * them into a `size` box with the top-left at 0,0 and returns SVG path data for one `fabric.Path`.
 * Depth is clamped per kind so the point count stays bounded (about 16k points at most).
 */

export type FractalKind = 'koch' | 'sierpinski' | 'tree' | 'dragon' | 'hilbert';

export const FRACTAL_LIMITS: Record<FractalKind, number> = {
    koch: 6,
    sierpinski: 7,
    tree: 11,
    dragon: 14,
    hilbert: 7,
};

export type FractalOptions = {
    kind: FractalKind;
    depth: number;
    /** longest side of the result, in px */
    size: number;
    /** tree only: branch angle in degrees (default 25) */
    angle?: number;
};

type Pt = [number, number];
type Line = { pts: Pt[]; closed: boolean };

const koch = (depth: number): Line[] => {
    const h = Math.sqrt(3) / 2;
    let pts: Pt[] = [
        [0, 0],
        [1, 0],
        [0.5, h],
    ];
    for (let i = 0; i < depth; i++) {
        const next: Pt[] = [];
        pts.forEach((a, k) => {
            const b = pts[(k + 1) % pts.length];
            const dx = (b[0] - a[0]) / 3;
            const dy = (b[1] - a[1]) / 3;
            const p1: Pt = [a[0] + dx, a[1] + dy];
            const p3: Pt = [a[0] + 2 * dx, a[1] + 2 * dy];
            // peak: the middle third rotated -60° (outwards for this winding)
            const p2: Pt = [p1[0] + dx / 2 + dy * h, p1[1] + dy / 2 - dx * h];
            next.push(a, p1, p2, p3);
        });
        pts = next;
    }
    return [{ pts: [...pts, pts[0]], closed: true }];
};

const sierpinski = (depth: number): Line[] => {
    const out: Line[] = [];
    const walk = (a: Pt, b: Pt, c: Pt, n: number) => {
        if (n === 0) {
            out.push({ pts: [a, b, c], closed: true });
            return;
        }
        const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const ab = mid(a, b);
        const bc = mid(b, c);
        const ca = mid(c, a);
        walk(a, ab, ca, n - 1);
        walk(ab, b, bc, n - 1);
        walk(ca, bc, c, n - 1);
    };
    walk([0.5, 0], [1, Math.sqrt(3) / 2], [0, Math.sqrt(3) / 2], depth);
    return out;
};

const tree = (depth: number, angleDeg: number): Line[] => {
    const out: Line[] = [];
    const spread = (angleDeg * Math.PI) / 180;
    const grow = (from: Pt, dir: number, len: number, n: number) => {
        const to: Pt = [from[0] + Math.cos(dir) * len, from[1] + Math.sin(dir) * len];
        out.push({ pts: [from, to], closed: false });
        if (n <= 1) return;
        grow(to, dir - spread, len * 0.72, n - 1);
        grow(to, dir + spread, len * 0.72, n - 1);
    };
    grow([0, 0], -Math.PI / 2, 1, depth); // trunk points up (screen y grows down)
    return out;
};

const dragon = (depth: number): Line[] => {
    // turn sequence: t(n) = right if the bit above the lowest set bit of n is 0
    const pts: Pt[] = [[0, 0]];
    let dir = 0;
    const steps = 2 ** depth;
    for (let n = 1; n <= steps; n++) {
        const [x, y] = pts[pts.length - 1];
        pts.push([x + Math.cos((dir * Math.PI) / 2), y + Math.sin((dir * Math.PI) / 2)]);
        if (n < steps) dir += ((n & -n) << 1) & n ? -1 : 1;
    }
    return [{ pts: pts.map(([x, y]) => [Math.round(x), Math.round(y)] as Pt), closed: false }];
};

const hilbert = (depth: number): Line[] => {
    const n = 2 ** depth;
    const pts: Pt[] = [];
    for (let d = 0; d < n * n; d++) {
        let x = 0;
        let y = 0;
        let t = d;
        for (let s = 1; s < n; s *= 2) {
            const rx = 1 & (t / 2);
            const ry = 1 & (t ^ rx);
            if (ry === 0) {
                if (rx === 1) {
                    x = s - 1 - x;
                    y = s - 1 - y;
                }
                [x, y] = [y, x];
            }
            x += s * rx;
            y += s * ry;
            t = Math.floor(t / 4);
        }
        pts.push([x, y]);
    }
    return [{ pts, closed: false }];
};

const clampDepth = (kind: FractalKind, depth: number) =>
    Math.min(FRACTAL_LIMITS[kind], Math.max(1, Math.round(Number.isFinite(depth) ? depth : 1)));

const r = (v: number) => Math.round(v * 100) / 100;

export function fractalPath({ kind, depth, size, angle = 25 }: FractalOptions) {
    const n = clampDepth(kind, depth);
    const lines =
        kind === 'koch'
            ? koch(n)
            : kind === 'sierpinski'
              ? sierpinski(n)
              : kind === 'tree'
                ? tree(n, angle)
                : kind === 'dragon'
                  ? dragon(n)
                  : hilbert(n);

    const all = lines.flatMap((l) => l.pts);
    const minX = Math.min(...all.map((p) => p[0]));
    const minY = Math.min(...all.map((p) => p[1]));
    const w = Math.max(...all.map((p) => p[0])) - minX;
    const h = Math.max(...all.map((p) => p[1])) - minY;
    const k = size / Math.max(w, h, 1e-9);

    const d = lines
        .map(({ pts, closed }) => {
            const [first, ...rest] = pts.map(
                ([x, y]) => `${r((x - minX) * k)} ${r((y - minY) * k)}`,
            );
            return `M${first}${rest.map((p) => ` L${p}`).join('')}${closed ? ' Z' : ''}`;
        })
        .join(' ');
    return { d, width: r(w * k), height: r(h * k) };
}
