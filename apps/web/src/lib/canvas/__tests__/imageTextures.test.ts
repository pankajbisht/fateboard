import { describe, expect, it, vi } from 'vitest';
import { FabricImage, Group, Rect } from 'fabric';
import { evictImageTextures } from '../imageTextures';

// BUG-236 / P4: a removed image's WebGL textures are freed (Fabric only frees them in dispose()).
describe('evictImageTextures', () => {
    const image = () => {
        const img = new FabricImage(document.createElement('canvas'));
        const spy = vi.spyOn(img, 'removeTexture');
        return { img, spy };
    };

    it('frees the plain and the filtered texture of an image', () => {
        const { img, spy } = image();
        evictImageTextures(img);
        expect(spy.mock.calls.map((c) => c[0])).toEqual([img.cacheKey, `${img.cacheKey}_filtered`]);
    });

    it('frees images inside groups', () => {
        const { img, spy } = image();
        evictImageTextures(new Group([new Rect({ width: 5, height: 5 }), new Group([img])]));
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('ignores other objects and nothing', () => {
        expect(() => evictImageTextures(new Rect())).not.toThrow();
        expect(() => evictImageTextures(null)).not.toThrow();
    });
});
