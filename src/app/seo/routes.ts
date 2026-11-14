/**
 * One list of public routes and their search / social metadata (docs/ARCHITECTURE.md "SEO").
 * Read by the build (`vite.config.ts` → `prerender.ts`: one static HTML file per route + sitemap) and by the app
 * (`RouteSeo`: updates the head on client-side navigation). Pure data: no DOM, and imports only other pure data
 * modules (runs in Node too).
 * The `/` entry must match `index.html` (guarded by `seo.test.ts`).
 */

import {
    CATEGORY_LABEL,
    GALLERY_ITEMS,
    galleryPath,
} from '../../components/pages/web/gallery/galleryData';
import { PATHS } from '../routes/paths';

export interface SeoRoute {
    /** Router path, no trailing slash (`/` for the landing page). */
    path: string;
    title: string;
    description: string;
    /** false = `noindex` + left out of the sitemap (still prerendered so a direct visit is HTTP 200). */
    index: boolean;
    /** Crawlable fallback content shown before React mounts (and to no-JS crawlers). */
    heading: string;
    intro: string;
}

export const SEO_ROUTES: readonly SeoRoute[] = [
    {
        path: '/',
        title: 'Free Online Whiteboard & Design Canvas | Fateboard',
        description:
            'Fateboard is a free online whiteboard and design canvas. Sketch, draw shapes, add text, brainstorm and mind map in your browser. No sign-up needed.',
        index: true,
        heading: 'Fateboard: free online whiteboard and design canvas',
        intro: 'Sketch, draw shapes and arrows, add text, brainstorm and mind map on a blank canvas in your browser. Free, no sign-up needed.',
    },
    {
        path: '/draw',
        title: 'Draw Online: Free Whiteboard Editor | Fateboard',
        description:
            'Open a blank canvas and start drawing online. Brushes, shapes, arrows, text, pages, templates and animation, free in your browser.',
        index: true,
        heading: 'Draw online on a free whiteboard',
        intro: 'A blank canvas with brushes, shapes, arrows, text, multiple pages, templates and keyframe animation. Your work is saved in your browser.',
    },
    {
        path: '/help',
        title: 'Help & Keyboard Shortcuts | Fateboard',
        description:
            'How to use Fateboard: tools, panels and every keyboard shortcut for drawing, shapes, text, layers, undo and export.',
        index: true,
        heading: 'Fateboard help and keyboard shortcuts',
        intro: 'Learn the drawing tools, panels and keyboard shortcuts of the Fateboard online whiteboard.',
    },
    {
        path: '/setting',
        title: 'Settings | Fateboard',
        description: 'Fateboard editor settings.',
        index: false,
        heading: 'Fateboard settings',
        intro: 'Editor preferences for the Fateboard online whiteboard.',
    },
    {
        path: '/command-palette',
        title: 'Commands | Fateboard',
        description: 'Search every Fateboard command.',
        index: false,
        heading: 'Fateboard commands',
        intro: 'Search and run every Fateboard editor command.',
    },
    {
        path: PATHS.gallery,
        title: 'Gallery: Cartoons, Manga, Scenery & Diagrams | Fateboard',
        description:
            'Cartoons, manga, scenery, flow diagrams and designs made with Fateboard. Open any piece to watch it built step by step.',
        index: true,
        heading: 'Made with Fateboard',
        intro: 'Characters, worlds and diagrams built from shapes, pen paths, gradients and text. Open any piece to learn how it is made.',
    },
    // one tutorial page per gallery piece
    ...GALLERY_ITEMS.map((item): SeoRoute => ({
        path: galleryPath(item),
        title: `How to Make ${item.title}: ${CATEGORY_LABEL[item.category]} Tutorial | Fateboard`,
        description: `Step-by-step ${CATEGORY_LABEL[item.category].toLowerCase()} tutorial: ${item.description}`,
        index: true,
        heading: `How to make ${item.title}`,
        intro: `${item.description} Watch it being built step by step in Fateboard, the free online canvas.`,
    })),
];

/** Shown for any path that is not a public route (share links, unknown URLs): never indexed. */
export const FALLBACK_SEO: SeoRoute = {
    path: '',
    title: 'Fateboard',
    description: 'Free online whiteboard and design canvas.',
    index: false,
    heading: 'Fateboard',
    intro: 'Free online whiteboard and design canvas.',
};

const normalize = (pathname: string) => (pathname.replace(/\/+$/, '') || '/').toLowerCase();

export function seoForPath(pathname: string): SeoRoute {
    const path = normalize(pathname);
    return SEO_ROUTES.find((r) => r.path === path) ?? FALLBACK_SEO;
}

/** Absolute URL of a route; `siteUrl` comes from `VITE_SITE_URL` (`normalizeSiteUrl`). */
export const canonicalUrl = (route: SeoRoute, siteUrl: string) =>
    `${siteUrl}${route.path === '/' ? '/' : route.path}`;
