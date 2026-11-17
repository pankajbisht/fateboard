/**
 * The region an export covers (scene px) and crop marks in exported files (2026-11-17, InDesign "Printer's
 * marks"). Moved out of ExportCanvas (its own logic, and the panel is at its size ceiling). Marks geometry:
 * lib/document/printMarks.ts (the board's PageFrame draws the same marks).
 */
import type * as fabric from 'fabric';
import { normalizePageSetup } from '@/lib/document/pageSetup';
import { cropMarkLines, pageFrameExtent } from '@/lib/document/printMarks';

export type Box = { left: number; top: number; width: number; height: number };
type Out = { x: number; y: number; w: number; h: number };

/** Objects an export draws: visible, not helpers (`excludeFromExport`), not left out of the crop. */
export const exportableObjects = (canvas: fabric.Canvas): fabric.FabricObject[] =>
    canvas
        .getObjects()
        .filter(
            (o) =>
                o.visible &&
                !(o as typeof o & { excludeFromCrop?: boolean }).excludeFromCrop &&
                !o.excludeFromExport,
        );

const setupOf = (canvas: fabric.Canvas) =>
    normalizePageSetup((canvas as { pageSetup?: unknown }).pageSetup);

/**
 * Null when nothing is exportable. Crop to content: the objects' box. The page: the page + its bleed. With crop
 * marks: the page + bleed, slug and the marks around it.
 */
export function exportSceneBounds(
    canvas: fabric.Canvas,
    o: { cropToContent: boolean; cropMarks: boolean },
): Box | null {
    const objects = exportableObjects(canvas);
    if (!objects.length) return null;
    if (!o.cropToContent) {
        const s = setupOf(canvas);
        const e = o.cropMarks ? pageFrameExtent(s, { frames: true, marks: true }) : s.bleed;
        return {
            left: -e,
            top: -e,
            width: canvas.getWidth() + 2 * e,
            height: canvas.getHeight() + 2 * e,
        };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const object of objects) {
        const b = object.getBoundingRect(); // Fabric 6+: always absolute, no arguments
        minX = Math.min(minX, b.left);
        minY = Math.min(minY, b.top);
        maxX = Math.max(maxX, b.left + b.width);
        maxY = Math.max(maxY, b.top + b.height);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;
    return {
        left: minX,
        top: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
    };
}

/** Crop marks into a raster export: page px → output px through the export's `src` (scene) → `draw` box. */
export function paintCropMarks(
    ctx: CanvasRenderingContext2D,
    canvas: fabric.Canvas,
    src: Box,
    draw: Out,
): void {
    const kx = draw.w / src.width;
    const ky = draw.h / src.height;
    const X = (x: number) => draw.x + (x - src.left) * kx;
    const Y = (y: number) => draw.y + (y - src.top) * ky;
    ctx.save();
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of cropMarkLines(
        canvas.getWidth(),
        canvas.getHeight(),
        setupOf(canvas),
    )) {
        ctx.moveTo(X(x1), Y(y1));
        ctx.lineTo(X(x2), Y(y2));
    }
    ctx.strokeStyle = '#000000'; // registration black
    ctx.lineWidth = Math.max(1, kx); // 1 page px ≈ 0.75 pt
    ctx.stroke();
    ctx.restore();
}

/** Crop marks as one SVG path in scene coordinates (the export's viewBox). */
export function cropMarksSvg(canvas: fabric.Canvas): string {
    const d = cropMarkLines(canvas.getWidth(), canvas.getHeight(), setupOf(canvas))
        .map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`)
        .join('');
    return `<path d="${d}" fill="none" stroke="#000000" stroke-width="1"/>`;
}
