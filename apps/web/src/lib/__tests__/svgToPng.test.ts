import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PNG_SIDE, svgSize, svgToPng } from '../export/svgToPng';

describe('svgSize', () => {
    it('reads the declared pixel size of the root element', () => {
        expect(
            svgSize('<svg xmlns="x" viewBox="0 0 10 10" width="1920" height="1080"><path/></svg>'),
        ).toEqual({ width: 1920, height: 1080 });
        expect(svgSize('<svg width="12.5" height="7">')).toEqual({ width: 12.5, height: 7 });
        expect(svgSize('<svg viewBox="0 0 10 10">')).toBeNull();
        expect(svgSize('not an svg')).toBeNull();
        // a width on a child does not count
        expect(svgSize('<svg viewBox="0 0 1 1"><rect width="5" height="5"/></svg>')).toBeNull();
    });
});

describe('svgToPng', () => {
    const restore: (() => void)[] = [];
    afterEach(() => restore.splice(0).forEach((f) => f()));

    /** jsdom draws nothing: a fake image that loads (or fails) and a fake canvas that records the size. */
    function fake(opts: { fail?: 'image' | 'encode' | 'context' } = {}) {
        const drawn: number[][] = [];
        const created = vi.fn(() => 'blob:svg');
        const revoked = vi.fn();
        URL.createObjectURL = created as never;
        URL.revokeObjectURL = revoked;
        class FakeImage {
            onload: () => void = () => {};
            onerror: () => void = () => {};
            set src(_v: string) {
                queueMicrotask(() => (opts.fail === 'image' ? this.onerror() : this.onload()));
            }
        }
        const prevImage = globalThis.Image;
        globalThis.Image = FakeImage as never;
        const proto = HTMLCanvasElement.prototype;
        const prevCtx = proto.getContext;
        const prevBlob = proto.toBlob;
        proto.getContext = (() =>
            opts.fail === 'context'
                ? null
                : {
                      drawImage: (_i: unknown, x: number, y: number, w: number, h: number) =>
                          drawn.push([x, y, w, h]),
                  }) as never;
        proto.toBlob = function (cb: BlobCallback) {
            cb(
                opts.fail === 'encode'
                    ? null
                    : new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }),
            );
        } as never;
        restore.push(() => {
            globalThis.Image = prevImage;
            proto.getContext = prevCtx;
            proto.toBlob = prevBlob;
        });
        return { drawn, created, revoked };
    }

    it('draws the SVG at the size asked and returns a PNG blob, freeing the temporary URL', async () => {
        const f = fake();
        const blob = await svgToPng('<svg/>', 1920, 1080);
        expect(blob.type).toBe('image/png');
        expect(f.drawn).toEqual([[0, 0, 1920, 1080]]);
        expect(f.revoked).toHaveBeenCalledWith('blob:svg');
    });

    it('fails with a clear message when the picture cannot be drawn, the canvas is missing, or encoding fails, and still frees the URL', async () => {
        for (const [fail, message] of [
            ['image', /could not be drawn/],
            ['context', /No canvas/],
            ['encode', /encode/],
        ] as const) {
            const f = fake({ fail });
            await expect(svgToPng('<svg/>', 10, 10)).rejects.toThrow(message);
            expect(f.revoked).toHaveBeenCalled();
            restore.splice(0).forEach((r) => r());
        }
    });

    it('refuses sizes that are zero, negative, not numbers or too big, before doing any work', async () => {
        const f = fake();
        for (const [w, h] of [
            [0, 10],
            [10, -1],
            [Number.NaN, 5],
            [MAX_PNG_SIDE + 1, 5],
        ])
            await expect(svgToPng('<svg/>', w, h)).rejects.toThrow(/between 1 and/);
        expect(f.created).not.toHaveBeenCalled();
    });
});
