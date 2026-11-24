/**
 * Draws an SVG document to a PNG in the browser (an <img> from the SVG, drawn on a canvas). No library; works for
 * the scene and character SVGs, which are self-contained (paths, gradients, no fonts, no external images). Corners
 * outside the picture stay transparent.
 */
export const MAX_PNG_SIDE = 8192;

/** The pixel size an SVG document declares (`width` / `height` on the root), or null. */
export function svgSize(svg: string): { width: number; height: number } | null {
    const root = /<svg\b[^>]*>/.exec(svg)?.[0];
    if (!root) return null;
    const w = Number(/\bwidth="([\d.]+)"/.exec(root)?.[1]);
    const h = Number(/\bheight="([\d.]+)"/.exec(root)?.[1]);
    return w > 0 && h > 0 ? { width: w, height: h } : null;
}

/** Draws the SVG on a new canvas of the given size (a PNG and a PDF both start here). */
export async function drawSvg(
    svg: string,
    width: number,
    height: number,
): Promise<HTMLCanvasElement> {
    const w = Math.round(width);
    const h = Math.round(height);
    if (!(w > 0 && h > 0) || w > MAX_PNG_SIDE || h > MAX_PNG_SIDE)
        throw new Error(`A picture must be between 1 and ${MAX_PNG_SIDE} pixels on each side.`);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('The picture could not be drawn.'));
            img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas to draw on.');
        ctx.drawImage(img, 0, 0, w, h);
        return canvas;
    } finally {
        URL.revokeObjectURL(url);
    }
}

export async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
    const canvas = await drawSvg(svg, width, height);
    return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Could not encode the PNG.'))),
            'image/png',
        ),
    );
}
