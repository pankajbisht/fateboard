import type { Similarity } from './placeActor';

/**
 * Moves an SVG path through a similarity (uniform scale + rotation + translation, no mirror), writing it back
 * with absolute commands only. Arcs stay exact: radii scale, the ellipse turns with the rotation, flags keep.
 * Handles M L H V Q T C S A Z in both cases (what the shape builders and Fabric need). Arc flags must be
 * separated by spaces (as every builder writes them); stray numbers after Z are skipped.
 */
const TOKEN = /[MLHVQTCSAZmlhvqtcsaz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, Q: 4, T: 2, C: 6, S: 4, A: 7, Z: 0 };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function transformPath(d: string, m: Similarity): string {
    const tokens = d.match(TOKEN) ?? [];
    const scale = Math.hypot(m[0], m[1]);
    const turn = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
    const tx = (x: number, y: number) =>
        `${r2(m[0] * x + m[2] * y + m[4])} ${r2(m[1] * x + m[3] * y + m[5])}`;
    let out = '';
    let i = 0;
    let cmd = '';
    let cx = 0;
    let cy = 0;
    let sx = 0;
    let sy = 0;
    const num = () => Number(tokens[i++]);
    while (i < tokens.length) {
        if (/^[a-z]$/i.test(tokens[i])) cmd = tokens[i++];
        else if (!cmd) return '';
        else if (cmd === 'Z' || cmd === 'z') {
            // a number after Z without a command is malformed: skip it (never loop on it)
            i++;
            continue;
        }
        const up = cmd.toUpperCase();
        const rel = cmd !== up;
        if (up === 'Z') {
            out += 'Z';
            cx = sx;
            cy = sy;
            continue;
        }
        if (i + ARGS[up] > tokens.length) break;
        const ox = rel ? cx : 0;
        const oy = rel ? cy : 0;
        switch (up) {
            case 'M':
            case 'L':
            case 'T': {
                cx = ox + num();
                cy = oy + num();
                out += `${up}${tx(cx, cy)}`;
                if (up === 'M') {
                    sx = cx;
                    sy = cy;
                    // further pairs after M are line-tos
                    cmd = rel ? 'l' : 'L';
                }
                break;
            }
            case 'H':
                cx = (rel ? cx : 0) + num();
                out += `L${tx(cx, cy)}`;
                break;
            case 'V':
                cy = (rel ? cy : 0) + num();
                out += `L${tx(cx, cy)}`;
                break;
            case 'Q':
            case 'S': {
                const x1 = ox + num();
                const y1 = oy + num();
                cx = ox + num();
                cy = oy + num();
                out += `${up}${tx(x1, y1)} ${tx(cx, cy)}`;
                break;
            }
            case 'C': {
                const x1 = ox + num();
                const y1 = oy + num();
                const x2 = ox + num();
                const y2 = oy + num();
                cx = ox + num();
                cy = oy + num();
                out += `C${tx(x1, y1)} ${tx(x2, y2)} ${tx(cx, cy)}`;
                break;
            }
            case 'A': {
                const rx = num();
                const ry = num();
                const rot = num();
                const large = num();
                const sweep = num();
                cx = ox + num();
                cy = oy + num();
                out += `A${r2(rx * scale)} ${r2(ry * scale)} ${r2(rot + turn)} ${large} ${sweep} ${tx(cx, cy)}`;
                break;
            }
        }
    }
    return out;
}
