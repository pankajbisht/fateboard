/**
 * Sharp objects at any zoom (BUG-221). Fabric caches each object as a bitmap at its on-screen scale, but
 * caps the bitmap (`config.maxCacheSideLimit`, `config.perfLimitSizeTotal`) and then stretches it, so a
 * zoomed-in object went soft. An object whose cache would pass those limits is drawn directly (vectors,
 * always sharp) instead; everything else keeps Fabric's cache. Installed once, from RootLayout.
 */
import { FabricObject, config } from 'fabric';

const INSTALLED = '__fbCrispCache';

type Cacheable = FabricObject & {
    ownCaching?: boolean;
    needsItsOwnCache: () => boolean;
    _getCacheCanvasDimensions: () => { width: number; height: number };
};

/** Would a cache this big be capped (and stretched) by Fabric? */
export const cacheTooBig = (w: number, h: number) =>
    w > config.maxCacheSideLimit ||
    h > config.maxCacheSideLimit ||
    w * h > config.perfLimitSizeTotal;

export function installCrispCache(): void {
    const proto = FabricObject.prototype as unknown as Record<string, unknown> & {
        shouldCache: (this: Cacheable) => boolean;
    };
    if (proto[INSTALLED]) return;
    proto[INSTALLED] = true;
    const shouldCache = proto.shouldCache;
    proto.shouldCache = function (this: Cacheable) {
        const cache = shouldCache.call(this);
        // objects that only draw right through a cache (clip paths, stroke-first with a shadow) keep it
        if (!cache || !this.canvas || this.needsItsOwnCache()) return cache;
        const dims = this._getCacheCanvasDimensions();
        if (!cacheTooBig(dims.width, dims.height)) return cache;
        this.ownCaching = false;
        return false;
    };
}
