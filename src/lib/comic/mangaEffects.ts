/**
 * Manga effect lines (2026-11-17), pure: SVG path data in a `width` × `height` box, filled black by the Comic
 * slice. Seeded, so the same settings always draw the same lines.
 * - focus lines (集中線): tapered wedges from the box edge pointing at an empty centre;
 * - speed lines: tapered horizontal streaks (turn the object for other directions);
 * - burst: one spiky closed outline (impact / flash balloon).
 */
import { mulberry32 } from '@/lib/brushes/stamp/rng';

export interface FocusLinesParams {
    width: number;
    height: number;
    count: number;
    /** Empty centre, as a fraction of the half size, 0 … 0.95. */
    innerRadius: number;
    /** Wedge width at the box edge, px. */
    thickness: number;
    /** Randomness of angle, length and width, 0 … 1. */
    jitter: number;
    seed: number;
}

export interface SpeedLinesParams {
    width: number;
    height: number;
    count: number;
    thickness: number;
    /** Shortest streak, fraction of the width. */
    minLength: number;
    seed: number;
}

export interface BurstParams {
    width: number;
    height: number;
    spikes: number;
    innerRadius: number;
    jitter: number;
    seed: number;
}

const f = (n: number) => Math.round(n * 100) / 100;
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`;

/** Where a ray from (cx, cy) at angle a leaves the box. */
function edgePoint(w: number, h: number, cx: number, cy: number, a: number) {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const tx = dx > 0 ? (w - cx) / dx : dx < 0 ? -cx / dx : Infinity;
    const ty = dy > 0 ? (h - cy) / dy : dy < 0 ? -cy / dy : Infinity;
    const t = Math.min(tx, ty);
    return { x: cx + dx * t, y: cy + dy * t };
}

export function focusLinesPath(p: FocusLinesParams): string {
    const rnd = mulberry32(p.seed);
    const cx = p.width / 2;
    const cy = p.height / 2;
    const n = Math.max(1, Math.round(p.count));
    const j = Math.min(1, Math.max(0, p.jitter));
    const inner = Math.min(0.95, Math.max(0, p.innerRadius));
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
        const a = ((i + (rnd() - 0.5) * j) / n) * Math.PI * 2;
        const reach = inner * (1 + (rnd() - 0.5) * j * 0.6);
        const tip = { x: cx + Math.cos(a) * cx * reach, y: cy + Math.sin(a) * cy * reach };
        const end = edgePoint(p.width, p.height, cx, cy, a);
        const half = (p.thickness * (1 + (rnd() - 0.5) * j)) / 2;
        // wedge base along the box edge
        const ex = -Math.sin(a) * half;
        const ey = Math.cos(a) * half;
        const clampX = (x: number) => Math.min(p.width, Math.max(0, x));
        const clampY = (y: number) => Math.min(p.height, Math.max(0, y));
        parts.push(
            `M ${pt(tip.x, tip.y)} L ${pt(clampX(end.x + ex), clampY(end.y + ey))} L ${pt(clampX(end.x - ex), clampY(end.y - ey))} Z`,
        );
    }
    return parts.join(' ');
}

export function speedLinesPath(p: SpeedLinesParams): string {
    const rnd = mulberry32(p.seed);
    const n = Math.max(1, Math.round(p.count));
    const min = Math.min(1, Math.max(0.05, p.minLength));
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
        const y = ((i + rnd()) / n) * p.height;
        const len = (min + rnd() * (1 - min)) * p.width;
        const x0 = rnd() * (p.width - len);
        const half = (p.thickness * (0.5 + rnd())) / 2;
        parts.push(`M ${pt(x0, y)} L ${pt(x0 + len, y - half)} L ${pt(x0 + len, y + half)} Z`);
    }
    return parts.join(' ');
}

export function burstPath(p: BurstParams): string {
    const rnd = mulberry32(p.seed);
    const n = Math.max(3, Math.round(p.spikes));
    const rx = p.width / 2;
    const ry = p.height / 2;
    const inner = Math.min(0.95, Math.max(0.1, p.innerRadius));
    const j = Math.min(1, Math.max(0, p.jitter));
    const pts: string[] = [];
    for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 1 - rnd() * j * 0.5 : inner * (1 - rnd() * j * 0.3);
        pts.push(pt(rx + Math.cos(a) * rx * r, ry + Math.sin(a) * ry * r));
    }
    return `M ${pts[0]} ${pts
        .slice(1)
        .map((q) => `L ${q}`)
        .join(' ')} Z`;
}
