/** Video export choices of the Animation panel. */
export const EXPORT_SIZES = [
    { id: 'canvas', label: 'Canvas size', w: 0, h: 0 },
    { id: '720', label: '1280 × 720 (HD)', w: 1280, h: 720 },
    { id: '1080', label: '1920 × 1080 (Full HD)', w: 1920, h: 1080 },
    { id: '2160', label: '3840 × 2160 (4K)', w: 3840, h: 2160 },
    { id: 'vertical', label: '1080 × 1920 (Reels / Shorts)', w: 1080, h: 1920 },
    { id: 'square', label: '1080 × 1080 (Square)', w: 1080, h: 1080 },
];

export const EXPORT_QUALITY = [
    { id: 'low', label: 'Low (2.5 Mbps)', bps: 2_500_000 },
    { id: 'medium', label: 'Medium (6 Mbps)', bps: 6_000_000 },
    { id: 'high', label: 'High (12 Mbps)', bps: 12_000_000 },
    { id: 'ultra', label: 'Ultra (25 Mbps)', bps: 25_000_000 },
];

export const EXPORT_FPS = [24, 30, 60].map((f) => ({ value: f, label: `${f} fps` }));
