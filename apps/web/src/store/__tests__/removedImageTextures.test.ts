/**
 * BUG-236 / P4: every `object:removed` (delete, undo / redo, page switch: loadFromJSON clears the canvas)
 * frees the removed image's WebGL textures. An added object (still on a canvas) keeps them.
 */
import { describe, expect, it, vi } from 'vitest';
import { FabricImage } from 'fabric';
import { useStore } from '@store';

const handle = (e: unknown) =>
    (
        useStore.getState() as unknown as { handlePersistEvent: (e: unknown) => void }
    ).handlePersistEvent(e);

describe('removed images free their textures', () => {
    it('object:removed evicts both textures', () => {
        const img = new FabricImage(document.createElement('canvas'));
        const spy = vi.spyOn(img, 'removeTexture');
        handle({ target: img });
        expect(spy).toHaveBeenCalledWith(img.cacheKey);
        expect(spy).toHaveBeenCalledWith(`${img.cacheKey}_filtered`);
    });

    it('object:added (the image is on a canvas) keeps them', () => {
        const img = new FabricImage(document.createElement('canvas'));
        (img as unknown as { canvas: unknown }).canvas = {};
        const spy = vi.spyOn(img, 'removeTexture');
        handle({ target: img });
        expect(spy).not.toHaveBeenCalled();
    });
});
