/**
 * Export / clipping wait for images to load. A FILTERED image draws from a <canvas> (no `complete`,
 * no `load` event): waiting on it hung export forever.
 */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { whenImageReady, whenImagesReady } from '../imageReady';

const TIMEOUT = 'timeout';
const settle = (p: Promise<unknown>, ms = 50) =>
    Promise.race([p.then(() => 'ready'), new Promise((r) => setTimeout(() => r(TIMEOUT), ms))]);

const loadedImg = () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'complete', { value: true });
    return img;
};
const loadingImg = () => {
    const img = document.createElement('img');
    let complete = false;
    Object.defineProperty(img, 'complete', { get: () => complete });
    return {
        img,
        finish: (event: 'load' | 'error') => {
            complete = true;
            img.dispatchEvent(new Event(event));
        },
    };
};

describe('whenImageReady', () => {
    it('a filtered image (drawn from a canvas) is ready right away', async () => {
        const image = new fabric.FabricImage(loadedImg());
        // what applyFilters() leaves: Fabric draws from the filtered canvas
        (image as unknown as { _element: HTMLCanvasElement })._element =
            document.createElement('canvas');
        expect(image.getElement()).toBeInstanceOf(HTMLCanvasElement);

        expect(await settle(whenImageReady(image))).toBe('ready');
    });

    it('waits for a source image that is still downloading, then resolves on load or error', async () => {
        const a = loadingImg();
        const pending = whenImageReady(new fabric.FabricImage(a.img));
        expect(await settle(pending)).toBe(TIMEOUT);
        a.finish('load');
        expect(await settle(pending)).toBe('ready');

        const b = loadingImg();
        const broken = whenImageReady(new fabric.FabricImage(b.img));
        b.finish('error');
        expect(await settle(broken)).toBe('ready');
    });

    it('non-images and canvas-based images need no wait', async () => {
        const fromCanvas = new fabric.FabricImage(document.createElement('canvas'));
        expect(await settle(whenImagesReady([new fabric.Rect(), fromCanvas, null]))).toBe('ready');
    });
});
