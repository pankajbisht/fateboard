/**
 * Screentones (manga tone sheets, 2026-11-17), pure drawing helpers. A tone is a seamless tile (dots, lines,
 * cross-hatch or noise) used as a Fabric pattern fill, turned by `angle` (pattern transform). The settings are
 * kept on the object (`toneParams`, in CUSTOM_PROPS) so the Comic panel can show and change them.
 */
import { mulberry32 } from '@/lib/brushes/stamp/rng';

export const TONE_KINDS = ['dots', 'lines', 'cross', 'noise'] as const;
export type ToneKind = (typeof TONE_KINDS)[number];

export interface ToneParams {
    kind: ToneKind;
    /** Cell size (lines per inch, inverted), px, 3 … 40. */
    spacing: number;
    /** Ink coverage, 0.05 … 0.95. */
    density: number;
    /** Screen angle, degrees, 0 … 180. */
    angle: number;
    color: string;
}

export const DEFAULT_TONE: ToneParams = {
    kind: 'dots',
    spacing: 8,
    density: 0.3,
    angle: 45,
    color: '#000000',
};

const clamp = (v: unknown, lo: number, hi: number, d: number) =>
    Number.isFinite(Number(v)) && v !== null && v !== ''
        ? Math.min(hi, Math.max(lo, Number(v)))
        : d;

export function normalizeTone(input: unknown): ToneParams {
    const r = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const angle = clamp(r.angle, -1e6, 1e6, DEFAULT_TONE.angle);
    return {
        kind: TONE_KINDS.includes(r.kind as ToneKind) ? (r.kind as ToneKind) : DEFAULT_TONE.kind,
        spacing: Math.round(clamp(r.spacing, 3, 40, DEFAULT_TONE.spacing)),
        density: clamp(r.density, 0.05, 0.95, DEFAULT_TONE.density),
        angle: ((angle % 180) + 180) % 180,
        color:
            typeof r.color === 'string' && /^#[0-9a-f]{6}$/i.test(r.color)
                ? r.color
                : DEFAULT_TONE.color,
    };
}

/** Tile side, px: one cell, or a larger random patch for noise. */
export const toneTileSize = (p: ToneParams) => (p.kind === 'noise' ? 64 : p.spacing);

/** Paint one seamless tile (size × size) on a transparent context. */
export function paintToneTile(ctx: CanvasRenderingContext2D, p: ToneParams, size: number) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = p.color;
    if (p.kind === 'dots') {
        // area of one dot = density × cell area; a dot at the centre and quarter dots at the corners (seamless)
        const r = Math.sqrt((p.density * size * size) / Math.PI) / Math.SQRT2;
        const dot = (x: number, y: number) => {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        };
        dot(size / 2, size / 2);
        for (const [x, y] of [
            [0, 0],
            [size, 0],
            [0, size],
            [size, size],
        ])
            dot(x, y);
    } else if (p.kind === 'lines') {
        ctx.fillRect(0, 0, size, size * p.density);
    } else if (p.kind === 'cross') {
        const t = size * (1 - Math.sqrt(1 - p.density));
        ctx.fillRect(0, 0, size, t);
        ctx.fillRect(0, 0, t, size);
    } else {
        const rnd = mulberry32(Math.round(p.density * 1000) + 7);
        const count = Math.round(size * size * p.density * 0.25);
        for (let i = 0; i < count; i++)
            ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1, 1);
    }
}
