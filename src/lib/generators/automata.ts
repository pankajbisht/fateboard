/**
 * Cellular automata (pure, no Fabric): elementary 1D rules (Wolfram 0-255) and Conway's Game of Life.
 * A grid is `boolean[][]` (rows of cells). `cellsToPath` turns the live cells into one SVG path, so a
 * 100 x 100 result is one canvas object, not 10 000.
 */

export type Grid = boolean[][];
export type Rng = () => number;

export const AUTOMATA_LIMITS = { maxSide: 200, maxSteps: 500 };

const clampInt = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(Number.isFinite(v) ? v : min)));

export type ElementaryOptions = {
    rule: number;
    width: number;
    generations: number;
    /** 'single' = one live cell in the middle of the first row */
    seed?: 'single' | 'random';
    rng?: Rng;
};

/** One row per generation; cells past the edges count as dead. */
export function elementary({
    rule,
    width,
    generations,
    seed = 'single',
    rng = Math.random,
}: ElementaryOptions): Grid {
    const bits = clampInt(rule, 0, 255);
    const w = clampInt(width, 1, AUTOMATA_LIMITS.maxSide);
    const gens = clampInt(generations, 1, AUTOMATA_LIMITS.maxSide);
    let row: boolean[] =
        seed === 'random'
            ? Array.from({ length: w }, () => rng() < 0.5)
            : Array.from({ length: w }, (_, i) => i === Math.floor(w / 2));
    const out: Grid = [row];
    for (let g = 1; g < gens; g++) {
        const prev = row;
        row = prev.map((_, i) => {
            const idx = (prev[i - 1] ? 4 : 0) | (prev[i] ? 2 : 0) | (prev[i + 1] ? 1 : 0);
            return ((bits >> idx) & 1) === 1;
        });
        out.push(row);
    }
    return out;
}

export type LifePreset = 'random' | 'glider' | 'gosper' | 'pulsar';

const PATTERNS: Record<Exclude<LifePreset, 'random'>, string[]> = {
    glider: ['.#.', '..#', '###'],
    gosper: [
        '........................#...........',
        '......................#.#...........',
        '............##......##............##',
        '...........#...#....##............##',
        '##........#.....#...##..............',
        '##........#...#.##....#.#...........',
        '..........#.....#.......#...........',
        '...........#...#....................',
        '............##......................',
    ],
    pulsar: [
        '..###...###..',
        '.............',
        '#....#.#....#',
        '#....#.#....#',
        '#....#.#....#',
        '..###...###..',
        '.............',
        '..###...###..',
        '#....#.#....#',
        '#....#.#....#',
        '#....#.#....#',
        '.............',
        '..###...###..',
    ],
};

export type LifeSeedOptions = {
    preset: LifePreset;
    cols: number;
    rows: number;
    /** random only: share of live cells, 0-1 */
    density?: number;
    rng?: Rng;
};

/** Starting grid. Patterns are placed one cell in from the top-left corner. */
export function lifeSeed({
    preset,
    cols,
    rows,
    density = 0.3,
    rng = Math.random,
}: LifeSeedOptions) {
    const w = clampInt(cols, 1, AUTOMATA_LIMITS.maxSide);
    const h = clampInt(rows, 1, AUTOMATA_LIMITS.maxSide);
    if (preset === 'random') {
        return Array.from({ length: h }, () => Array.from({ length: w }, () => rng() < density));
    }
    const pattern = PATTERNS[preset];
    return Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => pattern[y - 1]?.[x - 1] === '#'),
    );
}

/** Runs `steps` generations of B3/S23. `wrap` = the edges join (torus); otherwise outside cells are dead. */
export function lifeRun(grid: Grid, steps: number, wrap: boolean): Grid {
    const h = grid.length;
    const w = grid[0]?.length ?? 0;
    const at = (g: Grid, x: number, y: number) => {
        if (wrap) return g[(y + h) % h][(x + w) % w];
        return y >= 0 && y < h && x >= 0 && x < w && g[y][x];
    };
    let cur = grid;
    for (let s = 0; s < clampInt(steps, 0, AUTOMATA_LIMITS.maxSteps); s++) {
        const prev = cur;
        cur = prev.map((row, y) =>
            row.map((alive, x) => {
                let n = 0;
                for (let dy = -1; dy <= 1; dy++)
                    for (let dx = -1; dx <= 1; dx++)
                        if ((dx || dy) && at(prev, x + dx, y + dy)) n++;
                return n === 3 || (alive && n === 2);
            }),
        );
    }
    return cur;
}

/** One square per live cell: `cell` is the pitch, `gap` the space between squares. */
export function cellsToPath(grid: Grid, cell: number, gap: number) {
    const s = Math.max(0.5, cell - Math.max(0, gap));
    const parts: string[] = [];
    grid.forEach((row, y) =>
        row.forEach((alive, x) => {
            if (alive) parts.push(`M${x * cell} ${y * cell}h${s}v${s}h-${s}Z`);
        }),
    );
    return { d: parts.join(' '), width: (grid[0]?.length ?? 0) * cell, height: grid.length * cell };
}
