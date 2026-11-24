/**
 * BUG-209: main.tsx no longer imports Fabric, so the editor's selection chrome is applied when the
 * store-backed RootLayout chunk loads, before any editor route can create a Fabric object.
 */
import { InteractiveFabricObject } from 'fabric';
import { describe, expect, it } from 'vitest';

describe('RootLayout', () => {
    it('applies the selection chrome to Fabric defaults when its module loads', async () => {
        Object.assign(InteractiveFabricObject.ownDefaults, {
            transparentCorners: true,
            cornerColor: 'rgb(178,204,255)',
        });
        await import('../RootLayout');
        expect(InteractiveFabricObject.ownDefaults.transparentCorners).toBe(false);
        expect(InteractiveFabricObject.ownDefaults.cornerColor).toBe('#ffffff');
    });
});
