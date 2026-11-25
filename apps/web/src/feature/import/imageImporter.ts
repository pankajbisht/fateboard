import * as fabric from 'fabric';
import { useStore } from '@/store';
import { creationScaleOf } from '@/lib/canvas/creationScale';

/** A new picture's longer side, before the page / zoom scale (lib/canvas/creationScale). */
export const IMAGE_BASE_SIZE = 400;

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

    try {
        const url = await readAsDataURL(file);

        // Load image (Fabric v6+ returns a Promise)
        const img: fabric.Image = await fabric.Image.fromURL(url);

        // the middle of what is shown: the page centre on a design page (identity viewport), the
        // view centre on a whiteboard. Before, the page centre was multiplied by the fit scale, so
        // pictures landed in the upper left of a design page.
        const center = canvas.getVpCenter();
        img.set({
            left: center.x,
            top: center.y,
            originX: 'center',
            originY: 'center',
        });

        // longer side fitted to the base size for this page / zoom; small pictures are not enlarged
        const target = IMAGE_BASE_SIZE * creationScaleOf(useStore.getState());
        const longer = Math.max(img.width || 0, img.height || 0);
        if (longer > target) img.scale(target / longer);

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
        // a broken or unsupported picture must say so (BUG-158)
        void useStore.getState().alertDialog({
            title: "Can't open image",
            message: `"${file.name}" is not an image this browser can read.`,
        });
    }
}
