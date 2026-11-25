/**
 * BUG-121: an imported photo must keep a source that still works after a reload. It used to load
 * from `URL.createObjectURL(file)` and revoke it after 1 s, so autosave / project files / undo
 * stored a dead `blob:` URL.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@/store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { importImage } from '../imageImporter';

const original = useStore.getState();
afterEach(() => {
    useStore.setState({
        setToolbar: original.setToolbar,
        syncFromObject: original.syncFromObject,
    } as any);
    vi.restoreAllMocks();
});

// 1 x 1 transparent PNG
const PNG = Uint8Array.from(
    atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    ),
    (c) => c.charCodeAt(0),
);

describe('importImage (BUG-121)', () => {
    it('loads the file as a data URL (survives reload), never a blob: URL', async () => {
        const fakeImage = {
            set: vi.fn(),
            scaleToWidth: vi.fn(),
            setCoords: vi.fn(),
        };
        const fromURL = vi.spyOn(fabric.Image, 'fromURL').mockResolvedValue(fakeImage as any);
        const createObjectURL = vi.fn(() => 'blob:dead');
        const realCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = createObjectURL;
        useStore.setState({ setToolbar: vi.fn(), syncFromObject: vi.fn() } as any);
        const canvas: any = createFakeCanvas();
        canvas.setActiveObject = vi.fn();

        try {
            await importImage(canvas, new File([PNG], 'dot.png', { type: 'image/png' }));
        } finally {
            URL.createObjectURL = realCreateObjectURL;
        }

        expect(fromURL).toHaveBeenCalledTimes(1);
        expect(String(fromURL.mock.calls[0][0])).toMatch(/^data:image\/png;base64,/);
        expect(createObjectURL).not.toHaveBeenCalled();
        expect(canvas.getObjects()).toContain(fakeImage);
    });
});
