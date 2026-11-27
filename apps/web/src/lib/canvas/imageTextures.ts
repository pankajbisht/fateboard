import { FabricImage } from 'fabric';

/**
 * BUG-236 (P4, docs/PERFORMANCE_AUDIT.md): Fabric's WebGL filter backend keeps one texture per filtered
 * image (`cacheKey`, up to 64 MB each) until `image.dispose()`, and only `canvas.dispose()` calls that.
 * Delete, undo / redo and page switches (loadFromJSON removes the old objects) left every texture behind.
 * Called on `object:removed`. Always safe: an object that comes back (grouping, paste) only uploads its
 * texture again on the next `applyFilters`.
 */
export function evictImageTextures(obj: unknown): void {
    if (obj instanceof FabricImage) {
        obj.removeTexture(obj.cacheKey);
        obj.removeTexture(`${obj.cacheKey}_filtered`);
        return;
    }
    const children = (obj as { _objects?: unknown[] } | null)?._objects;
    if (Array.isArray(children)) children.forEach(evictImageTextures); // images inside groups
}
