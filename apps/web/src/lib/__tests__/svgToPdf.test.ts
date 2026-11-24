import { inflateSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { svgToPdf } from '../export/svgToPdf';

describe('svgToPdf', () => {
    const restore: (() => void)[] = [];
    afterEach(() => restore.splice(0).forEach((f) => f()));

    /** jsdom draws nothing: a fake image and a canvas whose pixels are given (RGBA). */
    function fake(rgba: number[], w: number, h: number) {
        URL.createObjectURL = vi.fn(() => 'blob:svg') as never;
        URL.revokeObjectURL = vi.fn();
        class FakeImage {
            onload: () => void = () => {};
            onerror: () => void = () => {};
            set src(_v: string) {
                queueMicrotask(() => this.onload());
            }
        }
        const prevImage = globalThis.Image;
        globalThis.Image = FakeImage as never;
        const proto = HTMLCanvasElement.prototype;
        const prev = proto.getContext;
        proto.getContext = (() => ({
            drawImage: () => {},
            getImageData: () => ({ data: Uint8ClampedArray.from(rgba), width: w, height: h }),
        })) as never;
        restore.push(() => {
            globalThis.Image = prevImage;
            proto.getContext = prev;
        });
    }

    it('makes a PDF blob whose image is the drawn pixels over white, page = picture at 96 dpi', async () => {
        // 2 × 1: opaque red, fully transparent
        fake([255, 0, 0, 255, 0, 0, 0, 0], 2, 1);
        const blob = await svgToPdf('<svg/>', 2, 1, 'My scene');
        expect(blob.type).toBe('application/pdf');
        const bytes = Buffer.from(await blob.arrayBuffer());
        const text = bytes.toString('latin1');
        expect(text.startsWith('%PDF-1.4')).toBe(true);
        expect(text).toContain('/MediaBox [0 0 1.5 0.75]');
        expect(text).toContain('/Title (My scene)');
        const at = text.indexOf('/Filter /FlateDecode');
        const from = text.indexOf('stream\n', at) + 'stream\n'.length;
        const len = Number(/\/Length (\d+)/.exec(text.slice(at, from))![1]);
        expect([...inflateSync(bytes.subarray(from, from + len))]).toEqual([
            255, 0, 0, 255, 255, 255,
        ]);
    });

    it('rejects a size it cannot draw before touching the canvas', async () => {
        await expect(svgToPdf('<svg/>', 0, 5, 'x')).rejects.toThrow(/between 1 and/);
    });
});
