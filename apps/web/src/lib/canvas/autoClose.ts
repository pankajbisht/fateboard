/**
 * Pencil auto-close: a freehand stroke that ends near where it started becomes a closed shape
 * (a `Z` is added, so the gap is bridged and the shape can be filled). Tiny scribbles and dots are
 * left alone so a tap never turns into a filled blob.
 */
type Cmd = (string | number)[];

const endPoint = (c: Cmd) => ({ x: Number(c[c.length - 2]), y: Number(c[c.length - 1]) });

/** Adds `Z` to the path commands when the end is within `tolerance` of the start. */
export function closeIfNearStart(path: { path: Cmd[] }, tolerance: number): boolean {
    const cmds = path.path;
    if (cmds.length < 3 || cmds[0][0] !== 'M' || cmds[cmds.length - 1][0] === 'Z') return false;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const c of cmds) {
        for (let i = 1; i + 1 < c.length; i += 2) {
            const x = Number(c[i]);
            const y = Number(c[i + 1]);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }
    if (Math.max(maxX - minX, maxY - minY) < tolerance * 3) return false; // a dot / tiny scribble

    const start = endPoint(cmds[0]);
    const end = endPoint(cmds[cmds.length - 1]);
    if (Math.hypot(end.x - start.x, end.y - start.y) > tolerance) return false;

    cmds.push(['Z']);
    return true;
}
