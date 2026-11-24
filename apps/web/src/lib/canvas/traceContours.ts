/**
 * Outlines of a 0/1 pixel mask as closed polygons (pure). Edges between filled and empty pixels are linked into
 * loops (filled side on the right, so outer outlines run clockwise on screen and holes the other way); diagonal
 * touches are split the 4-connected way. `simplify` then removes the pixel staircase (Ramer-Douglas-Peucker).
 * Paint bucket: mask -> loops -> an SVG path with the even-odd rule (holes stay holes).
 */
type Pt = { x: number; y: number };

// directions: 0 right, 1 down, 2 left, 3 up (screen axes)
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

export function traceContours(mask: Uint8Array, w: number, h: number): Pt[][] {
    const inside = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
    const W = w + 1;
    // outgoing edges per vertex: up to 4 (one per direction), stored as a bit set
    const out = new Uint8Array(W * (h + 1));
    let edges = 0;
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            if (!inside(x, y)) continue;
            if (!inside(x, y - 1)) {
                out[y * W + x] |= 1 << 0; // top: (x,y) -> (x+1,y)
                edges++;
            }
            if (!inside(x + 1, y)) {
                out[y * W + x + 1] |= 1 << 1; // right: down
                edges++;
            }
            if (!inside(x, y + 1)) {
                out[(y + 1) * W + x + 1] |= 1 << 2; // bottom: left
                edges++;
            }
            if (!inside(x - 1, y)) {
                out[(y + 1) * W + x] |= 1 << 3; // left: up
                edges++;
            }
        }
    const loops: Pt[][] = [];
    for (let v = 0; v < out.length && edges > 0; v++) {
        while (out[v]) {
            let dir = Math.log2(out[v] & -out[v]);
            let x = v % W;
            let y = Math.floor(v / W);
            const loop: Pt[] = [{ x, y }];
            const limit = edges + 4;
            for (let guard = 0; guard <= limit; guard++) {
                out[y * W + x] &= ~(1 << dir);
                edges--;
                x += DX[dir];
                y += DY[dir];
                const here = out[y * W + x];
                if (!here) break;
                // prefer a right turn, then straight, then left: keeps diagonal pixels apart
                const next = [(dir + 1) % 4, dir, (dir + 3) % 4].find((d) => here & (1 << d));
                if (next === undefined) break;
                if (next !== dir) loop.push({ x, y });
                dir = next;
            }
            if (loop.length > 2) loops.push(loop);
        }
    }
    return loops;
}

function distToSegment(p: Pt, a: Pt, b: Pt) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (!len2) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function rdp(pts: Pt[], eps: number): Pt[] {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack: [number, number][] = [[0, pts.length - 1]];
    while (stack.length) {
        const [s, e] = stack.pop() as [number, number];
        let max = -1;
        let at = -1;
        for (let i = s + 1; i < e; i++) {
            const d = distToSegment(pts[i], pts[s], pts[e]);
            if (d > max) {
                max = d;
                at = i;
            }
        }
        if (max > eps && at > 0) {
            keep[at] = 1;
            stack.push([s, at], [at, e]);
        }
    }
    return pts.filter((_, i) => keep[i]);
}

/** A closed loop with its staircase removed (`eps` px). Small loops are kept as they are. */
export function simplifyLoop(loop: Pt[], eps = 0.75): Pt[] {
    if (loop.length < 8) return loop;
    // split at the point farthest from the start so both halves are open polylines
    let far = 0;
    let best = -1;
    for (let i = 1; i < loop.length; i++) {
        const d = Math.hypot(loop[i].x - loop[0].x, loop[i].y - loop[0].y);
        if (d > best) {
            best = d;
            far = i;
        }
    }
    const a = rdp(loop.slice(0, far + 1), eps);
    const b = rdp([...loop.slice(far), loop[0]], eps);
    return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/** Signed area (shoelace): > 0 clockwise on screen. */
export function loopArea(loop: Pt[]): number {
    let s = 0;
    for (let i = 0; i < loop.length; i++) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        s += a.x * b.y - b.x * a.y;
    }
    return s / 2;
}

/** SVG path data of loops after mapping each point (`map`: raster px -> scene). */
export function loopsToPath(loops: Pt[][], map: (p: Pt) => Pt = (p) => p): string {
    return loops
        .map((loop) => {
            const pts = loop.map(map).map((p) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`);
            return `M ${pts.join(' L ')} Z`;
        })
        .join(' ');
}
