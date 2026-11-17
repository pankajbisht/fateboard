import { useEffect, useRef } from 'react';
import { flattenPenNodes } from '@/lib/canvas/penShape';
import { strokeDabs, type StrokePoint } from '@/lib/brushes/stamp/dabs';
import { applyStrokeTexture, renderDabs } from '@/lib/brushes/stamp/renderDabs';
import type { StampParams } from '@/lib/brushes/stamp/stampParams';

/** Sample stroke: the same S curve as the classic previews, in an 80 × 40 box, with a pressure swell. */
const CURVE = [
    { x: 10, y: 30, out: { x: 30, y: 2 } },
    { x: 70, y: 12, in: { x: 50, y: 42 } },
];
const PATH = flattenPenNodes(CURVE, 48);
const POINTS: StrokePoint[] = PATH.map((p, i) => ({
    x: p.x,
    y: p.y,
    p: Math.sin((i / (PATH.length - 1)) * Math.PI) * 0.8 + 0.2,
    t: i * 16,
}));

/** Colours that show off a family (fire on black would look like soot). Others use the text colour. */
const FAMILY_COLOR: Record<string, string> = {
    fire: '#ff6a00',
    smoke: '#94a3b8',
    magic: '#a855f7',
    nature: '#3f9b3f',
    watercolor: '#2563eb',
};

/**
 * A stamp brush drawn by the real engine (same dabs as on the canvas), in the brush tile. Decorative: the
 * tile's label names the brush.
 */
export function StampPreview({
    params,
    width,
    category,
}: {
    params: StampParams;
    width: number;
    category?: string;
}) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || typeof ctx.setTransform !== 'function') return;
        const k = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
        canvas.width = 80 * k;
        canvas.height = 40 * k;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        const ink = getComputedStyle(canvas).color || '#111827';
        const color = FAMILY_COLOR[category ?? ''] ?? toHex(ink);
        const size = Math.min(
            params.spray ? 22 : 14,
            Math.max(2, width / (params.spray ? 2.5 : 2.2)),
        );
        const dabs = strokeDabs(POINTS, params, size, color, 7);
        try {
            renderDabs(ctx, dabs, params, k);
            applyStrokeTexture(ctx, params, { minX: 0, minY: 0, maxX: 80, maxY: 40 }, k);
        } catch {
            /* a preview never breaks the panel */
        }
    }, [params, width, category]);
    return <canvas ref={ref} aria-hidden className="h-10 w-full text-ink" width={80} height={40} />;
}

/** rgb(…) from getComputedStyle → #rrggbb (the engine mixes hex colours). */
function toHex(css: string): string {
    const m = css.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return '#111827';
    return `#${m
        .slice(0, 3)
        .map((v) => Math.round(Number(v)).toString(16).padStart(2, '0'))
        .join('')}`;
}
