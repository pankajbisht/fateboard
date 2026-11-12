/**
 * Grid painters (one per `GridStyle`). They draw straight onto the canvas context in CSS-pixel
 * screen space (the Notebook slice sets that up and calls them only for the on-screen canvas, so the
 * grid never reaches exports, thumbnails or `toJSON`).
 *
 * Look: slate grey with alpha, so it reads on the white page, the tinted whiteboard and dark mode;
 * minor lines are device-pixel hairlines and fade in as you zoom in (no popping); a stronger line or
 * dot every `MAJOR_EVERY` cells.
 */
import { MAJOR_EVERY, isoRowHeight, type GridStyle } from './grid';

export type GridView = {
    /** Fabric viewport transform `[zoom, 0, 0, zoom, panX, panY]`. */
    vpt: ArrayLike<number>;
    /** Canvas size in CSS px. */
    width: number;
    height: number;
    /** devicePixelRatio the canvas renders at (`getRetinaScaling()`). */
    pixelRatio: number;
};

const MINOR_COLOR = 'rgba(100, 116, 139, 0.28)';
const MAJOR_COLOR = 'rgba(100, 116, 139, 0.5)';
const EVEN_COLOR = 'rgba(100, 116, 139, 0.38)'; // squares / ruled: every line the same
const MINOR_DOT_COLOR = 'rgba(100, 116, 139, 0.55)';
const MAJOR_DOT_COLOR = 'rgba(100, 116, 139, 0.8)';

/** Below this spacing (screen px) a grid level is hidden; it is fully shown from FULL_PX up. */
const MIN_PX = 6;
const FULL_PX = 14;
const MAX_LINES_PER_AXIS = 1500;
const MAX_POINTS = 60000;
/** Dashed style: screen px on / off (a fixed short dash reads as "dashed" at any cell size). */
const DASH = [4, 3];

const mod = (n: number, m: number) => ((n % m) + m) % m;
const fade = (spacing: number) => Math.min(1, Math.max(0, (spacing - MIN_PX) / (FULL_PX - MIN_PX)));

type Frame = {
    zoom: number;
    ox: number;
    oy: number;
    width: number;
    height: number;
    /** Hairline width and its pixel-centre offset in CSS px. */
    hair: number;
    hairOffset: number;
};

const frameOf = (view: GridView): Frame => {
    const ratio = Math.max(1, Math.round(view.pixelRatio || 1));
    return {
        zoom: view.vpt[0],
        ox: view.vpt[4],
        oy: view.vpt[5],
        width: view.width,
        height: view.height,
        hair: 1 / ratio,
        hairOffset: 0.5 / ratio,
    };
};

/** Indices of grid lines `i * step` (scene) visible on one axis, or null when too many. */
const visibleRange = (step: number, zoom: number, offset: number, length: number) => {
    const first = Math.floor(-offset / zoom / step);
    const last = Math.ceil((length - offset) / zoom / step);
    return last - first > MAX_LINES_PER_AXIS ? null : { first, last };
};

const stroke = (
    ctx: CanvasRenderingContext2D,
    path: Path2D,
    color: string,
    width: number,
    alpha = 1,
) => {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke(path);
    ctx.globalAlpha = 1;
};

/* ------------------------------ square grids ------------------------------ */

type LineOpts = { even: boolean; dashed: boolean; vertical: boolean };

const paintSquareLines = (
    ctx: CanvasRenderingContext2D,
    f: Frame,
    size: number,
    opts: LineOpts,
) => {
    const cell = size * f.zoom;
    if (cell * MAJOR_EVERY < MIN_PX) return; // too dense to be useful
    const minorAlpha = fade(cell);
    const xs = opts.vertical ? visibleRange(size, f.zoom, f.ox, f.width) : { first: 0, last: -1 };
    const ys = visibleRange(size, f.zoom, f.oy, f.height);
    if (!xs || !ys) return;

    const minor = new Path2D();
    const major = new Path2D();
    // dashed: the pattern is anchored to the content origin (pan), one period before the view, so
    // the dashes move with the content and never jump when the view crosses a cell boundary
    const period = DASH[0] + DASH[1];
    const startY = mod(f.oy, period) - period;
    const startX = mod(f.ox, period) - period;
    const endY = f.height;
    const endX = f.width;

    for (let i = xs.first; i <= xs.last; i++) {
        const isMajor = mod(i, MAJOR_EVERY) === 0;
        if (!isMajor && minorAlpha === 0) continue;
        const target = isMajor ? major : minor;
        const x = Math.round(i * cell + f.ox) + (isMajor ? 0.5 : f.hairOffset);
        target.moveTo(x, opts.dashed ? startY : 0);
        target.lineTo(x, endY);
    }
    for (let j = ys.first; j <= ys.last; j++) {
        const isMajor = mod(j, MAJOR_EVERY) === 0;
        if (!isMajor && minorAlpha === 0) continue;
        const target = isMajor ? major : minor;
        const y = Math.round(j * cell + f.oy) + (isMajor ? 0.5 : f.hairOffset);
        target.moveTo(opts.dashed ? startX : 0, y);
        target.lineTo(endX, y);
    }

    if (opts.dashed) ctx.setLineDash(DASH);
    if (opts.even) {
        // same weight everywhere; when minor lines fade out the every-5th lines stay
        stroke(ctx, minor, EVEN_COLOR, f.hair, minorAlpha);
        stroke(ctx, major, EVEN_COLOR, f.hair);
    } else {
        stroke(ctx, minor, MINOR_COLOR, f.hair, minorAlpha);
        stroke(ctx, major, MAJOR_COLOR, 1);
    }
    ctx.setLineDash([]);
};

/** Dots or "+" marks at every crossing (stronger every `MAJOR_EVERY` cells). */
const paintPoints = (
    ctx: CanvasRenderingContext2D,
    f: Frame,
    size: number,
    mark: 'dot' | 'cross',
) => {
    const cell = size * f.zoom;
    if (cell * MAJOR_EVERY < MIN_PX) return;
    const xs = visibleRange(size, f.zoom, f.ox, f.width);
    const ys = visibleRange(size, f.zoom, f.oy, f.height);
    if (!xs || !ys) return;
    const count = (xs.last - xs.first + 1) * (ys.last - ys.first + 1);
    const minorAlpha = count > MAX_POINTS ? 0 : fade(cell);

    const minor = new Path2D();
    const major = new Path2D();
    const add = (path: Path2D, x: number, y: number, isMajor: boolean) => {
        if (mark === 'dot') {
            const r = isMajor ? 1.6 : 1.1;
            path.moveTo(x + r, y);
            path.arc(x, y, r, 0, Math.PI * 2);
        } else {
            const arm = Math.min(isMajor ? 5 : 3.5, cell / 3);
            path.moveTo(x - arm, y);
            path.lineTo(x + arm, y);
            path.moveTo(x, y - arm);
            path.lineTo(x, y + arm);
        }
    };

    for (let i = xs.first; i <= xs.last; i++) {
        const majorX = mod(i, MAJOR_EVERY) === 0;
        if (!majorX && minorAlpha === 0) continue;
        const x = Math.round(i * cell + f.ox) + 0.5;
        for (let j = ys.first; j <= ys.last; j++) {
            const isMajor = majorX && mod(j, MAJOR_EVERY) === 0;
            if (!isMajor && minorAlpha === 0) continue;
            add(isMajor ? major : minor, x, Math.round(j * cell + f.oy) + 0.5, isMajor);
        }
    }

    if (mark === 'dot') {
        ctx.globalAlpha = minorAlpha;
        ctx.fillStyle = MINOR_DOT_COLOR;
        if (minorAlpha > 0) ctx.fill(minor);
        ctx.globalAlpha = 1;
        ctx.fillStyle = MAJOR_DOT_COLOR;
        ctx.fill(major);
    } else {
        stroke(ctx, minor, MINOR_DOT_COLOR, 1, minorAlpha);
        stroke(ctx, major, MAJOR_DOT_COLOR, 1);
    }
};

/* ------------------------------- isometric -------------------------------- */

/**
 * Triangle grid with side `size`: rows every triangle height, and two families of 60° lines
 * (`x = k·size ± y/√3`). Corners sit on the snap lattice of `gridSnapSteps('isometric')`.
 */
const paintIsometric = (ctx: CanvasRenderingContext2D, f: Frame, size: number) => {
    const cell = size * f.zoom;
    const row = isoRowHeight(size);
    if (row * f.zoom * MAJOR_EVERY < MIN_PX) return;
    const minorAlpha = fade(row * f.zoom);

    const ys = visibleRange(row, f.zoom, f.oy, f.height);
    if (!ys) return;
    // visible scene rect
    const sx0 = -f.ox / f.zoom;
    const sx1 = (f.width - f.ox) / f.zoom;
    const sy0 = -f.oy / f.zoom;
    const sy1 = (f.height - f.oy) / f.zoom;
    const k = Math.sqrt(3);
    const families = [
        // x = k·size + y/√3, then x = k·size − y/√3
        {
            sign: 1,
            first: Math.floor((sx0 - sy1 / k) / size),
            last: Math.ceil((sx1 - sy0 / k) / size),
        },
        {
            sign: -1,
            first: Math.floor((sx0 + sy0 / k) / size),
            last: Math.ceil((sx1 + sy1 / k) / size),
        },
    ];
    if (families.some((fam) => fam.last - fam.first > MAX_LINES_PER_AXIS)) return;

    const minor = new Path2D();
    const major = new Path2D();
    const toX = (sx: number) => sx * f.zoom + f.ox;
    const toY = (sy: number) => sy * f.zoom + f.oy;

    for (let j = ys.first; j <= ys.last; j++) {
        const isMajor = mod(j, MAJOR_EVERY) === 0;
        if (!isMajor && minorAlpha === 0) continue;
        const y = Math.round(toY(j * row)) + (isMajor ? 0.5 : f.hairOffset);
        (isMajor ? major : minor).moveTo(0, y);
        (isMajor ? major : minor).lineTo(f.width, y);
    }
    for (const fam of families) {
        for (let i = fam.first; i <= fam.last; i++) {
            const isMajor = mod(i, MAJOR_EVERY) === 0;
            if (!isMajor && minorAlpha === 0) continue;
            const path = isMajor ? major : minor;
            path.moveTo(toX(i * size + (fam.sign * sy0) / k), toY(sy0));
            path.lineTo(toX(i * size + (fam.sign * sy1) / k), toY(sy1));
        }
    }

    stroke(ctx, minor, MINOR_COLOR, f.hair, minorAlpha);
    stroke(ctx, major, MAJOR_COLOR, cell >= MIN_PX ? 1 : f.hair);
};

/* --------------------------------- entry ---------------------------------- */

/** Paints `style` with cells of `size` scene px for the current viewport. */
export const paintGridStyle = (
    ctx: CanvasRenderingContext2D,
    view: GridView,
    style: GridStyle,
    size: number,
): void => {
    const f = frameOf(view);
    if (!(f.zoom > 0) || !(size > 0)) return;
    switch (style) {
        case 'lines':
            return paintSquareLines(ctx, f, size, { even: false, dashed: false, vertical: true });
        case 'plain':
            return paintSquareLines(ctx, f, size, { even: true, dashed: false, vertical: true });
        case 'dashed':
            return paintSquareLines(ctx, f, size, { even: false, dashed: true, vertical: true });
        case 'ruled':
            return paintSquareLines(ctx, f, size, { even: true, dashed: false, vertical: false });
        case 'dots':
            return paintPoints(ctx, f, size, 'dot');
        case 'crosses':
            return paintPoints(ctx, f, size, 'cross');
        case 'isometric':
            return paintIsometric(ctx, f, size);
    }
};
