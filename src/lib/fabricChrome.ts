import { InteractiveFabricObject, type FabricObject } from 'fabric';
import { BRAND } from '@/lib/theme';

/** Current value of a CSS token on <html>, or the fallback (tests / SSR / before CSS loads). */
const token = (name: string, fallback: string) => {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

/**
 * Selection handles visible on the light page AND the dark workspace: theme-colored frame,
 * solid white corners with a theme-colored edge (Fabric's pale hollow corners vanish in dark mode).
 * Colors come from the active color theme (--color-primary-400). UI chrome only: not serialized.
 */
export function selectionChrome() {
    const accent = token('--color-primary-400', BRAND.primaryLight);
    return {
        borderColor: accent,
        cornerColor: '#ffffff',
        cornerStrokeColor: accent,
        transparentCorners: false,
        cornerSize: 10,
        borderScaleFactor: 1.5,
    } as const;
}

/** Fabric's look at app start: defaults for every object created from now on. */
export function applyFabricChrome(): void {
    Object.assign(InteractiveFabricObject.ownDefaults, selectionChrome());
}

/** After a color theme change: new defaults + restyle the objects already on the canvas. */
export function restyleSelectionChrome(objects: FabricObject[]): void {
    applyFabricChrome();
    const chrome = selectionChrome();
    objects.forEach((o) => o.set(chrome));
}
