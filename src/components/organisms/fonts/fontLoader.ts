// ============================================================
// Font loader
// Fabric measures text with the browser's current fonts, so a font MUST be loaded before a
// Textbox is created with it (otherwise width/height are measured with a fallback font).
// ============================================================

export type FontRequest = {
    fontFamily: string;
    fontWeight: number;
    italic?: boolean;
};

const SYSTEM_FONTS = new Set([
    'arial',
    'helvetica',
    'times new roman',
    'georgia',
    'verdana',
    'courier new',
    'tahoma',
    'trebuchet ms',
    'impact',
    'sans-serif',
    'serif',
    'monospace',
    'system-ui',
]);

const stylesheetCache = new Map<string, Promise<void>>();

/** Resolves when the stylesheet loaded, failed, or 5 seconds passed: it never blocks forever. */
function ensureStylesheet(href: string): Promise<void> {
    const cached = stylesheetCache.get(href);
    if (cached) return cached;

    const promise = new Promise<void>((resolve) => {
        const existing = document.querySelector<HTMLLinkElement>(
            `link[data-font-template="${href}"]`,
        );
        if (existing) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.fontTemplate = href;

        const done = () => resolve();
        link.onload = done;
        link.onerror = done;
        window.setTimeout(done, 5000);

        document.head.appendChild(link);
    });

    stylesheetCache.set(href, promise);
    return promise;
}

/** One Google Fonts URL per family, so one unknown font cannot break the others. */
function googleFontUrl(family: string, requests: FontRequest[]): string {
    const name = family.trim().replace(/\s+/g, '+');
    const hasItalic = requests.some((r) => r.italic);

    if (!hasItalic) {
        const weights = [...new Set(requests.map((r) => r.fontWeight))].sort((a, b) => a - b);
        return `https://fonts.googleapis.com/css2?family=${name}:wght@${weights.join(';')}&display=swap`;
    }

    // ital,wght tuples must be sorted
    const tuples = [...new Set(requests.map((r) => `${r.italic ? 1 : 0},${r.fontWeight}`))].sort(
        (a, b) => {
            const [ai, aw] = a.split(',').map(Number) as [number, number];
            const [bi, bw] = b.split(',').map(Number) as [number, number];
            return ai - bi || aw - bw;
        },
    );

    return `https://fonts.googleapis.com/css2?family=${name}:ital,wght@${tuples.join(';')}&display=swap`;
}

/**
 * Loads every font a template uses. Safe to call many times (cached) and safe to call for
 * system fonts. Never rejects.
 */
export async function loadTemplateFonts(fonts: FontRequest[]): Promise<void> {
    if (typeof document === 'undefined' || fonts.length === 0) return;

    const byFamily = new Map<string, FontRequest[]>();
    for (const font of fonts) {
        if (!font.fontFamily || SYSTEM_FONTS.has(font.fontFamily.toLowerCase())) continue;
        const list = byFamily.get(font.fontFamily) ?? [];
        list.push(font);
        byFamily.set(font.fontFamily, list);
    }

    await Promise.all(
        [...byFamily.entries()].map(([family, requests]) =>
            ensureStylesheet(googleFontUrl(family, requests)),
        ),
    );

    // The stylesheet only DECLARES the fonts; this downloads the actual font files.
    await Promise.all(
        fonts.map((font) =>
            document.fonts
                .load(
                    `${font.italic ? 'italic ' : ''}${font.fontWeight} 32px "${font.fontFamily}"`,
                    'Aa',
                )
                .catch(() => []),
        ),
    );
}
