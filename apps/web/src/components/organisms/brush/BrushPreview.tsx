import { getPreset, type BrushType } from '@/store/brushConfig';
import { flattenPenNodes, shapedOutline } from '@/lib/canvas/penShape';
import { nibOutline } from '@/lib/brushes/nibOutline';

/** One sample stroke (an S curve in an 80 × 40 box), drawn the way each brush engine paints it. */
const CURVE = [
    { x: 8, y: 30, out: { x: 30, y: 2 } },
    { x: 72, y: 12, in: { x: 50, y: 42 } },
];
const POINTS = flattenPenNodes(CURVE, 24);
const D = 'M8 30 C30 2 50 42 72 12';
const poly = (pts: { x: number; y: number }[]) =>
    `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}Z`;

/** dots along the curve, spread by a fixed pseudo-random offset so the picture never changes */
const dots = (count: number, spread: number) =>
    Array.from({ length: count }, (_, i) => {
        const p = POINTS[Math.floor((i * (POINTS.length - 1)) / (count - 1))];
        const a = i * 2.39996; // golden angle
        const r = spread * (((i * 7) % 10) / 10);
        return { cx: p.x + Math.cos(a) * r, cy: p.y + Math.sin(a) * r };
    });

const INK = shapedOutline(CURVE, 'ellipse', 9);
const NIB = poly(
    nibOutline(
        POINTS.map((p) => ({ ...p, f: 1 })),
        { width: 9, angle: 30, fixation: 0.9, caps: 0 },
    ),
);
const FLAT_NIB = poly(
    nibOutline(
        POINTS.map((p) => ({ ...p, f: 1 })),
        { width: 9, angle: 45, fixation: 1, caps: 0 },
    ),
);

export function BrushPreview({ brush }: { brush: BrushType }) {
    const preset = getPreset(brush);
    const w = Math.min(10, Math.max(1.5, preset.width / 2.2));
    const line = (extra: Record<string, unknown> = {}) => (
        <path
            d={D}
            fill="none"
            stroke="currentColor"
            strokeWidth={w}
            strokeLinecap="round"
            {...extra}
        />
    );

    let art;
    if (brush === 'nib') art = <path d={NIB} fill="currentColor" />;
    else if (preset.engine === 'calligraphy') art = <path d={FLAT_NIB} fill="currentColor" />;
    else if (preset.engine === 'ink') art = <path d={INK} fill="currentColor" />;
    else if (preset.engine === 'neon')
        art = (
            <>
                {line({ strokeWidth: w * 2.4, opacity: 0.25 })}
                {line({ strokeWidth: w * 0.6, opacity: 0.9 })}
            </>
        );
    else if (preset.engine === 'texture') art = line({ strokeDasharray: '1.5 1.2', opacity: 0.8 });
    else if (preset.engine === 'pattern')
        art = line({ strokeDasharray: '4 2', strokeLinecap: 'butt' });
    else if (preset.engine === 'spray')
        art = dots(brush === 'splatter' ? 14 : 36, brush === 'airbrush' ? 6 : 4).map((c, i) => (
            <circle
                key={i}
                {...c}
                r={brush === 'splatter' ? 1 + (i % 3) : 0.7}
                fill="currentColor"
            />
        ));
    else if (preset.engine === 'circle')
        art = dots(9, 0).map((c, i) => <circle key={i} {...c} r={3} fill="currentColor" />);
    else if (preset.engine === 'eraser') art = line({ strokeDasharray: '3 3', opacity: 0.5 });
    else art = line({ opacity: preset.opacity });

    return (
        <svg viewBox="0 0 80 40" className="h-10 w-full text-ink" aria-hidden>
            {art}
        </svg>
    );
}
