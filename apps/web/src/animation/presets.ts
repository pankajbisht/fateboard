/**
 * Animation preset catalogue (ids, labels, groups, default durations). The keyframes are built in
 * `engine.ts` (`buildPreset`); the ambient scenery ones in `ambientPresets.ts`. Re-exported by the engine.
 */
export type PresetGroup = 'entrance' | 'emphasis' | 'exit';

export type PresetId =
    | 'fadeIn'
    | 'slideInLeft'
    | 'slideInRight'
    | 'slideInUp'
    | 'slideInDown'
    | 'zoomIn'
    | 'popIn'
    | 'rotateIn'
    | 'flipInX'
    | 'typewriter'
    | 'pulse'
    | 'shake'
    | 'spin'
    | 'bounce'
    | 'swing'
    | 'rubberBand'
    | 'heartbeat'
    | 'float'
    | 'windSway'
    | 'drift'
    | 'fadeOut'
    | 'slideOutLeft'
    | 'slideOutRight'
    | 'slideOutUp'
    | 'slideOutDown'
    | 'zoomOut'
    | 'rotateOut'
    | 'flipOutX';

export interface PresetMeta {
    id: PresetId;
    label: string;
    group: PresetGroup;
    defaultDuration: number;
    textOnly?: boolean;
    repeatable?: boolean;
}

export const PRESETS: PresetMeta[] = [
    { id: 'fadeIn', label: 'Fade in', group: 'entrance', defaultDuration: 600 },
    { id: 'slideInLeft', label: 'Slide from left', group: 'entrance', defaultDuration: 700 },
    { id: 'slideInRight', label: 'Slide from right', group: 'entrance', defaultDuration: 700 },
    { id: 'slideInUp', label: 'Slide from bottom', group: 'entrance', defaultDuration: 700 },
    { id: 'slideInDown', label: 'Slide from top', group: 'entrance', defaultDuration: 700 },
    { id: 'zoomIn', label: 'Zoom in', group: 'entrance', defaultDuration: 700 },
    { id: 'popIn', label: 'Pop in', group: 'entrance', defaultDuration: 800 },
    { id: 'rotateIn', label: 'Rotate in', group: 'entrance', defaultDuration: 800 },
    { id: 'flipInX', label: 'Flip in', group: 'entrance', defaultDuration: 800 },
    {
        id: 'typewriter',
        label: 'Typewriter',
        group: 'entrance',
        defaultDuration: 1500,
        textOnly: true,
    },
    { id: 'pulse', label: 'Pulse', group: 'emphasis', defaultDuration: 800, repeatable: true },
    { id: 'shake', label: 'Shake', group: 'emphasis', defaultDuration: 600, repeatable: true },
    { id: 'spin', label: 'Spin 360°', group: 'emphasis', defaultDuration: 1000, repeatable: true },
    { id: 'bounce', label: 'Bounce', group: 'emphasis', defaultDuration: 900, repeatable: true },
    { id: 'swing', label: 'Swing', group: 'emphasis', defaultDuration: 900, repeatable: true },
    {
        id: 'rubberBand',
        label: 'Rubber band',
        group: 'emphasis',
        defaultDuration: 900,
        repeatable: true,
    },
    {
        id: 'heartbeat',
        label: 'Heartbeat',
        group: 'emphasis',
        defaultDuration: 1000,
        repeatable: true,
    },
    { id: 'float', label: 'Float', group: 'emphasis', defaultDuration: 2400, repeatable: true },
    // scenery (Scene Objects, docs/PROPS.md phase 5): loop these over a whole shot
    {
        id: 'windSway',
        label: 'Wind sway',
        group: 'emphasis',
        defaultDuration: 2400,
        repeatable: true,
    },
    { id: 'drift', label: 'Drift', group: 'emphasis', defaultDuration: 6000, repeatable: true },
    { id: 'fadeOut', label: 'Fade out', group: 'exit', defaultDuration: 600 },
    { id: 'slideOutLeft', label: 'Slide to left', group: 'exit', defaultDuration: 700 },
    { id: 'slideOutRight', label: 'Slide to right', group: 'exit', defaultDuration: 700 },
    { id: 'slideOutUp', label: 'Slide to top', group: 'exit', defaultDuration: 700 },
    { id: 'slideOutDown', label: 'Slide to bottom', group: 'exit', defaultDuration: 700 },
    { id: 'zoomOut', label: 'Zoom out', group: 'exit', defaultDuration: 700 },
    { id: 'rotateOut', label: 'Rotate out', group: 'exit', defaultDuration: 800 },
    { id: 'flipOutX', label: 'Flip out', group: 'exit', defaultDuration: 800 },
];
