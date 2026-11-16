/**
 * Brush tips for the stamp engine: each tip is drawn once per size bucket as a white alpha mask on an
 * offscreen canvas, then tinted per colour (both cached). Shapes are procedural (no image files), drawn in a
 * unit box (-1 … 1) so every tip scales cleanly. Browser only (needs a 2D canvas).
 */
import { mulberry32 } from './rng';
import type { TipShape } from './stampParams';

type Ctx = CanvasRenderingContext2D;
const MIN_BUCKET = 8;
const MAX_BUCKET = 512;
const MAX_TINTS = 256;

const masks = new Map<string, HTMLCanvasElement>();
const tints = new Map<string, HTMLCanvasElement>();

/** Power-of-two pixel size a tip is drawn at for a dab of `px` device pixels. */
export const tipBucket = (px: number) =>
    Math.min(MAX_BUCKET, Math.max(MIN_BUCKET, 2 ** Math.ceil(Math.log2(Math.max(1, px * 1.25)))));

/** Colour rounded to 8 levels a channel step, so jittered colours share cached tints. */
export function quantizeHex(hex: string): string {
    const n = parseInt(hex.slice(1, 7), 16);
    if (!Number.isFinite(n)) return '#000000';
    const q = (c: number) => Math.min(255, Math.round(c / 8) * 8);
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255]
        .map((c) => q(c).toString(16).padStart(2, '0'))
        .join('')}`;
}

const canvasOf = (size: number) => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return c;
};

function softDisc(ctx: Ctx, hardness: number, wet: number, r = 1, x = 0, y = 0, alpha = 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const inner = 1 - wet * 0.65;
    const h = Math.min(0.98, Math.max(0, hardness));
    g.addColorStop(0, `rgba(255,255,255,${inner * alpha})`);
    g.addColorStop(h, `rgba(255,255,255,${inner * alpha})`);
    if (wet > 0) g.addColorStop(Math.max(h, 0.9), `rgba(255,255,255,${alpha})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function star(ctx: Ctx, points: number, outer: number, inner: number) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 ? inner : outer;
        const a = (i * Math.PI) / points - Math.PI / 2;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
}

/** Knock random speckles out of what is drawn (pencil graphite, chalk). */
function speckle(ctx: Ctx, size: number, density: number, blob: number, seed: number) {
    const rnd = mulberry32(seed);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#fff';
    const n = Math.round(size * size * density * 0.02);
    for (let i = 0; i < n; i++) {
        ctx.globalAlpha = 0.4 + rnd() * 0.6;
        const r = Math.max(0.5, blob * size * rnd());
        ctx.beginPath();
        ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

/** Draws `tip` filling the unit box (-1 … 1) of `ctx`, white on transparent. */
function drawTip(ctx: Ctx, tip: TipShape, hardness: number, wet: number, size: number) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    const rnd = mulberry32(tip.length * 7919 + 13);
    switch (tip) {
        case 'square': {
            const steps = hardness >= 0.95 ? 1 : 10;
            ctx.globalAlpha = 1 / steps;
            for (let k = 0; k < steps; k++) {
                const r = 0.95 - (1 - hardness) * 0.9 * (k / Math.max(1, steps - 1));
                ctx.fillRect(-r, -r, r * 2, r * 2);
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'grain':
            softDisc(ctx, hardness, 0);
            speckle(ctx, size, 1.6, 0.02, 11);
            break;
        case 'chalk':
            softDisc(ctx, Math.max(0.85, hardness), 0);
            speckle(ctx, size, 0.9, 0.05, 23);
            break;
        case 'bristle':
            for (let i = 0; i < 11; i++) {
                const x = -0.92 + (i / 10) * 1.84;
                softDisc(
                    ctx,
                    0.6,
                    0,
                    0.07 + rnd() * 0.08,
                    x,
                    (rnd() - 0.5) * 0.25,
                    0.55 + rnd() * 0.45,
                );
            }
            break;
        case 'hatch':
            ctx.lineWidth = 0.12;
            for (const y of [-0.72, -0.24, 0.24, 0.72]) {
                ctx.beginPath();
                ctx.moveTo(-0.95, y);
                ctx.lineTo(0.95, y);
                ctx.stroke();
            }
            break;
        case 'star':
            star(ctx, 5, 0.98, 0.42);
            break;
        case 'spark':
            softDisc(ctx, 0, 0, 0.45, 0, 0, 0.9);
            star(ctx, 4, 0.98, 0.1);
            break;
        case 'splat':
            ctx.beginPath();
            ctx.arc(0, 0, 0.5, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < 9; i++) {
                const a = rnd() * Math.PI * 2;
                const d = 0.55 + rnd() * 0.38;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.04 + rnd() * 0.1, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'leaf': {
            ctx.beginPath();
            ctx.moveTo(0, -0.98);
            ctx.bezierCurveTo(0.7, -0.5, 0.7, 0.5, 0, 0.98);
            ctx.bezierCurveTo(-0.7, 0.5, -0.7, -0.5, 0, -0.98);
            ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 0.07;
            ctx.beginPath();
            ctx.moveTo(0, -0.8);
            ctx.lineTo(0, 0.85);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
            break;
        }
        case 'grass':
            for (const [x, top, lean] of [
                [-0.45, -0.55, -0.25],
                [0, -0.98, 0.1],
                [0.4, -0.7, 0.3],
            ]) {
                ctx.beginPath();
                ctx.moveTo(x - 0.1, 0.98);
                ctx.quadraticCurveTo(x, 0.2, x + lean, top);
                ctx.quadraticCurveTo(x + 0.04, 0.2, x + 0.1, 0.98);
                ctx.fill();
            }
            break;
        case 'cloud':
            for (const [x, y, r] of [
                [0, 0.1, 0.62],
                [-0.42, 0.22, 0.45],
                [0.45, 0.2, 0.45],
                [-0.18, -0.3, 0.45],
                [0.25, -0.25, 0.4],
            ])
                softDisc(ctx, Math.min(0.5, hardness), 0, r, x, y, 0.75);
            break;
        case 'flame': {
            const g = ctx.createRadialGradient(0, 0.45, 0, 0, 0.2, 1);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(Math.max(0.05, hardness * 0.7), 'rgba(255,255,255,0.85)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(0, -0.98);
            ctx.bezierCurveTo(0.45, -0.35, 0.7, 0.35, 0, 0.98);
            ctx.bezierCurveTo(-0.7, 0.35, -0.45, -0.35, 0, -0.98);
            ctx.fill();
            break;
        }
        case 'snow':
            ctx.lineWidth = 0.1;
            for (let i = 0; i < 6; i++) {
                ctx.save();
                ctx.rotate((i * Math.PI) / 3);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -0.95);
                ctx.moveTo(0, -0.55);
                ctx.lineTo(0.25, -0.75);
                ctx.moveTo(0, -0.55);
                ctx.lineTo(-0.25, -0.75);
                ctx.stroke();
                ctx.restore();
            }
            break;
        case 'heart':
            ctx.beginPath();
            ctx.moveTo(0, 0.9);
            ctx.bezierCurveTo(-1.2, 0, -0.6, -1, 0, -0.4);
            ctx.bezierCurveTo(0.6, -1, 1.2, 0, 0, 0.9);
            ctx.fill();
            break;
        case 'drop':
            ctx.beginPath();
            ctx.moveTo(0, -0.98);
            ctx.bezierCurveTo(0.2, -0.5, 0.7, 0, 0.7, 0.3);
            ctx.arc(0, 0.3, 0.7, 0, Math.PI);
            ctx.bezierCurveTo(-0.7, 0, -0.2, -0.5, 0, -0.98);
            ctx.fill();
            break;
        case 'ring':
            ctx.lineWidth = 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, 0.85, 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'round':
        default:
            softDisc(ctx, hardness, wet);
    }
}

/** The tip's white mask at the bucket for `px`. */
export function tipMask(
    tip: TipShape,
    hardness: number,
    wet: number,
    px: number,
): HTMLCanvasElement {
    const size = tipBucket(px);
    const key = `${tip}|${hardness.toFixed(2)}|${wet.toFixed(2)}|${size}`;
    const hit = masks.get(key);
    if (hit) return hit;
    const c = canvasOf(size);
    const ctx = c.getContext('2d');
    if (ctx) {
        ctx.translate(size / 2, size / 2);
        ctx.scale(size / 2, size / 2);
        drawTip(ctx, tip, hardness, wet, size);
    }
    masks.set(key, c);
    return c;
}

/** The tip mask filled with `hex` (cached; least recently made dropped first). */
export function tintedTip(
    tip: TipShape,
    hardness: number,
    wet: number,
    px: number,
    hex: string,
): HTMLCanvasElement {
    const mask = tipMask(tip, hardness, wet, px);
    const color = quantizeHex(hex);
    const key = `${tip}|${hardness.toFixed(2)}|${wet.toFixed(2)}|${mask.width}|${color}`;
    const hit = tints.get(key);
    if (hit) return hit;
    const c = canvasOf(mask.width);
    const ctx = c.getContext('2d');
    if (ctx) {
        ctx.drawImage(mask, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, c.width, c.height);
    }
    if (tints.size >= MAX_TINTS) tints.delete(tints.keys().next().value as string);
    tints.set(key, c);
    return c;
}
