import type { FabricObject } from 'fabric';
import type { EasingName, FullProps, Keyframe, PropValues } from './engine';

/**
 * Ambient scenery presets (docs/PROPS.md phase 5), built for the engine's `buildPreset`:
 * - wind sway: the object leans with the wind (skew) while its base stays planted, like grass and trees;
 * - drift: a slow side-to-side drift (clouds).
 * Both end where they start, so repeated cycles loop seamlessly.
 */
/** The engine's keyframe factory (ids, rounding). */
type MakeKey = (time: number, props: PropValues, easing: EasingName) => Keyframe;

const STEPS = 12;
const SWAY_DEG = 5;
const DRIFT_PX = 48;

const originFactor = (v: unknown) =>
    v === 'center' ? 0.5 : v === 'right' || v === 'bottom' ? 1 : typeof v === 'number' ? v : 0;

export function ambientKeyframes(
    id: 'windSway' | 'drift',
    obj: FabricObject,
    rest: FullProps,
    start: number,
    dur: number,
    make: MakeKey,
): Keyframe[] {
    const at = (i: number) => start + (dur * i) / STEPS;
    if (id === 'drift')
        return Array.from({ length: STEPS + 1 }, (_, i) =>
            make(
                at(i),
                { left: rest.left + Math.sin((i / STEPS) * Math.PI * 2) * DRIFT_PX },
                'linear',
            ),
        );
    // skewX shifts a point (y below the origin, local px) by scaleX · y · tan(skew): move `left` back by the
    // base's shift so the base stays put (unrotated objects; a turned prop sways a little at its base)
    const below = (1 - originFactor(obj.originY)) * (obj.height ?? 0);
    return Array.from({ length: STEPS + 1 }, (_, i) => {
        const deg = rest.skewX + Math.sin((i / STEPS) * Math.PI * 2) * SWAY_DEG;
        const shift =
            rest.scaleX *
            below *
            (Math.tan((deg * Math.PI) / 180) - Math.tan((rest.skewX * Math.PI) / 180));
        return make(at(i), { skewX: deg, left: rest.left - shift }, 'linear');
    });
}
