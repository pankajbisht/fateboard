import * as fabric from 'fabric';
import { useStore } from './../../store'; // your Zustand store

/**
 * Enable full transformations for any Fabric object
 */
function enableTransform(obj: fabric.Object) {
    obj.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        perPixelTargetFind: false,
        objectCaching: false,
    });
    obj.setCoords();
}

/** Reads a file as a `data:` URL, so the image keeps a source that works after a reload. */
function readAsDataURL(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Import an image file into the Fabric canvas.
 *
 * The image is loaded from a `data:` URL (BUG-121): Fabric saves `src` with the object, and a
 * `blob:` URL dies with the tab, so autosave, project files and undo could not bring the photo back.
 * The data URL lives in the project in IndexedDB (no localStorage quota, Q5).
 */
export async function importImage(canvas: fabric.Canvas, file: File) {
    if (!canvas || !file) return;

    const { pageWidth, pageHeight, scale } = useStore.getState();

    try {
        const url = await readAsDataURL(file);

        // Load image (Fabric v6+ returns a Promise)
        const img: fabric.Image = await fabric.Image.fromURL(url);

        // Compute position
        const x = (pageWidth / 2) * scale;
        const y = (pageHeight / 2) * scale;

        img.set({
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
        });

        // Scale image to fit canvas width (optional)
        const cw = canvas.getWidth();
        img.scaleToWidth(Math.min(400, cw * 0.7));

        // Enable all transformations
        enableTransform(img);

        // Add to canvas and set active
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();

        // Update toolbar / store (Zustand)
        useStore.getState().setToolbar({ target: img });
        useStore.getState().syncFromObject(img);
    } catch (err) {
        console.error('[import] image load failed', err);
    }
}
