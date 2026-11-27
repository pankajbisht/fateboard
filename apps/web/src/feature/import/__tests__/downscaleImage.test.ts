import { afterEach, describe, expect, it, vi } from 'vitest';
import { downscaleImageFile, MAX_IMAGE_SIDE } from '../downscaleImage';

describe('downscaleImageFile', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('keeps a small photo as it is', async () => {
        vi.stubGlobal('createImageBitmap', async () => ({
            width: 800,
            height: 600,
            close: vi.fn(),
        }));
        const file = new Blob(['x'], { type: 'image/jpeg' });
        expect(await downscaleImageFile(file)).toBe(file);
    });

    it('scales the longer side of a big photo to the cap, as JPEG', async () => {
        vi.stubGlobal('createImageBitmap', async () => ({
            width: 8000,
            height: 2000,
            close: vi.fn(),
        }));
        const sizes: number[][] = [];
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
            this: HTMLCanvasElement,
        ) {
            sizes.push([this.width, this.height]);
            return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
        } as never);
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, type) =>
            cb(new Blob(['y'], { type })),
        );
        const out = await downscaleImageFile(new Blob(['x'], { type: 'image/jpeg' }));
        expect(sizes[0]).toEqual([MAX_IMAGE_SIDE, 1024]);
        expect(out.type).toBe('image/jpeg');
    });

    it('never re-encodes SVG', async () => {
        const svg = new Blob(['<svg/>'], { type: 'image/svg+xml' });
        expect(await downscaleImageFile(svg)).toBe(svg);
    });
});
