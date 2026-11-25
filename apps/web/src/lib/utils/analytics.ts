/**
 * Google Analytics (gtag.js), loaded only when a real measurement id is configured (`VITE_GA_ID`).
 * Replaces the inline `%VITE_GA_ID%` snippet in index.html, which shipped literally when the id was unset
 * (BUG-131). Returns true when it injected the script.
 */
type GtagWindow = Window & { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void };

export function initAnalytics(id: string | undefined, win: GtagWindow = window): boolean {
    const measurementId = id?.trim() ?? '';
    if (!measurementId || measurementId.includes('%') || win.gtag) return false;

    win.dataLayer = win.dataLayer ?? [];
    win.gtag = function gtag() {
        // gtag.js reads the `arguments` object itself, not an array copy
        // eslint-disable-next-line prefer-rest-params
        win.dataLayer!.push(arguments);
    };
    win.gtag('js', new Date());
    win.gtag('config', measurementId);

    const script = win.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    win.document.head.appendChild(script);
    return true;
}
