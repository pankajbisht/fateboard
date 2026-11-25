/**
 * The small motion each preset tile plays on hover / focus (Web Animations keyframes on a 14 px
 * square). A picture of the preset, not the engine: distances are scaled to the tile.
 */
import type { PresetId } from '@/animation/engine';

const x = (px: number) => `translateX(${px}px)`;
const y = (px: number) => `translateY(${px}px)`;
const HIDDEN = { opacity: 0 };
const SHOWN = { opacity: 1, transform: 'none' };

const ENTER: Record<string, Keyframe> = {
    fade: HIDDEN,
    left: { ...HIDDEN, transform: x(-18) },
    right: { ...HIDDEN, transform: x(18) },
    bottom: { ...HIDDEN, transform: y(12) },
    top: { ...HIDDEN, transform: y(-12) },
    zoom: { ...HIDDEN, transform: 'scale(0.3)' },
    rotate: { ...HIDDEN, transform: 'rotate(-120deg) scale(0.6)' },
    flip: { ...HIDDEN, transform: 'scaleY(0)' },
};
const enter = (from: Keyframe): Keyframe[] => [from, SHOWN];
const exit = (to: Keyframe): Keyframe[] => [SHOWN, to];
const steps = (values: number[], css: (v: number) => string): Keyframe[] =>
    values.map((v) => ({ transform: css(v) }));

export const PRESET_DEMOS: Record<PresetId, Keyframe[]> = {
    fadeIn: enter(ENTER.fade),
    slideInLeft: enter(ENTER.left),
    slideInRight: enter(ENTER.right),
    slideInUp: enter(ENTER.bottom),
    slideInDown: enter(ENTER.top),
    zoomIn: enter(ENTER.zoom),
    popIn: [
        { ...HIDDEN, transform: 'scale(0)' },
        { opacity: 1, transform: 'scale(1.25)', offset: 0.7 },
        SHOWN,
    ],
    rotateIn: enter(ENTER.rotate),
    flipInX: enter(ENTER.flip),
    typewriter: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],

    pulse: steps([1, 1.35, 1], (v) => `scale(${v})`),
    shake: steps([0, -5, 5, -4, 4, -2, 0], x),
    spin: steps([0, 360], (v) => `rotate(${v}deg)`),
    bounce: steps([0, -10, 0, -4, 0], y),
    swing: steps([0, 15, -10, 6, -3, 0], (v) => `rotate(${v}deg)`),
    rubberBand: [
        [1, 1],
        [1.25, 0.75],
        [0.75, 1.25],
        [1.15, 0.85],
        [1, 1],
    ].map(([sx, sy]) => ({ transform: `scale(${sx}, ${sy})` })),
    heartbeat: [
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.3)', offset: 0.14 },
        { transform: 'scale(1)', offset: 0.28 },
        { transform: 'scale(1.3)', offset: 0.42 },
        { transform: 'scale(1)', offset: 1 },
    ],
    float: steps([0, -4, 0, 4, 0], y),

    fadeOut: exit(ENTER.fade),
    slideOutLeft: exit(ENTER.left),
    slideOutRight: exit(ENTER.right),
    slideOutUp: exit(ENTER.top),
    slideOutDown: exit(ENTER.bottom),
    zoomOut: exit(ENTER.zoom),
    rotateOut: exit({ ...HIDDEN, transform: 'rotate(120deg) scale(0.6)' }),
    flipOutX: exit(ENTER.flip),
};
