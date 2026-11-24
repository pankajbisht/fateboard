import type { Body, StyleId } from '../schema/types';
import { MORE_PACKS } from './packsMore';

/**
 * Style packs (docs/CHARACTER_STUDIO.md §7.3): how a character is drawn, never what it is. Switching a style
 * changes only `character.style`. Every look is made of shapes (lines, fills, gradients, shading crescents,
 * screentone), no filters, so a style placed on the page looks the same as in the studio (`boardOutput: vector`).
 * The 14 packs of phase 9 are in packsMore.ts (pixel waits for the raster pipeline).
 */
export type TintId =
    'none' | 'vivid' | 'warm90' | 'pastel' | 'warmPastel' | 'paper' | 'white' | 'noir' | 'neon';

export interface StylePack {
    id: StyleId;
    name: string;
    tags: string[];
    line: {
        /** share of the character's height */
        width: number;
        color: 'darken' | 'ink' | 'none';
        /** how much darker than the fill (color: darken) */
        darken: number;
        /** outline of body parts against thin face lines */
        silhouette: number;
    };
    shading: {
        kind: 'none' | 'cel' | 'soft';
        /** how dark the shadow side is (0..1) */
        strength: number;
        /** how far the lit copy shifts, share of the part's size (bigger = more shadow) */
        offset: number;
    };
    /** light edge on the shadow side (webtoon rim light) */
    rim?: number;
    /** a light band on the lit side of the hair */
    hairHighlight?: boolean;
    hairGradient?: boolean;
    clothGradient?: boolean;
    /** a colour grade that gives the style its palette (tints.ts) */
    tint?: TintId;
    /** manga: black, white and screentone */
    palette: 'color' | 'manga';
    /**
     * `headScale`: how much bigger the style draws the head on the classic body. The manga body is measured in heads
     * (rig/proportions.ts), so it ignores `headScale` unless `superDeformed` (chibi: the big head is the style).
     * `limb`: arm and leg thickness (stick figures are thin).
     */
    proportion: { headScale: number; limb?: number; superDeformed?: boolean };
    eyes: { scale: number; tall: number; iris: number; shine: 1 | 2 };
    face: { chin: 'round' | 'pointed'; featureLine: number };
    boardOutput: 'vector' | 'raster';
}

const BASE_PACKS: Record<'cartoon' | 'anime' | 'realistic' | 'manga' | 'webtoon', StylePack> = {
    cartoon: {
        id: 'cartoon',
        name: 'Cartoon',
        tags: ['bold', 'flat', 'kids'],
        line: { width: 0.0062, color: 'darken', darken: 0.55, silhouette: 1 },
        shading: { kind: 'none', strength: 0, offset: 0 },
        palette: 'color',
        proportion: { headScale: 1.32 },
        eyes: { scale: 1, tall: 1.18, iris: 0.62, shine: 1 },
        face: { chin: 'round', featureLine: 0.0055 },
        boardOutput: 'vector',
    },
    anime: {
        id: 'anime',
        name: 'Anime',
        tags: ['anime', 'cel', 'big eyes'],
        line: { width: 0.0036, color: 'darken', darken: 0.72, silhouette: 1.3 },
        shading: { kind: 'cel', strength: 0.24, offset: 0.22 },
        hairHighlight: true,
        hairGradient: true,
        palette: 'color',
        proportion: { headScale: 1.24 },
        eyes: { scale: 1.32, tall: 1.38, iris: 0.8, shine: 2 },
        face: { chin: 'pointed', featureLine: 0.0042 },
        boardOutput: 'vector',
    },
    realistic: {
        id: 'realistic',
        name: 'Realistic',
        tags: ['natural', 'soft', 'proportions'],
        line: { width: 0.0022, color: 'darken', darken: 0.3, silhouette: 1 },
        shading: { kind: 'soft', strength: 0.22, offset: 0.42 },
        palette: 'color',
        proportion: { headScale: 1 },
        eyes: { scale: 0.7, tall: 0.95, iris: 0.56, shine: 1 },
        face: { chin: 'round', featureLine: 0.0032 },
        boardOutput: 'vector',
    },
    manga: {
        id: 'manga',
        name: 'Manga B/W',
        tags: ['manga', 'black and white', 'screentone', 'ink'],
        line: { width: 0.0072, color: 'ink', darken: 1, silhouette: 1.35 },
        shading: { kind: 'cel', strength: 1, offset: 0.24 },
        hairHighlight: true,
        palette: 'manga',
        proportion: { headScale: 1.22 },
        eyes: { scale: 1.26, tall: 1.32, iris: 0.78, shine: 2 },
        face: { chin: 'pointed', featureLine: 0.0048 },
        boardOutput: 'vector',
    },
    webtoon: {
        id: 'webtoon',
        name: 'Webtoon',
        tags: ['webtoon', 'clean', 'rim light'],
        line: { width: 0.0042, color: 'darken', darken: 0.62, silhouette: 1.1 },
        shading: { kind: 'cel', strength: 0.15, offset: 0.28 },
        rim: 0.5,
        hairGradient: true,
        clothGradient: true,
        palette: 'color',
        proportion: { headScale: 1.18 },
        eyes: { scale: 1.16, tall: 1.24, iris: 0.72, shine: 2 },
        face: { chin: 'round', featureLine: 0.0042 },
        boardOutput: 'vector',
    },
};

export const STYLE_PACKS = { ...BASE_PACKS, ...MORE_PACKS };
export type AvailableStyle = keyof typeof STYLE_PACKS;

/** The pack for a style id; a style not built yet (`pixel`: needs the raster pipeline) draws as cartoon. */
export const packFor = (s: StyleId): StylePack =>
    STYLE_PACKS[s as AvailableStyle] ?? STYLE_PACKS.cartoon;

/** The styles that can be picked now, in menu order. */
export const AVAILABLE_STYLES = [
    'cartoon',
    'anime',
    'anime-90s',
    'webtoon',
    'manga',
    'realistic',
    'indian-tv',
    'chibi',
    'doodle',
    'sketch',
    'comic-western',
    'flat',
    'watercolor',
    'cel-3d',
    'picture-book',
    'noir',
    'paper-cut',
    'cyberpunk',
    'stick',
] as const satisfies readonly AvailableStyle[];

const HEX = /^#([0-9a-f]{6})$/i;
const toRgb = (hex: string): [number, number, number] => {
    const m = HEX.exec(hex);
    const n = m ? parseInt(m[1], 16) : 0x808080;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
        .map((v) =>
            Math.round(Math.min(255, Math.max(0, v)))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;

/** `t` of the way from `a` to `b`. */
export function mixColor(a: string, b: string, t: number): string {
    const [r1, g1, b1] = toRgb(a);
    const [r2, g2, b2] = toRgb(b);
    return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Darker (amount > 0) toward a deep ink, keeping some hue. */
export const darken = (hex: string, amount: number) => mixColor(hex, '#1a1210', amount);
export const lighten = (hex: string, amount: number) => mixColor(hex, '#ffffff', amount);
/** Cool shadow colour: shadows lean blue-violet, as in cel animation. */
export const shadeOf = (hex: string, amount: number) => mixColor(hex, '#1c1838', amount);

/** Relative luminance 0..1 (sRGB weights). */
export function luminance(hex: string): number {
    const [r, g, b] = toRgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export const MANGA_INK = '#141414';
export const MANGA_PAPER = '#ffffff';

/**
 * Manga: light colours become paper, middle ones screentone, dark ones ink. `tone` = ink coverage (0 = none).
 * Skin is never ink (the face would vanish): dark skin is a denser tone.
 */
export function mangaPaint(hex: string, skin = false): { fill: string; tone: number } {
    const l = luminance(hex);
    if (l > 0.6) return { fill: MANGA_PAPER, tone: 0 };
    if (l > 0.26) return { fill: MANGA_PAPER, tone: 0.25 };
    return skin ? { fill: MANGA_PAPER, tone: 0.45 } : { fill: MANGA_INK, tone: 0 };
}

/**
 * The head size the style draws for this body (render/head.ts, render/face.ts). The manga body keeps its measured
 * head (7.5–8 heads tall) in every style but a super-deformed one; the classic body takes the style's head scale.
 */
export const drawnHeadScale = (pack: StylePack, body: Pick<Body, 'bodyStyle'>): number =>
    body.bodyStyle === 'manga' && !pack.proportion.superDeformed ? 1 : pack.proportion.headScale;
