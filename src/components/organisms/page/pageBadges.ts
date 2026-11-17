import { useMemo } from 'react';
import { useStore } from '@store';
import { isLeftPage, normalizePageRole, pageNumberOf } from '@/lib/document/pageSetup';

type PageRec = { id: string; canvasJSON?: Record<string, unknown> | null };

/**
 * Page card chips (2026-11-17): document page numbers (master pages skipped, shown "M"), and "L" / "R" on facing
 * pages. The open page's role and setup are live (canvas), the others come from their saved JSON.
 */
export function usePageBadges(pages: PageRec[], currentPageId: string | null) {
    const role = useStore((s) => s.pageRole);
    const facing = useStore((s) => s.pageSetup.facing);
    return useMemo(() => {
        const roles = pages.map((p) => ({
            role: p.id === currentPageId ? role : normalizePageRole(p.canvasJSON?.pageRole),
        }));
        const labels = pages.map((_, i) => {
            const n = pageNumberOf(roles, i);
            if (n === null) return 'M';
            return facing ? `${isLeftPage(n) ? 'L' : 'R'} ${n}` : String(n);
        });
        return { labels, facing };
    }, [pages, currentPageId, role, facing]);
}
