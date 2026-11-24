import { luminance, mixColor, type TintId } from './styles';

/**
 * Colour grades that give a style its palette (noir greys, neon, pastel wash …). A tint maps one hex colour to
 * another; the renderer applies it to every material and to the eye colour, before the scene's own grade.
 */
const HEX = /^#([0-9a-f]{6})$/i;
const rgb = (hex: string): [number, number, number] => {
    const m = HEX.exec(hex);
    const n = m ? parseInt(m[1], 16) : 0x808080;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
        .map((v) =>
            Math.round(Math.min(255, Math.max(0, v)))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;

/** Away from (k > 1) or toward (k < 1) the colour's own grey. */
function saturate(color: string, k: number): string {
    const [r, g, b] = rgb(color);
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return hex(y + (r - y) * k, y + (g - y) * k, y + (b - y) * k);
}

const TINTS: Record<TintId, (c: string) => string> = {
    none: (c) => c,
    vivid: (c) => saturate(c, 1.3),
    warm90: (c) => mixColor(saturate(c, 0.85), '#ffd9a8', 0.1),
    pastel: (c) => mixColor(saturate(c, 0.9), '#ffffff', 0.35),
    warmPastel: (c) => mixColor(c, '#fff1d6', 0.3),
    paper: (c) => mixColor(c, '#ffffff', 0.78),
    white: () => '#ffffff',
    noir: (c) => {
        const g = Math.min(1, Math.max(0, (luminance(c) - 0.5) * 1.35 + 0.5)) * 255;
        return hex(g, g, g);
    },
    // dark → deep violet, light → cyan, with 35 % of the colour's own hue kept so skin, cloth and hair differ
    neon: (c) =>
        saturate(
            mixColor(mixColor('#2a0a4a', '#37e8ff', Math.pow(luminance(c), 0.8)), c, 0.35),
            1.2,
        ),
};

export const tintFor = (id: TintId | undefined): ((c: string) => string) => TINTS[id ?? 'none'];
