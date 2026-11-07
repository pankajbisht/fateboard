/**
 * "Is this image ready to draw?" for Fabric images.
 *
 * Look at the SOURCE element, not `getElement()`: once filters are applied, Fabric draws from a
 * filtered <canvas>, which has no `complete` flag and never fires `load`. Waiting on it never ends
 * (export / clipping hung forever on filtered images). Only an <img> that is still downloading
 * needs a wait; canvas / video sources are ready.
 */
type ImageLike = {
    getOriginalElement?: () => unknown;
    _originalElement?: unknown;
    getElement?: () => unknown;
};

/** Resolves once the image source is loaded (or failed: a broken image must not block). */
export function whenImageReady(obj: unknown): Promise<void> {
    const o = obj as ImageLike | null;
    const source = o?.getOriginalElement?.() ?? o?._originalElement ?? o?.getElement?.();

    if (!(source instanceof HTMLImageElement) || source.complete) return Promise.resolve();

    return new Promise((resolve) => {
        const done = () => resolve();
        source.addEventListener('load', done, { once: true });
        source.addEventListener('error', done, { once: true });
    });
}

/** Every image among `objects` ready (other objects are skipped). */
export async function whenImagesReady(objects: unknown[]): Promise<void> {
    await Promise.all(objects.map(whenImageReady));
}
