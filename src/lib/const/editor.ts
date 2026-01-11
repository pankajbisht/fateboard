export const DEVELOPMENT = 'development';
export const LANDSCAPE = 'landscape';
export const A4 = 'A4';
export const DEFAULT = 'Default';
export const FREEHAND = 'freehand';
export const PORTRAIT = 'portrait';

// export const PAGE_SIZES = {
//     Default: { w: 1024, h: 600 },
//     // Freehand: { w: 1920, h: 1080 },
//     Freehand: { w: 500, h: 400 },
//     A4: { w: 794, h: 1123 },
//     A5: { w: 794, h: 1123 },
//     Letter: { w: 816, h: 1056 },
//     Legal: { w: 816, h: 1344 },
// };

export const PAGE_SIZES = {
    DEFAULT: { w: 1024, h: 600 },

    FREEHAND: { w: 500, h: 400 },

    A3: { w: 1123, h: 1587 },
    A4: { w: 794, h: 1123 },
    A5: { w: 559, h: 794 },

    LETTER: { w: 816, h: 1056 },
    LEGAL: { w: 816, h: 1344 },

    // CUSTOM: null, // handled separately (user input)
    CUSTOM: { w: 1600, h: 2200 },
};
