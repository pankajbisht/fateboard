import type { CanvasPreset } from './board.type';

/** Print sizes are page px at 96 per inch (CSS reference, lib/units); export picks the resolution. */
const mm = (v: number) => Math.round((v * 96) / 25.4);
const inch = (v: number) => Math.round(v * 96);
/** Bleed + safe area (Clip Studio manga manuscript style), mm → page px (unrounded, like typed values). */
const setup = (bleedMm: number, topMm: number, sideMm: number) => {
    const px = (v: number) => (v * 96) / 25.4;
    return {
        bleed: px(bleedMm),
        margins: { top: px(topMm), bottom: px(topMm), inside: px(sideMm), outside: px(sideMm) },
    };
};

export const CANVAS_PRESETS: CanvasPreset[] = [
    {
        id: 'youtube-thumbnail',
        label: 'YouTube Thumbnail',
        category: 'Video',
        width: 1280,
        height: 720,
        icon: 'youtube',
    },
    {
        id: 'youtube-shorts',
        label: 'YouTube Shorts',
        category: 'Video',
        width: 1080,
        height: 1920,
        icon: 'youtube',
    },
    {
        id: 'youtube-channel-art',
        label: 'YouTube Channel Art',
        category: 'Video',
        width: 2560,
        height: 1440,
        icon: 'tv',
    },
    {
        id: 'instagram-post',
        label: 'Instagram Post',
        category: 'Social Media',
        width: 1080,
        height: 1080,
        icon: 'instagram',
    },
    {
        id: 'instagram-story',
        label: 'Instagram Story',
        category: 'Social Media',
        width: 1080,
        height: 1920,
        icon: 'instagram',
    },
    {
        id: 'facebook-post',
        label: 'Facebook Post',
        category: 'Social Media',
        width: 1200,
        height: 630,
        icon: 'facebook',
    },
    {
        id: 'facebook-cover',
        label: 'Facebook Cover',
        category: 'Social Media',
        width: 1640,
        height: 924,
        icon: 'facebook',
    },
    {
        id: 'linkedin-post',
        label: 'LinkedIn Post',
        category: 'Social Media',
        width: 1200,
        height: 627,
        icon: 'linkedin',
    },
    // one entry per format: Settings > Orientation picks portrait / landscape (2026-11-17; the id stays for saved settings)
    {
        id: 'a4-portrait',
        label: 'A4',
        category: 'Print',
        width: 794,
        height: 1123,
        icon: 'file-lines',
    },
    {
        id: 'a3',
        label: 'A3',
        category: 'Print',
        width: mm(297),
        height: mm(420),
        icon: 'file-lines',
    },
    {
        id: 'letter',
        label: 'US Letter',
        category: 'Print',
        width: inch(8.5),
        height: inch(11),
        icon: 'file-lines',
    },
    {
        id: 'legal',
        label: 'US Legal',
        category: 'Print',
        width: inch(8.5),
        height: inch(14),
        icon: 'file-lines',
    },
    {
        id: 'tabloid',
        label: 'Tabloid',
        category: 'Print',
        width: inch(11),
        height: inch(17),
        icon: 'file-lines',
    },
    // manga / comics: the page is the trim size; bleed 3 mm + a safe area like Clip Studio's manuscript
    {
        id: 'manga-b4',
        label: 'Manga manuscript B4',
        category: 'Manga & comics',
        width: mm(257),
        height: mm(364),
        icon: 'comic-panels',
        pageSetup: setup(3, 25, 20),
    },
    {
        id: 'manga-b5',
        label: 'Manga B5 (doujinshi)',
        category: 'Manga & comics',
        width: mm(182),
        height: mm(257),
        icon: 'comic-panels',
        pageSetup: setup(3, 18.5, 16),
    },
    {
        id: 'manga-a5',
        label: 'Manga A5 (paperback)',
        category: 'Manga & comics',
        width: mm(148),
        height: mm(210),
        icon: 'comic-panels',
        pageSetup: setup(3, 15, 12),
    },
    {
        id: 'us-comic',
        label: 'US comic book',
        category: 'Manga & comics',
        width: inch(6.625),
        height: inch(10.25),
        icon: 'comic-panels',
        pageSetup: setup(3.175, 8.5, 8),
    },
    // vertical scroll comics: 800 px wide
    {
        id: 'webtoon-panel',
        label: 'Webtoon episode panel',
        category: 'Webtoon',
        width: 800,
        height: 1280,
        icon: 'images',
    },
    {
        id: 'webtoon-strip',
        label: 'Webtoon long strip',
        category: 'Webtoon',
        width: 800,
        height: 6400,
        icon: 'images',
    },
    // digital painting
    {
        id: 'square-2048',
        label: 'Square 2048',
        category: 'Digital art',
        width: 2048,
        height: 2048,
        icon: 'palette',
    },
    {
        id: 'square-4096',
        label: 'Square 4096',
        category: 'Digital art',
        width: 4096,
        height: 4096,
        icon: 'palette',
    },
    {
        id: 'uhd-4k',
        label: '4K UHD',
        category: 'Digital art',
        width: 3840,
        height: 2160,
        icon: 'display',
    },
    {
        id: 'ipad-pro',
        label: 'iPad Pro canvas',
        category: 'Digital art',
        width: 2732,
        height: 2048,
        icon: 'display',
    },
    {
        id: 'print-8x10',
        label: 'Art print 8 × 10 in',
        category: 'Digital art',
        width: inch(8),
        height: inch(10),
        icon: 'image',
    },
    {
        id: 'print-11x14',
        label: 'Art print 11 × 14 in',
        category: 'Digital art',
        width: inch(11),
        height: inch(14),
        icon: 'image',
    },
    {
        id: 'print-18x24',
        label: 'Poster 18 × 24 in',
        category: 'Digital art',
        width: inch(18),
        height: inch(24),
        icon: 'image',
    },
    {
        id: 'presentation-16-9',
        label: 'Presentation 16:9',
        category: 'Presentation',
        width: 1920,
        height: 1080,
        icon: 'display',
    },
];

/** The preset a new board starts with: Full HD 16:9, the usual default of design tools. Lives here (not in
 *  a component) so store slices can import it without importing a component that imports the store
 *  (circular import). */
export const DEFAULT_CANVAS_PRESET: CanvasPreset = CANVAS_PRESETS.find(
    (preset) => preset.id === 'presentation-16-9',
)!;

/** Settings > Canvas > Orientation: the canvas size is used in it (owner, 2026-11-11). */
export type CanvasOrientation = 'landscape' | 'portrait';
export const CANVAS_ORIENTATIONS: readonly CanvasOrientation[] = ['landscape', 'portrait'];

const SWAP_SUFFIX = '@swapped';

/** `youtube-shorts@swapped` -> `youtube-shorts`, so a rotated preset still matches its format. */
export const basePresetId = (id: string) => id.replace(SWAP_SUFFIX, '');

/** Ids that were merged into another entry (2026-11-17: A4 Portrait / Landscape became one "A4"). */
const LEGACY_PRESET_IDS: Record<string, string> = { 'a4-landscape': 'a4-portrait' };

/** The current preset id for a saved one (old ids, rotated ids), or the id itself. */
export const currentPresetId = (id: string) => {
    const base = basePresetId(id);
    return LEGACY_PRESET_IDS[base] ?? base;
};

/** The format behind a preset id (old and rotated ids too); undefined for custom sizes. */
export const findPreset = (id: string): CanvasPreset | undefined =>
    CANVAS_PRESETS.find((p) => p.id === currentPresetId(id));

/**
 * The same format with its long side horizontal (landscape) or vertical (portrait). A square size
 * stays as it is. A rotated preset keeps its format's id with `@swapped`; a size that is not a
 * preset gets an id from its dimensions.
 */
export function orientPreset(preset: CanvasPreset, orientation: CanvasOrientation): CanvasPreset {
    const base = basePresetId(preset.id);
    const long = Math.max(preset.width, preset.height);
    const short = Math.min(preset.width, preset.height);
    const width = orientation === 'landscape' ? long : short;
    const height = orientation === 'landscape' ? short : long;

    const original = CANVAS_PRESETS.find((p) => p.id === base);
    const isOriginalSize = !!original && original.width === width && original.height === height;

    const id = !original
        ? `custom-${width}x${height}` // custom size: id follows the dimensions
        : isOriginalSize
          ? base
          : `${base}${SWAP_SUFFIX}`;

    return { ...preset, id, width, height };
}
