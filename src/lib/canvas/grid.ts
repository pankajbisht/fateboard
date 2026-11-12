/**
 * Editor grid model (pure, no store import): the grid styles, size limits, per-mode defaults and the
 * snap lattice of each style. Used by Settings (saved per mode), the Notebook slice (snap) and the
 * grid painters.
 */

export const GRID_STYLES = [
    'lines',
    'plain',
    'dashed',
    'dots',
    'crosses',
    'isometric',
    'ruled',
] as const;
export type GridStyle = (typeof GRID_STYLES)[number];

/** Labels for the grid menu, in menu order. */
export const GRID_STYLE_LABELS: Record<GridStyle, string> = {
    lines: 'Graph',
    plain: 'Squares',
    dashed: 'Dashed',
    dots: 'Dots',
    crosses: 'Crosses',
    isometric: 'Isometric',
    ruled: 'Ruled',
};

export type GridMode = 'design' | 'whiteboard';
export type GridPrefs = { style: GridStyle; size: number };

export const DEFAULT_GRID_SIZE = 20;
export const MIN_GRID_SIZE = 4;
export const MAX_GRID_SIZE = 200;
/** A stronger line (or dot) every this many cells. */
export const MAJOR_EVERY = 5;

/** The whiteboard shows dots, a design page graph paper. */
export const DEFAULT_GRID_PREFS: Record<GridMode, GridPrefs> = {
    design: { style: 'lines', size: DEFAULT_GRID_SIZE },
    whiteboard: { style: 'dots', size: DEFAULT_GRID_SIZE },
};

/** Board mode → grid mode (no editor open counts as design). */
export const gridModeFor = (boardMode: GridMode | null | undefined): GridMode =>
    boardMode === 'whiteboard' ? 'whiteboard' : 'design';

export const isGridStyle = (v: unknown): v is GridStyle =>
    typeof v === 'string' && (GRID_STYLES as readonly string[]).includes(v);

/** A whole number inside the limits, or null for anything that is not a finite number. */
export const clampGridSize = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v)
        ? Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, Math.round(v)))
        : null;

/** Anything (old or corrupt settings) → valid prefs for every mode. */
export const sanitizeGridPrefs = (raw: unknown): Record<GridMode, GridPrefs> => {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const one = (mode: GridMode): GridPrefs => {
        const p = (r[mode] && typeof r[mode] === 'object' ? r[mode] : {}) as Record<
            string,
            unknown
        >;
        return {
            style: isGridStyle(p.style) ? p.style : DEFAULT_GRID_PREFS[mode].style,
            size: clampGridSize(p.size) ?? DEFAULT_GRID_PREFS[mode].size,
        };
    };
    return { design: one('design'), whiteboard: one('whiteboard') };
};

/** Row height of the isometric grid: the height of an equilateral triangle with side `size`. */
export const isoRowHeight = (size: number) => (size * Math.sqrt(3)) / 2;

/**
 * Snap step per axis, in scene units (null = that axis does not snap to the grid). Every grid point
 * the user sees is on this lattice: square styles snap to the cells, the isometric grid per axis
 * (columns every half side, rows every triangle height: its corners plus the midpoints of the
 * horizontal edges, all on drawn lines), the ruled grid to its lines only.
 */
export const gridSnapSteps = (
    style: GridStyle,
    size: number,
): { x: number | null; y: number | null } => {
    if (style === 'isometric') return { x: size / 2, y: isoRowHeight(size) };
    if (style === 'ruled') return { x: null, y: size };
    return { x: size, y: size };
};
