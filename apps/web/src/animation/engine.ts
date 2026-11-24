import type { Canvas, FabricObject } from 'fabric';

/* ══════════════════════════════ Types ══════════════════════════════ */

export const NUM_PROPS = [
    'left',
    'top',
    'scaleX',
    'scaleY',
    'angle',
    'skewX',
    'skewY',
    'opacity',
    'reveal',
] as const;
export const COLOR_PROPS = ['fill', 'stroke'] as const;
export type NumProp = (typeof NUM_PROPS)[number];
export type ColorProp = (typeof COLOR_PROPS)[number];
export type AnimProp = NumProp | ColorProp;
export const ANIMATABLE_PROPS: readonly AnimProp[] = [...NUM_PROPS, ...COLOR_PROPS];

export const isColorProp = (p: AnimProp): p is ColorProp =>
    (COLOR_PROPS as readonly string[]).includes(p);

/** `reveal` (0..1) drives typewriter text; it only exists on text tracks. */
export type PropValues = Partial<Record<NumProp, number>> & Partial<Record<ColorProp, string>>;
export type FullProps = Record<Exclude<NumProp, 'reveal'>, number> &
    Partial<Record<ColorProp, string>>;

export type Bezier = [number, number, number, number];

export type EasingName =
    | 'linear'
    | 'hold'
    | 'easeInQuad'
    | 'easeOutQuad'
    | 'easeInOutQuad'
    | 'easeInCubic'
    | 'easeOutCubic'
    | 'easeInOutCubic'
    | 'easeInExpo'
    | 'easeOutExpo'
    | 'easeInOutExpo'
    | 'easeOutBack'
    | 'easeInOutBack'
    | 'easeOutElastic'
    | 'easeOutBounce'
    | 'spring';

export interface Keyframe {
    id: string;
    /** ms from timeline start */
    time: number;
    props: PropValues;
    /** easing of the segment that STARTS at this keyframe */
    easing: EasingName;
    /** when set, overrides `easing` with a custom cubic-bezier curve */
    bezier?: Bezier;
}

export interface Track {
    objectId: string;
    label: string;
    rest: FullProps;
    /** original text, captured for text objects (needed by the typewriter / reveal prop) */
    fullText?: string;
    muted?: boolean;
    keyframes: Keyframe[]; // sorted by time
}

export type Tracks = Record<string, Track>;

export interface AnimationData {
    version: 2;
    duration: number;
    fps: number;
    workIn: number;
    workOut: number | null;
    tracks: Tracks;
}

/* ══════════════════════════════ Easing ══════════════════════════════ */

const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3;

export const EASINGS: Record<EasingName, (t: number) => number> = {
    linear: (t) => t,
    hold: (t) => (t < 1 ? 0 : 1),
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeInOutExpo: (t) =>
        t === 0
            ? 0
            : t === 1
              ? 1
              : t < 0.5
                ? Math.pow(2, 20 * t - 10) / 2
                : (2 - Math.pow(2, -20 * t + 10)) / 2,
    easeOutBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    easeInOutBack: (t) =>
        t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
    easeOutElastic: (t) =>
        t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1,
    easeOutBounce: (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    spring: (t) => (t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(13 * t)),
};

export const EASING_NAMES = Object.keys(EASINGS) as EasingName[];

/** Standard cubic-bezier approximations, used when the user switches a named easing to "custom". */
export const NAMED_BEZIER: Partial<Record<EasingName, Bezier>> = {
    linear: [0, 0, 1, 1],
    easeInQuad: [0.11, 0, 0.5, 0],
    easeOutQuad: [0.5, 1, 0.89, 1],
    easeInOutQuad: [0.45, 0, 0.55, 1],
    easeInCubic: [0.32, 0, 0.67, 0],
    easeOutCubic: [0.33, 1, 0.68, 1],
    easeInOutCubic: [0.65, 0, 0.35, 1],
    easeInExpo: [0.7, 0, 0.84, 0],
    easeOutExpo: [0.16, 1, 0.3, 1],
    easeInOutExpo: [0.87, 0, 0.13, 1],
    easeOutBack: [0.34, 1.56, 0.64, 1],
    easeInOutBack: [0.68, -0.6, 0.32, 1.6],
};

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sy = (t: number) => ((ay * t + by) * t + cy) * t;
    const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

    return (x) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 8; i++) {
            const err = sx(t) - x;
            if (Math.abs(err) < 1e-6) return sy(t);
            const d = dx(t);
            if (Math.abs(d) < 1e-6) break;
            t -= err / d;
        }
        let lo = 0;
        let hi = 1;
        t = x;
        for (let i = 0; i < 28; i++) {
            const v = sx(t);
            if (Math.abs(v - x) < 1e-6) break;
            if (x > v) lo = t;
            else hi = t;
            t = (lo + hi) / 2;
        }
        return sy(t);
    };
}

const bezierCache = new Map<string, (x: number) => number>();

/** Eased progress (0..1, may overshoot) for a keyframe's outgoing segment. */
export function easeKeyframe(k: Pick<Keyframe, 'easing' | 'bezier'>, p: number): number {
    if (k.bezier) {
        const key = k.bezier.join(',');
        let fn = bezierCache.get(key);
        if (!fn) {
            fn = cubicBezier(...k.bezier);
            if (bezierCache.size > 200) bezierCache.clear();
            bezierCache.set(key, fn);
        }
        return fn(p);
    }
    return EASINGS[k.easing](p);
}

/* ══════════════════════════════ Colour ══════════════════════════════ */

type RGBA = [number, number, number, number];
const colorCache = new Map<string, RGBA>();
let colorCtx: CanvasRenderingContext2D | null = null;

export function parseColor(input: string): RGBA {
    const hit = colorCache.get(input);
    if (hit) return hit;
    colorCtx ??= document.createElement('canvas').getContext('2d');
    let out: RGBA = [0, 0, 0, 1];
    if (colorCtx) {
        colorCtx.fillStyle = '#000000';
        colorCtx.fillStyle = input; // the browser normalises any CSS colour
        const v = colorCtx.fillStyle as string;
        if (v.startsWith('#')) {
            const n = parseInt(v.slice(1), 16);
            out = [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
        } else {
            const m = v.match(/rgba?\(([^)]+)\)/);
            if (m) {
                const p = m[1].split(',').map((s) => parseFloat(s));
                out = [p[0], p[1], p[2], p[3] ?? 1];
            }
        }
    }
    colorCache.set(input, out);
    return out;
}

export const toHex = (input: string): string => {
    const [r, g, b] = parseColor(input);
    return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
};

const lerpColor = (a: string, b: string, e: number): string => {
    const A = parseColor(a);
    const B = parseColor(b);
    const m = (i: number) => A[i] + (B[i] - A[i]) * e;
    return `rgba(${Math.round(m(0))},${Math.round(m(1))},${Math.round(m(2))},${Math.max(0, Math.min(1, m(3))).toFixed(3)})`;
};

/* ══════════════════════════════ Helpers ══════════════════════════════ */

export const MIN_DURATION = 500;
export const MAX_DURATION = 10 * 60 * 1000;

export const uid = () => Math.random().toString(36).slice(2, 10);

type AnimObject = FabricObject & {
    animId?: string;
    name?: string;
    text?: string;
    __animRest?: Record<string, unknown>;
};

/** A new page / board has no animation: same defaults as the animation slice. */
export const emptyAnimation = (): AnimationData => ({
    version: 2,
    duration: 5000,
    fps: 30,
    workIn: 0,
    workOut: null,
    tracks: {},
});

/** Stable id linking tracks to canvas objects. Add 'animId' to your toObject() include list. */
export function ensureAnimId(obj: FabricObject): string {
    const o = obj as AnimObject;
    if (!o.animId) o.animId = uid();
    return o.animId;
}
export const getAnimId = (obj: FabricObject): string | undefined => (obj as AnimObject).animId;
export const isTextObject = (obj: FabricObject) => typeof (obj as AnimObject).text === 'string';

export function labelOf(obj: FabricObject): string {
    const o = obj as AnimObject;
    if (typeof o.text === 'string' && o.text.trim()) return o.text.trim().slice(0, 18);
    if (o.name) return o.name;
    const type = o.type ?? 'object';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

export function readProps(obj: FabricObject): FullProps {
    const out: FullProps = {
        left: obj.left ?? 0,
        top: obj.top ?? 0,
        scaleX: obj.scaleX ?? 1,
        scaleY: obj.scaleY ?? 1,
        angle: obj.angle ?? 0,
        skewX: obj.skewX ?? 0,
        skewY: obj.skewY ?? 0,
        opacity: obj.opacity ?? 1,
    };
    if (typeof obj.fill === 'string') out.fill = obj.fill;
    if (typeof obj.stroke === 'string') out.stroke = obj.stroke;
    return out;
}

export const sortKeyframes = (k: Keyframe[]) => [...k].sort((a, b) => a.time - b.time);

/** Merge keyframes; same-time (±1 ms) keyframes merge prop-by-prop. */
export function mergeKeyframes(existing: Keyframe[], incoming: Keyframe[]): Keyframe[] {
    const out = existing.map((k) => ({ ...k, props: { ...k.props } }));
    for (const n of incoming) {
        const hit = out.find((k) => Math.abs(k.time - n.time) < 1);
        if (hit) {
            hit.props = { ...hit.props, ...n.props };
            hit.easing = n.easing;
            hit.bezier = n.bezier;
        } else {
            out.push({ ...n, props: { ...n.props } });
        }
    }
    return sortKeyframes(out);
}

export function contentEnd(tracks: Tracks): number {
    let end = 0;
    for (const t of Object.values(tracks)) for (const k of t.keyframes) end = Math.max(end, k.time);
    return end;
}

/** Props that appear in at least one keyframe of the track, in canonical order. */
export function usedProps(track: Track): AnimProp[] {
    return ANIMATABLE_PROPS.filter((p) => track.keyframes.some((k) => k.props[p] !== undefined));
}

/* ══════════════════════════════ Sampling ══════════════════════════════ */

export function sampleTrack(track: Track, t: number): PropValues {
    const out: Record<string, number | string> = {};
    for (const prop of ANIMATABLE_PROPS) {
        const pts = track.keyframes.filter((k) => k.props[prop] !== undefined);
        if (!pts.length) continue;
        if (t <= pts[0].time) {
            out[prop] = pts[0].props[prop]!;
            continue;
        }
        const last = pts[pts.length - 1];
        if (t >= last.time) {
            out[prop] = last.props[prop]!;
            continue;
        }
        let i = 0;
        while (i < pts.length - 2 && t >= pts[i + 1].time) i++;
        const a = pts[i];
        const b = pts[i + 1];
        const e = easeKeyframe(a, (t - a.time) / (b.time - a.time));
        const av = a.props[prop]!;
        const bv = b.props[prop]!;
        out[prop] =
            typeof av === 'string' || typeof bv === 'string'
                ? lerpColor(String(av), String(bv), e)
                : av + (bv - av) * e;
    }
    return out as PropValues;
}

/**
 * Rest values of the props a track animates (+ the full text when it reveals text). Kept on an
 * object that is shown animated (runtime only, never serialized): `serializeCanvas` writes these
 * instead of the live values, so autosave, pages, undo and files never store a mid-animation
 * state (BUG-011). Props the track does not animate are always saved live.
 */
function restOfAnimated(track: Track): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const prop of usedProps(track)) {
        if (prop === 'reveal') {
            if (track.fullText !== undefined) out.text = track.fullText;
        } else if (track.rest[prop as keyof FullProps] !== undefined) {
            out[prop] = track.rest[prop as keyof FullProps];
        }
    }
    return out;
}

/** True while the object is shown with animated values (see `restOfAnimated`). */
export const isShownAnimated = (obj: FabricObject) => !!(obj as AnimObject).__animRest;

function setRestState(obj: FabricObject, track: Track) {
    delete (obj as AnimObject).__animRest;
    obj.set(track.rest as Partial<FabricObject>);
    if (track.fullText !== undefined && (obj as AnimObject).text !== track.fullText)
        obj.set('text' as keyof FabricObject, track.fullText as never);
}

/** Writes the state at time `t` onto the canvas objects. Does not render. */
export function applyTracksAt(canvas: Canvas, tracks: Tracks, t: number, updateCoords = true) {
    const byId = new Map<string, FabricObject>();
    for (const o of canvas.getObjects()) {
        const id = getAnimId(o);
        if (id) byId.set(id, o);
    }
    for (const track of Object.values(tracks)) {
        const obj = byId.get(track.objectId);
        if (!obj) continue;
        if (track.muted) {
            setRestState(obj, track);
        } else if (track.keyframes.length) {
            (obj as AnimObject).__animRest = restOfAnimated(track);
            const { reveal, ...rest } = sampleTrack(track, t);
            obj.set(rest as Partial<FabricObject>);
            if (reveal !== undefined && track.fullText !== undefined) {
                const n = Math.round(Math.max(0, Math.min(1, reveal)) * track.fullText.length);
                const txt = track.fullText.slice(0, n);
                if ((obj as AnimObject).text !== txt)
                    obj.set('text' as keyof FabricObject, txt as never);
            }
        } else continue;
        if (updateCoords) obj.setCoords();
    }
}

export function restoreObject(canvas: Canvas, track: Track) {
    const obj = canvas.getObjects().find((o) => getAnimId(o) === track.objectId);
    if (!obj) return;
    setRestState(obj, track);
    obj.setCoords();
}

/* ══════════════════════════════ Presets ══════════════════════════════ */

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
    { id: 'fadeOut', label: 'Fade out', group: 'exit', defaultDuration: 600 },
    { id: 'slideOutLeft', label: 'Slide to left', group: 'exit', defaultDuration: 700 },
    { id: 'slideOutRight', label: 'Slide to right', group: 'exit', defaultDuration: 700 },
    { id: 'slideOutUp', label: 'Slide to top', group: 'exit', defaultDuration: 700 },
    { id: 'slideOutDown', label: 'Slide to bottom', group: 'exit', defaultDuration: 700 },
    { id: 'zoomOut', label: 'Zoom out', group: 'exit', defaultDuration: 700 },
    { id: 'rotateOut', label: 'Rotate out', group: 'exit', defaultDuration: 800 },
    { id: 'flipOutX', label: 'Flip out', group: 'exit', defaultDuration: 800 },
];

const originFactor = (v: unknown) =>
    v === 'center' ? 0.5 : v === 'right' || v === 'bottom' ? 1 : typeof v === 'number' ? v : 0;

/** left/top that keep the object's visual CENTER fixed for a given scale + angle (any origin). */
function centerLocked(obj: FabricObject, rest: FullProps, sx: number, sy: number, angle: number) {
    const ox = originFactor(obj.originX);
    const oy = originFactor(obj.originY);
    const w = obj.width ?? 0;
    const h = obj.height ?? 0;
    const offset = (scaleX: number, scaleY: number, deg: number) => {
        const r = (deg * Math.PI) / 180;
        const x = (0.5 - ox) * w * scaleX;
        const y = (0.5 - oy) * h * scaleY;
        return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
    };
    const a = offset(rest.scaleX, rest.scaleY, rest.angle);
    const b = offset(sx, sy, angle);
    return { left: rest.left + a.x - b.x, top: rest.top + a.y - b.y };
}

const kf = (time: number, props: PropValues, easing: EasingName): Keyframe => ({
    id: uid(),
    time: Math.round(time),
    props,
    easing,
});

const SLIDE = 240;

function cycle(
    id: PresetId,
    obj: FabricObject,
    rest: FullProps,
    start: number,
    dur: number,
): Keyframe[] {
    const end = start + dur;
    const op = rest.opacity;
    /** scale factors + angle, centre-locked */
    const xf = (fx: number, fy = fx, angle = rest.angle): PropValues => ({
        scaleX: rest.scaleX * fx,
        scaleY: rest.scaleY * fy,
        angle,
        ...centerLocked(obj, rest, rest.scaleX * fx, rest.scaleY * fy, angle),
    });
    const at = (f: number) => start + dur * f;

    switch (id) {
        case 'fadeIn':
            return [kf(start, { opacity: 0 }, 'easeOutQuad'), kf(end, { opacity: op }, 'linear')];
        case 'slideInLeft':
            return [
                kf(start, { left: rest.left - SLIDE, opacity: 0 }, 'easeOutCubic'),
                kf(end, { left: rest.left, opacity: op }, 'linear'),
            ];
        case 'slideInRight':
            return [
                kf(start, { left: rest.left + SLIDE, opacity: 0 }, 'easeOutCubic'),
                kf(end, { left: rest.left, opacity: op }, 'linear'),
            ];
        case 'slideInUp':
            return [
                kf(start, { top: rest.top + SLIDE, opacity: 0 }, 'easeOutCubic'),
                kf(end, { top: rest.top, opacity: op }, 'linear'),
            ];
        case 'slideInDown':
            return [
                kf(start, { top: rest.top - SLIDE, opacity: 0 }, 'easeOutCubic'),
                kf(end, { top: rest.top, opacity: op }, 'linear'),
            ];
        case 'zoomIn':
            return [
                kf(start, { ...xf(0.3), opacity: 0 }, 'easeOutCubic'),
                kf(end, { ...xf(1), opacity: op }, 'linear'),
            ];
        case 'popIn':
            return [
                kf(start, { ...xf(0), opacity: 0 }, 'easeOutBack'),
                kf(end, { ...xf(1), opacity: op }, 'linear'),
            ];
        case 'rotateIn':
            return [
                kf(start, { ...xf(0.6, 0.6, rest.angle - 120), opacity: 0 }, 'easeOutCubic'),
                kf(end, { ...xf(1), opacity: op }, 'linear'),
            ];
        case 'flipInX':
            return [
                kf(start, { ...xf(1, 0), opacity: 0 }, 'easeOutBack'),
                kf(end, { ...xf(1), opacity: op }, 'linear'),
            ];
        case 'typewriter':
            return [kf(start, { reveal: 0 }, 'linear'), kf(end, { reveal: 1 }, 'linear')];

        case 'pulse':
            return [
                kf(start, xf(1), 'easeInOutQuad'),
                kf(at(0.5), xf(1.15), 'easeInOutQuad'),
                kf(end, xf(1), 'linear'),
            ];
        case 'shake': {
            const offs = [0, -14, 14, -10, 10, -5, 0];
            return offs.map((dx, i) =>
                kf(at(i / (offs.length - 1)), { left: rest.left + dx }, 'linear'),
            );
        }
        case 'spin': {
            const N = 24;
            return Array.from({ length: N + 1 }, (_, i) => {
                const f = i / N;
                const angle = rest.angle + 360 * EASINGS.easeInOutCubic(f);
                return kf(
                    at(f),
                    { angle, ...centerLocked(obj, rest, rest.scaleX, rest.scaleY, angle) },
                    'linear',
                );
            });
        }
        case 'bounce':
            return [
                kf(start, { top: rest.top }, 'easeOutQuad'),
                kf(at(0.3), { top: rest.top - 60 }, 'easeInQuad'),
                kf(at(0.55), { top: rest.top }, 'easeOutQuad'),
                kf(at(0.75), { top: rest.top - 24 }, 'easeInQuad'),
                kf(end, { top: rest.top }, 'linear'),
            ];
        case 'swing': {
            const angles = [0, 15, -10, 6, -3, 0];
            return angles.map((d, i) =>
                kf(
                    at(i / (angles.length - 1)),
                    xf(1, 1, rest.angle + d),
                    i === angles.length - 1 ? 'linear' : 'easeInOutQuad',
                ),
            );
        }
        case 'rubberBand': {
            const steps: [number, number, number][] = [
                [0, 1, 1],
                [0.3, 1.25, 0.75],
                [0.4, 0.75, 1.25],
                [0.5, 1.15, 0.85],
                [0.65, 0.95, 1.05],
                [1, 1, 1],
            ];
            return steps.map(([f, sx, sy]) => kf(at(f), xf(sx, sy), 'easeInOutQuad'));
        }
        case 'heartbeat': {
            const steps: [number, number][] = [
                [0, 1],
                [0.14, 1.2],
                [0.28, 1],
                [0.42, 1.2],
                [1, 1],
            ];
            return steps.map(([f, s]) => kf(at(f), xf(s), 'easeOutQuad'));
        }
        case 'float': {
            const N = 16;
            return Array.from({ length: N + 1 }, (_, i) =>
                kf(at(i / N), { top: rest.top + Math.sin((i / N) * Math.PI * 2) * 12 }, 'linear'),
            );
        }

        case 'fadeOut':
            return [kf(start, { opacity: op }, 'easeInQuad'), kf(end, { opacity: 0 }, 'linear')];
        case 'slideOutLeft':
            return [
                kf(start, { left: rest.left, opacity: op }, 'easeInCubic'),
                kf(end, { left: rest.left - SLIDE, opacity: 0 }, 'linear'),
            ];
        case 'slideOutRight':
            return [
                kf(start, { left: rest.left, opacity: op }, 'easeInCubic'),
                kf(end, { left: rest.left + SLIDE, opacity: 0 }, 'linear'),
            ];
        case 'slideOutUp':
            return [
                kf(start, { top: rest.top, opacity: op }, 'easeInCubic'),
                kf(end, { top: rest.top - SLIDE, opacity: 0 }, 'linear'),
            ];
        case 'slideOutDown':
            return [
                kf(start, { top: rest.top, opacity: op }, 'easeInCubic'),
                kf(end, { top: rest.top + SLIDE, opacity: 0 }, 'linear'),
            ];
        case 'zoomOut':
            return [
                kf(start, { ...xf(1), opacity: op }, 'easeInCubic'),
                kf(end, { ...xf(0.3), opacity: 0 }, 'linear'),
            ];
        case 'rotateOut':
            return [
                kf(start, { ...xf(1), opacity: op }, 'easeInCubic'),
                kf(end, { ...xf(0.6, 0.6, rest.angle + 120), opacity: 0 }, 'linear'),
            ];
        case 'flipOutX':
            return [
                kf(start, { ...xf(1), opacity: op }, 'easeInCubic'),
                kf(end, { ...xf(1, 0), opacity: 0 }, 'linear'),
            ];
    }
}

/** Builds the keyframes for a preset. `repeat` loops emphasis presets back-to-back. */
export function buildPreset(
    id: PresetId,
    obj: FabricObject,
    rest: FullProps,
    start: number,
    dur: number,
    repeat = 1,
): Keyframe[] {
    const out: Keyframe[] = [];
    const meta = PRESETS.find((p) => p.id === id);
    const n = meta?.repeatable ? Math.max(1, Math.min(20, Math.round(repeat))) : 1;
    for (let r = 0; r < n; r++) out.push(...cycle(id, obj, rest, start + r * dur, dur));
    // repeated cycles share boundary keyframes; merge them
    return mergeKeyframes([], out);
}
