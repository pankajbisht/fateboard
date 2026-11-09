import type { CanvasPreset } from './board.type';

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
    {
        id: 'a4-portrait',
        label: 'A4 Portrait',
        category: 'Print',
        width: 794,
        height: 1123,
        icon: 'file-lines',
    },
    {
        id: 'a4-landscape',
        label: 'A4 Landscape',
        category: 'Print',
        width: 1123,
        height: 794,
        icon: 'file-lines',
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
 *  CanvasSizePanel) so store slices can import it without importing a component that imports the store
 *  (circular import). */
export const DEFAULT_CANVAS_PRESET: CanvasPreset = CANVAS_PRESETS.find(
    (preset) => preset.id === 'presentation-16-9',
)!;
