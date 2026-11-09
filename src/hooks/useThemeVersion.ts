import { useEffect, useState } from 'react';

/**
 * Bumps when the app theme changes (`.dark` class or `data-theme` color theme on <html>). For things that paint
 * colors themselves (2D canvas rulers) and must redraw: CSS-styled elements update on their own.
 */
export function useThemeVersion(): number {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (typeof MutationObserver === 'undefined') return;
        const mo = new MutationObserver(() => setVersion((v) => v + 1));
        mo.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
        });
        return () => mo.disconnect();
    }, []);
    return version;
}

/** Current value of a CSS color token (e.g. '--color-surface'), or `fallback` when unset. */
export function cssToken(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
}
