import tailwindcolors from 'tailwindcss/colors';

/**
 * The right dock palette: Tailwind 4 color families (the same colors the dock always offered).
 * `value` is what the palette sends to `handleColorChange` (a `bg-<family>-<shade>` class, which
 * the color slice turns into hex); `css` is the color to paint the swatch with.
 */
export type PaletteSwatch = { id: string; label: string; value: string; css: string };
export type PaletteFamily = { id: string; label: string; shades: PaletteSwatch[] };

/** Light to dark. 950 is left out (it was never offered). */
export const PALETTE_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

const FAMILY_IDS = [
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
    'slate',
    'gray',
    'zinc',
    'neutral',
    'stone',
] as const;

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const colors = tailwindcolors as unknown as Record<string, Record<string, string> | string>;

export const PALETTE_FAMILIES: PaletteFamily[] = FAMILY_IDS.map((id) => {
    const family = colors[id] as Record<string, string>;
    const shades = PALETTE_SHADES.map((shade) => ({
        id: `${id}-${shade}`,
        label: `${title(id)} ${shade}`,
        value: `bg-${id}-${shade}`,
        css: family[shade],
    }));
    return { id, label: title(id), shades };
});

/** Pure white and black (Tailwind's 50 / 900 are only near-white / near-black). */
export const PALETTE_BASICS: PaletteSwatch[] = [
    { id: 'white', label: 'White', value: 'bg-white', css: colors.white as string },
    { id: 'black', label: 'Black', value: 'bg-black', css: colors.black as string },
];
