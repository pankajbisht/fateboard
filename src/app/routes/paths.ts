/**
 * Every app path in one place (docs/ARCHITECTURE.md "Routing"). Pure data, no React: the SEO route
 * list and gallery data import it in Node too. Link to pages with these instead of string literals.
 */
export const PATHS = {
    home: '/',
    draw: '/draw',
    setting: '/setting',
    commandPalette: '/command-palette',
    help: '/help',
    gallery: '/gallery',
    galleryPiece: '/gallery/:id',
    notFound: '*',
} as const;

export type AppPath = (typeof PATHS)[keyof typeof PATHS];
