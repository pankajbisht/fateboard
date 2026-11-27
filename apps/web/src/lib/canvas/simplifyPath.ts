/** P6 (docs/PERFORMANCE_AUDIT.md): fewer vertices for long ink strokes, without visible change. */
export type XY = { x: number; y: number };

/**
 * Ramer–Douglas–Peucker, iterative (no recursion depth limit). Keeps the first and last point and every point
 * further than `epsilon` from the simplified line. Distances are to the SEGMENT, so closed outlines (first ≈
 * last point) and spikes are kept.
 */
export function simplifyPolyline<T extends XY>(points: readonly T[], epsilon: number): T[] {
    const n = points.length;
    if (n < 3 || !(epsilon > 0)) return points.slice();
    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;
    const eps2 = epsilon * epsilon;
    const stack: Array<[number, number]> = [[0, n - 1]];
    while (stack.length) {
        const [a, b] = stack.pop()!;
        const A = points[a]!;
        const B = points[b]!;
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const len2 = dx * dx + dy * dy;
        let worst = -1;
        let at = -1;
        for (let i = a + 1; i < b; i++) {
            const P = points[i]!;
            const t = len2
                ? Math.min(1, Math.max(0, ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2))
                : 0;
            const ex = A.x + t * dx - P.x;
            const ey = A.y + t * dy - P.y;
            const d2 = ex * ex + ey * ey;
            if (d2 > worst) {
                worst = d2;
                at = i;
            }
        }
        if (worst > eps2 && at > a) {
            keep[at] = 1;
            stack.push([a, at], [at, b]);
        }
    }
    return points.filter((_, i) => keep[i] === 1);
}
