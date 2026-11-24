/** What people read in the Animation panel instead of the engine's property and easing ids. */
import type { AnimProp, EasingName, NumProp } from '@/animation/engine';
import { fromUnit, toUnit, unitPrecision, type Unit } from '@/lib/units';

export const PROP_LABELS: Record<AnimProp, string> = {
    left: 'X',
    top: 'Y',
    scaleX: 'Scale X',
    scaleY: 'Scale Y',
    angle: 'Rotation',
    skewX: 'Skew X',
    skewY: 'Skew Y',
    opacity: 'Opacity',
    reveal: 'Text shown',
    fill: 'Fill',
    stroke: 'Stroke',
};

/** `length` follows Settings > Units; `percent` shows 0..1 as 0..100 %. */
type PropKind = 'length' | 'percent' | 'degrees';

const PROP_KIND: Record<NumProp, PropKind> = {
    left: 'length',
    top: 'length',
    scaleX: 'percent',
    scaleY: 'percent',
    angle: 'degrees',
    skewX: 'degrees',
    skewY: 'degrees',
    opacity: 'percent',
    reveal: 'percent',
};

export interface PropField {
    unit: string;
    step: number;
    precision: number;
    /** stored value → shown value */
    show: (stored: number) => number;
    /** typed value → stored value */
    store: (shown: number) => number;
}

/** How a numeric keyframe value is shown and edited. */
export function propField(prop: NumProp, unit: Unit): PropField {
    const kind = PROP_KIND[prop];
    if (kind === 'percent')
        return {
            unit: '%',
            step: 5,
            precision: 1,
            show: (v) => v * 100,
            store: (v) => v / 100,
        };
    if (kind === 'degrees')
        return { unit: '°', step: 1, precision: 1, show: (v) => v, store: (v) => v };
    return {
        unit,
        step: unit === 'px' ? 1 : 0.1,
        precision: Math.max(1, unitPrecision(unit)),
        show: (v) => toUnit(v, unit),
        store: (v) => fromUnit(v, unit),
    };
}

/** "Opacity 50 %", "X 120 px", "Fill #ff0000": keyframe tooltips. */
export function describeProp(prop: AnimProp, value: number | string, unit: Unit): string {
    if (typeof value === 'string') return `${PROP_LABELS[prop]} ${value}`;
    const f = propField(prop as NumProp, unit);
    return `${PROP_LABELS[prop]} ${+f.show(value).toFixed(f.precision)} ${f.unit}`;
}

export const EASING_LABELS: Record<EasingName, string> = {
    linear: 'Linear (constant speed)',
    hold: 'Hold (jump at the end)',
    easeInQuad: 'Ease in · gentle',
    easeOutQuad: 'Ease out · gentle',
    easeInOutQuad: 'Ease in and out · gentle',
    easeInCubic: 'Ease in · medium',
    easeOutCubic: 'Ease out · medium',
    easeInOutCubic: 'Ease in and out · medium',
    easeInExpo: 'Ease in · strong',
    easeOutExpo: 'Ease out · strong',
    easeInOutExpo: 'Ease in and out · strong',
    easeOutBack: 'Overshoot',
    easeInOutBack: 'Wind up and overshoot',
    easeOutElastic: 'Elastic',
    easeOutBounce: 'Bounce',
    spring: 'Spring',
};
