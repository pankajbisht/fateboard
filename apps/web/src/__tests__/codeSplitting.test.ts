/**
 * Performance (production readiness P1): every page is its own chunk, so the landing page does not
 * download the editor (panels, animation, export, templates). The router may only `lazy()`-import
 * pages; a static import would pull that page back into the entry chunk.
 */
import { describe, expect, it } from 'vitest';

const FILES = import.meta.glob<string>(['/src/app/rootRouter.tsx', '/src/app/routes/*.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
});
/** The router and its route registry (`src/app/routes/appRoutes.tsx`). */
const ROUTER = Object.values(FILES).join('\n');

describe('code splitting', () => {
    it('the router and route registry import no page statically', () => {
        const staticPageImports = ROUTER.split('\n').filter((line) =>
            /^import\s.+from\s+['"]@\/components\/pages\//.test(line),
        );
        expect(staticPageImports).toEqual([]);
    });

    it('every routed page is lazy-loaded', () => {
        for (const page of [
            'web/WhiteboardMarketingSite',
            'Editor/Editor',
            'Setting/EditorSettingPage',
            'HelpPage/HelpPage',
            'NotFound/NotFoundPage',
            'Command/CommandPalette',
            'GalleryTutorial/GalleryTutorialPage',
            'Gallery/GalleryPage',
        ]) {
            expect(ROUTER, page).toMatch(new RegExp(`import\\('@/components/pages/${page}'\\)`));
        }
    });
});
