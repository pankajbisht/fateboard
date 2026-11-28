// @vitest-environment node
/** Export region and crop marks (2026-11-17): content, page + bleed, or page + bleed / slug / crop marks. */
import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { CROP_MARK } from '@/lib/document/printMarks';
import { cropMarksSvg, exportSceneBounds, paintCropMarks } from '../exportBounds';

const rect = (left: number, top: number, extra: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left,
        top,
        width: 40,
        height: 20,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
        ...extra,
    });
const page = (objects: fabric.FabricObject[], pageSetup: Record<string, unknown> = {}) =>
    Object.assign(createFakeCanvas(objects), {
        getWidth: () => 800,
        getHeight: () => 600,
        pageSetup,
    }) as unknown as fabric.Canvas;

describe('exportSceneBounds', () => {
    it('nothing exportable (empty, hidden or helper objects) → null', () => {
        expect(exportSceneBounds(page([]), { cropToContent: false, cropMarks: false })).toBeNull();
        const hidden = rect(0, 0, { visible: false });
        const helper = Object.assign(rect(0, 0), { excludeFromExport: true });
        expect(
            exportSceneBounds(page([hidden, helper]), { cropToContent: true, cropMarks: false }),
        ).toBeNull();
    });

    it('crop to content: the objects box; the page: the page + its bleed', () => {
        const c = page([rect(10, 20), rect(100, 50)], { bleed: 12 });
        expect(exportSceneBounds(c, { cropToContent: true, cropMarks: false })).toEqual({
            left: 10,
            top: 20,
            width: 130,
            height: 50,
        });
        expect(exportSceneBounds(c, { cropToContent: false, cropMarks: false })).toEqual({
            left: -12,
            top: -12,
            width: 824,
            height: 624,
        });
    });

    it('with crop marks: the page + bleed, slug and the marks', () => {
        const c = page([rect(0, 0)], { bleed: 12, slug: 60 });
        expect(exportSceneBounds(c, { cropToContent: false, cropMarks: true })).toEqual({
            left: -72,
            top: -72,
            width: 944,
            height: 744,
        });
        const noSlug = page([rect(0, 0)], { bleed: 0 });
        const e = CROP_MARK.minOffset + CROP_MARK.length;
        expect(exportSceneBounds(noSlug, { cropToContent: false, cropMarks: true })).toMatchObject({
            left: -e,
            width: 800 + 2 * e,
        });
    });
});

describe('crop marks in files', () => {
    it('raster: marks map from page px to the output box', () => {
        const c = page([rect(0, 0)], { bleed: 10 });
        const lines: number[][] = [];
        let at: number[] = [];
        const ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: (x: number, y: number) => (at = [x, y]),
            lineTo: (x: number, y: number) => lines.push([...at, x, y]),
            stroke: vi.fn(),
        } as unknown as CanvasRenderingContext2D;
        const src = exportSceneBounds(c, { cropToContent: false, cropMarks: true })!;
        // output at 2 px per page px, offset by (5, 7)
        paintCropMarks(ctx, c, src, { x: 5, y: 7, w: src.width * 2, h: src.height * 2 });
        expect(lines).toHaveLength(8);
        const o = 10;
        const L = CROP_MARK.length;
        const X = (x: number) => 5 + (x - src.left) * 2;
        const Y = (y: number) => 7 + (y - src.top) * 2;
        expect(lines[0]).toEqual([X(-o - L), Y(0), X(-o), Y(0)]);
        expect(ctx.stroke).toHaveBeenCalled();
    });

    it('SVG: one path of eight marks in scene coordinates (the export viewBox)', () => {
        const svg = cropMarksSvg(page([rect(0, 0)], { bleed: 10 }));
        expect(svg).toMatch(/^<path /);
        expect(svg.match(/M/g)).toHaveLength(8);
        expect(svg).toContain(`M${-10 - CROP_MARK.length} 0L-10 0`);
    });
});
