import { pdfFromImage, rgbaOverWhite } from './pdf';
import { drawSvg } from './svgToPng';

/**
 * An SVG document as a one-page PDF (the picture, on white, the page the picture's size at 96 dpi): drawn on a canvas,
 * its pixels deflated into the PDF. Transparent corners become white.
 */
export async function svgToPdf(
    svg: string,
    width: number,
    height: number,
    title: string,
): Promise<Blob> {
    const canvas = await drawSvg(svg, width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas to read.');
    const { width: w, height: h } = canvas;
    const pixels = ctx.getImageData(0, 0, w, h).data;
    const pdf = await pdfFromImage({ width: w, height: h, rgb: rgbaOverWhite(pixels) }, { title });
    return new Blob([pdf as BlobPart], { type: 'application/pdf' });
}
