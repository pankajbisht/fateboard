import type { PageSetup } from '@/lib/document/pageSetup';
import { cropMarkLines, pageFrameExtent } from '@/lib/document/printMarks';

/** InDesign guide colours: bleed red, slug blue. Crop marks follow the ink colour (visible in both themes). */
const BLEED = '#ef4444';
const SLUG = '#0ea5e9';

/**
 * Print frames around the design page (InDesign / Clip Studio style, 2026-11-17): bleed (red) and slug (blue)
 * frames with "Show guides", crop marks with "Show crop marks". Drawn in the board's stage OUTSIDE the page:
 * the canvas is exactly the page (decision Q2), so art past the trim is not shown here (BUG-234) but is
 * exported with the bleed. Board only, never exported; clicks pass through.
 *
 * `left` / `top`: the page's position in the stage (CSS px); `scale`: CSS px per page px.
 */
export function PageFrame({
    left,
    top,
    scale,
    width,
    height,
    setup,
}: {
    left: number;
    top: number;
    scale: number;
    width: number;
    height: number;
    setup: PageSetup;
}) {
    const frames = setup.guides && setup.bleed + setup.slug > 0;
    const marks = setup.cropMarks;
    const extent = pageFrameExtent(setup, { frames, marks });
    if (!extent || scale <= 0) return null;
    const pad = extent * scale + 1; // + 1: the outer line is not cut by the box
    const at = (v: number) => pad + v * scale;
    const frame = (key: string, out: number, stroke: string) => (
        <rect
            data-frame={key}
            x={at(-out)}
            y={at(-out)}
            width={(width + 2 * out) * scale}
            height={(height + 2 * out) * scale}
            fill="none"
            stroke={stroke}
            strokeWidth={1}
        />
    );
    return (
        <svg
            aria-hidden="true"
            className="pointer-events-none absolute overflow-visible"
            shapeRendering="crispEdges"
            style={{
                left: left - pad,
                top: top - pad,
                width: width * scale + 2 * pad,
                height: height * scale + 2 * pad,
            }}
        >
            {frames && setup.bleed > 0 && frame('bleed', setup.bleed, BLEED)}
            {frames && setup.slug > 0 && frame('slug', setup.bleed + setup.slug, SLUG)}
            {marks && (
                <path
                    data-frame="crop-marks"
                    d={cropMarkLines(width, height, setup)
                        .map(([x1, y1, x2, y2]) => `M${at(x1)} ${at(y1)}L${at(x2)} ${at(y2)}`)
                        .join('')}
                    stroke="var(--color-ink)"
                    strokeWidth={1}
                />
            )}
        </svg>
    );
}
