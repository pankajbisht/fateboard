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

/**
 * Import an image file into the Fabric canvas
 */
export async function importImage(canvas: fabric.Canvas, file: File) {
    if (!canvas || !file) return;

    const { pageWidth, pageHeight, scale } = useStore.getState();

    // Create a temporary URL for the image
    const url = URL.createObjectURL(file);

    try {
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
        console.error('Image load failed', err);
    } finally {
        // Revoke URL after short delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
