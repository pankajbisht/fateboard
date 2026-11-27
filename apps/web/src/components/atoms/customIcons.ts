import { createLucideIcon, type IconNode } from 'lucide-react';

/**
 * Fateboard's own icons, drawn on Lucide's 24 × 24 grid with its stroke style (2 px, round caps / joins,
 * `currentColor`), so they sit next to Lucide icons without looking different and follow the icon size
 * setting. Made with `createLucideIcon`; registered by name in `atoms/Icon.tsx`. Data only (no logic).
 *
 * Use one when no Lucide icon says what the control does (2026-11-16 icon audit, docs/COMPONENTS.md).
 */
const icon = (name: string, node: IconNode) => createLucideIcon(name, node);
type IconPart = IconNode[number];

/** Node tool (A): a curve with square anchors and the hollow "direct selection" arrow. */
export const NodeToolIcon = icon('NodeTool', [
    ['path', { d: 'M4 17C7 10 12 7 19 6', key: 'curve' }],
    ['rect', { x: '2', y: '15', width: '4', height: '4', rx: '0.5', key: 'a1' }],
    ['rect', { x: '17', y: '4', width: '4', height: '4', rx: '0.5', key: 'a2' }],
    ['path', { d: 'm12 12 8.5 3-3.6 1.4L15.5 20z', key: 'arrow' }],
]);

/** Laser pointer (K): a pointer stick and a glowing dot with rays. */
export const LaserPointerIcon = icon('LaserPointer', [
    ['path', { d: 'm3 21 8.5-8.5', key: 'stick' }],
    ['circle', { cx: '15', cy: '9', r: '2.5', key: 'dot' }],
    ['path', { d: 'M15 2.5V4', key: 'r1' }],
    ['path', { d: 'M21.5 9H20', key: 'r2' }],
    ['path', { d: 'm19.6 4.4-1.1 1.1', key: 'r3' }],
    ['path', { d: 'm19.6 13.6-1.1-1.1', key: 'r4' }],
    ['path', { d: 'm10.4 4.4 1.1 1.1', key: 'r5' }],
]);

/** Tiling tools: a brick-bond tile pattern (was the Settings gear, BUG-208). */
export const TilingIcon = icon('Tiling', [
    ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', key: 'frame' }],
    ['path', { d: 'M3 9h18', key: 'h1' }],
    ['path', { d: 'M3 15h18', key: 'h2' }],
    ['path', { d: 'M9 3v6', key: 'v1' }],
    ['path', { d: 'M15 3v6', key: 'v2' }],
    ['path', { d: 'M12 9v6', key: 'v3' }],
    ['path', { d: 'M9 15v6', key: 'v4' }],
    ['path', { d: 'M15 15v6', key: 'v5' }],
]);

/** Along path: copies placed along a curve (was the Settings gear, BUG-208). */
export const AlongPathIcon = icon('AlongPath', [
    ['path', { d: 'M2 19C6 19 7 6 12 6s6 13 10 13', key: 'curve', strokeDasharray: '2 3' }],
    ['rect', { x: '3.5', y: '13.5', width: '4', height: '4', rx: '1', key: 'c1' }],
    ['rect', { x: '10', y: '4', width: '4', height: '4', rx: '1', key: 'c2' }],
    ['rect', { x: '16.5', y: '13.5', width: '4', height: '4', rx: '1', key: 'c3' }],
]);

/** Node editor "Close path": a closed outline with its join node. */
export const PathCloseIcon = icon('PathClose', [
    ['circle', { cx: '12', cy: '13', r: '7', key: 'loop' }],
    ['rect', { x: '10', y: '4', width: '4', height: '4', rx: '0.5', key: 'node' }],
]);

/** Node editor "Open path": the outline with a gap between two end nodes. */
export const PathOpenIcon = icon('PathOpen', [
    ['path', { d: 'M8.5 6.94A7 7 0 1 0 15.5 6.94', key: 'arc' }],
    ['rect', { x: '6.5', y: '4.94', width: '4', height: '4', rx: '0.5', key: 'n1' }],
    ['rect', { x: '13.5', y: '4.94', width: '4', height: '4', rx: '0.5', key: 'n2' }],
]);

/** Brush settings (Help 'Draw' topic): a stroke above a slider. */
export const BrushSettingsIcon = icon('BrushSettings', [
    ['path', { d: 'M3 9c3-5 5 3 8-1s5-5 9 0', key: 'stroke' }],
    ['path', { d: 'M3 17h4', key: 't1' }],
    ['path', { d: 'M13 17h8', key: 't2' }],
    ['circle', { cx: '10', cy: '17', r: '2.5', key: 'knob' }],
]);

/** Drafter tool: a drafting-machine head, two square blades with ticks and a protractor arc. */
export const DrafterIcon = icon('Drafter', [
    ['path', { d: 'M4 4v16h16', key: 'blades' }],
    ['path', { d: 'M4 8h2M4 12h2M4 16h2M8 20v-2M12 20v-2M16 20v-2', key: 'ticks' }],
    ['path', { d: 'M4 11a9 9 0 0 1 9 9', key: 'arc' }],
    ['path', { d: 'm4 20 7.5-7.5', key: 'arm' }],
]);

/** Copy spray (Shift + S): a spray can whose nozzle scatters copies of one shape (squares). */
export const CopySprayIcon = icon('CopySpray', [
    ['rect', { x: '3', y: '11', width: '7', height: '10', rx: '1.5', key: 'can' }],
    ['path', { d: 'M5 11V8h3v3M8 9h2', key: 'nozzle' }],
    ['rect', { x: '13', y: '3', width: '4', height: '4', rx: '0.5', key: 'c1' }],
    [
        'rect',
        {
            x: '18',
            y: '9',
            width: '3.5',
            height: '3.5',
            rx: '0.5',
            transform: 'rotate(20 19.75 10.75)',
            key: 'c2',
        },
    ],
    [
        'rect',
        {
            x: '13',
            y: '14',
            width: '4',
            height: '4',
            rx: '0.5',
            transform: 'rotate(-15 15 16)',
            key: 'c3',
        },
    ],
]);

/** Mirror symmetry: a dashed axis between two mirrored strokes. */
export const SymmetryIcon = icon('Symmetry', [
    ['path', { d: 'M12 2v3M12 9.5v5M12 19v3', key: 'axis' }],
    ['path', { d: 'M9 4C5 6 3 10 5 14s4 5 4 6', key: 'left' }],
    ['path', { d: 'M15 4c4 2 6 6 4 10s-4 5-4 6', key: 'right' }],
]);

const PETAL = 'M12 10.5C10 7 10.5 4 12 2.5c1.5 1.5 2 4.5 0 8';
/** Rotational symmetry: one stroke repeated three times around a centre. */
export const SymmetryRadialIcon = icon('SymmetryRadial', [
    ['circle', { cx: '12', cy: '12', r: '1.5', key: 'c' }],
    ['path', { d: PETAL, key: 'p1' }],
    ['path', { d: PETAL, transform: 'rotate(120 12 12)', key: 'p2' }],
    ['path', { d: PETAL, transform: 'rotate(240 12 12)', key: 'p3' }],
]);

/** Point symmetry: a stroke and its copy turned 180° about a centre point. */
export const SymmetryPointIcon = icon('SymmetryPoint', [
    ['circle', { cx: '12', cy: '12', r: '1.5', key: 'c' }],
    ['path', { d: 'M4 4c4 0 6 2 6 5', key: 'a' }],
    ['path', { d: 'M20 20c-4 0-6-2-6-5', key: 'b' }],
]);

/** Kaleidoscope (mirror + rotation): four mirrored petals. */
export const KaleidoscopeIcon = icon('Kaleidoscope', [
    ['circle', { cx: '12', cy: '12', r: '9.5', key: 'ring', strokeDasharray: '2 2.5' }],
    ['path', { d: 'M12 12 9 6c1-2 5-2 6 0z', key: 'p1' }],
    ['path', { d: 'M12 12 9 6c1-2 5-2 6 0z', transform: 'rotate(90 12 12)', key: 'p2' }],
    ['path', { d: 'M12 12 9 6c1-2 5-2 6 0z', transform: 'rotate(180 12 12)', key: 'p3' }],
    ['path', { d: 'M12 12 9 6c1-2 5-2 6 0z', transform: 'rotate(270 12 12)', key: 'p4' }],
]);

/** Colour wheel view of the colour picker: a ring of hue sectors around a centre. */
export const ColorWheelIcon = icon('ColorWheel', [
    ['circle', { cx: '12', cy: '12', r: '10', key: 'outer' }],
    ['circle', { cx: '12', cy: '12', r: '3', key: 'inner' }],
    ['path', { d: 'M12 2v7M12 15v7', key: 's1' }],
    ['path', { d: 'm3.34 7 6.06 3.5M14.6 13.5l6.06 3.5', key: 's2' }],
    ['path', { d: 'm3.34 17 6.06-3.5M14.6 10.5 20.66 7', key: 's3' }],
]);

/** Manga brushes: a G-pen nib (the dip pen manga is inked with). */
export const GPenIcon = icon('GPen', [
    ['path', { d: 'M12 22 7 12l2-9h6l2 9z', key: 'nib' }],
    ['path', { d: 'M12 22v-8', key: 'slit' }],
    ['circle', { cx: '12', cy: '11.5', r: '1.5', key: 'hole' }],
]);

/** Spray tool settings: a nozzle cone of dots. */
export const SprayPatternIcon = icon('SprayPattern', [
    ['path', { d: 'M3 12h4', key: 'nozzle' }],
    ['circle', { cx: '11', cy: '12', r: '0.5', key: 'd1' }],
    ['circle', { cx: '14', cy: '9', r: '0.5', key: 'd2' }],
    ['circle', { cx: '14', cy: '15', r: '0.5', key: 'd3' }],
    ['circle', { cx: '17', cy: '6', r: '0.5', key: 'd4' }],
    ['circle', { cx: '17.5', cy: '12', r: '0.5', key: 'd5' }],
    ['circle', { cx: '17', cy: '18', r: '0.5', key: 'd6' }],
    ['circle', { cx: '20.5', cy: '8.5', r: '0.5', key: 'd7' }],
    ['circle', { cx: '20.5', cy: '15.5', r: '0.5', key: 'd8' }],
]);

/* ---------------- 2026-11-16 (2): header / footer icons the owner asked to redraw ---------------- */

/* Group / ungroup (2026-11-17 redraw): selection brackets instead of dashed frames, which blur at 16 px. */
const BRACKET_TL: IconPart = ['path', { d: 'M3 7.5V5a2 2 0 0 1 2-2h2.5', key: 'tl' }];
const BRACKET_TR: IconPart = ['path', { d: 'M16.5 3H19a2 2 0 0 1 2 2v2.5', key: 'tr' }];
const BRACKET_BR: IconPart = ['path', { d: 'M21 16.5V19a2 2 0 0 1-2 2h-2.5', key: 'br' }];
const BRACKET_BL: IconPart = ['path', { d: 'M7.5 21H5a2 2 0 0 1-2-2v-2.5', key: 'bl' }];

/** Group: a rectangle and a circle inside one set of selection brackets. */
export const GroupObjectsIcon = icon('GroupObjects', [
    BRACKET_TL,
    BRACKET_TR,
    BRACKET_BR,
    BRACKET_BL,
    ['rect', { x: '6.5', y: '6.5', width: '6', height: '6', rx: '1', key: 'a' }],
    ['circle', { cx: '15.5', cy: '15.5', r: '2.5', key: 'b' }],
]);

/** Ungroup: the same shapes pulled out into the corners, the brackets broken open. */
export const UngroupObjectsIcon = icon('UngroupObjects', [
    BRACKET_TR,
    BRACKET_BL,
    ['rect', { x: '3', y: '3', width: '7', height: '7', rx: '1.5', key: 'a' }],
    ['circle', { cx: '17.5', cy: '17.5', r: '3.5', key: 'b' }],
]);

/* Boolean operations: two overlapping circles, the result shaded (Venn diagrams). Circles r 6 at x 9 / 15; they
   cross at (12, 6.8) and (12, 17.2). */
const LEFT = 'M9 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12';
const RIGHT = 'M15 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12';
const UNION = 'M12 6.8A6 6 0 1 0 12 17.2A6 6 0 1 0 12 6.8Z';
const LENS = 'M12 6.8A6 6 0 0 1 12 17.2A6 6 0 0 1 12 6.8Z';
const LEFT_ONLY = 'M12 6.8A6 6 0 1 0 12 17.2A6 6 0 0 1 12 6.8Z';
const SHADE = { fill: 'currentColor', fillOpacity: '0.3', stroke: 'none' };

/** Boolean operations menu: two circles with their overlap shaded. */
export const BooleanIcon = icon('Boolean', [
    ['path', { d: LENS, ...SHADE, key: 'shade' }],
    ['path', { d: LEFT, key: 'l' }],
    ['path', { d: RIGHT, key: 'r' }],
]);
export const BooleanUnionIcon = icon('BooleanUnion', [
    ['path', { d: UNION, ...SHADE, key: 'shade' }],
    ['path', { d: UNION, key: 'outline' }],
]);
export const BooleanSubtractIcon = icon('BooleanSubtract', [
    ['path', { d: LEFT_ONLY, ...SHADE, key: 'shade' }],
    ['path', { d: LEFT_ONLY, key: 'outline' }],
    ['path', { d: RIGHT, strokeDasharray: '2 2.2', key: 'cut' }],
]);
export const BooleanIntersectIcon = icon('BooleanIntersect', [
    ['path', { d: LENS, ...SHADE, key: 'shade' }],
    ['path', { d: LENS, key: 'outline' }],
    ['path', { d: LEFT, strokeDasharray: '2 2.2', key: 'l' }],
    ['path', { d: RIGHT, strokeDasharray: '2 2.2', key: 'r' }],
]);
export const BooleanExcludeIcon = icon('BooleanExclude', [
    ['path', { d: `${UNION} ${LENS}`, ...SHADE, fillRule: 'evenodd', key: 'shade' }],
    ['path', { d: LEFT, key: 'l' }],
    ['path', { d: RIGHT, key: 'r' }],
]);
export const BooleanDivideIcon = icon('BooleanDivide', [
    ['path', { d: LEFT, key: 'l' }],
    ['path', { d: RIGHT, key: 'r' }],
    ['path', { d: 'M3 3l2.5 2.5M21 21l-2.5-2.5', key: 'split' }],
]);

/** Grid options (header): a page with a dotted guide grid. */
export const CanvasGridIcon = icon('CanvasGrid', [
    ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', key: 'page' }],
    [
        'path',
        {
            d: 'M9 3v18M15 3v18M3 9h18M3 15h18',
            strokeDasharray: '1.5 2',
            strokeWidth: '1.5',
            key: 'grid',
        },
    ],
]);

/* Arrange (2026-11-17 redraw): two overlapping objects, back 3…14 and front 10…21. The moved object is
   solid; the arrow in the free corner says where it goes, a bar on it = all the way to the front / back.
   The send set is the bring set turned half a turn, so the four read as one family. */
const FRONT = { x: '10', y: '10', width: '11', height: '11', rx: '2' };
/** What shows of the back object behind a solid front one (gaps keep the outlines apart at 16 px). */
const BACK_EDGE: IconPart = [
    'path',
    { d: 'M14 7.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2.5', key: 'back' },
];
/** The back object, solid where the front one does not cover it. */
const BACK_SOLID: IconPart = [
    'path',
    {
        d: 'M5 3h7a2 2 0 0 1 2 2v2.5H7.5V14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
        fill: 'currentColor',
        key: 'back',
    },
];
const FRONT_SOLID: IconPart = ['rect', { ...FRONT, fill: 'currentColor', key: 'front' }];
const FRONT_EDGE: IconPart = ['rect', { ...FRONT, key: 'front' }];

export const BringToFrontIcon = icon('BringToFront', [
    BACK_EDGE,
    FRONT_SOLID,
    ['path', { d: 'M16.5 2h5', key: 'bar' }],
    ['path', { d: 'M19 7.5v-3M16.5 7 19 4.5 21.5 7', key: 'arrow' }],
]);
export const BringForwardIcon = icon('BringForward', [
    BACK_EDGE,
    FRONT_SOLID,
    ['path', { d: 'M19 7.5v-5M16.5 5 19 2.5 21.5 5', key: 'arrow' }],
]);
export const SendBackwardIcon = icon('SendBackward', [
    BACK_SOLID,
    FRONT_EDGE,
    ['path', { d: 'M5 16.5v5M2.5 19 5 21.5 7.5 19', key: 'arrow' }],
]);
export const SendToBackIcon = icon('SendToBack', [
    BACK_SOLID,
    FRONT_EDGE,
    ['path', { d: 'M2.5 22h5', key: 'bar' }],
    ['path', { d: 'M5 16.5v3M2.5 17 5 19.5 7.5 17', key: 'arrow' }],
]);

/** Brush tool: a round artist's brush (handle, ferrule, bristles) and a stroke of paint. */
export const BrushToolIcon = icon('BrushTool', [
    [
        'rect',
        {
            x: '10.5',
            y: '1.5',
            width: '3',
            height: '10',
            rx: '1.5',
            transform: 'rotate(45 12 12)',
            key: 'handle',
        },
    ],
    ['path', { d: 'M9.5 11.5h5v3h-5z', transform: 'rotate(45 12 12)', key: 'ferrule' }],
    [
        'path',
        {
            d: 'M9.5 14.5c0 3 1 5.5 2.5 7.5 1.5-2 2.5-4.5 2.5-7.5',
            transform: 'rotate(45 12 12)',
            key: 'tip',
        },
    ],
    ['path', { d: 'M4 22c3 0 6-1.5 9.5-1.5', key: 'paint' }],
]);

/* Footer fill / stroke toggles: the swatch shows the state; hover shows what a click does. */
const SWATCH = { x: '4', y: '4', width: '16', height: '16', rx: '3' };
const SLASH: IconPart = ['path', { d: 'M3 21 21 3', className: 'text-danger', key: 'slash' }];
/* Add / remove (2026-11-17 redraw): one smaller swatch, the badge in the free corner never overlaps it. */
const BADGE_SWATCH = { x: '3', y: '3', width: '12', height: '12', rx: '2.5' };
const ADD_BADGE: IconPart = ['path', { d: 'M19 15.5v7M15.5 19h7', key: 'plus' }];
const REMOVE_BADGE: IconPart = [
    'path',
    { d: 'M16.5 16.5l5 5M21.5 16.5l-5 5', className: 'text-danger', key: 'x' },
];

export const FillOnIcon = icon('FillOn', [
    ['rect', { ...SWATCH, fill: 'currentColor', key: 'swatch' }],
]);
export const FillNoneIcon = icon('FillNone', [
    ['rect', { ...SWATCH, strokeDasharray: '3 2.5', key: 'swatch' }],
    SLASH,
]);
export const FillRemoveIcon = icon('FillRemove', [
    ['rect', { ...BADGE_SWATCH, fill: 'currentColor', key: 'swatch' }],
    REMOVE_BADGE,
]);
export const FillAddIcon = icon('FillAdd', [
    ['rect', { ...BADGE_SWATCH, fill: 'currentColor', key: 'swatch' }],
    ADD_BADGE,
]);
export const StrokeOnIcon = icon('StrokeOn', [
    ['rect', { ...SWATCH, strokeWidth: '3.5', key: 'swatch' }],
]);
export const StrokeNoneIcon = icon('StrokeNone', [
    ['rect', { ...SWATCH, strokeDasharray: '3 2.5', key: 'swatch' }],
    SLASH,
]);
export const StrokeRemoveIcon = icon('StrokeRemove', [
    ['rect', { ...BADGE_SWATCH, strokeWidth: '3', key: 'swatch' }],
    REMOVE_BADGE,
]);
export const StrokeAddIcon = icon('StrokeAdd', [
    ['rect', { ...BADGE_SWATCH, strokeWidth: '3', key: 'swatch' }],
    ADD_BADGE,
]);
