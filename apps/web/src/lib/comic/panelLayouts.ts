/**
 * Comic panel layouts (Clip Studio style frame presets, 2026-11-17), pure. A preset is rows of panels: each row
 * has a height weight and column width weights; `layoutPanels` fits them into an area with a gutter between
 * panels. Used by the Comic slice (frames + clipped art layer).
 */
import type { Rect } from '@/lib/document/pageSetup';

export interface PanelPreset {
    id: string;
    label: string;
    rows: { h: number; cols: number[] }[];
}

const row = (h: number, ...cols: number[]) => ({ h, cols });

export const PANEL_PRESETS: PanelPreset[] = [
    { id: 'single', label: 'Full page', rows: [row(1, 1)] },
    { id: 'two-tiers', label: '2 tiers', rows: [row(1, 1), row(1, 1)] },
    { id: 'two-cols', label: '2 columns', rows: [row(1, 1, 1)] },
    { id: 'three-tiers', label: '3 tiers', rows: [row(1, 1), row(1, 1, 1), row(1, 1)] },
    { id: 'yonkoma', label: '4-koma strip', rows: [row(1, 1), row(1, 1), row(1, 1), row(1, 1)] },
    { id: 'grid-4', label: '2 × 2', rows: [row(1, 1, 1), row(1, 1, 1)] },
    { id: 'grid-6', label: '2 × 3', rows: [row(1, 1, 1), row(1, 1, 1), row(1, 1, 1)] },
    { id: 'grid-9', label: '3 × 3', rows: [row(1, 1, 1, 1), row(1, 1, 1, 1), row(1, 1, 1, 1)] },
    { id: 'manga', label: 'Manga page', rows: [row(1.2, 2, 1), row(1, 1), row(1.1, 1, 1.4)] },
    { id: 'big-top', label: 'Big top', rows: [row(2, 1), row(1, 1, 1, 1)] },
    { id: 'big-bottom', label: 'Big bottom', rows: [row(1, 1, 1), row(2, 1)] },
    { id: 'action', label: 'Action', rows: [row(1, 1, 2), row(1.4, 1), row(1, 2, 1, 1)] },
];

const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
const r2 = (n: number) => Math.round(n * 1000) / 1000;

/** Fit a preset into `area`, `gutter` px between panels. Panels come top-left first, row by row. */
export function layoutPanels(preset: PanelPreset, area: Rect, gutter: number): Rect[] {
    const rows = preset.rows.filter((r) => r.h > 0 && r.cols.length);
    const g = Math.max(0, gutter);
    const freeH = Math.max(0, area.height - g * (rows.length - 1));
    const totalH = sum(rows.map((r) => r.h));
    const out: Rect[] = [];
    let y = area.top;
    for (const r of rows) {
        const h = (freeH * r.h) / totalH;
        const freeW = Math.max(0, area.width - g * (r.cols.length - 1));
        const totalW = sum(r.cols);
        let x = area.left;
        for (const c of r.cols) {
            const w = (freeW * c) / totalW;
            out.push({ left: r2(x), top: r2(y), width: r2(w), height: r2(h) });
            x += w + g;
        }
        y += h + g;
    }
    return out;
}

/**
 * Cut a panel in two with a gutter: `horizontal` = a horizontal cut (top / bottom), `vertical` = left / right.
 * `at` = where the cut goes, 0 … 1 (default the middle).
 */
export function splitRect(
    r: Rect,
    dir: 'horizontal' | 'vertical',
    gutter: number,
    at = 0.5,
): [Rect, Rect] {
    const f = Math.min(0.95, Math.max(0.05, at));
    if (dir === 'horizontal') {
        const free = Math.max(0, r.height - gutter);
        const h1 = r2(free * f);
        return [
            { left: r.left, top: r.top, width: r.width, height: h1 },
            { left: r.left, top: r2(r.top + h1 + gutter), width: r.width, height: r2(free - h1) },
        ];
    }
    const free = Math.max(0, r.width - gutter);
    const w1 = r2(free * f);
    return [
        { left: r.left, top: r.top, width: w1, height: r.height },
        { left: r2(r.left + w1 + gutter), top: r.top, width: r2(free - w1), height: r.height },
    ];
}
