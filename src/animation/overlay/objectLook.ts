import type { FabricObject } from 'fabric';
import { sampleTrack, type Track } from '../engine';

/**
 * Show an object as it looks at another time, then put it back exactly as it was. Used to draw onion-skin
 * ghosts; the board never keeps these values (no event fires, nothing is saved, `__animRest` is untouched).
 */
type Obj = FabricObject & Record<string, unknown>;
export type Look = Record<string, unknown>;

const LOOK_KEYS = [
    'left',
    'top',
    'scaleX',
    'scaleY',
    'angle',
    'skewX',
    'skewY',
    'opacity',
    'fill',
    'stroke',
    // Fabric flips an object when a scale goes below 0 (an easing that overshoots)
    'flipX',
    'flipY',
] as const;

/** The values a track can change, as the object shows them now. */
export function captureLook(obj: FabricObject): Look {
    const o = obj as Obj;
    const look: Look = {};
    for (const k of LOOK_KEYS) look[k] = o[k];
    if (typeof o.text === 'string') look.text = o.text;
    return look;
}

/** Puts back what `captureLook` read; only the values that differ (text re-layout is not free). */
export function putBackLook(obj: FabricObject, look: Look) {
    const o = obj as Obj;
    const changed: Look = {};
    for (const [k, v] of Object.entries(look)) if (o[k] !== v) changed[k] = v;
    if (Object.keys(changed).length) obj.set(changed as Partial<FabricObject>);
    obj.setCoords();
}

/** Shows the track's state at `t` on the object (the same values playback would show). */
export function showSample(obj: FabricObject, track: Track, t: number) {
    const { reveal, ...rest } = sampleTrack(track, t);
    obj.set(rest as Partial<FabricObject>);
    if (reveal !== undefined && track.fullText !== undefined) {
        const n = Math.round(Math.max(0, Math.min(1, reveal)) * track.fullText.length);
        obj.set('text' as keyof FabricObject, track.fullText.slice(0, n) as never);
    }
    obj.setCoords();
}
