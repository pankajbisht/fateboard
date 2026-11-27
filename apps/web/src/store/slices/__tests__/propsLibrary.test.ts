/** Scene Objects phase 6 (docs/PROPS.md): the user's own props, prop packs. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { propStorage } from '@/lib/storage';
import { createPropsSlice } from '../createPropsSlice';

const SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40"><script>x()</script><rect width="80" height="40" fill="#f00"/></svg>';

const make = (extra: Record<string, unknown> = {}) =>
    createHarness([createPropsSlice as never], {
        canvas: null,
        boardMode: 'design',
        pageWidth: 600,
        pageHeight: 600,
        showToast: vi.fn(),
        ...extra,
    });

const svgFile = (name = 'Lamp post.svg') => new File([SVG], name, { type: 'image/svg+xml' });

describe('user props library', () => {
    beforeEach(async () => {
        for (const p of (await propStorage.loadLibrary()) as { id: string }[])
            await propStorage.remove(p.id);
    });

    it('imports an SVG file: sanitised, named after the file, saved', async () => {
        const h = make();
        expect(await h.get().importPropFile(svgFile())).toBe(true);
        const [p] = h.get().propUserLibrary;
        expect(p).toMatchObject({ label: 'Lamp post', kind: 'svg', width: 80, height: 40 });
        expect(p.data).not.toContain('script');
        expect((await propStorage.loadLibrary()) as unknown[]).toHaveLength(1);
        // a new store reads it back
        const again = make();
        await again.get().loadPropLibrary();
        expect(again.get().propUserLibrary.map((x) => x.id)).toEqual([p.id]);
    });

    it('refuses files that are not SVG or PNG', async () => {
        const h = make();
        expect(
            await h.get().importPropFile(new File(['hello'], 'notes.txt', { type: 'text/plain' })),
        ).toBe(false);
        expect(h.get().showToast).toHaveBeenCalled();
        expect(h.get().propUserLibrary).toEqual([]);
    });

    it('places a user prop like any prop (click, drop, recent)', async () => {
        const canvas = createFakeCanvas();
        const h = make({ canvas });
        await h.get().importPropFile(svgFile());
        const id = h.get().propUserLibrary[0].id;
        expect(await h.get().addProp(id, { at: { x: 50, y: 60 } })).toBe(true);
        const [obj] = canvas.getObjects();
        expect([obj.left, obj.top]).toEqual([50, 60]);
        expect((obj as { name?: string }).name).toBe('Lamp post');
        expect(h.get().propRecent[0]).toBe(id);
    });

    it('removes a user prop', async () => {
        const h = make();
        await h.get().importPropFile(svgFile());
        const id = h.get().propUserLibrary[0].id;
        expect(await h.get().removeUserProp(id)).toBe(true);
        expect(h.get().propUserLibrary).toEqual([]);
        expect((await propStorage.loadLibrary()) as unknown[]).toEqual([]);
    });

    it('exports a pack and imports it into another library, skipping duplicates', async () => {
        const h = make();
        await h.get().importPropFile(svgFile('One.svg'));
        await h.get().importPropFile(svgFile('Two.svg'));
        const json = h.get().propPackJson();
        for (const p of (await propStorage.loadLibrary()) as { id: string }[])
            await propStorage.remove(p.id);
        const other = make();
        expect(await other.get().importPropPack(json)).toBe(2);
        expect(
            other
                .get()
                .propUserLibrary.map((p) => p.label)
                .sort(),
        ).toEqual(['One', 'Two']);
        expect(await other.get().importPropPack(json)).toBe(0); // already there
        expect(await other.get().importPropPack('{"format":"x"}')).toBe(0);
        expect(other.get().showToast).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringMatching(/not a prop pack/i) }),
        );
    });
});
