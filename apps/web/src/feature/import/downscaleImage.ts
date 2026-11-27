/**
 * Photos are stored as `data:` URLs inside the project (BUG-121): a 24-megapixel photo costs ~96 MB of
 * decoded pixels and ~8 MB of text in every autosave. Imports are capped here, before they become a URL.
 */

/** Longest side kept (px). Fabric's WebGL filters work on one texture up to `config.textureSize` (4096). */
export const MAX_IMAGE_SIDE = 4096;

/** Never re-encoded: vectors stay vectors, animated GIFs keep their frames. */
const KEEP_AS_IS = new Set(['image/svg+xml', 'image/gif']);

/** The file itself when it is small enough (or cannot be decoded here), else a downscaled copy. */
export async function downscaleImageFile(file: Blob, maxSide = MAX_IMAGE_SIDE): Promise<Blob> {
    if (KEEP_AS_IS.has(file.type) || typeof createImageBitmap !== 'function') return file;
    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(file); // honours EXIF orientation (default 'from-image')
        const longer = Math.max(bitmap.width, bitmap.height);
        if (longer <= maxSide) return file;
        const k = maxSide / longer;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * k));
        canvas.height = Math.max(1, Math.round(bitmap.height * k));
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        // JPEG stays JPEG; everything else becomes PNG so transparency survives
        const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
        canvas.width = 0; // release the pixels now, not at GC
        canvas.height = 0;
        return out ?? file;
    } catch (error) {
        console.error('[import] could not downscale the image, keeping the original', error);
        return file;
    } finally {
        bitmap?.close();
    }
}
