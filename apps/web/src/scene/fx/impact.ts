/**
 * Fight effects (docs/COMBAT_PACK.md, Stage 3): lightweight shapes — impact flash, speed lines, a motion smear
 * along the striking limb, a shockwave ring, sweat drops — plus camera shake and hit-stop as numbers. Each effect
 * can be switched off and comes in three strengths (subtle / normal / dramatic: manga). Every shape is one SVG path
 * (the scene draws paths only, so screentone and export work by index). Pure and seeded: the same frame gives the
 * same picture, so baked frames can be cached. Coordinates are frame pixels.
 */
export type FxIntensity = 'subtle' | 'normal' | 'dramatic';
export const FX_INTENSITIES: readonly FxIntensity[] = ['subtle', 'normal', 'dramatic'];

export interface FxToggles {
    flash: boolean;
    speedLines: boolean;
    smear: boolean;
    shockwave: boolean;
    sweat: boolean;
    shake: boolean;
    hitStop: boolean;
}
export const FX_ALL_ON: FxToggles = {
    flash: true,
    speedLines: true,
    smear: true,
    shockwave: true,
    sweat: true,
    shake: true,
    hitStop: true,
};
export const FX_KEYS = Object.keys(FX_ALL_ON) as (keyof FxToggles)[];

export interface FxLevel {
    /** flash radius as a share of the frame height, and its spikes */
    flash: number;
    spikes: number;
    /** shockwave: largest radius (share of frame height) and stroke */
    ring: number;
    ringWidth: number;
    /** speed lines: how many and how long (share of frame height) */
    lines: number;
    lineLength: number;
    sweat: number;
    /** camera shake: amplitude (share of frame height) and how many frames it lasts */
    shake: number;
    shakeFrames: number;
    /** frames frozen on impact */
    hitStop: number;
}

export const FX_LEVELS: Record<FxIntensity, FxLevel> = {
    subtle: {
        flash: 0.05,
        spikes: 6,
        ring: 0.08,
        ringWidth: 2,
        lines: 4,
        lineLength: 0.08,
        sweat: 2,
        shake: 0.004,
        shakeFrames: 3,
        hitStop: 2,
    },
    normal: {
        flash: 0.08,
        spikes: 9,
        ring: 0.14,
        ringWidth: 3,
        lines: 7,
        lineLength: 0.14,
        sweat: 4,
        shake: 0.008,
        shakeFrames: 5,
        hitStop: 3,
    },
    dramatic: {
        flash: 0.13,
        spikes: 14,
        ring: 0.22,
        ringWidth: 5,
        lines: 12,
        lineLength: 0.22,
        sweat: 7,
        shake: 0.015,
        shakeFrames: 8,
        hitStop: 4,
    },
};

/** One path of an effect. */
export interface FxShape {
    key: string;
    d: string;
    fill: string;
    stroke: string | null;
    strokeWidth: number;
    opacity?: number;
}

type P = [number, number];
const INK = '#1a1a1a';
const f1 = (n: number) => Math.round(n * 10) / 10;
const poly = (ps: readonly P[]) =>
    ps.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('') + 'Z';
const ellipsePath = (cx: number, cy: number, rx: number, ry: number) =>
    `M${f1(cx - rx)} ${f1(cy)}A${f1(rx)} ${f1(ry)} 0 1 0 ${f1(cx + rx)} ${f1(cy)}A${f1(rx)} ${f1(ry)} 0 1 0 ${f1(cx - rx)} ${f1(cy)}Z`;

/** A tiny seeded generator (mulberry32), so effects are the same on every render. */
function seeded(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A spiky burst with a white core at the impact point. */
export function impactFlash(
    x: number,
    y: number,
    frameH: number,
    lv: FxLevel,
    seed = 1,
): FxShape[] {
    const r = lv.flash * frameH;
    const rand = seeded(seed);
    const star: P[] = [];
    const n = lv.spikes * 2;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const k = i % 2 ? 0.45 : 0.8 + rand() * 0.45;
        star.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]);
    }
    return [
        { key: 'fx-flash', d: poly(star), fill: '#fff6c2', stroke: INK, strokeWidth: 2 },
        {
            key: 'fx-flash-core',
            d: ellipsePath(x, y, r * 0.3, r * 0.3),
            fill: '#ffffff',
            stroke: null,
            strokeWidth: 0,
        },
    ];
}

/** A ring that grows and fades over `t` = 0..1 after the impact. */
export function shockwave(x: number, y: number, t: number, frameH: number, lv: FxLevel): FxShape[] {
    const k = Math.min(1, Math.max(0, t));
    const r = lv.ring * frameH * (0.25 + 0.75 * k);
    return [
        {
            key: 'fx-ring',
            d: ellipsePath(x, y, r, r * 0.6),
            fill: 'none',
            stroke: '#ffffff',
            strokeWidth: lv.ringWidth,
            opacity: Math.round((1 - k) * 100) / 100,
        },
    ];
}

/** Manga speed lines trailing behind a moving point (`angle` = direction of motion, radians). */
export function speedLines(
    x: number,
    y: number,
    angle: number,
    frameH: number,
    lv: FxLevel,
    seed = 2,
): FxShape[] {
    const rand = seeded(seed);
    const back = angle + Math.PI;
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    let d = '';
    for (let i = 0; i < lv.lines; i++) {
        const off = (rand() - 0.5) * lv.flash * frameH * 1.6;
        const len = lv.lineLength * frameH * (0.5 + rand() * 0.5);
        const sx = x + nx * off + Math.cos(back) * len * 0.15;
        const sy = y + ny * off + Math.sin(back) * len * 0.15;
        d += `M${f1(sx)} ${f1(sy)}L${f1(sx + Math.cos(back) * len)} ${f1(sy + Math.sin(back) * len)}`;
    }
    return [{ key: 'fx-speed', d, fill: 'none', stroke: INK, strokeWidth: 1.5, opacity: 0.7 }];
}

/**
 * A motion smear: a tapering ribbon along the path the striking limb travelled (oldest first), wide at the limb
 * and thin at the tail.
 */
export function smear(path: readonly P[], width: number): FxShape[] {
    if (path.length < 2) return [];
    const left: P[] = [];
    const right: P[] = [];
    for (let i = 0; i < path.length; i++) {
        const [x, y] = path[i];
        const [px, py] = path[Math.max(0, i - 1)];
        const [qx, qy] = path[Math.min(path.length - 1, i + 1)];
        const dx = qx - px;
        const dy = qy - py;
        const l = Math.hypot(dx, dy) || 1;
        const w = (width * (i + 1)) / path.length / 2;
        left.push([x - (dy / l) * w, y + (dx / l) * w]);
        right.push([x + (dy / l) * w, y - (dx / l) * w]);
    }
    return [
        {
            key: 'fx-smear',
            d: poly([...left, ...right.reverse()]),
            fill: '#ffffff',
            stroke: null,
            strokeWidth: 0,
            opacity: 0.55,
        },
    ];
}

/** Sweat drops flung from a point (a hit head), along the strike (`angle`, radians). */
export function sweatDrops(
    x: number,
    y: number,
    angle: number,
    frameH: number,
    lv: FxLevel,
    seed = 3,
): FxShape[] {
    const rand = seeded(seed);
    const s = frameH * 0.008;
    const out: FxShape[] = [];
    for (let i = 0; i < lv.sweat; i++) {
        const a = angle + (rand() - 0.5) * 1.4;
        const r = frameH * (0.03 + rand() * 0.06);
        const cx = x + Math.cos(a) * r;
        const cy = y + Math.sin(a) * r;
        const tx = cx - Math.cos(a) * s * 2.4;
        const ty = cy - Math.sin(a) * s * 2.4;
        out.push({
            key: `fx-sweat${i}`,
            d: `M${f1(tx)} ${f1(ty)}Q${f1(cx + s)} ${f1(cy - s)} ${f1(cx)} ${f1(cy + s)}Q${f1(cx - s)} ${f1(cy - s)} ${f1(tx)} ${f1(ty)}Z`,
            fill: '#cfe9ff',
            stroke: INK,
            strokeWidth: 1,
        });
    }
    return out;
}

/** Camera shake offset (frame pixels) `k` frames after the impact: a decaying wobble, zero once it is over. */
export function shakeOffset(k: number, frameH: number, lv: FxLevel): [number, number] {
    if (k < 0 || k >= lv.shakeFrames) return [0, 0];
    const amp = lv.shake * frameH * (1 - k / lv.shakeFrames);
    return [f1(Math.sin(k * 2.1) * amp), f1(Math.cos(k * 2.9) * amp * 0.6)];
}

export type FxContact = 'hit' | 'block' | 'miss';

export interface ImpactCtx {
    /** frames since the impact (0 = the impact frame; negative = before it) */
    k: number;
    /** impact point and the direction the strike travels (radians), in frame pixels */
    at: P;
    angle: number;
    /** the striking limb's recent path (oldest first), for the smear */
    trail?: readonly P[];
    frameH: number;
    intensity: FxIntensity;
    on?: Partial<FxToggles>;
    /** a miss shows motion only, a block a smaller burst without sweat */
    contact?: FxContact;
    seed?: number;
}

/** Everything for one frame of one impact, as path shapes ([] when nothing shows). */
export function impactShapes(c: ImpactCtx): FxShape[] {
    const lv = FX_LEVELS[c.intensity];
    const on = { ...FX_ALL_ON, ...c.on };
    const [x, y] = c.at;
    const seed = c.seed ?? 1;
    const contact = c.contact ?? 'hit';
    const out: FxShape[] = [];
    // the motion: before the impact, and on the impact frame of a still picture
    if (c.k <= 0) {
        if (on.smear && c.trail) out.push(...smear(c.trail, c.frameH * lv.flash * 0.6));
        if (on.speedLines && c.k >= -2) out.push(...speedLines(x, y, c.angle, c.frameH, lv, seed));
    }
    if (c.k < 0 || contact === 'miss') return out;
    const hold = on.hitStop ? lv.hitStop : 0;
    const size = contact === 'block' ? 0.7 : 1;
    if (on.flash && c.k <= hold) out.push(...impactFlash(x, y, c.frameH * size, lv, seed));
    const ringT = c.k / (hold + 6);
    if (on.shockwave && ringT <= 1) out.push(...shockwave(x, y, ringT, c.frameH * size, lv));
    if (on.sweat && contact === 'hit' && c.k <= hold + 4)
        out.push(...sweatDrops(x, y, c.angle, c.frameH * (1 + c.k * 0.05), lv, seed + 7));
    return out;
}

/** The shapes as one SVG group (for overlays outside the scene renderer). */
export function fxSvg(shapes: readonly FxShape[]): string {
    if (!shapes.length) return '';
    const body = shapes
        .map(
            (s) =>
                `<path d="${s.d}" fill="${s.fill}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round"` : ''}${s.opacity !== undefined ? ` opacity="${s.opacity}"` : ''}/>`,
        )
        .join('');
    return `<g class="fx">${body}</g>`;
}
