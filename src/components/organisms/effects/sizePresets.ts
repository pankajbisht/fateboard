export interface SizePreset {
    id: string;
    label: string;
    width: number;
    height: number;
    category?: string;
}

export const SIZE_PRESETS: SizePreset[] = [
    {
        id: 'youtube-thumbnail',
        label: 'YouTube Thumbnail',
        width: 1280,
        height: 720,
        category: 'YouTube',
    },
    {
        id: 'youtube-banner',
        label: 'YouTube Banner',
        width: 2560,
        height: 1440,
        category: 'YouTube',
    },
    {
        id: 'instagram-post',
        label: 'Instagram Post',
        width: 1080,
        height: 1080,
        category: 'Instagram',
    },
    {
        id: 'instagram-story',
        label: 'Instagram Story',
        width: 1080,
        height: 1920,
        category: 'Instagram',
    },
    {
        id: 'presentation',
        label: 'Presentation',
        width: 1920,
        height: 1080,
        category: 'Presentation',
    },
    {
        id: 'poster',
        label: 'Poster',
        width: 1080,
        height: 1350,
        category: 'Poster',
    },
    {
        id: 'facebook-post',
        label: 'Facebook Post',
        width: 1200,
        height: 630,
        category: 'Social',
    },
    {
        id: 'linkedin-post',
        label: 'LinkedIn Post',
        width: 1200,
        height: 627,
        category: 'Social',
    },
];
