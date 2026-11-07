/** Pure color conversions for the custom color picker (hex / RGB 0-255 / HSV h 0-360, s v 0-100). */

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
