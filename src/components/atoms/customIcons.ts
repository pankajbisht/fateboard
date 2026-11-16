import { createLucideIcon, type IconNode } from 'lucide-react';

/**
 * Fateboard's own icons, drawn on Lucide's 24 × 24 grid with its stroke style (2 px, round caps / joins,
 * `currentColor`), so they sit next to Lucide icons without looking different and follow the icon size
 * setting. Made with `createLucideIcon`; registered by name in `atoms/Icon.tsx`. Data only (no logic).
 *
 * Use one when no Lucide icon says what the control does (2026-11-16 icon audit, docs/COMPONENTS.md).
 */
const icon = (name: string, node: IconNode) => createLucideIcon(name, node);

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

/** Draw panel (brush settings): a stroke above a slider. */
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
