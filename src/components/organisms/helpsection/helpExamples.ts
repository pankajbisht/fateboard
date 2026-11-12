/**
 * Real-world examples for the Help page: a small project per topic that you watch being built.
 * Each step has a caption, the control it uses (`ui`) and where on the board it happens (`at`);
 * the picture (`scene`, see helpScene.ts) builds up step by step. Shown under each topic by
 * `ui/ExampleSlider.tsx` (a slider of examples, each holding a slider of steps).
 * Same rules as helpTopics.ts: write only what the editor does today, key marks in backticks.
 * `__tests__/helpExamples.test.ts` checks topic ids, links, scenes and the known false claims.
 */
import type { IconName } from '@/components/atoms/Icon';

import {
    at,
    circle,
    during,
    ellipse,
    path,
    photo,
    rect,
    type SceneDraft,
    type SceneItem,
    text,
    times,
} from './helpScene';
import { sectionSlug } from './helpTopics';
import { fractalPath } from '@/lib/generators/fractals';
import { cellsToPath, elementary } from '@/lib/generators/automata';

export interface HelpStep {
    text: string;
    /** The control this step uses, shown on the picture: "Draw › Neon", "`mod+S`". */
    ui?: string;
    /** Where on the 320 × 180 board the step happens: the cursor goes there. */
    at?: [number, number];
}

export interface HelpExample {
    /** Unique across all topics. */
    id: string;
    title: string;
    /** Who makes it, and why: one line. */
    brief: string;
    icon: IconName;
    /** 3 to 6 steps, played one by one. */
    steps: HelpStep[];
    /** What you have at the end, shown with the finished picture. */
    result: string;
    /** The picture, built up step by step. */
    scene: SceneItem[];
    /** Other topics this project leans on (topic ids). */
    uses?: string[];
}

const s = (stepText: string, ui?: string, where?: [number, number]): HelpStep => ({
    text: stepText,
    ui,
    at: where,
});

/* ----------------------------- picture parts ----------------------------- */

/** Moves the absolute M / L points of a generated path (lib/generators) to (dx, dy) on the board. */
const shiftD = (d: string, dx: number, dy: number) =>
    d.replace(/([ML])(-?[\d.]+) (-?[\d.]+)/g, (_, c, x, y) => `${c}${+x + dx} ${+y + dy}`);
const flake = (depth: number) => shiftD(fractalPath({ kind: 'koch', depth, size: 110 }).d, 105, 42);
const cells = (rule: number) =>
    shiftD(cellsToPath(elementary({ rule, width: 63, generations: 32 }), 4, 1).d, 34, 22);

/** Text on light artwork (sticky notes, tags): stays dark in dark mode, where `ink` turns light. */
const ON_LIGHT = '#0f1b2d';

const SELECT = { stroke: 'primary', w: 1, dash: '4 3', fill: '#0a60d614' };

const range = (count: number) => Array.from({ length: count }, (_, i) => i);

const starD = (cx: number, cy: number, outer: number, inner = outer * 0.45): string =>
    range(10)
        .map((i) => {
            const r = i % 2 ? inner : outer;
            const a = (Math.PI / 5) * i - Math.PI / 2;
            return `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
        })
        .join(' ') + 'Z';

const star = (cx: number, cy: number, outer: number, fill = '#ffd60a') =>
    path(starD(cx, cy, outer), { fill, stroke: '#b08900', w: 0.8 });

const badge = (x: number, y: number, label: string, fill = 'primary'): SceneDraft[] => [
    rect(x, y, label.length * 5.4 + 14, 16, { fill, rx: 8 }),
    text(x + 7, y + 11.5, label, { size: 9, weight: 700, fill: '#ffffff' }),
];

const sticky = (x: number, y: number, label: string, fill = '#ffe66d'): SceneDraft[] => [
    rect(x, y, 46, 30, { fill, shadow: true }),
    text(x + 5, y + 18, label, { fill: ON_LIGHT, size: 8 }),
];

const card = (x: number, y: number, name: string, price: string, fill: string): SceneDraft[] => [
    rect(x, y, 80, 110, { fill: 'page', stroke: 'line', w: 1, rx: 6, shadow: true }),
    text(x + 40, y + 24, name, { size: 10, weight: 700, anchor: 'middle', fill: 'muted' }),
    text(x + 40, y + 56, price, { size: 20, weight: 800, anchor: 'middle' }),
    rect(x + 12, y + 80, 56, 18, { fill, rx: 9 }),
];

const button = (x: number, y: number, label: string, fill: string): SceneDraft[] => [
    rect(x, y, 100, 26, { fill, rx: 13 }),
    text(x + 50, y + 17, label, { size: 10, weight: 700, anchor: 'middle', fill: '#ffffff' }),
];

const checker = (x: number, y: number, w: number, h: number): SceneDraft[] =>
    times(Math.ceil(w / 10) * Math.ceil(h / 10), (i) => {
        const cols = Math.ceil(w / 10);
        const c = i % cols;
        const r = Math.floor(i / cols);
        return rect(x + c * 10, y + r * 10, 10, 10, {
            fill: (r + c) % 2 ? 'line' : 'page',
            op: 0.6,
        });
    });

const mountainBadge = (cx: number, cy: number, r: number): SceneDraft[] => [
    circle(cx, cy, r, { fill: '#ffb703' }),
    path(
        `M${cx - r * 0.9} ${cy + r * 0.45} L${cx - r * 0.45} ${cy - r * 0.25} L${cx - r * 0.1} ${cy + r * 0.15} L${cx + r * 0.25} ${cy - r * 0.55} L${cx + r * 0.85} ${cy + r * 0.45}Z`,
        { fill: '#1d3557' },
    ),
];

type Cubic = [number, number, number, number, number, number, number, number];

/** Points along a cubic Bézier, with the tangent angle in degrees. */
const alongCubic = ([x0, y0, x1, y1, x2, y2, x3, y3]: Cubic, count: number) =>
    range(count).map((i) => {
        const t = 0.06 + (0.88 * i) / (count - 1);
        const u = 1 - t;
        const x = u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3;
        const y = u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3;
        const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
        const dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
        return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
    });

const ROUTE: Cubic = [30, 150, 110, 175, 150, 15, 290, 40];
const footprints = (scaled: boolean): SceneDraft[] =>
    alongCubic(ROUTE, 12).map(({ x, y, angle }, i) => {
        const side = i % 2 ? 6 : -6;
        const rad = ((angle + 90) * Math.PI) / 180;
        const k = scaled ? 0.6 + (0.8 * i) / 11 : 1;
        return ellipse(x + side * Math.cos(rad), y + side * Math.sin(rad), 2.6 * k, 4.6 * k, {
            fill: '#5d4037',
            rot: angle + 90,
        });
    });

/** Copies around a center: tick marks, petals. */
const ring = (
    count: number,
    radius: number,
    make: (x: number, y: number, deg: number, i: number) => SceneDraft,
) =>
    times(count, (i) => {
        const deg = (360 / count) * i;
        const rad = (deg * Math.PI) / 180;
        return make(160 + radius * Math.sin(rad), 90 - radius * Math.cos(rad), deg, i);
    });

const tick = (x: number, y: number, deg: number) =>
    rect(x - 3, y - 8, 6, 16, { fill: 'ink', rot: deg });
/** `k` scales the petal; `jitter` nudges every petal a little, by its index. */
const petal = (x: number, y: number, deg: number, i: number, k = 1, op = 1, jitter = k !== 1) =>
    ellipse(x + (jitter ? ((i % 3) - 1) * 2 : 0), y, 9 * k, 22 * k, {
        fill: '#ff8fab',
        stroke: '#c9184a',
        w: 1,
        rot: deg,
        op,
    });

const perimeterStars = (): SceneDraft[] => {
    const pts: [number, number][] = [];
    const [x0, y0, x1, y1] = [30, 25, 290, 155];
    for (let x = x0; x < x1; x += 26) pts.push([x, y0]);
    for (let y = y0; y < y1; y += 26) pts.push([x1, y]);
    for (let x = x1; x > x0; x -= 26) pts.push([x, y1]);
    for (let y = y1; y > y0; y -= 26) pts.push([x0, y]);
    return pts.map(([x, y]) => star(x, y, 6));
};

/* -------------------------------- examples ------------------------------- */

/** Topic id → its examples, in the order they are shown. */
export const HELP_EXAMPLES: Record<string, HelpExample[]> = {
    basics: [
        {
            id: 'team-planning-board',
            title: 'Weekly team planning board',
            brief: 'An endless board of sticky notes you can take to another computer.',
            icon: 'table-cells-large',
            steps: [
                s(
                    'Turn on Settings > Canvas > Freehand for an endless whiteboard',
                    'Settings › Canvas › Freehand',
                ),
                s(
                    'Add Sticky Notes from Shapes, one column per day, and double-click each to type the task',
                    'Shapes › Sticky Note',
                    [70, 60],
                ),
                s(
                    'Close the tab whenever you like: everything is saved in this browser',
                    'Saved automatically',
                ),
                s('Press `mod+S` on Friday to download the week as a .fateboard file', '`mod+S`'),
                s('On another computer, `mod+O` opens that file with every page', '`mod+O`'),
            ],
            result: 'A planning board that saves itself, plus a file you can keep or hand over.',
            scene: [
                ...at(
                    0,
                    ...times(150, (i) =>
                        circle(16 + (i % 15) * 21, 16 + Math.floor(i / 15) * 18, 0.9, {
                            fill: 'line',
                        }),
                    ),
                ),
                ...at(
                    1,
                    text(30, 34, 'Mon', { size: 10, weight: 700 }),
                    text(100, 34, 'Tue', { size: 10, weight: 700 }),
                    text(170, 34, 'Wed', { size: 10, weight: 700 }),
                    ...sticky(26, 42, 'Sprint'),
                    ...sticky(26, 80, 'Call Ana', '#ffb4a2'),
                    ...sticky(96, 42, 'Copy', '#b5e48c'),
                    ...sticky(166, 42, 'Review'),
                    ...sticky(166, 80, 'Ship it', '#ffb4a2'),
                ),
                ...at(2, ...badge(236, 14, '✓ Saved', '#2a9d8f')),
                ...at(3, ...badge(200, 140, '↓ week.fateboard')),
                ...at(4, ...badge(40, 140, 'Opened on laptop', '#2a9d8f')),
            ],
            uses: ['settings', 'shapes'],
        },
    ],

    select: [
        {
            id: 'tidy-mood-board',
            title: 'Tidy a messy mood board',
            brief: 'Pasted photos of every size, turned into one neat row.',
            icon: 'images',
            steps: [
                s(
                    'Drag a selection box around the photos you want to line up',
                    'Select (`V`)',
                    [300, 165],
                ),
                s(
                    '`shift` + click a photo to leave it out, or to add one you missed',
                    '`shift` + click',
                    [270, 110],
                ),
                s(
                    'Drag a corner handle of each photo until they are all the same height: proportions stay the same',
                    'Corner handle',
                    [146, 120],
                ),
                s(
                    'Align them top, then distribute them so the gaps are equal',
                    'Top bar › Align · Distribute',
                ),
                s(
                    'Right-click > Group so the finished row moves as one',
                    'Right-click › Group',
                    [160, 90],
                ),
            ],
            result: 'A clean photo row, the same height and evenly spaced, that moves in one piece.',
            scene: [
                ...during(
                    0,
                    2,
                    photo(30, 26, 70, 46),
                    photo(110, 64, 36, 52),
                    photo(172, 18, 76, 48),
                    photo(250, 76, 40, 58),
                    photo(56, 104, 58, 54, 'portrait'),
                ),
                ...during(
                    2,
                    3,
                    photo(30, 26, 76, 50),
                    photo(110, 64, 35, 50),
                    photo(172, 18, 79, 50),
                    photo(250, 76, 34, 50),
                    photo(56, 104, 54, 50, 'portrait'),
                ),
                ...at(
                    3,
                    photo(16, 65, 76, 50),
                    photo(98, 65, 35, 50),
                    photo(139, 65, 79, 50),
                    photo(224, 65, 34, 50),
                    photo(264, 65, 46, 50, 'portrait'),
                ),
                ...during(0, 3, rect(16, 12, 290, 154, SELECT)),
                ...during(1, 2, rect(246, 72, 48, 66, { stroke: 'accent', w: 2, rx: 3 })),
                ...during(4, 5, rect(12, 61, 302, 58, SELECT)),
            ],
            uses: ['arrange', 'top-bar'],
        },
        {
            id: 'price-tags',
            title: 'A row of price tags',
            brief: 'Make one tag, then copy it along a shop shelf.',
            icon: 'copy',
            steps: [
                s(
                    'Add a Text Rounded shape from Shapes and type a price',
                    'Shapes › Text Rounded',
                    [60, 87],
                ),
                s('`mod+D` duplicates it on top of the original', '`mod+D`'),
                s(
                    'Hold `shift` and press → a few times to move the copy 10 px at a time',
                    '`shift` + →',
                    [130, 87],
                ),
                s(
                    'Repeat for the rest, then double-click each tag to change its price',
                    'Double-click',
                    [270, 87],
                ),
            ],
            result: 'A row of matching tags, ready to print or share.',
            scene: [
                ...at(0, rect(10, 120, 300, 8, { fill: '#a47148', rx: 2 })),
                ...at(
                    0,
                    rect(30, 70, 60, 34, { fill: '#ffd6a5', stroke: 'ink', w: 1.5, rx: 12 }),
                    text(60, 92, '$4.99', {
                        fill: ON_LIGHT,
                        size: 13,
                        weight: 700,
                        anchor: 'middle',
                    }),
                ),
                ...during(
                    1,
                    2,
                    rect(34, 74, 60, 34, { fill: '#ffd6a5', stroke: 'primary', w: 1.5, rx: 12 }),
                ),
                ...at(
                    2,
                    rect(100, 70, 60, 34, { fill: '#ffd6a5', stroke: 'ink', w: 1.5, rx: 12 }),
                    text(130, 92, '$2.50', {
                        fill: ON_LIGHT,
                        size: 13,
                        weight: 700,
                        anchor: 'middle',
                    }),
                ),
                ...at(
                    3,
                    rect(170, 70, 60, 34, { fill: '#ffd6a5', stroke: 'ink', w: 1.5, rx: 12 }),
                    text(200, 92, '$7.20', {
                        fill: ON_LIGHT,
                        size: 13,
                        weight: 700,
                        anchor: 'middle',
                    }),
                    rect(240, 70, 60, 34, { fill: '#ffd6a5', stroke: 'ink', w: 1.5, rx: 12 }),
                    text(270, 92, '$1.10', {
                        fill: ON_LIGHT,
                        size: 13,
                        weight: 700,
                        anchor: 'middle',
                    }),
                ),
            ],
            uses: ['shapes', 'text'],
        },
    ],

    hand: [
        {
            id: 'walk-through-a-big-board',
            title: 'Walk a team through a big board',
            brief: 'Present a whiteboard during a call without moving anything by accident.',
            icon: 'hand',
            steps: [
                s('Press `mod+0` so everyone sees the whole board first', '`mod+0`'),
                s(
                    'Point with `mod` + wheel (or pinch) at the part you talk about to zoom in there',
                    '`mod` + wheel',
                    [70, 70],
                ),
                s(
                    'Press `H` and drag to slide over to the next part; nothing on the board can move',
                    'Hand (`H`)',
                    [200, 90],
                ),
                s(
                    'Press `K` for the laser pointer to circle what matters',
                    'Laser pointer (`K`)',
                    [180, 110],
                ),
            ],
            result: 'A smooth tour of your board, with the content exactly as you left it.',
            scene: [
                ...at(
                    0,
                    text(26, 30, 'Ideas', { size: 10, weight: 700 }),
                    ...sticky(22, 40, 'Dark UI'),
                    ...sticky(72, 40, 'Search', '#b5e48c'),
                    ...sticky(22, 76, 'Export', '#ffb4a2'),
                    text(130, 30, 'Plan', { size: 10, weight: 700 }),
                    ...sticky(126, 40, 'Week 1'),
                    ...sticky(176, 40, 'Week 2'),
                    ...sticky(126, 76, 'Launch', '#b5e48c'),
                    text(236, 30, 'Done', { size: 10, weight: 700 }),
                    ...sticky(232, 40, 'Logo', '#ffb4a2'),
                    ...sticky(232, 76, 'Site'),
                ),
                ...during(1, 2, rect(16, 20, 108, 96, { stroke: 'primary', w: 2.5, rx: 6 })),
                ...at(2, rect(120, 20, 108, 96, { stroke: 'primary', w: 2.5, rx: 6 })),
                ...at(
                    3,
                    path('M122 108 C120 70 180 66 178 92 C176 118 130 122 124 100', {
                        stroke: '#ff3b30',
                        w: 2.5,
                        glow: '#ff3b30',
                        draw: true,
                    }),
                ),
            ],
            uses: ['laser'],
        },
    ],

    node: [
        {
            id: 'speech-bubble',
            title: 'A speech bubble with your own tail',
            brief: 'A comic or chat bubble whose tail points exactly at your character.',
            icon: 'share-nodes',
            steps: [
                s('Add a Rounded Rectangle from Shapes', 'Shapes › Rounded Rectangle', [160, 75]),
                s('Press `A` and click it: its nodes appear', 'Node tool (`A`)', [160, 75]),
                s(
                    'Double-click the bottom edge twice to add two nodes next to each other',
                    'Double-click the outline',
                    [140, 110],
                ),
                s(
                    'Drag one of the new nodes down and out: that is the sharp tail',
                    'Drag a node',
                    [118, 148],
                ),
                s(
                    'Press `Enter` to finish, then put a text box on top for the words',
                    '`Enter`',
                    [160, 78],
                ),
            ],
            result: 'A bubble with its tail exactly where you want it, ready for any comic panel.',
            scene: [
                ...during(
                    0,
                    3,
                    rect(90, 40, 140, 70, { fill: '#e0f0ff', stroke: 'ink', w: 1.5, rx: 14 }),
                ),
                ...at(
                    3,
                    path(
                        'M104 40 H216 Q230 40 230 54 V96 Q230 110 216 110 H150 L118 148 L130 110 H104 Q90 110 90 96 V54 Q90 40 104 40Z',
                        { fill: '#e0f0ff', stroke: 'ink', w: 1.5 },
                    ),
                ),
                ...during(
                    1,
                    4,
                    ...[
                        [104, 40],
                        [216, 40],
                        [230, 54],
                        [230, 96],
                        [216, 110],
                        [104, 110],
                        [90, 96],
                        [90, 54],
                    ].map(([x, y]) =>
                        rect(x! - 3, y! - 3, 6, 6, { fill: 'page', stroke: 'primary', w: 1.2 }),
                    ),
                ),
                ...during(
                    2,
                    3,
                    rect(127, 107, 6, 6, { fill: 'accent' }),
                    rect(147, 107, 6, 6, { fill: 'accent' }),
                ),
                ...during(
                    3,
                    4,
                    rect(115, 145, 6, 6, { fill: 'accent' }),
                    rect(147, 107, 6, 6, { fill: 'accent' }),
                ),
                ...at(
                    4,
                    text(160, 82, 'Hi there!', {
                        fill: ON_LIGHT,
                        size: 18,
                        weight: 800,
                        anchor: 'middle',
                    }),
                ),
            ],
            uses: ['shapes', 'text'],
        },
        {
            id: 'leaf-logo',
            title: 'A leaf logo from a circle',
            brief: 'Start from a circle and pinch it into a leaf for a garden shop logo.',
            icon: 'bezier-curve',
            steps: [
                s('Add a Circle from Shapes, press `A` and click it', 'Node tool (`A`)', [160, 90]),
                s(
                    '`alt` + click two opposite nodes: they become sharp corners, the tips of the leaf',
                    '`alt` + click',
                    [160, 45],
                ),
                s(
                    'Drag the other two nodes closer to the middle to slim the leaf',
                    'Drag a node',
                    [188, 90],
                ),
                s(
                    '`alt` + drag one handle to give the leaf a slight bend',
                    '`alt` + drag a handle',
                    [192, 70],
                ),
                s(
                    'Press `Enter`, then give it a green Linear gradient in Fill and Shadow',
                    'Fill & Shadow › Linear',
                ),
            ],
            result: 'A custom leaf you can save under My Shapes and reuse.',
            scene: [
                ...during(0, 1, circle(160, 90, 45, { fill: '#b7e4c7', stroke: 'ink', w: 1.5 })),
                ...during(
                    1,
                    2,
                    path(
                        'M160 45 C200 60 205 75 205 90 C205 105 200 120 160 135 C120 120 115 105 115 90 C115 75 120 60 160 45Z',
                        { fill: '#b7e4c7', stroke: 'ink', w: 1.5 },
                    ),
                ),
                ...during(
                    2,
                    3,
                    path(
                        'M160 40 C185 65 188 78 188 90 C188 102 185 115 160 140 C135 115 132 102 132 90 C132 78 135 65 160 40Z',
                        { fill: '#b7e4c7', stroke: 'ink', w: 1.5 },
                    ),
                ),
                ...during(
                    3,
                    4,
                    path(
                        'M160 40 C195 62 192 92 182 108 C175 120 168 130 160 140 C135 115 128 95 134 80 C138 66 148 52 160 40Z',
                        { fill: '#b7e4c7', stroke: 'ink', w: 1.5 },
                    ),
                ),
                ...at(
                    4,
                    path(
                        'M160 40 C195 62 192 92 182 108 C175 120 168 130 160 140 C135 115 128 95 134 80 C138 66 148 52 160 40Z',
                        {
                            grad: { from: '#95d5b2', to: '#2d6a4f', angle: 60 },
                            stroke: '#1b4332',
                            w: 1.5,
                        },
                    ),
                ),
                ...at(
                    3,
                    path('M160 140 C162 110 170 80 160 40', {
                        stroke: '#ffffff',
                        w: 1.2,
                        op: 0.7,
                        draw: true,
                    }),
                ),
                ...during(
                    0,
                    3,
                    ...[
                        [160, 45],
                        [160, 135],
                    ].map(([x, y]) =>
                        rect(x! - 3, y! - 3, 6, 6, { fill: 'page', stroke: 'primary', w: 1.2 }),
                    ),
                ),
                ...during(
                    0,
                    2,
                    ...[
                        [115, 90],
                        [205, 90],
                    ].map(([x, y]) =>
                        rect(x! - 3, y! - 3, 6, 6, { fill: 'page', stroke: 'primary', w: 1.2 }),
                    ),
                ),
                ...during(
                    3,
                    4,
                    path('M182 108 L194 64', { stroke: 'primary', w: 1 }),
                    circle(194, 64, 3, { fill: 'accent' }),
                ),
            ],
            uses: ['fill-shadow', 'shapes'],
        },
    ],

    pen: [
        {
            id: 'mountain-logo',
            title: 'Mountain range badge',
            brief: 'A crisp outdoor-club logo drawn point by point.',
            icon: 'pen-tool',
            steps: [
                s(
                    'Press `P` and click along the peaks and valleys of a mountain range',
                    'Pen (`P`)',
                    [260, 130],
                ),
                s(
                    'Click the first point again to close the shape',
                    'Click the first point',
                    [60, 130],
                ),
                s(
                    'With Fill chosen in the footer, click a deep blue swatch to fill the mountains',
                    'Footer › Fill, then a swatch',
                ),
                s(
                    'Add a Circle and send it behind with `mod+shift+↓` for the badge',
                    '`mod+shift+↓`',
                    [160, 40],
                ),
            ],
            result: 'A sharp vector badge that stays crisp when you export it as SVG.',
            scene: [
                ...at(3, circle(160, 95, 72, { fill: '#ffb703' })),
                ...during(
                    0,
                    1,
                    path('M60 130 L100 70 L130 105 L170 50 L210 100 L235 80 L260 130', {
                        stroke: 'ink',
                        w: 2,
                        draw: true,
                    }),
                ),
                ...during(
                    1,
                    2,
                    path('M60 130 L100 70 L130 105 L170 50 L210 100 L235 80 L260 130 Z', {
                        stroke: 'ink',
                        w: 2,
                    }),
                ),
                ...at(
                    2,
                    path('M60 130 L100 70 L130 105 L170 50 L210 100 L235 80 L260 130 Z', {
                        fill: '#1d3557',
                        stroke: 'ink',
                        w: 2,
                    }),
                ),
                ...during(
                    0,
                    2,
                    ...[
                        [60, 130],
                        [100, 70],
                        [130, 105],
                        [170, 50],
                        [210, 100],
                        [235, 80],
                        [260, 130],
                    ].map(([x, y]) =>
                        rect(x! - 3, y! - 3, 6, 6, { fill: 'page', stroke: 'primary', w: 1.2 }),
                    ),
                ),
                ...at(2, path('M160 64 L170 50 L180 64 L174 60 L166 64Z', { fill: '#ffffff' })),
            ],
            uses: ['color', 'export'],
        },
        {
            id: 'wave-divider',
            title: 'Wave divider for a web page',
            brief: 'A soft wave to separate two sections of a landing page mock-up.',
            icon: 'pen-tool',
            steps: [
                s(
                    'Press `P`, then click and drag to place each smooth point of the wave',
                    'Pen (`P`): click and drag',
                    [300, 100],
                ),
                s('Press `Enter` to finish the open path', '`Enter`'),
                s('Set a thick stroke width in the footer', 'Footer › Stroke width'),
                s(
                    'Fine-tune any bump later with the Node tool (`A`)',
                    'Node tool (`A`)',
                    [160, 100],
                ),
            ],
            result: 'A smooth, editable wave you can copy across your mock-up.',
            scene: [
                ...at(
                    0,
                    text(24, 40, 'Hero', { size: 16, weight: 800 }),
                    text(24, 150, 'Features', { size: 12, weight: 700, fill: 'muted' }),
                ),
                ...during(
                    0,
                    2,
                    path('M20 100 C70 50 110 50 160 100 S250 150 300 100', {
                        stroke: 'ink',
                        w: 2,
                        draw: true,
                    }),
                ),
                ...during(1, 2, rect(16, 60, 288, 82, SELECT)),
                ...at(
                    2,
                    path('M20 100 C70 50 110 50 160 100 S250 150 300 100', {
                        stroke: 'primary',
                        w: 8,
                    }),
                ),
                ...during(
                    3,
                    4,
                    path('M110 50 L160 100 L210 150', { stroke: 'primary', w: 1 }),
                    circle(110, 50, 3, { fill: 'accent' }),
                    circle(210, 150, 3, { fill: 'accent' }),
                    ...[
                        [20, 100],
                        [160, 100],
                        [300, 100],
                    ].map(([x, y]) =>
                        rect(x! - 3, y! - 3, 6, 6, { fill: 'page', stroke: 'primary', w: 1.2 }),
                    ),
                ),
            ],
            uses: ['node'],
        },
    ],

    pencil: [
        {
            id: 'app-wireframe',
            title: 'Five-minute app wireframe',
            brief: 'Rough out a phone screen before anyone opens a design tool.',
            icon: 'pencil-line',
            steps: [
                s('Press `shift+P` and sketch the phone outline', 'Pencil (`shift+P`)', [120, 20]),
                s('Sketch boxes for the header, a photo and a button', 'Pencil', [186, 140]),
                s(
                    'Scribble an arrow and the next screen to show where a tap leads',
                    'Pencil',
                    [250, 100],
                ),
                s(
                    'Straighten any wobbly line with the Node tool (`A`)',
                    'Node tool (`A`)',
                    [200, 90],
                ),
            ],
            result: 'A quick sketch to agree on the idea before the real design.',
            scene: [
                ...during(
                    0,
                    3,
                    path(
                        'M120 20 Q117 90 121 160 Q160 163 200 159 Q203 90 199 21 Q160 17 120 20Z',
                        { stroke: 'ink', w: 1.6, draw: true },
                    ),
                ),
                ...at(3, rect(120, 20, 80, 140, { stroke: 'ink', w: 1.6, rx: 8 })),
                ...at(
                    1,
                    path('M128 34 Q160 32 192 35', { stroke: 'ink', w: 1.6, draw: true }),
                    path('M130 48 L190 47 L191 95 L129 96Z M130 48 L191 95 M190 47 L129 96', {
                        stroke: 'ink',
                        w: 1.2,
                        draw: true,
                    }),
                    path('M136 130 Q160 127 186 130 L185 146 Q160 148 135 145Z', {
                        stroke: 'ink',
                        w: 1.6,
                        draw: true,
                    }),
                ),
                ...at(
                    2,
                    path('M190 138 Q232 132 248 104 M240 104 L248 104 L248 113', {
                        stroke: 'accent',
                        w: 1.8,
                        draw: true,
                    }),
                    path('M250 40 L300 41 L299 100 L251 99Z M258 52 L292 52 M258 62 L284 62', {
                        stroke: 'ink',
                        w: 1.4,
                        draw: true,
                    }),
                ),
            ],
            uses: ['node'],
        },
    ],

    laser: [
        {
            id: 'online-lesson',
            title: 'Teach a lesson over screen share',
            brief: 'Point at the step you are explaining, then move on with a clean board.',
            icon: 'laser-pointer',
            steps: [
                s(
                    'Put one idea on each page and press `Page Down` to move to the next',
                    '`Page Down`',
                ),
                s(
                    'Press `K` and drag around the part you are explaining',
                    'Laser pointer (`K`)',
                    [200, 120],
                ),
                s(
                    'The red trail fades after a second, so nothing needs cleaning up',
                    'Nothing is saved',
                ),
                s(
                    'Press `V` when the class wants you to change something',
                    'Select (`V`)',
                    [200, 100],
                ),
            ],
            result: 'A lesson where you can point freely and never save a stray mark.',
            scene: [
                ...at(
                    0,
                    text(20, 34, 'How plants eat', { size: 14, weight: 800 }),
                    text(300, 34, '2 / 6', { size: 9, anchor: 'end', fill: 'muted' }),
                    circle(70, 90, 20, { fill: '#ffd166' }),
                    path('M95 90 H150 M143 85 L150 90 L143 95', { stroke: 'accent', w: 2 }),
                    path('M200 140 C170 110 180 70 230 60 C240 100 230 130 200 140Z', {
                        fill: '#52b788',
                        stroke: '#1b4332',
                        w: 1.5,
                    }),
                    text(200, 160, 'leaf', { size: 10, anchor: 'middle' }),
                ),
                ...during(
                    1,
                    2,
                    path('M170 140 C150 90 200 40 245 70 C270 100 240 160 190 150', {
                        stroke: '#ff3b30',
                        w: 2.5,
                        glow: '#ff3b30',
                        draw: true,
                    }),
                ),
                ...during(
                    2,
                    3,
                    path('M170 140 C150 90 200 40 245 70 C270 100 240 160 190 150', {
                        stroke: '#ff3b30',
                        w: 2.5,
                        op: 0.2,
                    }),
                ),
                ...during(3, 4, rect(172, 54, 64, 90, SELECT)),
            ],
            uses: ['pages'],
        },
    ],

    brush: [
        {
            id: 'brush-lettering',
            title: 'Hand lettering',
            brief: 'A greeting written with a calligraphy nib: thick downstrokes, thin upstrokes.',
            icon: 'paintbrush',
            steps: [
                s('Press B and click the Calligraphy pen tile', 'Brush › Calligraphy pen'),
                s('Write the word in one stroke', 'Drag on the board', [160, 90]),
                s(
                    'Lower Fixation for an even, rounder line and write a flourish',
                    'Calligraphy › Fixation',
                    [160, 140],
                ),
            ],
            result: 'Lettering with real calligraphic contrast, as editable filled paths.',
            scene: [
                ...at(0, rect(60, 40, 200, 110, { fill: 'page', stroke: 'ink', w: 1 })),
                ...at(
                    1,
                    path(
                        'M90 110 C100 60 120 60 125 105 C130 70 150 70 155 105 C160 75 180 75 190 108 C200 80 220 80 230 100',
                        { stroke: 'ink', w: 5, draw: true },
                    ),
                ),
                ...at(
                    2,
                    path('M100 135 C140 125 180 145 220 132', {
                        stroke: 'ink',
                        w: 2.5,
                        draw: true,
                    }),
                ),
            ],
            uses: ['draw'],
        },
    ],

    draw: [
        {
            id: 'neon-sign',
            title: 'Glowing neon sign',
            brief: 'A café sign that looks lit up, written by hand.',
            icon: 'pencil',
            steps: [
                s('Set a dark Page background in Pages', 'Pages › Page background'),
                s(
                    'Open Draw, pick the Neon brush and raise Smoothing so your handwriting comes out clean',
                    'Draw › Neon · Smoothing',
                    [270, 150],
                ),
                s('Turn on Use brush color in Shadow and glow', 'Draw › Shadow and glow'),
                s('Write "open late" in one go', 'Drag on the board', [250, 96]),
                s('Pick another color and draw a heart next to it', 'Palette', [265, 70]),
            ],
            result: 'A neon-style sign to export as a poster or a social post.',
            scene: [
                ...at(0, rect(6, 6, 308, 168, { fill: '#141024', rx: 4 })),
                ...during(
                    1,
                    2,
                    path('M236 150 q10 -12 20 0 t20 0', { stroke: '#ff4fd8', w: 3, draw: true }),
                ),
                ...during(
                    2,
                    3,
                    path('M236 150 q10 -12 20 0 t20 0', {
                        stroke: '#ff4fd8',
                        w: 3,
                        glow: '#ff4fd8',
                    }),
                ),
                ...at(
                    3,
                    text(150, 108, 'open late', {
                        size: 46,
                        font: 'script',
                        fill: '#ffe3fa',
                        stroke: '#ff4fd8',
                        w: 1,
                        glow: '#ff4fd8',
                        anchor: 'middle',
                    }),
                ),
                ...at(
                    4,
                    path('M265 78 C245 64 250 46 265 58 C280 46 285 64 265 78Z', {
                        stroke: '#3df5ff',
                        w: 3,
                        glow: '#3df5ff',
                        draw: true,
                    }),
                ),
            ],
            uses: ['pages', 'export'],
        },
        {
            id: 'mirror-mandala',
            title: 'Mandala with mirror drawing',
            brief: 'A symmetric doodle for a colouring page, with no measuring.',
            icon: 'pencil',
            steps: [
                s(
                    'Open Draw, pick a pen and set Mirror drawing to 4-way',
                    'Draw › Mirror drawing › 4-way',
                ),
                s(
                    'Start near the middle of the page and draw petals outward',
                    'Drag on the board',
                    [210, 48],
                ),
                s(
                    'Turn on Fill the drawn shape and draw closed loops for solid petals',
                    'Draw › Fill the drawn shape',
                    [160, 40],
                ),
                s('Switch to the Chalk brush for a softer outer ring', 'Draw › Chalk', [230, 90]),
            ],
            result: 'A balanced mandala that would take ages to draw by hand.',
            scene: [
                ...during(
                    0,
                    4,
                    path('M160 10 V170 M10 90 H310', { stroke: 'line', w: 1, dash: '3 3' }),
                ),
                ...at(
                    1,
                    ...[
                        'M165 85 Q195 55 215 45 Q205 70 165 85Z',
                        'M155 85 Q125 55 105 45 Q115 70 155 85Z',
                        'M165 95 Q195 125 215 135 Q205 110 165 95Z',
                        'M155 95 Q125 125 105 135 Q115 110 155 95Z',
                    ].map((d) => path(d, { stroke: '#7b2cbf', w: 2, draw: true })),
                ),
                ...at(
                    2,
                    ...[
                        'M160 80 Q150 55 160 35 Q170 55 160 80Z',
                        'M160 100 Q150 125 160 145 Q170 125 160 100Z',
                        'M150 90 Q125 80 100 90 Q125 100 150 90Z',
                        'M170 90 Q195 80 220 90 Q195 100 170 90Z',
                    ].map((d) => path(d, { fill: '#ff8fab', stroke: '#7b2cbf', w: 1.5 })),
                    circle(160, 90, 7, { fill: '#ffd166', stroke: '#7b2cbf', w: 1.5 }),
                ),
                ...at(3, circle(160, 90, 72, { stroke: '#4361ee', w: 4, dash: '2 3', op: 0.75 })),
            ],
            uses: ['rotate'],
        },
    ],

    shapes: [
        {
            id: 'signup-flowchart',
            title: 'Sign-up flowchart',
            brief: 'Map how a new user signs up, so the team agrees on it.',
            icon: 'shapes',
            steps: [
                s(
                    'Add a Text Rounded shape for "Start" and Text Rectangles for each step',
                    'Shapes › Text Shapes',
                    [114, 90],
                ),
                s(
                    'Use a Text Diamond for each question, such as "Email valid?"',
                    'Shapes › Text Diamond',
                    [190, 90],
                ),
                s(
                    'In the Connectors tab, drag an elbow connector from shape to shape',
                    'Shapes › Connectors › Elbow',
                    [244, 90],
                ),
                s(
                    'Set the arrowhead to end so the flow reads left to right',
                    'Connector › Arrowheads › End',
                ),
                s('Move a shape: its connectors follow it', 'Drag a shape', [275, 90]),
            ],
            result: 'A flowchart you can rearrange without redrawing a single arrow.',
            scene: [
                ...at(
                    0,
                    rect(14, 78, 50, 24, { fill: '#b5e48c', stroke: 'ink', w: 1.2, rx: 12 }),
                    text(39, 94, 'Start', {
                        fill: ON_LIGHT,
                        size: 9,
                        weight: 700,
                        anchor: 'middle',
                    }),
                    rect(84, 76, 60, 28, { fill: '#e0f0ff', stroke: 'ink', w: 1.2 }),
                    text(114, 94, 'Enter email', { fill: ON_LIGHT, size: 8, anchor: 'middle' }),
                    rect(244, 76, 62, 28, { fill: '#e0f0ff', stroke: 'ink', w: 1.2 }),
                    text(275, 94, 'Welcome!', { fill: ON_LIGHT, size: 8, anchor: 'middle' }),
                    rect(160, 136, 60, 26, { fill: '#ffd6a5', stroke: 'ink', w: 1.2 }),
                    text(190, 153, 'Try again', { fill: ON_LIGHT, size: 8, anchor: 'middle' }),
                ),
                ...at(
                    1,
                    path('M190 66 L222 90 L190 114 L158 90Z', {
                        fill: '#fff3b0',
                        stroke: 'ink',
                        w: 1.2,
                    }),
                    text(190, 93, 'Valid?', {
                        fill: ON_LIGHT,
                        size: 8,
                        weight: 700,
                        anchor: 'middle',
                    }),
                ),
                ...at(
                    2,
                    ...[
                        'M64 90 H84',
                        'M144 90 H158',
                        'M222 90 H244',
                        'M190 114 V136',
                        'M160 149 H114 V104',
                    ].map((d) => path(d, { stroke: 'ink', w: 1.4, draw: true })),
                ),
                ...at(
                    3,
                    ...[
                        'M78 86 L84 90 L78 94Z',
                        'M152 86 L158 90 L152 94Z',
                        'M238 86 L244 90 L238 94Z',
                        'M186 130 L190 136 L194 130Z',
                        'M110 110 L114 104 L118 110Z',
                    ].map((d) => path(d, { fill: 'ink' })),
                ),
                ...during(4, 5, rect(240, 72, 70, 36, SELECT)),
            ],
            uses: ['text', 'arrange'],
        },
        {
            id: 'isometric-room',
            title: 'Isometric room sketch',
            brief: 'Plan where the furniture goes in a new office.',
            icon: 'shapes',
            steps: [
                s(
                    'Pick the isometric grid from the arrow next to the grid button',
                    'Top bar › Grid ▾ › Isometric',
                ),
                s(
                    'From the 3D category add a Box for the desk and a Cylinder for a stool',
                    'Shapes › 3D',
                    [170, 80],
                ),
                s('Keep a stroke on so the depth shows', 'Footer › Stroke'),
                s('Add Sticky Notes to label each piece', 'Shapes › Sticky Note', [80, 44]),
            ],
            result: 'A clear 3D-looking floor plan without any 3D software.',
            scene: [
                ...at(
                    0,
                    ...times(15, (i) =>
                        path(`M${-290 + i * 40} 174 l291 -168`, { stroke: 'line', w: 0.6 }),
                    ),
                    ...times(15, (i) =>
                        path(`M${20 + i * 40} 174 l-291 -168`, { stroke: 'line', w: 0.6 }),
                    ),
                ),
                ...during(
                    1,
                    2,
                    path('M120 80 L170 55 L220 80 L170 105Z', { fill: '#deb887' }),
                    path('M120 80 V105 L170 130 V105Z', { fill: '#c49a6c' }),
                    path('M170 105 V130 L220 105 V80Z', { fill: '#a47148' }),
                    path('M234 110 V135 A16 8 0 0 0 266 135 V110', { fill: '#8ecae6' }),
                    ellipse(250, 110, 16, 8, { fill: '#bde0fe' }),
                ),
                ...at(
                    2,
                    path('M120 80 L170 55 L220 80 L170 105Z', {
                        fill: '#deb887',
                        stroke: 'ink',
                        w: 1.2,
                    }),
                    path('M120 80 V105 L170 130 V105Z', { fill: '#c49a6c', stroke: 'ink', w: 1.2 }),
                    path('M170 105 V130 L220 105 V80Z', { fill: '#a47148', stroke: 'ink', w: 1.2 }),
                    path('M234 110 V135 A16 8 0 0 0 266 135 V110', {
                        fill: '#8ecae6',
                        stroke: 'ink',
                        w: 1.2,
                    }),
                    ellipse(250, 110, 16, 8, { fill: '#bde0fe', stroke: 'ink', w: 1.2 }),
                ),
                ...at(3, ...sticky(60, 30, 'Desk'), ...sticky(262, 62, 'Stool', '#b5e48c')),
            ],
            uses: ['arrange'],
        },
    ],

    text: [
        {
            id: 'event-poster-headline',
            title: 'Concert poster headline',
            brief: 'Big, punchy type that reads from across the street.',
            icon: 'font',
            steps: [
                s('In Text, add a heading and type the band name', 'Text › Heading', [160, 80]),
                s(
                    'Make it UPPERCASE and widen the letter spacing',
                    'Text › UPPERCASE · Letter spacing',
                ),
                s(
                    'Add an outline and a soft shadow so it stands off the background',
                    'Text › Outline · Shadow',
                ),
                s(
                    'Add a subheading for the date and apply a Font Template for a matching pair',
                    'Font Templates',
                    [160, 112],
                ),
            ],
            result: 'A poster title with clear hierarchy that you can read from afar.',
            scene: [
                ...at(
                    0,
                    rect(6, 6, 308, 168, {
                        grad: { from: '#3a0ca3', to: '#f72585', angle: 90 },
                        rx: 4,
                    }),
                ),
                ...during(
                    0,
                    1,
                    text(160, 86, 'the wild ones', {
                        size: 30,
                        weight: 800,
                        fill: '#ffffff',
                        anchor: 'middle',
                    }),
                ),
                ...during(
                    1,
                    2,
                    text(160, 86, 'THE WILD ONES', {
                        size: 26,
                        weight: 800,
                        fill: '#ffffff',
                        anchor: 'middle',
                        spacing: 3,
                    }),
                ),
                ...at(
                    2,
                    text(160, 86, 'THE WILD ONES', {
                        size: 26,
                        weight: 800,
                        fill: '#ffffff',
                        stroke: '#ffbe0b',
                        w: 1.2,
                        anchor: 'middle',
                        spacing: 3,
                        shadow: true,
                    }),
                ),
                ...at(
                    3,
                    text(160, 114, 'FRI 14 MARCH · 9 PM', {
                        size: 11,
                        weight: 600,
                        fill: '#ffbe0b',
                        anchor: 'middle',
                        spacing: 1.5,
                    }),
                ),
            ],
            uses: ['font-templates'],
        },
        {
            id: 'quote-sticker',
            title: 'Quote sticker',
            brief: 'A short quote styled like a laptop sticker.',
            icon: 'highlighter',
            steps: [
                s('Add body text and type the quote', 'Text › Body text', [160, 90]),
                s('Add a bright highlight behind the words', 'Text › Highlight'),
                s('Set the line height tighter so the lines hug', 'Text › Line height'),
                s('Rotate it slightly with the rotate handle', 'Rotate handle', [214, 58]),
            ],
            result: 'A playful quote you can export with a transparent background.',
            scene: [
                ...during(
                    1,
                    2,
                    rect(96, 66, 128, 20, { fill: '#fde047' }),
                    rect(104, 92, 112, 20, { fill: '#fde047' }),
                ),
                ...during(
                    0,
                    2,
                    text(160, 81, 'Done is better', {
                        fill: ON_LIGHT,
                        size: 17,
                        weight: 800,
                        anchor: 'middle',
                    }),
                    text(160, 107, 'than perfect', {
                        fill: ON_LIGHT,
                        size: 17,
                        weight: 800,
                        anchor: 'middle',
                    }),
                ),
                ...during(
                    2,
                    3,
                    rect(96, 70, 128, 19, { fill: '#fde047' }),
                    rect(104, 90, 112, 19, { fill: '#fde047' }),
                    text(160, 84, 'Done is better', {
                        fill: ON_LIGHT,
                        size: 17,
                        weight: 800,
                        anchor: 'middle',
                    }),
                    text(160, 104, 'than perfect', {
                        fill: ON_LIGHT,
                        size: 17,
                        weight: 800,
                        anchor: 'middle',
                    }),
                ),
                ...at(
                    3,
                    rect(96, 70, 128, 19, { fill: '#fde047', rot: -6 }),
                    rect(104, 90, 112, 19, { fill: '#fde047', rot: -6 }),
                    text(160, 84, 'Done is better', {
                        fill: ON_LIGHT,
                        size: 17,
                        weight: 800,
                        anchor: 'middle',
                        rot: -6,
                    }),
                    text(160, 104, 'than perfect', {
                        fill: ON_LIGHT,
                        size: 17,
                        weight: 800,
                        anchor: 'middle',
                        rot: -6,
                    }),
                ),
            ],
            uses: ['export'],
        },
    ],

    color: [
        {
            id: 'palette-from-photo',
            title: 'Brand colors from a photo',
            brief: 'Pull a palette for a hiking brand out of a mountain photo.',
            icon: 'eye-dropper',
            steps: [
                s('Press `mod+O` and bring the photo onto the page', '`mod+O`'),
                s('Add four Circles in a row next to it', 'Shapes › Circle', [296, 90]),
                s(
                    'Select a circle, open Custom color, click its eyedropper (in browsers that support it) and click a color in the photo',
                    'Custom color › Eyedropper',
                    [121, 66],
                ),
                s(
                    'Repeat for each circle. Recent colors keeps them all within reach',
                    'Palette › Recent colors',
                    [86, 140],
                ),
            ],
            result: 'A palette that matches the photo, ready for the rest of the brand.',
            scene: [
                ...at(0, photo(20, 30, 140, 120)),
                ...during(1, 2, circle(200, 90, 13, { fill: '#e5e7eb', stroke: 'ink', w: 1 })),
                ...during(
                    1,
                    3,
                    ...[232, 264, 296].map((x) =>
                        circle(x, 90, 13, { fill: '#e5e7eb', stroke: 'ink', w: 1 }),
                    ),
                ),
                ...at(2, circle(200, 90, 13, { fill: '#ffd166', stroke: 'ink', w: 1 })),
                ...at(
                    3,
                    ...[
                        ['#8ec5ff', 232],
                        ['#5b8c5a', 264],
                        ['#2f5d3a', 296],
                    ].map(([c, x]) =>
                        circle(x as number, 90, 13, { fill: c as string, stroke: 'ink', w: 1 }),
                    ),
                ),
            ],
            uses: ['shapes', 'fill-shadow'],
        },
    ],

    pages: [
        {
            id: 'storyboard',
            title: 'Video storyboard',
            brief: 'One page per shot, so the crew knows what to film.',
            icon: 'file-lines',
            steps: [
                s(
                    'Set up the first page with a frame and a caption box',
                    'Shapes · Text',
                    [60, 60],
                ),
                s(
                    'Duplicate the page for each shot, so the layout stays the same',
                    'Pages › Duplicate',
                ),
                s(
                    'Sketch each shot with the Pencil and rename the page after it',
                    'Pencil (`shift+P`)',
                    [160, 60],
                ),
                s(
                    'Drag thumbnails to reorder shots and flip through with `Page Down`',
                    'Pages › drag a thumbnail',
                    [210, 22],
                ),
            ],
            result: 'A storyboard in one project, each shot on its own page with its own undo.',
            scene: [
                ...at(
                    0,
                    rect(15, 30, 90, 60, { fill: 'page', stroke: 'ink', w: 1.2 }),
                    rect(15, 96, 90, 20, { stroke: 'line', w: 1, dash: '3 2' }),
                    text(60, 110, 'Shot 1', { size: 8, anchor: 'middle', fill: 'muted' }),
                ),
                ...at(
                    1,
                    ...[115, 215].flatMap((x, i) => [
                        rect(x, 30, 90, 60, { fill: 'page', stroke: 'ink', w: 1.2 }),
                        rect(x, 96, 90, 20, { stroke: 'line', w: 1, dash: '3 2' }),
                        text(x + 45, 110, `Shot ${i + 2}`, {
                            size: 8,
                            anchor: 'middle',
                            fill: 'muted',
                        }),
                    ]),
                ),
                ...at(
                    2,
                    path(
                        'M50 80 V62 M50 62 L42 72 M50 62 L58 72 M50 80 L44 88 M50 80 L56 88 M76 50 H100',
                        { stroke: 'ink', w: 1.4, draw: true },
                    ),
                    circle(50, 56, 5, { stroke: 'ink', w: 1.4 }),
                    path('M130 74 H190 V64 L180 54 H145 L135 64 H130Z M145 54 V64 M180 64 H135', {
                        stroke: 'ink',
                        w: 1.4,
                        draw: true,
                    }),
                    circle(146, 78, 5, { stroke: 'ink', w: 1.4 }),
                    circle(176, 78, 5, { stroke: 'ink', w: 1.4 }),
                    path('M235 84 V58 L260 40 L285 58 V84Z M254 84 V68 H266 V84', {
                        stroke: 'ink',
                        w: 1.4,
                        draw: true,
                    }),
                    text(15, 136, 'Wake up', { size: 9, weight: 700 }),
                    text(115, 136, 'Drive', { size: 9, weight: 700 }),
                    text(215, 136, 'Arrive', { size: 9, weight: 700 }),
                ),
                ...at(
                    3,
                    path('M260 26 Q210 4 160 26 M166 20 L160 26 L168 28', {
                        stroke: 'accent',
                        w: 2,
                        draw: true,
                    }),
                ),
            ],
            uses: ['pencil'],
        },
    ],

    layers: [
        {
            id: 'landscape-illustration',
            title: 'Layered landscape illustration',
            brief: 'Sky, hills and a sun you can rework without disturbing the rest.',
            icon: 'layer-group',
            steps: [
                s(
                    'Draw the sky, then the sun, the far hills and the near hills',
                    'Draw · Shapes',
                    [110, 110],
                ),
                s('Rename each layer (`F2`) so you can find it later', '`F2`', [262, 62]),
                s('Lock the sky so you cannot drag it by mistake', 'Layers › padlock', [296, 128]),
                s(
                    'Set the far hills to a lower opacity so they look misty',
                    'Layers › Opacity',
                    [262, 106],
                ),
                s(
                    'Right-click > Show only this layer to touch up the sun alone',
                    'Right-click › Show only this layer',
                    [262, 40],
                ),
            ],
            result: 'An illustration whose parts you can still find, hide and edit separately.',
            scene: [
                ...during(
                    0,
                    4,
                    rect(14, 14, 200, 152, { grad: { from: '#a2d2ff', to: '#ffc8dd', angle: 90 } }),
                ),
                ...at(
                    5,
                    rect(14, 14, 200, 152, { grad: { from: '#a2d2ff', to: '#ffc8dd', angle: 90 } }),
                ),
                ...at(0, circle(150, 70, 22, { fill: '#ffb703' })),
                ...during(
                    0,
                    3,
                    path('M14 120 Q70 70 120 110 T214 100 V166 H14Z', { fill: '#74c69d' }),
                ),
                ...during(
                    3,
                    4,
                    path('M14 120 Q70 70 120 110 T214 100 V166 H14Z', {
                        fill: '#74c69d',
                        op: 0.45,
                    }),
                ),
                ...at(
                    5,
                    path('M14 120 Q70 70 120 110 T214 100 V166 H14Z', {
                        fill: '#74c69d',
                        op: 0.45,
                    }),
                ),
                ...during(
                    0,
                    4,
                    path('M14 140 Q90 110 150 140 T214 135 V166 H14Z', { fill: '#2d6a4f' }),
                ),
                ...at(5, path('M14 140 Q90 110 150 140 T214 135 V166 H14Z', { fill: '#2d6a4f' })),
                ...at(
                    0,
                    rect(222, 14, 86, 152, { fill: 'page', stroke: 'line', w: 1, rx: 4 }),
                    text(230, 28, 'Layers', { size: 9, weight: 700 }),
                ),
                ...during(
                    0,
                    1,
                    ...['Path 4', 'Path 3', 'Path 2', 'Rect 1'].map((n, i) =>
                        text(232, 44 + i * 22, n, { size: 9, fill: 'muted' }),
                    ),
                ),
                ...at(
                    1,
                    ...['Sun', 'Near hills', 'Far hills', 'Sky'].map((n, i) =>
                        text(232, 44 + i * 22, n, { size: 9 }),
                    ),
                ),
                ...during(4, 5, rect(226, 34, 78, 16, { fill: 'primary', op: 0.15, rx: 3 })),
                ...at(
                    2,
                    rect(291, 103, 9, 7, { fill: 'ink', rx: 1 }),
                    path('M293 103 V100 A2.5 2.5 0 0 1 298 100 V103', { stroke: 'ink', w: 1.2 }),
                ),
                ...at(
                    3,
                    text(300, 92, '45%', { size: 8, anchor: 'end', fill: 'primary', weight: 700 }),
                ),
            ],
            uses: ['arrange', 'draw'],
        },
    ],

    templates: [
        {
            id: 'instagram-post',
            title: 'Instagram post in five minutes',
            brief: 'A good-looking post for a sale, without starting from scratch.',
            icon: 'instagram',
            steps: [
                s('Open Templates and filter by size', 'Templates › Size'),
                s('Preview a few and apply the one you like', 'Templates › Apply', [118, 54]),
                s(
                    'Double-click the text to write your own offer',
                    'Double-click the text',
                    [160, 80],
                ),
                s('Change the colors to match the shop', 'Palette'),
                s('Export with the Instagram size preset', 'Export › Instagram'),
            ],
            result: 'A finished post, sized right, with your words and colors.',
            scene: [
                ...during(
                    0,
                    1,
                    rect(20, 24, 64, 64, { grad: { from: '#ffafcc', to: '#cdb4db' }, rx: 4 }),
                    rect(92, 24, 64, 64, { grad: { from: '#ffd166', to: '#ef476f' }, rx: 4 }),
                    rect(164, 24, 64, 64, { grad: { from: '#06d6a0', to: '#118ab2' }, rx: 4 }),
                    rect(236, 24, 64, 64, { grad: { from: '#e9edc9', to: '#ccd5ae' }, rx: 4 }),
                    rect(20, 96, 64, 64, { grad: { from: '#bde0fe', to: '#a2d2ff' }, rx: 4 }),
                    rect(92, 96, 64, 64, { grad: { from: '#f1faee', to: '#a8dadc' }, rx: 4 }),
                    rect(88, 20, 72, 72, { stroke: 'primary', w: 2.5, rx: 6 }),
                ),
                ...during(
                    1,
                    3,
                    rect(85, 15, 150, 150, { grad: { from: '#ffd166', to: '#ef476f' }, rx: 4 }),
                ),
                ...at(
                    3,
                    rect(85, 15, 150, 150, { grad: { from: '#90e0ef', to: '#0077b6' }, rx: 4 }),
                ),
                ...during(
                    1,
                    2,
                    text(160, 86, 'Your title here', {
                        size: 16,
                        weight: 800,
                        anchor: 'middle',
                        fill: '#ffffff',
                    }),
                ),
                ...at(
                    2,
                    text(160, 82, 'SUMMER SALE', {
                        size: 20,
                        weight: 800,
                        anchor: 'middle',
                        fill: '#ffffff',
                    }),
                    text(160, 104, '30% off everything', {
                        size: 11,
                        anchor: 'middle',
                        fill: '#ffffff',
                    }),
                ),
                ...at(
                    1,
                    rect(125, 124, 70, 20, { fill: '#ffffff', rx: 10 }),
                    text(160, 138, 'Shop now', {
                        size: 9,
                        weight: 700,
                        anchor: 'middle',
                        fill: '#0f1b2d',
                    }),
                ),
                ...at(4, ...badge(232, 150, '↓ Instagram')),
            ],
            uses: ['export', 'text'],
        },
    ],

    'font-templates': [
        {
            id: 'deck-typography',
            title: 'Same fonts on every slide',
            brief: 'Keep a pitch deck looking like one designer made it.',
            icon: 'text-height',
            steps: [
                s('Style the title on the first page the way you like it', 'Text', [58, 58]),
                s('Select it and save it as a font template', 'Font Templates › Save'),
                s(
                    'On every other page, select the title and apply that template',
                    'Font Templates › your template',
                    [160, 58],
                ),
                s('Turn on Also change font size so the sizes match too', 'Also change font size'),
            ],
            result: 'A deck with consistent type, without copying settings by hand.',
            scene: [
                ...at(
                    0,
                    ...[14, 116, 218].map((x) =>
                        rect(x, 34, 88, 60, {
                            fill: 'page',
                            stroke: 'line',
                            w: 1,
                            rx: 3,
                            shadow: true,
                        }),
                    ),
                ),
                ...at(
                    0,
                    text(22, 62, 'Our plan', {
                        size: 15,
                        weight: 700,
                        font: 'serif',
                        fill: 'primary',
                    }),
                    path('M22 74 H80 M22 82 H70', { stroke: 'line', w: 2 }),
                ),
                ...during(
                    0,
                    2,
                    text(124, 62, 'Market', { size: 13, font: 'script' }),
                    text(226, 60, 'TEAM', { size: 10, weight: 800 }),
                ),
                ...[124, 226].flatMap((x) =>
                    at(
                        0,
                        path(`M${x} 74 H${x + 58} M${x} 82 H${x + 48}`, { stroke: 'line', w: 2 }),
                    ),
                ),
                ...at(1, ...badge(14, 104, '★ Saved: Title')),
                ...during(
                    2,
                    3,
                    text(124, 60, 'Market', {
                        size: 10,
                        weight: 700,
                        font: 'serif',
                        fill: 'primary',
                    }),
                    text(226, 60, 'Team', {
                        size: 10,
                        weight: 700,
                        font: 'serif',
                        fill: 'primary',
                    }),
                ),
                ...at(
                    3,
                    text(124, 62, 'Market', {
                        size: 15,
                        weight: 700,
                        font: 'serif',
                        fill: 'primary',
                    }),
                    text(226, 62, 'Team', {
                        size: 15,
                        weight: 700,
                        font: 'serif',
                        fill: 'primary',
                    }),
                ),
            ],
            uses: ['text', 'pages'],
        },
    ],

    arrange: [
        {
            id: 'pricing-cards',
            title: 'Three-column pricing table',
            brief: 'Basic, Pro and Team plans, perfectly lined up.',
            icon: 'align-objects-center',
            steps: [
                s(
                    'Build the first card, select its pieces and group them (`mod+G`)',
                    '`mod+G`',
                    [60, 95],
                ),
                s('Duplicate it twice and change the plan names and prices', '`mod+D`', [155, 110]),
                s('Select all three cards and align top', 'Top bar › Align top'),
                s('Distribute them so the gaps are equal', 'Top bar › Distribute'),
                s(
                    'Add a background, send it to the back (`mod+shift+↓`) and lock it (`mod+L`)',
                    '`mod+shift+↓` · `mod+L`',
                ),
            ],
            result: 'A pricing table with exact spacing that will not shift while you edit.',
            scene: [
                ...at(4, rect(10, 18, 300, 144, { fill: '#e0f0ff', rx: 8 })),
                ...during(0, 2, ...card(20, 40, 'BASIC', '$5', '#adb5bd')),
                ...at(2, ...card(20, 30, 'BASIC', '$5', '#adb5bd')),
                ...during(0, 1, rect(16, 36, 88, 118, SELECT)),
                ...during(
                    1,
                    2,
                    ...card(115, 55, 'PRO', '$12', '#0a60d6'),
                    ...card(215, 40, 'TEAM', '$30', '#ff7f0e'),
                ),
                ...during(
                    2,
                    3,
                    ...card(105, 30, 'PRO', '$12', '#0a60d6'),
                    ...card(215, 30, 'TEAM', '$30', '#ff7f0e'),
                ),
                ...at(
                    3,
                    ...card(120, 30, 'PRO', '$12', '#0a60d6'),
                    ...card(220, 30, 'TEAM', '$30', '#ff7f0e'),
                ),
                ...at(
                    4,
                    rect(291, 147, 9, 7, { fill: 'ink', rx: 1 }),
                    path('M293 147 V144 A2.5 2.5 0 0 1 298 144 V147', { stroke: 'ink', w: 1.2 }),
                ),
            ],
            uses: ['select', 'layers'],
        },
        {
            id: 'graph-paper-worksheet',
            title: 'Graph-paper math worksheet',
            brief: 'A math worksheet where every shape lands neatly on the grid.',
            icon: 'magnet',
            steps: [
                s(
                    "Press `mod+'` to show the grid and pick graph from the arrow next to it",
                    "`mod+'` · Grid ▾ › Graph",
                ),
                s('Press `mod+;` so shapes snap to the grid', '`mod+;`', [108, 122]),
                s(
                    'Place triangles and rectangles for the questions: their corners land on grid lines',
                    'Shapes',
                    [222, 114],
                ),
                s(
                    'Hold `alt` while dragging the odd label you want off the grid',
                    '`alt` + drag',
                    [120, 40],
                ),
            ],
            result: 'A tidy worksheet where every corner sits on a grid line. The grid only guides you on screen: it is not exported.',
            scene: [
                ...during(
                    0,
                    4,
                    ...times(26, (i) =>
                        path(`M${6 + i * 12} 6 V174`, { stroke: 'line', w: i % 5 ? 0.4 : 1 }),
                    ),
                    ...times(15, (i) =>
                        path(`M6 ${6 + i * 12} H314`, { stroke: 'line', w: i % 5 ? 0.4 : 1 }),
                    ),
                ),
                ...during(
                    1,
                    2,
                    path('M50 120 L108 123 L52 63Z', { stroke: 'primary', w: 2, dash: '4 3' }),
                ),
                ...at(
                    2,
                    path('M54 126 L114 126 L54 66Z', {
                        fill: '#0a60d61f',
                        stroke: 'primary',
                        w: 2,
                    }),
                    rect(150, 66, 72, 48, { fill: '#ff7f0e1f', stroke: 'accent', w: 2 }),
                ),
                ...at(3, text(57, 43, 'Q1. Find the area', { size: 11, weight: 700 })),
            ],
            uses: ['shapes', 'export'],
        },
    ],

    clones: [
        {
            id: 'ui-buttons',
            title: 'Restyle every button at once',
            brief: 'An app mock-up with buttons that must all match.',
            icon: 'link',
            steps: [
                s('Make one button and press `alt+D` for each copy you need', '`alt+D`', [90, 53]),
                s('Move the copies into place: each keeps its own position', 'Drag', [220, 133]),
                s('Change the color of any one, and every copy follows', 'Palette', [90, 93]),
                s(
                    'Press `shift+alt+D` on the Cancel button so it can look different',
                    '`shift+alt+D`',
                    [220, 133],
                ),
            ],
            result: 'A mock-up where a new brand color is one click, not twelve.',
            scene: [
                ...during(0, 2, ...button(40, 40, 'Save', '#0a60d6')),
                ...during(
                    1,
                    2,
                    ...button(40, 80, 'Send', '#0a60d6'),
                    ...button(40, 120, 'Share', '#0a60d6'),
                    ...button(170, 40, 'Next', '#0a60d6'),
                    ...button(170, 80, 'Buy', '#0a60d6'),
                ),
                ...during(1, 3, ...button(170, 120, 'Cancel', '#0a60d6')),
                ...at(
                    2,
                    ...button(40, 40, 'Save', '#7b2cbf'),
                    ...button(40, 80, 'Send', '#7b2cbf'),
                    ...button(40, 120, 'Share', '#7b2cbf'),
                    ...button(170, 40, 'Next', '#7b2cbf'),
                    ...button(170, 80, 'Buy', '#7b2cbf'),
                ),
                ...during(2, 3, ...button(170, 120, 'Cancel', '#7b2cbf')),
                ...at(3, ...button(170, 120, 'Cancel', '#8a94a6')),
                ...during(
                    1,
                    3,
                    path('M90 66 V80 M90 106 V120 M140 53 H170 M220 66 V80 M220 106 V120', {
                        stroke: 'primary',
                        w: 1,
                        dash: '2 2',
                    }),
                ),
            ],
            uses: ['select'],
        },
    ],

    boolean: [
        {
            id: 'round-avatar',
            title: 'Round profile picture',
            brief: 'Crop a photo into a circle for a team page.',
            icon: 'mask',
            steps: [
                s('Press `mod+O` and bring the photo onto the page', '`mod+O`'),
                s('Add a Circle on top of the face', 'Shapes › Circle', [160, 80]),
                s(
                    'Select both and open the shape operations menu in the footer',
                    'Footer › Shape ops',
                ),
                s('Choose Mask: the circle clips the photo', 'Shape ops › Mask'),
            ],
            result: 'A round avatar, ready for a team page or a slide.',
            scene: [
                ...during(0, 3, photo(110, 30, 100, 120, 'portrait')),
                ...during(
                    1,
                    3,
                    circle(160, 80, 46, { stroke: 'primary', w: 2, fill: '#0a60d61f' }),
                ),
                ...during(2, 3, rect(104, 24, 112, 132, SELECT)),
                ...at(3, photo(114, 34, 92, 92, 'portrait', { round: true })),
            ],
            uses: ['shapes'],
        },
        {
            id: 'cloud-icon',
            title: 'Weather icon from circles',
            brief: 'Build a cloud icon for a weather app from simple pieces.',
            icon: 'boolean-union',
            steps: [
                s(
                    'Add three overlapping Circles and a Rounded Rectangle along the bottom',
                    'Shapes',
                    [160, 75],
                ),
                s('Select all four and choose Union: one cloud shape', 'Shape ops › Union'),
                s(
                    'Add a small circle over one edge and choose Subtract for a bite. Backwards? Change the stacking order and try again',
                    'Shape ops › Subtract',
                    [222, 92],
                ),
                s('Give the cloud a Linear gradient', 'Fill & Shadow › Linear'),
            ],
            result: 'One clean icon shape, ready to use at any size.',
            scene: [
                ...during(
                    0,
                    1,
                    ...[
                        [120, 104, 26],
                        [160, 82, 36],
                        [200, 104, 26],
                    ].map(([x, y, r]) =>
                        circle(x!, y!, r!, { fill: '#bde0fe', stroke: 'ink', w: 1, op: 0.8 }),
                    ),
                    rect(96, 104, 128, 30, {
                        fill: '#bde0fe',
                        stroke: 'ink',
                        w: 1,
                        rx: 15,
                        op: 0.8,
                    }),
                ),
                ...during(
                    1,
                    3,
                    path(
                        'M111 134 Q96 134 96 118 Q96 100 116 99 Q118 64 155 58 Q188 54 196 82 Q224 80 224 108 Q224 134 206 134 Z',
                        { fill: '#8ecae6', stroke: 'ink', w: 1.5 },
                    ),
                ),
                ...at(
                    3,
                    path(
                        'M111 134 Q96 134 96 118 Q96 100 116 99 Q118 64 155 58 Q188 54 196 82 Q224 80 224 108 Q224 134 206 134 Z',
                        {
                            grad: { from: '#caf0f8', to: '#0096c7', angle: 90 },
                            stroke: '#023e8a',
                            w: 1.5,
                        },
                    ),
                ),
                ...at(2, circle(226, 96, 16, { fill: 'page' })),
            ],
            uses: ['fill-shadow', 'arrange'],
        },
    ],

    'fill-shadow': [
        {
            id: 'app-icon',
            title: 'Glossy app icon',
            brief: 'A modern icon tile for an app store mock-up.',
            icon: 'palette',
            steps: [
                s(
                    'Add a Rounded Rectangle and pick a Linear gradient preset',
                    'Fill & Shadow › Linear · Presets',
                ),
                s(
                    'Turn on Edit on canvas and drag the handles to angle the gradient',
                    'Edit on canvas',
                    [200, 140],
                ),
                s('Click the gradient bar to add a lighter stop near the top', 'Gradient bar'),
                s(
                    'Add a soft shadow with a large blur and a small offset',
                    'Fill & Shadow › Shadow',
                ),
            ],
            result: 'An icon tile with depth, ready for a symbol on top.',
            scene: [
                ...during(
                    0,
                    1,
                    rect(110, 40, 100, 100, {
                        grad: { from: '#4cc9f0', to: '#4361ee', angle: 90 },
                        rx: 24,
                    }),
                ),
                ...during(
                    1,
                    3,
                    rect(110, 40, 100, 100, {
                        grad: { from: '#4cc9f0', to: '#4361ee', angle: 45 },
                        rx: 24,
                    }),
                ),
                ...at(
                    3,
                    rect(110, 40, 100, 100, {
                        grad: { from: '#4cc9f0', to: '#4361ee', angle: 45 },
                        rx: 24,
                        shadow: true,
                    }),
                ),
                ...at(
                    2,
                    path('M124 70 Q124 50 144 50 H176 Q196 50 196 70 Q160 84 124 70Z', {
                        fill: '#ffffff',
                        op: 0.35,
                    }),
                ),
                ...at(0, path(starD(160, 92, 22), { fill: '#ffffff' })),
                ...during(
                    1,
                    2,
                    path('M120 40 L200 140', { stroke: 'ink', w: 1, dash: '3 2' }),
                    circle(120, 40, 4, { fill: '#4cc9f0', stroke: 'ink', w: 1 }),
                    circle(200, 140, 4, { fill: '#4361ee', stroke: 'ink', w: 1 }),
                ),
            ],
            uses: ['shapes'],
        },
        {
            id: 'sunset-background',
            title: 'Sunset sky background',
            brief: 'A warm backdrop for a holiday invitation.',
            icon: 'palette',
            steps: [
                s('Add a Rectangle that covers the page and send it to the back', '`mod+shift+↓`'),
                s(
                    'Choose Radial and move its center near the bottom',
                    'Fill & Shadow › Radial',
                    [160, 160],
                ),
                s('Set orange in the middle and deep purple outside', 'Gradient stops'),
                s(
                    'Add a Sun shape with a glowing shadow in the same orange',
                    'Shapes › Sun',
                    [160, 150],
                ),
            ],
            result: 'A soft sunset to put text and photos on.',
            scene: [
                ...during(0, 1, rect(6, 6, 308, 168, { fill: '#d9d9d9', rx: 4 })),
                ...during(
                    1,
                    2,
                    rect(6, 6, 308, 168, {
                        grad: { from: '#ffffff', to: '#8a8a8a', radial: true },
                        rx: 4,
                    }),
                ),
                ...at(
                    2,
                    rect(6, 6, 308, 168, {
                        grad: { from: '#ff9e00', to: '#3c096c', radial: true },
                        rx: 4,
                    }),
                ),
                ...at(3, circle(160, 150, 24, { fill: '#ffb703', glow: '#ff9e00' })),
                ...during(
                    0,
                    2,
                    text(160, 64, 'See you at sunset', {
                        fill: ON_LIGHT,
                        size: 20,
                        weight: 800,
                        anchor: 'middle',
                    }),
                ),
                ...at(
                    2,
                    text(160, 64, 'See you at sunset', {
                        size: 20,
                        weight: 800,
                        anchor: 'middle',
                        fill: '#ffffff',
                    }),
                ),
            ],
            uses: ['shapes', 'text'],
        },
    ],

    tiling: [
        {
            id: 'gift-wrap',
            title: 'Gift wrap pattern',
            brief: 'A seamless star pattern for a printable gift bag.',
            icon: 'screwdriver-wrench',
            steps: [
                s('Add a Star and give it a gold fill', 'Shapes › Star', [80, 90]),
                s(
                    'In Create Pattern, build a tile from it with a brick offset',
                    'Tiling › Create Pattern · Brick offset',
                ),
                s(
                    'Pick a deep red tile background and name the pattern',
                    'Tiling › Tile background',
                ),
                s(
                    'Apply it to the whole canvas background and adjust scale and angle',
                    'Tiling › Apply to canvas',
                ),
            ],
            result: 'A repeating wrap you can export at 3× for print.',
            scene: [
                ...during(0, 3, star(80, 90, 22)),
                ...during(1, 2, rect(190, 40, 100, 100, { fill: 'page', stroke: 'line', w: 1 })),
                ...during(2, 3, rect(190, 40, 100, 100, { fill: '#9d0208', stroke: 'line', w: 1 })),
                ...during(1, 3, star(215, 65, 10), star(265, 65, 10), star(240, 115, 10)),
                ...at(
                    3,
                    rect(6, 6, 308, 168, { fill: '#9d0208', rx: 4 }),
                    ...times(54, (i) =>
                        star(
                            20 + (i % 9) * 36 + (Math.floor(i / 9) % 2 ? 18 : 0),
                            20 + Math.floor(i / 9) * 30,
                            7,
                        ),
                    ),
                ),
            ],
            uses: ['export'],
        },
        {
            id: 'month-calendar',
            title: 'Month calendar grid',
            brief: 'A wall calendar with the weekends picked out.',
            icon: 'table-cells-large',
            steps: [
                s('Add one Square for a day', 'Shapes › Square', [40, 46]),
                s('Repeat Grid with 7 columns, 5 rows and small gaps', 'Tiling › Repeat Grid'),
                s(
                    'Pick a color rule such as every Nth to tint a column of days',
                    'Tiling › Color rule',
                ),
                s('Add the day numbers with Text', 'Text', [230, 120]),
            ],
            result: 'A calendar page built in a minute instead of 35 copies by hand.',
            scene: [
                ...at(0, text(22, 26, 'MARCH', { size: 12, weight: 800, spacing: 2 })),
                ...at(0, rect(22, 34, 36, 24, { fill: 'page', stroke: 'line', w: 1, rx: 2 })),
                ...at(
                    1,
                    ...times(34, (i) =>
                        rect(22 + ((i + 1) % 7) * 40, 34 + Math.floor((i + 1) / 7) * 28, 36, 24, {
                            fill: 'page',
                            stroke: 'line',
                            w: 1,
                            rx: 2,
                        }),
                    ),
                ),
                ...at(
                    2,
                    ...times(5, (r) =>
                        rect(22 + 6 * 40, 34 + r * 28, 36, 24, {
                            fill: '#ffd6a5',
                            stroke: 'line',
                            w: 1,
                            rx: 2,
                        }),
                    ),
                ),
                ...at(
                    3,
                    ...times(31, (i) =>
                        text(25 + (i % 7) * 40, 43 + Math.floor(i / 7) * 28, String(i + 1), {
                            size: 7,
                            weight: 600,
                            fill: i % 7 === 6 ? ON_LIGHT : 'ink',
                        }),
                    ),
                ),
            ],
            uses: ['text'],
        },
    ],

    rotate: [
        {
            id: 'clock-face',
            title: 'Clock face',
            brief: 'Twelve evenly spaced ticks for a clock illustration.',
            icon: 'rotate',
            steps: [
                s('Add a thin Rectangle for one hour tick', 'Shapes › Rectangle', [160, 32]),
                s(
                    'In Repeat Radially choose Ring with a count of 12, and keep Rotate copies with the ring on',
                    'Rotate › Repeat Radially · Ring',
                ),
                s('Set the pivot distance to the size of your clock', 'Rotate › Pivot distance'),
                s('Add two hands from the center with the Pen', 'Pen (`P`)', [190, 100]),
            ],
            result: 'A perfectly spaced dial, with no angles worked out by hand.',
            scene: [
                ...at(0, circle(160, 90, 70, { fill: 'page', stroke: 'ink', w: 2 })),
                ...during(0, 1, tick(160, 32, 0)),
                ...during(1, 2, ...ring(12, 38, tick)),
                ...at(2, ...ring(12, 58, tick)),
                ...at(
                    3,
                    path('M160 90 L160 52 M160 90 L190 100', { stroke: 'ink', w: 3, draw: true }),
                    circle(160, 90, 4, { fill: 'accent' }),
                ),
            ],
            uses: ['shapes', 'pen'],
        },
        {
            id: 'flower-badge',
            title: 'Flower badge',
            brief: 'A flower or sun burst for a sticker or a logo.',
            icon: 'rotate',
            steps: [
                s('Add an Ellipse for one petal', 'Shapes › Ellipse', [160, 52]),
                s('Repeat Radially with a count of 10', 'Rotate › Repeat Radially'),
                s(
                    'Add a scale step and a little jitter for a hand-made feel',
                    'Rotate › Scale step · Jitter',
                ),
                s('Turn on fade opacity for a soft trail', 'Rotate › Fade opacity'),
            ],
            result: 'A rich round motif made from a single shape.',
            scene: [
                ...during(0, 1, petal(160, 55, 0, 1)),
                ...during(1, 2, ...ring(10, 35, (x, y, d, i) => petal(x, y, d, i))),
                ...during(2, 3, ...ring(10, 35, (x, y, d, i) => petal(x, y, d, i, 1 - i * 0.04))),
                ...at(
                    3,
                    ...ring(10, 35, (x, y, d, i) => petal(x, y, d, i, 1 - i * 0.04, 1 - i * 0.07)),
                ),
                ...at(1, circle(160, 90, 14, { fill: '#ffd166', stroke: '#c9184a', w: 1 })),
            ],
            uses: ['shapes'],
        },
    ],

    'along-path': [
        {
            id: 'treasure-map',
            title: 'Treasure map footsteps',
            brief: 'A trail of footprints across a map for a kids party invite.',
            icon: 'bezier-curve',
            steps: [
                s(
                    'Draw the route with the Pen (`P`) and press Use selection as path',
                    'Along Path › Use selection as path',
                    [290, 40],
                ),
                s('Select a small Ellipse to use as a footprint', 'Shapes › Ellipse', [60, 120]),
                s(
                    'Turn on side offset and alternate sides so the steps go left, right, left',
                    'Along Path › Alternate sides',
                ),
                s('Scale from small to large, so the trail grows as it goes', 'Along Path › Scale'),
                s('Remove the path afterwards and keep only the steps', 'Remove the path'),
            ],
            result: 'A winding trail of footprints that follows your route exactly.',
            scene: [
                ...at(
                    0,
                    rect(6, 6, 308, 168, { fill: '#f4e1b6', rx: 4 }),
                    path('M240 120 Q260 96 290 110 Q300 140 270 150 Q240 150 240 120Z', {
                        fill: '#a7c957',
                    }),
                    text(290, 46, '✕', {
                        size: 18,
                        weight: 800,
                        fill: '#d00000',
                        anchor: 'middle',
                    }),
                ),
                ...during(
                    0,
                    4,
                    path('M30 150 C110 175 150 15 290 40', {
                        stroke: '#8d6e63',
                        w: 1.5,
                        dash: '4 3',
                    }),
                ),
                ...during(1, 2, ellipse(60, 120, 3, 5, { fill: '#5d4037' })),
                ...during(2, 3, ...footprints(false)),
                ...at(3, ...footprints(true)),
            ],
            uses: ['pen'],
        },
        {
            id: 'certificate-border',
            title: 'Certificate border',
            brief: 'A decorated border of stars around an award.',
            icon: 'star',
            steps: [
                s(
                    'Draw a closed frame with the Pen and use it as the path',
                    'Pen (`P`) › Use selection as path',
                    [30, 25],
                ),
                s('Select a small Star', 'Shapes › Star', [160, 130]),
                s(
                    'Choose fixed spacing so the stars are evenly apart',
                    'Along Path › Fixed spacing',
                ),
                s('Group the result so the border moves as one', '`mod+G`'),
            ],
            result: 'An even, decorative frame that fits your page.',
            scene: [
                ...at(
                    0,
                    path('M30 25 H290 V155 H30 Z', { stroke: 'line', w: 1, draw: true }),
                    text(160, 78, 'Certificate of Award', {
                        size: 16,
                        font: 'serif',
                        weight: 700,
                        anchor: 'middle',
                    }),
                    text(160, 108, 'for Maya', {
                        size: 22,
                        font: 'script',
                        anchor: 'middle',
                        fill: 'primary',
                    }),
                ),
                ...during(1, 2, star(160, 130, 7)),
                ...at(2, ...perimeterStars()),
                ...during(3, 4, rect(20, 15, 280, 150, SELECT)),
            ],
            uses: ['pen'],
        },
    ],

    filters: [
        {
            id: 'vintage-postcard',
            title: 'Vintage postcard',
            brief: 'Turn a holiday photo into an old-style postcard.',
            icon: 'sliders',
            steps: [
                s('Press `mod+O` and bring the photo onto the page', '`mod+O`'),
                s(
                    'Apply the Vintage preset and lower the intensity a little',
                    'Filters › Vintage · Intensity',
                ),
                s('Add some noise and fade for an old print feel', 'Filters › Noise · Fade'),
                s('Hold the compare button to see the original', 'Hold Compare'),
                s('Add "Greetings from…" text across the top', 'Text', [160, 48]),
            ],
            result: 'A postcard look, while the original photo stays one reset away.',
            scene: [
                ...during(0, 1, photo(40, 20, 240, 140)),
                ...during(
                    1,
                    2,
                    photo(40, 20, 240, 140, 'landscape', {
                        filter: 'sepia(0.6) saturate(0.8) contrast(1.05)',
                    }),
                ),
                ...at(
                    2,
                    photo(40, 20, 240, 140, 'landscape', {
                        filter: 'sepia(0.65) saturate(0.7) contrast(0.88) brightness(1.08)',
                    }),
                ),
                ...during(3, 4, photo(40, 20, 240, 140)),
                ...at(
                    4,
                    text(160, 52, 'Greetings from the hills', {
                        size: 24,
                        font: 'script',
                        fill: '#ffffff',
                        anchor: 'middle',
                        shadow: true,
                    }),
                ),
            ],
            uses: ['text'],
        },
        {
            id: 'duotone-poster',
            title: 'Duotone event poster',
            brief: 'A bold two-color look for a music night.',
            icon: 'image',
            steps: [
                s('Bring in a photo of the artist', '`mod+O`'),
                s('Turn on Duotone and pick two brand colors', 'Filters › Duotone'),
                s('Raise the contrast so the shapes pop', 'Filters › Contrast'),
                s('Add a big UPPERCASE headline on top', 'Text', [160, 150]),
            ],
            result: 'A striking poster from an ordinary photo.',
            scene: [
                ...during(0, 1, photo(90, 15, 140, 150, 'portrait')),
                ...during(
                    1,
                    2,
                    photo(90, 15, 140, 150, 'portrait', {
                        tones: ['#3a0ca3', '#ff8fab'],
                    }),
                ),
                ...at(
                    2,
                    photo(90, 15, 140, 150, 'portrait', {
                        tones: ['#3a0ca3', '#ff8fab'],
                        filter: 'contrast(1.4) saturate(1.2)',
                    }),
                ),
                ...at(
                    3,
                    text(160, 152, 'MUSIC NIGHT', {
                        size: 28,
                        weight: 800,
                        fill: '#ffd60a',
                        anchor: 'middle',
                        shadow: true,
                        spacing: 1,
                    }),
                ),
            ],
            uses: ['text', 'export'],
        },
    ],

    animate: [
        {
            id: 'logo-intro',
            title: 'Animated logo intro',
            brief: 'A three-second intro for a YouTube channel.',
            icon: 'video',
            steps: [
                s(
                    'Select the pieces of your logo and choose an Entrance preset',
                    'Animate › Entrance',
                    [130, 62],
                ),
                s('Set a delay so the pieces arrive one after another', 'Animate › Delay'),
                s(
                    'Add an Emphasis to the name so it pulses once',
                    'Animate › Emphasis',
                    [190, 104],
                ),
                s('Press `Space` to watch it, and `L` to loop', '`Space` · `L`'),
                s(
                    'Export as MP4 (where the browser supports it) at 1080p',
                    'Animate › Export video',
                ),
            ],
            result: 'A short intro video you can drop at the start of every upload.',
            scene: [
                ...at(
                    0,
                    circle(130, 62, 22, { fill: '#4361ee' }),
                    path('M178 40 L208 84 L148 84Z', { fill: '#f72585' }),
                    text(170, 112, 'fate.tv', { size: 18, weight: 800, anchor: 'middle' }),
                ),
                ...during(
                    0,
                    3,
                    circle(96, 62, 22, { fill: '#4361ee', op: 0.15 }),
                    circle(112, 62, 22, { fill: '#4361ee', op: 0.3 }),
                ),
                ...at(0, rect(14, 128, 292, 40, { fill: 'page', stroke: 'line', w: 1, rx: 4 })),
                ...during(
                    0,
                    1,
                    ...[134, 144, 154].map((y) => rect(30, y, 60, 6, { fill: 'primary', rx: 3 })),
                ),
                ...at(
                    1,
                    ...[134, 144, 154].map((y, i) =>
                        rect(30 + i * 30, y, 60, 6, { fill: 'primary', rx: 3 }),
                    ),
                ),
                ...at(2, rect(150, 154, 50, 6, { fill: 'accent', rx: 3 })),
                ...at(3, path('M120 130 V166', { stroke: '#d00000', w: 2 })),
                ...at(4, ...badge(232, 16, '↓ intro.mp4')),
            ],
            uses: ['export'],
        },
        {
            id: 'explainer-steps',
            title: 'Explainer with keyframes',
            brief: 'Show how a parcel travels from shop to door.',
            icon: 'keyframe',
            steps: [
                s('Draw the shop, the van and the house', 'Draw · Shapes', [70, 90]),
                s(
                    'With the timeline focused, press `K` to key the van where it starts, then turn on Auto-key',
                    '`K` · Auto-key',
                    [30, 158],
                ),
                s(
                    'Move the playhead forward and drag the van to the house',
                    'Drag the van',
                    [235, 110],
                ),
                s(
                    'Drag keyframes to slow down or speed up the trip',
                    'Timeline › drag a keyframe',
                    [260, 158],
                ),
                s('Set the work area with `I` and `O` and export only that part', '`I` · `O`'),
            ],
            result: 'A clear little explainer, with every move timed by you.',
            scene: [
                ...at(
                    0,
                    rect(20, 70, 50, 50, { fill: '#ffafcc', stroke: 'ink', w: 1.2 }),
                    path('M16 70 L45 50 L74 70Z', { fill: '#cdb4db', stroke: 'ink', w: 1.2 }),
                    text(45, 100, 'SHOP', {
                        fill: ON_LIGHT,
                        size: 8,
                        weight: 700,
                        anchor: 'middle',
                    }),
                    rect(250, 70, 50, 50, { fill: '#bde0fe', stroke: 'ink', w: 1.2 }),
                    path('M246 70 L275 50 L304 70Z', { fill: '#a2d2ff', stroke: 'ink', w: 1.2 }),
                    rect(268, 96, 14, 24, { fill: '#8d6e63' }),
                    path('M10 124 H310', { stroke: 'line', w: 3 }),
                ),
                ...during(
                    0,
                    2,
                    rect(76, 100, 40, 18, { fill: '#ffd166', stroke: 'ink', w: 1.2, rx: 3 }),
                    circle(86, 120, 4, { fill: 'ink' }),
                    circle(106, 120, 4, { fill: 'ink' }),
                ),
                ...at(
                    2,
                    rect(206, 100, 40, 18, { fill: '#ffd166', stroke: 'ink', w: 1.2, rx: 3 }),
                    circle(216, 120, 4, { fill: 'ink' }),
                    circle(236, 120, 4, { fill: 'ink' }),
                    path('M118 109 H204', { stroke: 'muted', w: 1, dash: '3 3' }),
                ),
                ...at(1, rect(14, 140, 292, 30, { fill: 'page', stroke: 'line', w: 1, rx: 4 })),
                ...at(4, rect(30, 142, 230, 26, { fill: 'primary', op: 0.12 })),
                ...at(1, path('M30 153 L35 158 L30 163 L25 158Z', { fill: 'accent' })),
                ...during(2, 3, path('M200 153 L205 158 L200 163 L195 158Z', { fill: 'accent' })),
                ...at(3, path('M260 153 L265 158 L260 163 L255 158Z', { fill: 'accent' })),
            ],
            uses: ['draw'],
        },
    ],

    export: [
        {
            id: 'youtube-thumbnail',
            title: 'YouTube thumbnail',
            brief: 'Export a thumbnail at the right size and a small file size.',
            icon: 'youtube',
            steps: [
                s('Pick the YouTube size preset', 'Export › YouTube'),
                s('Choose Fill so there are no empty edges', 'Export › Fill'),
                s('Pick JPEG and lower the compression a little', 'Export › JPEG'),
                s('Preview it, name the file and download', 'Export › Download'),
            ],
            result: 'A sharp thumbnail at the size YouTube expects.',
            scene: [
                ...at(0, rect(40, 22, 240, 135, { fill: 'line', op: 0.4 })),
                ...during(
                    0,
                    1,
                    rect(70, 32, 180, 115, { fill: '#ff006e' }),
                    photo(170, 44, 70, 90, 'portrait'),
                    text(80, 80, 'I BUILT', { size: 18, weight: 800, fill: '#ffffff' }),
                    text(80, 102, 'A CABIN', { size: 18, weight: 800, fill: '#ffbe0b' }),
                ),
                ...at(
                    1,
                    rect(40, 22, 240, 135, { fill: '#ff006e' }),
                    photo(170, 30, 100, 124, 'portrait'),
                    text(54, 80, 'I BUILT', { size: 24, weight: 800, fill: '#ffffff' }),
                    text(54, 110, 'A CABIN', { size: 24, weight: 800, fill: '#ffbe0b' }),
                ),
                ...at(0, rect(40, 22, 240, 135, { stroke: 'primary', w: 2 })),
                ...at(2, ...badge(240, 8, 'JPEG')),
                ...at(3, ...badge(160, 160, '↓ cabin-thumbnail.jpg')),
            ],
            uses: ['templates'],
        },
        {
            id: 'transparent-logo',
            title: 'Logo with no background',
            brief: 'A logo you can put on any website or slide.',
            icon: 'file-export',
            steps: [
                s('Choose PNG with a transparent background', 'Export › PNG · Transparent'),
                s('Turn on Crop to content to drop the empty space', 'Export › Crop to content'),
                s('Render at 3× for screens with high resolution', 'Export › Quality 3×'),
                s('Also save an SVG for print: it stays sharp at any size', 'Export › SVG'),
            ],
            result: 'Clean logo files for the web and for print.',
            scene: [
                ...during(0, 1, ...checker(40, 20, 240, 140)),
                ...at(1, ...checker(110, 40, 100, 100)),
                ...at(0, ...mountainBadge(160, 90, 45)),
                ...at(2, ...badge(226, 48, '3×')),
                ...at(3, ...badge(40, 150, '↓ logo.png'), ...badge(220, 150, '↓ logo.svg')),
            ],
            uses: ['pen'],
        },
    ],

    fractals: [
        {
            id: 'snowflake-card',
            title: 'Snowflake card',
            brief: 'A winter greeting card with a crisp vector snowflake.',
            icon: 'snowflake',
            steps: [
                s(
                    'Open Fractals, pick Koch snowflake with Depth 1 and insert it',
                    'Fractals › Insert fractal',
                    [160, 90],
                ),
                s('Delete it, raise Depth to 4 and insert again', 'Fractals › Depth', [160, 90]),
                s('Recolor it light blue', 'Fill & Shadow › Fill', [160, 90]),
            ],
            result: 'A sharp snowflake that scales to any print size.',
            scene: [
                ...at(0, rect(70, 15, 180, 150, { fill: 'page', stroke: 'ink', w: 1 })),
                ...during(0, 1, path(flake(1), { fill: 'ink' })),
                ...during(1, 2, path(flake(4), { fill: 'ink' })),
                ...at(2, path(flake(4), { fill: '#7cc4ff' })),
            ],
            uses: ['fill-shadow'],
        },
    ],

    automata: [
        {
            id: 'rule-90-pattern',
            title: 'Triangle texture',
            brief: 'A geometric background texture grown from Rule 90.',
            icon: 'cellular-automata',
            steps: [
                s(
                    'Open Cellular Automata, keep 1D rule and insert Rule 30',
                    'Cellular Automata › Insert pattern',
                    [160, 90],
                ),
                s(
                    'Delete it, choose Rule 90 and insert again',
                    'Cellular Automata › Rule',
                    [160, 90],
                ),
                s('Add a title on top', 'Text', [160, 160]),
            ],
            result: 'A Sierpinski-style texture made of one vector path.',
            scene: [
                ...during(0, 1, path(cells(30), { fill: 'primary' })),
                ...at(1, path(cells(90), { fill: 'primary' })),
                ...at(2, text(160, 160, 'Fractal week', { fill: 'ink', size: 14 })),
            ],
            uses: ['text'],
        },
    ],

    macro: [
        {
            id: 'stack-of-cards',
            title: 'Stack of cards',
            brief: 'Five offset copies without repeating the same keys five times.',
            icon: 'macro',
            steps: [
                s('Select a card and press Record', 'Macro › Record'),
                s(
                    'Duplicate it once with its shortcut, then Stop recording',
                    'Macro › Stop recording',
                ),
                s('Set Repeat to 4 and press Play macro', 'Macro › Play macro'),
            ],
            result: 'The same steps applied again and again, each one undoable.',
            scene: [
                ...at(0, rect(100, 50, 90, 60, { fill: 'page', stroke: 'ink', w: 2 })),
                ...during(1, 2, rect(110, 60, 90, 60, { fill: 'page', stroke: 'ink', w: 2 })),
                ...at(
                    2,
                    ...times(5, (i) =>
                        rect(100 + i * 10, 50 + i * 10, 90, 60, {
                            fill: 'page',
                            stroke: 'ink',
                            w: 2,
                        }),
                    ),
                ),
            ],
            uses: ['shortcuts'],
        },
    ],

    'top-bar': [
        {
            id: 'exact-layout',
            title: 'Pixel-exact banner layout',
            brief: 'Place a title exactly where a developer asked for it.',
            icon: 'grip-lines',
            steps: [
                s('Select the title', 'Select (`V`)', [140, 70]),
                s('Pick the top-left point in the anchor picker', 'Top bar › Anchor', [270, 30]),
                s('Type X 40 and Y 40 in the top bar', 'Top bar › X · Y'),
                s('Type the W the design asks for, and R 0 to undo any tilt', 'Top bar › W · R'),
            ],
            result: 'A layout that matches the spec number for number.',
            scene: [
                ...at(0, rect(14, 14, 292, 152, { fill: '#e0f0ff', rx: 4 })),
                ...during(
                    0,
                    2,
                    text(150, 82, 'Spring Launch', {
                        fill: ON_LIGHT,
                        size: 20,
                        weight: 800,
                        anchor: 'middle',
                        rot: 4,
                    }),
                ),
                ...during(0, 2, rect(80, 60, 140, 32, SELECT)),
                ...during(2, 3, rect(38, 38, 146, 30, SELECT)),
                ...at(
                    1,
                    rect(256, 22, 34, 34, { fill: 'page', stroke: 'line', w: 1, rx: 3 }),
                    ...times(9, (i) =>
                        circle(263 + (i % 3) * 10, 29 + Math.floor(i / 3) * 10, 2.2, {
                            fill: i ? 'line' : 'primary',
                        }),
                    ),
                ),
                ...during(
                    2,
                    3,
                    text(110, 58, 'Spring Launch', {
                        fill: ON_LIGHT,
                        size: 20,
                        weight: 800,
                        anchor: 'middle',
                        rot: 4,
                    }),
                ),
                ...during(
                    2,
                    4,
                    path('M40 14 V166 M14 40 H306', { stroke: 'accent', w: 1, dash: '3 3' }),
                ),
                ...at(3, text(40, 64, 'Spring Launch', { fill: ON_LIGHT, size: 26, weight: 800 })),
            ],
            uses: ['select'],
        },
    ],

    settings: [
        {
            id: 'printable-a4',
            title: 'Printable A4 handout',
            brief: 'A class handout measured in millimetres.',
            icon: 'gear',
            steps: [
                s(
                    'In Settings > Canvas choose A4 and portrait',
                    'Settings › Canvas › A4 · Portrait',
                ),
                s(
                    'Set Units to mm so the rulers and sizes read in millimetres',
                    'Settings › Units › mm',
                ),
                s(
                    'Draw one line with the Pen, then Repeat Grid it with 1 column and 12 rows for the writing lines',
                    'Pen (`P`) · Tiling › Repeat Grid',
                    [209, 50],
                ),
                s('Export as PNG at 3× for a sharp print', 'Export › PNG · 3×'),
            ],
            result: 'A page laid out at real print size, with writing lines that print (the grid would only show on screen).',
            scene: [
                ...at(
                    0,
                    rect(6, 6, 308, 168, { fill: 'line', op: 0.35, rx: 4 }),
                    rect(103, 12, 113, 160, { fill: 'page', stroke: 'line', w: 1, shadow: true }),
                ),
                ...at(
                    1,
                    rect(103, 12, 113, 9, { fill: 'line', op: 0.6 }),
                    ...times(12, (i) =>
                        path(`M${103 + i * 10} 21 v${i % 5 ? -3 : -6}`, { stroke: 'ink', w: 0.6 }),
                    ),
                    text(212, 19, 'mm', { size: 6, anchor: 'end', fill: 'muted' }),
                ),
                ...at(
                    2,
                    ...times(12, (i) =>
                        path(`M110 ${50 + i * 10} H209`, { stroke: 'muted', w: 0.6, draw: !i }),
                    ),
                    text(110, 38, 'Spelling practice', { size: 9, weight: 700 }),
                ),
                ...at(3, ...badge(236, 150, '↓ PNG 3×')),
            ],
            uses: ['pen', 'tiling', 'export'],
        },
    ],
};

export const examplesFor = (topicId: string): HelpExample[] => HELP_EXAMPLES[topicId] ?? [];

/** The section name search shows for an example. */
export const exampleSectionTitle = (example: HelpExample): string => `Example: ${example.title}`;

/** The `section` address of an example: what a search link to it writes. */
export const exampleSection = (example: HelpExample): string =>
    sectionSlug(exampleSectionTitle(example));

/** Every word of an example, key marks included (tests read it). */
export const exampleText = (example: HelpExample): string =>
    [
        example.title,
        example.brief,
        ...example.steps.flatMap((step) => [step.text, step.ui ?? '']),
        example.result,
    ].join('\n');
