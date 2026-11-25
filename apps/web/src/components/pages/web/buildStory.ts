/**
 * The story the landing page builds live in "From thought to visual" (`BuildStage`): a rough idea
 * becomes a finished launch poster in three steps, drawn with the Help picture language
 * (`helpScene.ts`), so it always looks like today's editor and needs no screenshots.
 */
import type { HelpExample } from '@/components/organisms/helpsection/helpExamples';
import {
    at,
    circle,
    during,
    path,
    rect,
    text,
    times,
} from '@/components/organisms/helpsection/helpScene';

/** The three steps listed next to the stage, one per story step. */
export const STORY_STEPS = [
    {
        title: 'Draw Naturally',
        description: 'Pick a pen and sketch the idea freely, just like on a real whiteboard.',
    },
    {
        title: 'Adjust as You Go',
        description:
            'Swap the sketch for clean shapes, then resize and recolor until it feels right.',
    },
    {
        title: 'Bring It to Life',
        description: 'Add a sky, glow and a headline, then animate it and export.',
    },
] as const;

const INK = '#0f1b2d';
const BODY = 'M110 30 C130 50 134 80 132 120 H88 C86 80 90 50 110 30Z';
const FINS = ['M88 100 L70 132 L88 124Z', 'M132 100 L150 132 L132 124Z'];
const FLAME = 'M96 122 Q110 166 124 122Z';
const STARS: [number, number][] = [
    [30, 30],
    [62, 70],
    [40, 140],
    [170, 24],
    [186, 150],
    [290, 30],
    [300, 150],
    [160, 92],
];

export const BUILD_STORY: HelpExample = {
    id: 'launch-poster',
    title: 'Launch day poster',
    brief: 'From a rough sketch to a finished, animated poster.',
    icon: 'wand-magic-sparkles',
    steps: [
        { text: STORY_STEPS[0].description, ui: 'Pencil (`shift+P`)', at: [150, 132] },
        { text: STORY_STEPS[1].description, ui: 'Shapes · Fill & Shadow', at: [132, 80] },
        { text: STORY_STEPS[2].description, ui: 'Animate › Entrance', at: [236, 96] },
    ],
    result: 'A finished launch poster, ready to export as an image or a video.',
    scene: [
        // 3 · the sky goes behind everything
        ...at(
            2,
            rect(6, 6, 308, 168, { grad: { from: '#10002b', to: '#3c096c', angle: 90 }, rx: 4 }),
        ),
        ...at(2, ...STARS.map(([x, y]) => circle(x, y, 1.6, { fill: '#ffffff', glow: '#4cc9f0' }))),
        ...at(
            2,
            path('M100 142 V172 M110 150 V176 M120 142 V172', {
                stroke: '#ff9e00',
                w: 2,
                op: 0.6,
                draw: true,
            }),
        ),

        // 1 · a quick sketch: rocket, flame, stars and a scribbled title
        ...during(
            0,
            1,
            path('M110 32 C128 52 135 82 131 121 L89 119 C85 80 92 50 111 31', {
                stroke: INK,
                w: 1.6,
                draw: true,
            }),
            path('M89 101 L71 131 L88 123 M131 101 L149 133 L132 124', {
                stroke: INK,
                w: 1.6,
                draw: true,
            }),
            circle(110, 72, 9, { stroke: INK, w: 1.6 }),
            path('M97 121 Q109 160 123 121', { stroke: INK, w: 1.6, draw: true }),
            path(
                'M186 72 q8 -8 16 0 t16 0 t16 0 t16 0 t16 0 M196 98 q7 -6 14 0 t14 0 t14 0 t14 0',
                { stroke: INK, w: 1.4, draw: true },
            ),
            path('M262 38 l4 8 l8 -2 l-6 6 l4 8 l-8 -4 l-6 6 l0 -8 l-8 -4 l8 -2Z', {
                stroke: INK,
                w: 1.2,
                draw: true,
            }),
        ),

        // 2 · clean shapes and colors replace the sketch
        ...during(
            1,
            2,
            ...FINS.map((d) => path(d, { fill: '#f72585', stroke: INK, w: 1.5 })),
            path(BODY, { fill: '#e9ecef', stroke: INK, w: 1.5 }),
            circle(110, 72, 9, { fill: '#4cc9f0', stroke: INK, w: 1.5 }),
            path(FLAME, { fill: '#ff9e00', stroke: INK, w: 1.5 }),
            text(230, 86, 'Launch day', { size: 20, weight: 600, anchor: 'middle', fill: INK }),
            rect(66, 26, 88, 144, { stroke: 'primary', w: 1, dash: '4 3' }),
            ...times(4, (i) =>
                rect([64, 152][i % 2]!, [24, 166][Math.floor(i / 2)]!, 5, 5, {
                    fill: '#ffffff',
                    stroke: 'primary',
                    w: 1,
                }),
            ),
        ),

        // 3 · brought to life: glow, styled headline, a flame that burns
        ...at(
            2,
            ...FINS.map((d) => path(d, { fill: '#f72585', stroke: '#ffffff', w: 1.2 })),
            path(BODY, {
                grad: { from: '#ffffff', to: '#adb5bd', angle: 0 },
                stroke: '#ffffff',
                w: 1.2,
            }),
            circle(110, 72, 9, { fill: '#4cc9f0', stroke: '#ffffff', w: 1.5, glow: '#4cc9f0' }),
            path(FLAME, { grad: { from: '#ffd60a', to: '#ff5400', angle: 90 }, glow: '#ff9e00' }),
            text(234, 82, 'LAUNCH', {
                size: 30,
                weight: 800,
                anchor: 'middle',
                fill: '#ffffff',
                glow: '#4cc9f0',
                spacing: 2,
            }),
            text(234, 112, 'DAY', {
                size: 30,
                weight: 800,
                anchor: 'middle',
                fill: '#ffd60a',
                spacing: 6,
            }),
            text(234, 136, 'FRIDAY · 7 PM', {
                size: 10,
                weight: 600,
                anchor: 'middle',
                fill: '#e0aaff',
                spacing: 2,
            }),
        ),

        // the end: exported
        ...at(
            3,
            rect(214, 148, 92, 18, { fill: '#0a60d6', rx: 9 }),
            text(260, 160.5, '↓ launch-day.mp4', {
                size: 9,
                weight: 700,
                anchor: 'middle',
                fill: '#ffffff',
            }),
        ),
    ],
};
