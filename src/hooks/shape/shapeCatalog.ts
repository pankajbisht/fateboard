/**
 * Shape catalog – single source of truth for every shape.
 * Put at: src/hooks/shape/shapeCatalog.ts
 *
 * - Pure data + helpers (no fabric / store imports).
 * - Every path / point set is authored in a 100 x 100 box. The slice scales the
 *   result to the shape's default size (w x h).
 * - Custom (user-made) shapes are registered at runtime with setCustomShapes().
 */

export type ShapeCategory =
    | 'basic'
    | 'text'
    | 'arcs'
    | 'stars'
    | 'symbols'
    | 'arrows'
    | 'callouts'
    | 'notes'
    | 'flow'
    | '3d'
    | 'lines'
    | 'custom';

export type ShapeKind = 'rect' | 'circle' | 'ellipse' | 'triangle' | 'line' | 'polygon' | 'path';

export interface Pt {
    x: number;
    y: number;
}

export interface ShapeDef {
    type: string;
    label: string;
    category: ShapeCategory;
    kind: ShapeKind;
    /** default size in canvas px */
    w: number;
    h: number;
    /** SVG path in a 100x100 box (path kind + panel icon) */
    d?: string;
    /** polygon kind */
    points?: Pt[];
    /** open path: never filled, always needs a stroke */
    open?: boolean;
    evenodd?: boolean;
    /** corner radius for rect kind ('full' = pill) */
    rx?: number | 'full';
    keywords?: string;
    /** default fill (falls back to white) */
    fill?: string;
    /** the shape carries an editable text box (Figma / Canva style) */
    text?: boolean;
    /** fraction of the shape width the text may use (ellipse/diamond need less) */
    textInset?: number;
    /** created by the user */
    custom?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                           */
/* -------------------------------------------------------------------------- */

const P = (...p: [number, number][]): Pt[] => p.map(([x, y]) => ({ x, y }));

/** Regular polygon inside the 100 box. startDeg -90 = point up. */
const regular = (n: number, startDeg = -90): Pt[] =>
    Array.from({ length: n }, (_, i) => {
        const a = (((360 / n) * i + startDeg) * Math.PI) / 180;
        return { x: 50 + 50 * Math.cos(a), y: 50 + 50 * Math.sin(a) };
    });

/** Star: n tips, `inner` = inner radius / outer radius. */
const star = (n: number, inner: number): Pt[] =>
    Array.from({ length: n * 2 }, (_, i) => {
        const r = i % 2 === 0 ? 50 : 50 * inner;
        const a = (Math.PI / n) * i - Math.PI / 2;
        return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
    });

/** Rotate points around the centre of the box. */
const rotate = (pts: Pt[], deg: number): Pt[] => {
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return pts.map(({ x, y }) => ({
        x: 50 + (x - 50) * c - (y - 50) * s,
        y: 50 + (x - 50) * s + (y - 50) * c,
    }));
};

export const toPath = (pts: Pt[]): string =>
    'M ' + pts.map((p) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`).join(' L ') + ' Z';

/** Path used for the panel icon. */
export const shapeIconPath = (def: ShapeDef): string =>
    def.d ?? (def.points ? toPath(def.points) : 'M 0 0 H 100 V 100 H 0 Z');

const CROSS = P(
    [35, 0],
    [65, 0],
    [65, 35],
    [100, 35],
    [100, 65],
    [65, 65],
    [65, 100],
    [35, 100],
    [35, 65],
    [0, 65],
    [0, 35],
    [35, 35],
);
const BLOCK_ARROW = P([0, 30], [60, 30], [60, 0], [100, 50], [60, 100], [60, 70], [0, 70]);

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

export const SHAPES: ShapeDef[] = [
    /* ---------------------------- Basic (14) ---------------------------- */
    {
        type: 'rect',
        label: 'Rectangle',
        category: 'basic',
        kind: 'rect',
        w: 160,
        h: 100,
        d: 'M 0 20 H 100 V 80 H 0 Z',
        keywords: 'box',
    },
    {
        type: 'square',
        label: 'Square',
        category: 'basic',
        kind: 'rect',
        w: 100,
        h: 100,
        d: 'M 0 0 H 100 V 100 H 0 Z',
        keywords: 'box',
    },
    {
        type: 'rounded-rect',
        label: 'Rounded Rectangle',
        category: 'basic',
        kind: 'rect',
        w: 160,
        h: 100,
        rx: 18,
        d: 'M 15 20 H 85 Q 100 20 100 35 V 65 Q 100 80 85 80 H 15 Q 0 80 0 65 V 35 Q 0 20 15 20 Z',
        keywords: 'card button',
    },
    {
        type: 'circle',
        label: 'Circle',
        category: 'basic',
        kind: 'circle',
        w: 100,
        h: 100,
        d: 'M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z',
        keywords: 'round',
    },
    {
        type: 'ellipse',
        label: 'Ellipse',
        category: 'basic',
        kind: 'ellipse',
        w: 120,
        h: 80,
        d: 'M 0 50 A 50 35 0 1 0 100 50 A 50 35 0 1 0 0 50 Z',
        keywords: 'oval',
    },
    {
        type: 'triangle',
        label: 'Triangle',
        category: 'basic',
        kind: 'triangle',
        w: 100,
        h: 100,
        d: 'M 50 5 L 100 95 L 0 95 Z',
    },
    {
        type: 'right-triangle',
        label: 'Right Triangle',
        category: 'basic',
        kind: 'polygon',
        w: 100,
        h: 100,
        points: P([0, 0], [0, 100], [100, 100]),
    },
    {
        type: 'diamond',
        label: 'Diamond',
        category: 'basic',
        kind: 'polygon',
        w: 100,
        h: 70,
        points: P([50, 0], [100, 50], [50, 100], [0, 50]),
        keywords: 'rhombus decision',
    },
    {
        type: 'pentagon',
        label: 'Pentagon',
        category: 'basic',
        kind: 'polygon',
        w: 105,
        h: 100,
        points: regular(5),
    },
    {
        type: 'hexagon',
        label: 'Hexagon',
        category: 'basic',
        kind: 'polygon',
        w: 87,
        h: 100,
        points: regular(6),
    },
    {
        type: 'octagon',
        label: 'Octagon',
        category: 'basic',
        kind: 'polygon',
        w: 100,
        h: 100,
        points: regular(8, -67.5),
        keywords: 'stop',
    },
    {
        type: 'capsule',
        label: 'Capsule',
        category: 'basic',
        kind: 'rect',
        w: 160,
        h: 60,
        rx: 'full',
        d: 'M 30 25 H 70 A 25 25 0 0 1 70 75 H 30 A 25 25 0 0 1 30 25 Z',
        keywords: 'pill tag',
    },
    {
        type: 'trapezoid',
        label: 'Trapezoid',
        category: 'basic',
        kind: 'polygon',
        w: 120,
        h: 80,
        points: P([20, 0], [80, 0], [100, 100], [0, 100]),
    },
    {
        type: 'parallelogram',
        label: 'Parallelogram',
        category: 'basic',
        kind: 'polygon',
        w: 130,
        h: 80,
        points: P([25, 0], [100, 0], [75, 100], [0, 100]),
        keywords: 'data input',
    },

    /* ------------------------ Shapes with text (6) ----------------------- */
    {
        type: 'text-rect',
        label: 'Text Rectangle',
        category: 'text',
        kind: 'rect',
        w: 180,
        h: 90,
        text: true,
        textInset: 0.92,
        d: 'M 0 15 H 100 V 85 H 0 Z',
        keywords: 'process box label figma',
    },
    {
        type: 'text-rounded',
        label: 'Text Rounded',
        category: 'text',
        kind: 'rect',
        w: 180,
        h: 90,
        rx: 18,
        text: true,
        textInset: 0.9,
        d: 'M 15 15 H 85 Q 100 15 100 30 V 70 Q 100 85 85 85 H 15 Q 0 85 0 70 V 30 Q 0 15 15 15 Z',
        keywords: 'card button label',
    },
    {
        type: 'text-ellipse',
        label: 'Text Ellipse',
        category: 'text',
        kind: 'ellipse',
        w: 180,
        h: 110,
        text: true,
        textInset: 0.72,
        d: 'M 0 50 A 50 38 0 1 0 100 50 A 50 38 0 1 0 0 50 Z',
        keywords: 'oval start end label',
    },
    {
        type: 'text-diamond',
        label: 'Text Diamond',
        category: 'text',
        kind: 'polygon',
        w: 170,
        h: 120,
        text: true,
        textInset: 0.55,
        points: P([50, 0], [100, 50], [50, 100], [0, 50]),
        keywords: 'decision question flowchart',
    },
    {
        type: 'text-hexagon',
        label: 'Text Hexagon',
        category: 'text',
        kind: 'polygon',
        w: 180,
        h: 100,
        text: true,
        textInset: 0.7,
        points: P([25, 0], [75, 0], [100, 50], [75, 100], [25, 100], [0, 50]),
        keywords: 'preparation label',
    },
    {
        type: 'text-pill',
        label: 'Text Pill',
        category: 'text',
        kind: 'rect',
        w: 180,
        h: 64,
        rx: 'full',
        text: true,
        textInset: 0.8,
        d: 'M 30 25 H 70 A 25 25 0 0 1 70 75 H 30 A 25 25 0 0 1 30 25 Z',
        keywords: 'terminator tag label',
    },

    /* ----------------------------- Arcs (5) ----------------------------- */
    {
        type: 'semi-circle',
        label: 'Semi Circle',
        category: 'arcs',
        kind: 'path',
        w: 120,
        h: 60,
        d: 'M 0 75 A 50 50 0 0 1 100 75 Z',
        keywords: 'half',
    },
    {
        type: 'quadrant',
        label: 'Quadrant',
        category: 'arcs',
        kind: 'path',
        w: 100,
        h: 100,
        d: 'M 0 100 L 0 0 A 100 100 0 0 1 100 100 Z',
        keywords: 'quarter',
    },
    {
        type: 'sector',
        label: 'Sector',
        category: 'arcs',
        kind: 'path',
        w: 100,
        h: 86,
        d: 'M 0 93 L 50 7 A 100 100 0 0 1 100 93 Z',
        keywords: 'pie slice',
    },
    {
        type: 'ring',
        label: 'Ring',
        category: 'arcs',
        kind: 'path',
        w: 100,
        h: 100,
        evenodd: true,
        d: 'M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z M 25 50 A 25 25 0 1 0 75 50 A 25 25 0 1 0 25 50 Z',
        keywords: 'donut',
    },
    {
        type: 'crescent',
        label: 'Crescent',
        category: 'arcs',
        kind: 'path',
        w: 60,
        h: 100,
        d: 'M 75 0 A 50 50 0 0 0 75 100 A 60 60 0 0 1 75 0 Z',
        keywords: 'moon night',
    },

    /* ----------------------------- Stars (4) ---------------------------- */
    {
        type: 'star-4',
        label: 'Sparkle',
        category: 'stars',
        kind: 'polygon',
        w: 100,
        h: 100,
        points: star(4, 0.28),
        keywords: 'shine',
    },
    {
        type: 'star',
        label: 'Star',
        category: 'stars',
        kind: 'polygon',
        w: 105,
        h: 100,
        points: star(5, 0.4),
        keywords: 'favorite rating',
    },
    {
        type: 'star-6',
        label: '6-Point Star',
        category: 'stars',
        kind: 'polygon',
        w: 87,
        h: 100,
        points: star(6, 0.55),
    },
    {
        type: 'burst',
        label: 'Burst',
        category: 'stars',
        kind: 'polygon',
        w: 120,
        h: 120,
        points: star(12, 0.72),
        keywords: 'explosion pow comic',
    },

    /* --------------------------- Symbols (10) --------------------------- */
    {
        type: 'heart',
        label: 'Heart',
        category: 'symbols',
        kind: 'path',
        w: 100,
        h: 90,
        d: 'M 50 90 C 10 60 0 35 0 25 C 0 8 15 0 27 0 C 38 0 46 6 50 15 C 54 6 62 0 73 0 C 85 0 100 8 100 25 C 100 35 90 60 50 90 Z',
        keywords: 'love like',
    },
    {
        type: 'cross',
        label: 'Plus',
        category: 'symbols',
        kind: 'polygon',
        w: 100,
        h: 100,
        points: CROSS,
        keywords: 'add cross',
    },
    {
        type: 'x-mark',
        label: 'X Mark',
        category: 'symbols',
        kind: 'polygon',
        w: 100,
        h: 100,
        points: rotate(CROSS, 45),
        keywords: 'close wrong cancel',
    },
    {
        type: 'check',
        label: 'Check Mark',
        category: 'symbols',
        kind: 'polygon',
        w: 100,
        h: 93,
        points: P([0, 55], [15, 40], [38, 63], [85, 10], [100, 25], [38, 93]),
        keywords: 'tick done correct',
    },
    {
        type: 'lightning',
        label: 'Lightning',
        category: 'symbols',
        kind: 'polygon',
        w: 70,
        h: 100,
        points: P([60, 0], [15, 55], [45, 55], [35, 100], [85, 40], [55, 40]),
        keywords: 'bolt energy',
    },
    {
        type: 'cloud',
        label: 'Cloud',
        category: 'symbols',
        kind: 'path',
        w: 150,
        h: 108,
        d: 'M 25 80 C 8 80 0 68 0 58 C 0 46 10 38 22 38 C 22 20 38 8 55 8 C 70 8 82 18 85 32 C 95 32 100 44 100 56 C 100 70 90 80 78 80 Z',
        keywords: 'weather',
    },
    {
        type: 'drop',
        label: 'Drop',
        category: 'symbols',
        kind: 'path',
        w: 80,
        h: 100,
        d: 'M 50 0 C 50 0 10 45 10 65 C 10 85 28 100 50 100 C 72 100 90 85 90 65 C 90 45 50 0 50 0 Z',
        keywords: 'water',
    },
    {
        type: 'sun',
        label: 'Sun',
        category: 'symbols',
        kind: 'path',
        w: 100,
        h: 100,
        d: 'M 28 50 A 22 22 0 1 0 72 50 A 22 22 0 1 0 28 50 Z M 50 0 V 18 M 50 82 V 100 M 0 50 H 18 M 82 50 H 100 M 15 15 L 28 28 M 72 72 L 85 85 M 85 15 L 72 28 M 15 85 L 28 72',
        keywords: 'weather day',
    },
    {
        type: 'smiley',
        label: 'Smiley',
        category: 'symbols',
        kind: 'path',
        w: 100,
        h: 100,
        d: 'M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z M 30 38 A 5 5 0 1 0 40 38 A 5 5 0 1 0 30 38 Z M 60 38 A 5 5 0 1 0 70 38 A 5 5 0 1 0 60 38 Z M 28 62 Q 50 85 72 62',
        keywords: 'face emoji cartoon happy',
    },
    {
        type: 'pin',
        label: 'Location Pin',
        category: 'symbols',
        kind: 'path',
        w: 80,
        h: 100,
        evenodd: true,
        d: 'M 50 100 C 50 100 10 60 10 38 C 10 16 28 0 50 0 C 72 0 90 16 90 38 C 90 60 50 100 50 100 Z M 38 38 A 12 12 0 1 0 62 38 A 12 12 0 1 0 38 38 Z',
        keywords: 'map marker place',
    },

    /* ---------------------------- Arrows (5) ---------------------------- */
    {
        type: 'arrow',
        label: 'Arrow',
        category: 'arrows',
        kind: 'path',
        open: true,
        w: 140,
        h: 62,
        d: 'M 0 50 H 100 M 78 28 L 100 50 L 78 72',
        keywords: 'pointer direction',
    },
    {
        type: 'arrow-block',
        label: 'Block Arrow',
        category: 'arrows',
        kind: 'polygon',
        w: 140,
        h: 90,
        points: BLOCK_ARROW,
        keywords: 'right next',
    },
    {
        type: 'arrow-up',
        label: 'Up Arrow',
        category: 'arrows',
        kind: 'polygon',
        w: 90,
        h: 140,
        points: rotate(BLOCK_ARROW, -90),
    },
    {
        type: 'double-arrow',
        label: 'Double Arrow',
        category: 'arrows',
        kind: 'polygon',
        w: 150,
        h: 90,
        points: P(
            [0, 50],
            [25, 20],
            [25, 38],
            [75, 38],
            [75, 20],
            [100, 50],
            [75, 80],
            [75, 62],
            [25, 62],
            [25, 80],
        ),
        keywords: 'both horizontal',
    },
    {
        type: 'chevron',
        label: 'Chevron',
        category: 'arrows',
        kind: 'polygon',
        w: 80,
        h: 100,
        points: P([0, 0], [60, 0], [100, 50], [60, 100], [0, 100], [40, 50]),
        keywords: 'process step',
    },

    /* --------------------------- Callouts (2) --------------------------- */
    {
        type: 'speech',
        label: 'Speech Bubble',
        category: 'callouts',
        kind: 'path',
        w: 160,
        h: 130,
        d: 'M 15 0 H 85 Q 100 0 100 15 V 55 Q 100 70 85 70 H 45 L 20 100 L 25 70 H 15 Q 0 70 0 55 V 15 Q 0 0 15 0 Z',
        keywords: 'chat comment dialog',
    },
    {
        type: 'thought',
        label: 'Thought Bubble',
        category: 'callouts',
        kind: 'path',
        w: 150,
        h: 140,
        d: 'M 25 80 C 8 80 0 68 0 58 C 0 46 10 38 22 38 C 22 20 38 8 55 8 C 70 8 82 18 85 32 C 95 32 100 44 100 56 C 100 70 90 80 78 80 Z M 16 90 A 6 6 0 1 0 28 90 A 6 6 0 1 0 16 90 Z M 4 100 A 3 3 0 1 0 10 100 A 3 3 0 1 0 4 100 Z',
        keywords: 'think idea cartoon',
    },

    /* ----------------------------- Notes (5) ---------------------------- */
    {
        type: 'paper',
        label: 'Text Paper',
        category: 'notes',
        kind: 'rect',
        w: 240,
        h: 90,
        text: true,
        textInset: 0.92,
        d: 'M 0 15 H 100 V 85 H 0 Z M 20 40 H 80 M 20 60 H 60',
        keywords: 'text label note box',
    },
    {
        type: 'sticky',
        label: 'Sticky Note',
        category: 'notes',
        kind: 'path',
        w: 130,
        h: 130,
        fill: '#FFF3A3',
        text: true,
        textInset: 0.8,
        d: 'M 0 0 H 100 V 70 L 70 100 H 0 Z M 70 100 V 70 H 100',
        keywords: 'post-it memo',
    },
    {
        type: 'flag',
        label: 'Flag',
        category: 'notes',
        kind: 'path',
        w: 90,
        h: 110,
        d: 'M 10 100 V 0 M 10 5 H 90 L 70 30 L 90 55 H 10',
        keywords: 'milestone mark',
    },
    {
        type: 'bracket',
        label: 'Bracket',
        category: 'notes',
        kind: 'path',
        open: true,
        w: 40,
        h: 120,
        d: 'M 70 0 H 30 V 100 H 70',
        keywords: 'group highlight',
    },
    {
        type: 'brace',
        label: 'Curly Brace',
        category: 'notes',
        kind: 'path',
        open: true,
        w: 60,
        h: 140,
        d: 'M 70 0 Q 40 0 40 20 V 40 Q 40 50 10 50 Q 40 50 40 60 V 80 Q 40 100 70 100',
        keywords: 'group',
    },

    /* ---------------------------- Flowchart (2) -------------------------- */
    {
        type: 'cylinder',
        label: 'Database',
        category: 'flow',
        kind: 'path',
        w: 100,
        h: 120,
        d: 'M 0 15 C 0 -5 100 -5 100 15 V 85 C 100 105 0 105 0 85 Z M 0 15 C 0 35 100 35 100 15',
        keywords: 'storage cylinder db',
    },
    {
        type: 'document',
        label: 'Document',
        category: 'flow',
        kind: 'path',
        w: 140,
        h: 110,
        d: 'M 0 0 H 100 V 80 C 80 65 70 100 50 85 C 30 70 20 100 0 85 Z',
        keywords: 'file page',
    },

    /* ------------------------------- 3D (9) ------------------------------ */
    // One closed path each: the first sub-path is the filled silhouette, the rest are the visible
    // edges (drawn by the stroke). No groups or new object types, so undo, save, export, snap and
    // animation handle them like any other path. Edges need a stroke (every new shape has one).
    {
        type: 'cube',
        label: 'Cube',
        category: '3d',
        kind: 'path',
        w: 120,
        h: 120,
        d: 'M 0 30 L 30 0 L 100 0 L 100 70 L 70 100 L 0 100 Z M 0 30 L 70 30 L 100 0 M 70 30 L 70 100',
        keywords: '3d box block square solid',
    },
    {
        type: 'cuboid',
        label: 'Box',
        category: '3d',
        kind: 'path',
        w: 170,
        h: 110,
        d: 'M 0 25 L 25 0 L 100 0 L 100 75 L 75 100 L 0 100 Z M 0 25 L 75 25 L 100 0 M 75 25 L 75 100',
        keywords: '3d cuboid rectangular prism brick package',
    },
    {
        type: 'cylinder-3d',
        label: 'Cylinder',
        category: '3d',
        kind: 'path',
        w: 100,
        h: 140,
        d: 'M 0 12 A 50 12 0 0 1 100 12 V 88 A 50 12 0 0 1 0 88 Z M 0 12 A 50 12 0 0 0 100 12',
        keywords: '3d tube can pipe solid',
    },
    {
        type: 'cone',
        label: 'Cone',
        category: '3d',
        kind: 'path',
        w: 110,
        h: 130,
        d: 'M 50 0 L 100 88 A 50 12 0 0 1 0 88 Z M 0 88 A 50 12 0 0 1 100 88',
        keywords: '3d funnel traffic solid',
    },
    {
        type: 'sphere',
        label: 'Sphere',
        category: '3d',
        kind: 'path',
        w: 120,
        h: 120,
        d: 'M 0 50 A 50 50 0 1 1 100 50 A 50 50 0 1 1 0 50 Z M 0 50 A 50 14 0 0 0 100 50',
        keywords: '3d ball globe orb solid',
    },
    {
        type: 'pyramid',
        label: 'Pyramid',
        category: '3d',
        kind: 'path',
        w: 130,
        h: 120,
        d: 'M 50 0 L 100 75 L 65 100 L 0 80 Z M 50 0 L 65 100',
        keywords: '3d tetrahedron egypt solid',
    },
    {
        type: 'prism',
        label: 'Prism',
        category: '3d',
        kind: 'path',
        w: 160,
        h: 110,
        d: 'M 0 100 L 60 100 L 100 55 L 70 0 L 30 45 Z M 30 45 L 60 100',
        keywords: '3d triangular prism tent roof wedge solid',
    },
    {
        type: 'hex-prism',
        label: 'Hexagonal Prism',
        category: '3d',
        kind: 'path',
        w: 110,
        h: 130,
        d: 'M 0 15 L 25 0 L 75 0 L 100 15 L 100 85 L 75 100 L 25 100 L 0 85 Z M 0 15 L 25 30 L 75 30 L 100 15 M 25 30 L 25 100 M 75 30 L 75 100',
        keywords: '3d hexagon column nut pencil solid',
    },
    {
        type: 'torus',
        label: 'Torus',
        category: '3d',
        kind: 'path',
        evenodd: true, // the hole is a second closed sub-path
        w: 140,
        h: 90,
        d: 'M 0 50 A 50 30 0 1 1 100 50 A 50 30 0 1 1 0 50 Z M 28 48 Q 50 64 72 48 Q 50 36 28 48 Z',
        keywords: '3d donut ring doughnut solid',
    },

    /* ----------------------------- Lines (3) ---------------------------- */
    {
        type: 'line',
        label: 'Line',
        category: 'lines',
        kind: 'line',
        open: true,
        w: 160,
        h: 0,
        d: 'M 0 50 H 100',
        keywords: 'stroke',
    },
    {
        type: 'curve',
        label: 'Curve',
        category: 'lines',
        kind: 'path',
        open: true,
        w: 160,
        h: 110,
        d: 'M 0 100 Q 50 -40 100 100',
        keywords: 'arc bezier quadratic',
    },
    {
        type: 'zigzag',
        label: 'Zigzag',
        category: 'lines',
        kind: 'path',
        open: true,
        w: 160,
        h: 96,
        d: 'M 0 80 L 20 20 L 40 80 L 60 20 L 80 80 L 100 20',
        keywords: 'lightning wave',
    },
];

export const SHAPE_CATEGORIES: { id: ShapeCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'text', label: 'Text Shapes' },
    { id: 'basic', label: 'Basic' },
    { id: 'arcs', label: 'Arcs' },
    { id: 'stars', label: 'Stars' },
    { id: 'symbols', label: 'Symbols' },
    { id: 'arrows', label: 'Arrows' },
    { id: 'callouts', label: 'Callouts' },
    { id: 'notes', label: 'Notes' },
    { id: 'flow', label: 'Flow' },
    { id: '3d', label: '3D' },
    { id: 'lines', label: 'Lines' },
    { id: 'custom', label: 'My Shapes' },
];

/** Shapes panel section title and hint per category. */
export const SHAPE_CATEGORY_INFO: Record<ShapeCategory, { title: string; hint: string }> = {
    text: { title: 'Text Shapes', hint: 'Double-click to type inside. Great for flowcharts.' },
    basic: { title: 'Basic', hint: 'Rectangles, circles, triangles and polygons.' },
    arcs: { title: 'Arcs', hint: 'Half circles, rings, pie slices, crescent.' },
    stars: { title: 'Stars', hint: 'Stars, sparkles and bursts.' },
    symbols: { title: 'Symbols', hint: 'Heart, check, cloud, sun, pin and more.' },
    arrows: { title: 'Arrows', hint: 'Line arrows and block arrows.' },
    callouts: { title: 'Callouts', hint: 'Speech and thought bubbles.' },
    notes: { title: 'Notes', hint: 'Text paper, sticky note, flag, brackets.' },
    flow: { title: 'Flowchart', hint: 'Database, document.' },
    '3d': { title: '3D Shapes', hint: 'Cube, cylinder, cone, sphere, pyramid and more.' },
    lines: { title: 'Lines & Curves', hint: 'Line, curve, zigzag.' },
    custom: { title: 'My Shapes', hint: 'Shapes you saved yourself.' },
};

/** Old type names that still work. */
const ALIASES: Record<string, string> = {
    polygon: 'pentagon',
    quadratic: 'curve',
    semicircle: 'semi-circle',
};

const SHAPE_MAP = new Map(SHAPES.map((s) => [s.type, s]));

/* -------------------------------------------------------------------------- */
/* Custom (user-made) shapes                                                  */
/* -------------------------------------------------------------------------- */

let CUSTOM_MAP = new Map<string, ShapeDef>();

/** Replace the registered custom shapes (called by the slice on load / change). */
export const setCustomShapes = (list: ShapeDef[]): void => {
    CUSTOM_MAP = new Map(list.map((s) => [s.type, s]));
};

export const getShapeDef = (type: string): ShapeDef | undefined => {
    const t = ALIASES[type] ?? type;
    return SHAPE_MAP.get(t) ?? CUSTOM_MAP.get(t);
};
