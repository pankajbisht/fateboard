/**
 * Font library for text shapes.
 *
 * Web fonts come from Google Fonts. Each one gets its own <link>, so a single bad
 * request can never break the others. The browser only downloads a font file once
 * a glyph actually uses it.
 *
 * To add a font: add one line to FONT_GROUPS. Single-weight fonts (most script and
 * handwriting fonts) must use web(label, generic, false), otherwise Google rejects
 * the request.
 */

export interface ShapeFont {
    label: string;
    /** value stored on the fabric Textbox (fontFamily) */
    value: string;
    /** Google Fonts family name; undefined = system font (nothing to load) */
    google?: string;
    /** font has both 400 and 700 */
    bold?: boolean;
}

export interface FontGroup {
    label: string;
    fonts: ShapeFont[];
}

const web = (label: string, generic: string, bold = true): ShapeFont => ({
    label,
    value: `'${label}', ${generic}`,
    google: label,
    bold,
});

const system = (label: string, value: string): ShapeFont => ({ label, value });

export const FONT_GROUPS: FontGroup[] = [
    {
        label: 'Professional · Sans',
        fonts: [
            web('Inter', 'Arial, sans-serif'),
            web('Roboto', 'Arial, sans-serif'),
            web('Open Sans', 'Arial, sans-serif'),
            web('Lato', 'Arial, sans-serif'),
            web('Montserrat', 'Arial, sans-serif'),
            web('Poppins', 'Arial, sans-serif'),
            web('Nunito', 'Arial, sans-serif'),
            web('Source Sans 3', 'Arial, sans-serif'),
            web('Work Sans', 'Arial, sans-serif'),
            web('DM Sans', 'Arial, sans-serif'),
            web('Raleway', 'Arial, sans-serif'),
        ],
    },
    {
        label: 'Professional · Serif',
        fonts: [
            web('Playfair Display', 'Georgia, serif'),
            web('Merriweather', 'Georgia, serif'),
            web('Lora', 'Georgia, serif'),
            web('Libre Baskerville', 'Georgia, serif'),
        ],
    },
    {
        label: 'Notes · Handwriting',
        fonts: [
            web('Caveat', 'cursive'),
            web('Kalam', 'cursive'),
            web('Patrick Hand', 'cursive', false),
            web('Comic Neue', 'cursive'),
            web('Indie Flower', 'cursive', false),
            web('Shadows Into Light', 'cursive', false),
            web('Gloria Hallelujah', 'cursive', false),
            web('Architects Daughter', 'cursive', false),
            web('Reenie Beanie', 'cursive', false),
            web('Covered By Your Grace', 'cursive', false),
            web('Permanent Marker', 'cursive', false),
        ],
    },
    {
        label: 'Script · Calligraphy',
        fonts: [
            web('Dancing Script', 'cursive'),
            web('Pacifico', 'cursive', false),
            web('Great Vibes', 'cursive', false),
            web('Satisfy', 'cursive', false),
            web('Sacramento', 'cursive', false),
            web('Lobster', 'cursive', false),
        ],
    },
    {
        label: 'Display · Headings',
        fonts: [
            web('Bebas Neue', 'Impact, sans-serif', false),
            web('Oswald', 'Impact, sans-serif'),
            web('Anton', 'Impact, sans-serif', false),
            web('Abril Fatface', 'Georgia, serif', false),
            web('Fredoka One', 'Arial Rounded MT Bold, sans-serif', false),
            web('Bubblegum Sans', 'cursive', false),
        ],
    },
    {
        label: 'Code · Mono',
        fonts: [
            web('JetBrains Mono', 'monospace'),
            web('Fira Code', 'monospace'),
            web('Courier Prime', 'monospace'),
        ],
    },
    {
        label: 'System (no download)',
        fonts: [
            system('Arial', 'Arial, Helvetica, sans-serif'),
            system('Verdana', 'Verdana, Geneva, sans-serif'),
            system('Trebuchet MS', 'Trebuchet MS, sans-serif'),
            system('Georgia', 'Georgia, serif'),
            system('Times New Roman', 'Times New Roman, Times, serif'),
            system('Courier New', 'Courier New, monospace'),
            system('Comic Sans', 'Comic Sans MS, cursive'),
            system('Impact', 'Impact, sans-serif'),
        ],
    },
];

/** Dropdown options for every font picker (Text panel, text float): grouped, previewed. */
export const FONT_OPTIONS = FONT_GROUPS.flatMap((g) =>
    g.fonts.map((f) => ({
        value: f.value,
        label: f.label,
        group: g.label,
        style: { fontFamily: f.value },
    })),
);

/** First family of a CSS font list, unquoted and lowercase ("'Inter', Arial" -> "inter"). */
export const firstFontFamily = (v: string) =>
    String(v ?? '')
        .split(',')[0]
        .replace(/['"]/g, '')
        .trim()
        .toLowerCase();

/**
 * The picker value for a stored fontFamily: the library entry with the same first family
 * (so "Arial" selects "Arial, Helvetica, sans-serif"), else the stored value itself.
 */
export const matchFontValue = (fontFamily: string) =>
    FONT_OPTIONS.find((o) => firstFontFamily(o.value) === firstFontFamily(fontFamily))?.value ??
    fontFamily;

/** Options with an unknown current font prepended, so the picker can still show it. */
export const fontOptionsWith = (value: string) =>
    !value || FONT_OPTIONS.some((o) => o.value === value)
        ? FONT_OPTIONS
        : [
              { value, label: value.split(',')[0].replace(/['"]/g, '').trim() || value },
              ...FONT_OPTIONS,
          ];

/** Flat list (kept for old imports). */
export const SHAPE_FONTS = FONT_GROUPS.flatMap((g) =>
    g.fonts.map((f) => ({ label: f.label, value: f.value })),
);

let injected = false;

/** Adds the Google Fonts stylesheets once. Safe to call many times. */
export function injectFontStyles(): void {
    if (injected || typeof document === 'undefined') return;
    injected = true;

    FONT_GROUPS.forEach((g) =>
        g.fonts.forEach((f) => {
            if (!f.google) return;

            const id = `shape-font-${f.google.replace(/\s+/g, '-').toLowerCase()}`;
            if (document.getElementById(id)) return;

            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href =
                'https://fonts.googleapis.com/css2?family=' +
                f.google.replace(/\s+/g, '+') +
                (f.bold ? ':wght@400;700' : '') +
                '&display=swap';
            document.head.appendChild(link);
        }),
    );
}

/** Resolves once the browser has the font ready for canvas drawing. */
export async function loadFont(fontFamilyValue: string): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts) return;

    const family = fontFamilyValue.split(',')[0].replace(/['"]/g, '').trim();
    if (!family) return;

    try {
        await Promise.all([
            document.fonts.load(`400 16px "${family}"`),
            document.fonts.load(`700 16px "${family}"`),
        ]);
    } catch {
        /* offline / blocked: the fallback font keeps working */
    }
}
