/**
 * Draws stamp dabs (`dabs.ts`) with their tips (`tips.ts`) on a context whose current transform maps object
 * units to device pixels, then applies the stroke textures (paper grain, manga screentone). The context must be
 * an isolated layer (the object's cache or an offscreen canvas): textures and "add" blending work on whatever
 * is already in it. Browser only.
 */
import type { Dab } from './dabs';
import type { StampParams } from './stampParams';
import { tintedTip } from './tips';
import { mulberry32 } from './rng';

type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };
type Ctx = CanvasRenderingContext2D & { getTransform?: () => Matrix };

const BLEND: Record<StampParams['blend'], GlobalCompositeOperation> = {
    normal: 'source-over',
    add: 'lighter',
    multiply: 'multiply',
    screen: 'screen',
};

function place(
    ctx: Ctx,
    base: Matrix | undefined,
    d: Dab,
    img: CanvasImageSource,
    size: number,
    sy: number,
) {
    const cos = Math.cos(d.angle);
    const sin = Math.sin(d.angle);
    if (base) {
        const a = cos * size;
        const b = sin * size;
        const c = -sin * size * sy;
        const dd = cos * size * sy;
        ctx.setTransform(
            base.a * a + base.c * b,
            base.b * a + base.d * b,
            base.a * c + base.c * dd,
            base.b * c + base.d * dd,
            base.a * d.x + base.c * d.y + base.e,
            base.b * d.x + base.d * d.y + base.f,
        );
        ctx.drawImage(img, -0.5, -0.5, 1, 1);
        return;
    }
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.scale(size, size * sy);
    ctx.drawImage(img, -0.5, -0.5, 1, 1);
    ctx.restore();
}

/** Paint every dab. `pixelScale` = device pixels per object unit (sizes the cached tips). */
export function renderDabs(ctx: Ctx, dabs: Dab[], P: StampParams, pixelScale: number): void {
    const base = ctx.getTransform?.();
    ctx.save();
    ctx.globalCompositeOperation = BLEND[P.blend] ?? 'source-over';
    for (const d of dabs) {
        const px = d.size * pixelScale;
        if (px < 0.15 || d.alpha <= 0) continue;
        if (P.glow > 0) {
            const halo = d.size * (1 + 2 * P.glow);
            ctx.globalAlpha = d.alpha * P.glow * 0.35;
            place(ctx, base, d, tintedTip('round', 0, 0, halo * pixelScale, d.color), halo, 1);
        }
        ctx.globalAlpha = d.alpha;
        place(ctx, base, d, tintedTip(P.tip, P.hardness, P.wetEdges, px, d.color), d.size, d.sy);
    }
    ctx.restore();
}

const patterns = new Map<string, HTMLCanvasElement>();
function tile(key: string, size: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const hit = patterns.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (ctx) paint(ctx);
    patterns.set(key, c);
    return c;
}

function fillWith(
    ctx: Ctx,
    image: HTMLCanvasElement,
    matrix: DOMMatrix,
    op: GlobalCompositeOperation,
    alpha: number,
    box: { minX: number; minY: number; maxX: number; maxY: number },
) {
    const pattern = ctx.createPattern(image, 'repeat');
    if (!pattern) return;
    pattern.setTransform?.(matrix);
    ctx.save();
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pattern;
    ctx.fillRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
    ctx.restore();
}

/** Paper grain (knocked out) and screentone (dots kept) over the stroke's box, in object units. */
export function applyStrokeTexture(
    ctx: Ctx,
    P: StampParams,
    box: { minX: number; minY: number; maxX: number; maxY: number },
    pixelScale: number,
): void {
    if (typeof DOMMatrix === 'undefined') return;
    if (P.screentone > 0) {
        const n = Math.max(4, Math.min(256, Math.round(P.screentone * pixelScale)));
        const dots = tile(`tone|${n}`, n, (t) => {
            t.fillStyle = '#fff';
            t.beginPath();
            t.arc(n / 2, n / 2, n * 0.36, 0, Math.PI * 2);
            t.fill();
        });
        const k = P.screentone / n;
        fillWith(
            ctx,
            dots,
            new DOMMatrix().rotateSelf(45).scaleSelf(k, k),
            'destination-in',
            1,
            box,
        );
    }
    if (P.grain > 0) {
        const grain = tile('grain', 128, (t) => {
            const img = t.createImageData(128, 128);
            const rnd = mulberry32(99);
            for (let i = 0; i < img.data.length; i += 4) {
                img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
                img.data[i + 3] = rnd() < 0.45 ? 140 + rnd() * 115 : 0;
            }
            t.putImageData(img, 0, 0);
        });
        fillWith(ctx, grain, new DOMMatrix().scaleSelf(0.5, 0.5), 'destination-out', P.grain, box);
    }
}
