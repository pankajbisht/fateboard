/**
 * New shapes, sticky notes, text and pictures are sized for the page or zoom they are added to
 * (`lib/canvas/creationScale`): on a 1920 × 1080 page they are 1.8 × the base sizes, on a whiteboard
 * zoomed out to 50 % they are 2 ×, so they look the same on screen. Explicit sizes are kept.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { importFile } from '@/feature/import';

let canvas: fabric.Canvas;
const spies: { mockRestore: () => void }[] = [];
const spy = <T extends { mockRestore: () => void }>(s: T) => (spies.push(s), s);
let prev: any;
const state = () => useStore.getState() as any;
const last = () => canvas.getObjects().at(-1) as any;
/** Drawn width without the stroke (getScaledWidth includes it). */
const widthOf = (o: any) => Math.round(o.getScaledWidth() - (o.strokeWidth ?? 0));
const heightOf = (o: any) => Math.round(o.getScaledHeight() - (o.strokeWidth ?? 0));

const designPage = (width: number, height: number) =>
    useStore.setState({ boardMode: 'design', pageWidth: width, pageHeight: height } as any);

beforeEach(() => {
    prev = { ...useStore.getState() };
    canvas = new fabric.Canvas(document.createElement('canvas'), {
        width: 1920,
        height: 1080,
        renderOnAddRemove: false,
    });
    // jsdom's 2D context cannot draw: no painting in these tests
    const noPaint = canvas as unknown as Record<string, () => void>;
    noPaint.renderAll = () => undefined;
    noPaint.renderCanvas = () => undefined;
    noPaint.renderTop = () => undefined;
    useStore.setState({ canvas, pages: [], currentPageId: null } as any);
});
afterEach(() => {
    // only this file's spies: restoreAllMocks would also drop setupTests' requestRenderAll stub
    spies.forEach((spy) => spy.mockRestore());
    spies.length = 0;
    useStore.setState({
        canvas: prev.canvas,
        boardMode: prev.boardMode,
        pageWidth: prev.pageWidth,
        pageHeight: prev.pageHeight,
    } as any);
    void canvas.dispose();
});

describe('size of new objects', () => {
    it('a rectangle on a 1920 × 1080 page is 1.8 × the catalog size, stroke too', () => {
        designPage(1920, 1080);
        state().addShape('rect');
        const rect = last();
        expect(widthOf(rect)).toBe(Math.round(160 * 1.8));
        expect(heightOf(rect)).toBe(Math.round(100 * 1.8));
        expect(rect.strokeWidth).toBeCloseTo(2 * 1.8);
    });

    it('a sticky note and the text inside it grow with the page', () => {
        designPage(1920, 1080);
        state().addShape('sticky');
        const note = last();
        expect(note.isTextShape).toBe(true);
        expect(note.__text.fontSize).toBeCloseTo(18 * 1.8);
    });

    it('an explicit size is used as given', () => {
        designPage(1920, 1080);
        state().addShape('rect', { width: 50, height: 40 });
        expect(widthOf(last())).toBe(50);
    });

    it('on a whiteboard zoomed out to 50 %, a new shape is twice as big, so it looks the same', () => {
        useStore.setState({ boardMode: 'whiteboard' } as any);
        canvas.setZoom(0.5);
        state().addShape('circle');
        expect(widthOf(last())).toBe(200);
    });

    it('text presets grow with the page (heading 64 → 115 on 1920 × 1080)', () => {
        designPage(1920, 1080);
        spy(
            vi.spyOn(fabric.Textbox.prototype, 'enterEditing').mockImplementation(function (
                this: any,
            ) {
                return this;
            }),
        );
        state().addText({ text: 'Heading', fontSize: 64, bold: true });
        const text = last();
        expect(text.fontSize).toBeCloseTo(64 * 1.8);
        expect(text.width).toBeCloseTo(200 * 1.8);
    });

    it('a picture lands in the middle of the page, fitted to the page, never enlarged', async () => {
        designPage(1920, 1080);
        const fromURL = spy(
            vi.spyOn(fabric.FabricImage, 'fromURL').mockImplementation(
                async () =>
                    new fabric.FabricImage(document.createElement('img'), {
                        width: 4000,
                        height: 2000,
                    }) as any,
            ),
        );
        await importFile(canvas, new File(['x'], 'big.png', { type: 'image/png' }));
        const img = last();
        expect(img.getCenterPoint()).toMatchObject({ x: 960, y: 540 });
        expect(Math.round(img.getScaledWidth())).toBe(Math.round(400 * 1.8));

        fromURL.mockImplementation(
            async () =>
                new fabric.FabricImage(document.createElement('img'), {
                    width: 40,
                    height: 20,
                }) as any,
        );
        await importFile(canvas, new File(['x'], 'icon.png', { type: 'image/png' }));
        expect(Math.round(last().getScaledWidth())).toBe(40);
    });
});
