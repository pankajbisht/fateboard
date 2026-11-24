/** Pure color conversions (hex / RGB 0-255 / HSV and HSL h 0-360, s v l 0-100 / CMYK 0-100). */

export type RGB = { r: number; g: number; b: number };
export type HSV = { h: number; s: number; v: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** "#abc", "abc", "#AABBCC", "aabbcc" -> "#aabbcc"; anything else -> null. */
export function normalizeHex(input: string): string | null {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
    if (!m) return null;
    const h = m[1].toLowerCase();
    return `#${h.length === 3 ? [...h].map((c) => c + c).join('') : h}`;
}

export function hexToRgb(hex: string): RGB | null {
    const n = normalizeHex(hex);
    if (!n) return null;
    const v = parseInt(n.slice(1), 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
    return `#${[r, g, b]
        .map((c) =>
            Math.round(clamp(c, 0, 255))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;
}

/** Exact (unrounded) HSV, so hex -> hsv -> hex round-trips. */
export function rgbToHsv({ r, g, b }: RGB): HSV {
    const [R, G, B] = [r / 255, g / 255, b / 255];
    const max = Math.max(R, G, B);
    const d = max - Math.min(R, G, B);
    let h = 0;
    if (d) {
        if (max === R) h = ((G - B) / d) % 6;
        else if (max === G) h = (B - R) / d + 2;
        else h = (R - G) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h, s: max ? (d / max) * 100 : 0, v: max * 100 };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
    const S = clamp(s, 0, 100) / 100;
    const V = clamp(v, 0, 100) / 100;
    const f = (n: number) => {
        const k = (n + (((h % 360) + 360) % 360) / 60) % 6;
        return Math.round((V - V * S * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
    };
    return { r: f(5), g: f(3), b: f(1) };
}

export type HSL = { h: number; s: number; l: number };
export type CMYK = { c: number; m: number; y: number; k: number };

/** Exact (unrounded) HSL. Same hue as HSV. */
export function rgbToHsl(rgb: RGB): HSL {
    return hsvToHsl(rgbToHsv(rgb));
}

export function hslToRgb(hsl: HSL): RGB {
    return hsvToRgb(hslToHsv(hsl));
}

/** HSV and HSL share the hue, so this keeps it for grays (the picker's hue never jumps). */
export function hsvToHsl({ h, s, v }: HSV): HSL {
    const S = clamp(s, 0, 100) / 100;
    const V = clamp(v, 0, 100) / 100;
    const l = V * (1 - S / 2);
    const sl = l === 0 || l === 1 ? 0 : (V - l) / Math.min(l, 1 - l);
    return { h, s: sl * 100, l: l * 100 };
}

export function hslToHsv({ h, s, l }: HSL): HSV {
    const S = clamp(s, 0, 100) / 100;
    const L = clamp(l, 0, 100) / 100;
    const v = L + S * Math.min(L, 1 - L);
    return { h, s: v ? 2 * (1 - L / v) * 100 : 0, v: v * 100 };
}

/** Exact (unrounded) CMYK, the plain device formula (no print profile). Black = K only. */
export function rgbToCmyk({ r, g, b }: RGB): CMYK {
    const [R, G, B] = [r / 255, g / 255, b / 255];
    const k = 1 - Math.max(R, G, B);
    if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
    const ink = (x: number) => ((1 - x - k) / (1 - k)) * 100;
    return { c: ink(R), m: ink(G), y: ink(B), k: k * 100 };
}

export function cmykToRgb({ c, m, y, k }: CMYK): RGB {
    const K = 1 - clamp(k, 0, 100) / 100;
    const ch = (x: number) => Math.round(255 * (1 - clamp(x, 0, 100) / 100) * K);
    return { r: ch(c), g: ch(m), b: ch(y) };
}

/** The formats the picker shows and copies. */
export const COLOR_FORMATS = ['hex', 'rgb', 'hsl', 'hsb', 'cmyk'] as const;
export type ColorFormat = (typeof COLOR_FORMATS)[number];

/**
 * The color as text in `format`, the way it is usually pasted (CSS for hex / rgb / hsl). '' if
 * invalid. `hsv` = exact HSV of the same color (the picker's): HSL / HSB are written from it, so
 * typed values and a gray's hue are kept (it rounds to the same hex). Default: from the hex.
 */
export function formatColor(hex: string, format: ColorFormat, hsv?: HSV): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return '';
    const exact = hsv ?? rgbToHsv(rgb);
    const n = (x: number) => Math.round(x);
    const pc = (...xs: number[]) => xs.map((x) => `${n(x)}%`).join(', ');
    switch (format) {
        case 'hex':
            return rgbToHex(rgb).toUpperCase();
        case 'rgb':
            return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        case 'hsl': {
            const { h, s, l } = hsvToHsl(exact);
            return `hsl(${n(h) % 360}, ${pc(s, l)})`;
        }
        case 'hsb': {
            const { h, s, v } = exact;
            return `hsb(${n(h) % 360}, ${pc(s, v)})`;
        }
        case 'cmyk': {
            const { c, m, y, k } = rgbToCmyk(rgb);
            return `cmyk(${pc(c, m, y, k)})`;
        }
    }
}
