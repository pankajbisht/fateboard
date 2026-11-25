// src/lib/pathRepeat.ts
// Pure geometry for "Repeat Along Path". No store, no React, so the live preview
// and the final apply use exactly the same numbers.
import { BRAND } from '@/lib/theme';
import * as fabric from 'fabric';

/* --------------------------------- types ---------------------------------- */
export type RepeatMode = 'spacing' | 'count';
export type RotateMode = 'path' | 'fixed' | 'random';

export interface AlongPathOptions {
    mode: RepeatMode;
    spacing: number; // px between copies (mode = spacing)
    count: number; // number of copies (mode = count)
    startOffset: number; // % of path length skipped at the start
    endOffset: number; // % of path length skipped at the end
    reverse: boolean; // walk the path backwards
    includeEnd: boolean; // count mode: last copy sits exactly on the end point
    rotate: RotateMode; // follow tangent / keep original angle / random
    angleOffset: number; // degrees added to the rotation
    sideOffset: number; // px pushed perpendicular to the path
    alternateSide: boolean; // flip sideOffset on every other copy (footsteps, zig-zag)
    alternateFlip: boolean; // mirror every other copy
    scaleStart: number; // size multiplier at the start
    scaleEnd: number; // size multiplier at the end (taper)
    opacityStart: number; // 0..1
    opacityEnd: number; // 0..1 (fade out)
    jitterPosition: number; // px, random nudge
    jitterRotation: number; // degrees, random +/-
    jitterScale: number; // 0..1, random +/- fraction
    seed: number; // same seed = same random layout
}

export const DEFAULT_ALONG_PATH: AlongPathOptions = {
    mode: 'spacing',
    spacing: 40,
    count: 12,
    startOffset: 0,
    endOffset: 0,
    reverse: false,
    includeEnd: true,
    rotate: 'path',
    angleOffset: 0,
    sideOffset: 0,
    alternateSide: false,
    alternateFlip: false,
    scaleStart: 1,
    scaleEnd: 1,
    opacityStart: 1,
    opacityEnd: 1,
    jitterPosition: 0,
    jitterRotation: 0,
    jitterScale: 0,
    seed: 1,
};

export interface PathSample {
    x: number; // canvas coordinates (object centre)
    y: number;
    angle: number; // final rotation in degrees
    scale: number; // multiplier on the source's own scale
    opacity: number; // multiplier on the source's own opacity
    flip: boolean; // toggle flipY relative to the source
}

export interface SampleResult {
    samples: PathSample[];
    length: number;
    closed: boolean;
    requested: number;
    tooMany: boolean;
}

/* --------------------------------- helpers -------------------------------- */
const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** small seeded RNG so jitter is repeatable (preview == result) */
const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export const isClosedPath = (p: fabric.Path) => {
    const last = (p.path as any[]).at(-1);
    return String(last?.[0] ?? '').toUpperCase() === 'Z';
};

/* ----------------------------- guide conversion ---------------------------- */
/** Shapes that can act as a path. Paths are used directly, the rest are converted. */
export const isGuideCandidate = (o?: fabric.Object | null): o is fabric.Object =>
    !!o &&
    (o instanceof fabric.Path ||
        o instanceof fabric.Line ||
        o instanceof fabric.Circle ||
        o instanceof fabric.Ellipse ||
        o instanceof fabric.Rect ||
        o instanceof fabric.Polyline); // Polygon extends Polyline

type Cmd = ['M' | 'L' | 'C' | 'Z', ...number[]];

/** local-space commands -> SVG path string in canvas (world) coordinates */
const toWorldPathString = (obj: fabric.Object, cmds: Cmd[]) => {
    const m = obj.calcTransformMatrix();
    const f = (n: number) => +n.toFixed(3);
    return cmds
        .map(([c, ...n]) => {
            if (c === 'Z') return 'Z';
            const out: number[] = [];
            for (let i = 0; i < n.length; i += 2) {
                const p = fabric.util.transformPoint(new fabric.Point(n[i], n[i + 1]), m);
                out.push(f(p.x), f(p.y));
            }
            return `${c} ${out.join(' ')}`;
        })
        .join(' ');
};

const ellipseCmds = (rx: number, ry: number): Cmd[] => {
    const k = 0.5522847498;
    return [
        ['M', rx, 0],
        ['C', rx, ry * k, rx * k, ry, 0, ry],
        ['C', -rx * k, ry, -rx, ry * k, -rx, 0],
        ['C', -rx, -ry * k, -rx * k, -ry, 0, -ry],
        ['C', rx * k, -ry, rx, -ry * k, rx, 0],
        ['Z'],
    ];
};

/**
 * Returns a fabric.Path that follows the given object in canvas coordinates.
 * A Path is returned as-is; other shapes give a fresh, detached Path (not on the canvas).
 */
export const toGuidePath = (obj: fabric.Object): fabric.Path | null => {
    if (obj instanceof fabric.Path) return obj;

    let cmds: Cmd[] | null = null;

    if (obj instanceof fabric.Circle) {
        cmds = ellipseCmds(obj.radius, obj.radius);
    } else if (obj instanceof fabric.Ellipse) {
        cmds = ellipseCmds(obj.rx, obj.ry);
    } else if (obj instanceof fabric.Rect) {
        const w = obj.width / 2;
        const h = obj.height / 2;
        cmds = [['M', -w, -h], ['L', w, -h], ['L', w, h], ['L', -w, h], ['Z']];
    } else if (obj instanceof fabric.Line) {
        const { x1, y1, x2, y2 } = obj.calcLinePoints();
        cmds = [
            ['M', x1, y1],
            ['L', x2, y2],
        ];
    } else if (obj instanceof fabric.Polyline) {
        const off = obj.pathOffset;
        const pts = obj.points.map((p) => [p.x - off.x, p.y - off.y]);
        if (pts.length < 2) return null;
        cmds = pts.map(([x, y], i) => [i ? 'L' : 'M', x, y] as Cmd);
        if (obj instanceof fabric.Polygon) cmds.push(['Z']);
    }

    return cmds ? new fabric.Path(toWorldPathString(obj, cmds)) : null;
};

/* ------------------------------ guide presets ------------------------------ */
export const GUIDE_FLAG = 'alongPathGuide';
export const isPanelGuide = (o?: fabric.Object | null) => !!(o as any)?.data?.[GUIDE_FLAG];

const spiralPath = () => {
    const parts: string[] = [];
    for (let i = 0; i <= 180; i++) {
        const t = i / 180;
        const a = t * 3 * 2 * Math.PI;
        const r = t * 130;
        parts.push(
            `${i ? 'L' : 'M'} ${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`,
        );
    }
    return parts.join(' ');
};

export const GUIDE_PRESETS: { id: string; label: string; d: string }[] = [
    { id: 'line', label: 'Line', d: 'M 0 0 L 300 0' },
    { id: 'arc', label: 'Arc', d: 'M 0 0 Q 150 -160 300 0' },
    { id: 's-curve', label: 'S-curve', d: 'M 0 0 C 100 -120 200 120 300 0' },
    { id: 'wave', label: 'Wave', d: 'M 0 0 Q 37.5 -50 75 0 T 150 0 T 225 0 T 300 0' },
    {
        id: 'zigzag',
        label: 'Zig-zag',
        d: 'M 0 0 L 50 -50 L 100 50 L 150 -50 L 200 50 L 250 -50 L 300 0',
    },
    { id: 'circle', label: 'Circle', d: toCirclePath(120) },
    {
        id: 'heart',
        label: 'Heart',
        d: 'M 150 280 C 60 200 0 140 0 80 C 0 30 40 0 80 0 C 110 0 135 18 150 45 C 165 18 190 0 220 0 C 260 0 300 30 300 80 C 300 140 240 200 150 280 Z',
    },
    { id: 'spiral', label: 'Spiral', d: spiralPath() },
];

function toCirclePath(r: number) {
    const k = r * 0.5523;
    return `M ${r} 0 C ${r} ${k} ${k} ${r} 0 ${r} C ${-k} ${r} ${-r} ${k} ${-r} 0 C ${-r} ${-k} ${-k} ${-r} 0 ${-r} C ${k} ${-r} ${r} ${-k} ${r} 0 Z`;
}

/** A visible, editable, non-exported guide the user can drag/scale on the canvas. */
export const createGuide = (presetId: string, center: fabric.Point) => {
    const preset = GUIDE_PRESETS.find((p) => p.id === presetId) ?? GUIDE_PRESETS[0];
    const path = new fabric.Path(preset.d, {
        fill: '',
        stroke: BRAND.primary,
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        strokeUniform: true,
        objectCaching: false,
        excludeFromExport: true,
        data: { [GUIDE_FLAG]: true },
    } as any);
    path.setPositionByOrigin(center, 'center', 'center');
    path.setCoords();
    return path;
};

/* --------------------------------- sampler -------------------------------- */
/**
 * Computes where every copy goes. `baseAngle` is the source object's own angle
 * (used when rotate = 'fixed'). `maxCopies` guards against freezing the tab.
 */
export const sampleAlongPath = (
    guide: fabric.Path,
    o: AlongPathOptions,
    baseAngle = 0,
    maxCopies = 1000,
): SampleResult => {
    const none = (extra: Partial<SampleResult> = {}): SampleResult => ({
        samples: [],
        length: 0,
        closed: false,
        requested: 0,
        tooMany: false,
        ...extra,
    });

    // `length` of each info entry is the length of THAT segment, so the total is the sum
    const infos = fabric.util.getPathSegmentsInfo(guide.path);
    const length = infos.reduce((sum, s) => sum + (s.length || 0), 0);
    if (!(length > 0)) return none();

    const closed = isClosedPath(guide);
    const startPct = clamp(o.startOffset, 0, 99);
    const endPct = clamp(o.endOffset, 0, 99);
    const from = (length * startPct) / 100;
    const to = length * (1 - endPct / 100);
    const span = to - from;
    if (!(span > 0)) return none({ length, closed });

    // a closed path walked end to end must not put a copy on the start twice
    const fullLoop = closed && startPct === 0 && endPct === 0;

    let n: number;
    let step: number;
    if (o.mode === 'count') {
        n = Math.max(1, Math.floor(o.count) || 1);
        const divisions = fullLoop || !o.includeEnd ? n : Math.max(1, n - 1);
        step = span / divisions;
    } else {
        step = Math.max(0.01, o.spacing);
        n = Math.floor(span / step + 1e-9) + 1;
        if (fullLoop && n > 1 && Math.abs((n - 1) * step - span) < 1e-6) n -= 1;
    }
    if (n > maxCopies) return { samples: [], length, closed, requested: n, tooMany: true };

    const rand = mulberry32(o.seed);
    const matrix = guide.calcTransformMatrix();
    const offset = guide.pathOffset; // path-local points are relative to this, subtract it first

    const world = (d: number) => {
        const p = fabric.util.getPointOnPath(guide.path, d, infos);
        return fabric.util.transformPoint(new fabric.Point(p.x - offset.x, p.y - offset.y), matrix);
    };

    // tangent from two nearby points: stays correct under scale, rotation and skew of the path
    const eps = Math.min(0.5, length / 1000);
    const samples: PathSample[] = [];

    for (let k = 0; k < n; k++) {
        const along = Math.min(from + k * step, to);
        const d = clamp(o.reverse ? from + to - along : along, 0, length);

        const p = world(d);
        const a = world(clamp(d - eps, 0, length));
        const b = world(clamp(d + eps, 0, length));
        let rad = Math.atan2(b.y - a.y, b.x - a.x);
        if (o.reverse) rad += Math.PI;

        // always draw the same number of randoms per copy so changing one slider doesn't reshuffle the rest
        const r1 = rand();
        const r2 = rand();
        const r3 = rand();
        const r4 = rand();

        const side = o.sideOffset * (o.alternateSide && k % 2 === 1 ? -1 : 1);
        let x = p.x - Math.sin(rad) * side;
        let y = p.y + Math.cos(rad) * side;
        if (o.jitterPosition > 0) {
            x += (r1 - 0.5) * 2 * o.jitterPosition;
            y += (r2 - 0.5) * 2 * o.jitterPosition;
        }

        const tangent = (rad * 180) / Math.PI;
        const jr = (r3 - 0.5) * 2 * o.jitterRotation;
        const angle =
            o.rotate === 'path'
                ? tangent + o.angleOffset + jr
                : o.rotate === 'random'
                  ? r3 * 360 + o.angleOffset
                  : baseAngle + o.angleOffset + jr;

        const t = n > 1 ? k / (n - 1) : 0;
        samples.push({
            x,
            y,
            angle,
            scale: Math.max(
                0.01,
                lerp(o.scaleStart, o.scaleEnd, t) * (1 + (r4 - 0.5) * 2 * o.jitterScale),
            ),
            opacity: clamp(lerp(o.opacityStart, o.opacityEnd, t), 0, 1),
            flip: o.alternateFlip && k % 2 === 1,
        });
    }

    return { samples, length, closed, requested: n, tooMany: false };
};
