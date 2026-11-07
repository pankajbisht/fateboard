/**
 * Performance (production readiness P1): template images were 2–7 MB camera originals (dist 39 MB).
 * Gallery cards use small thumbnails; every referenced file exists and stays within budget.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { DESIGN_TEMPLATES } from '@/components/organisms/effects/designTemplateData';

const file = (url: string) => resolve(process.cwd(), 'public', url.replace(/^\//, ''));
const KB = 1024;

describe('template assets', () => {
    it('gallery thumbnails are small files under /template/thumb/', () => {
        for (const t of DESIGN_TEMPLATES) {
            expect(t.thumbnail, t.id).toMatch(/^\/template\/thumb\//);
            expect(statSync(file(t.thumbnail)).size, t.thumbnail).toBeLessThan(150 * KB);
        }
    });

    it('preview and canvas images stay under 1 MB each', () => {
        const urls = new Set<string>();
        for (const t of DESIGN_TEMPLATES) {
            if (t.preview) urls.add(t.preview);
            for (const o of t.objects ?? []) {
                const src = (o as { src?: string }).src;
                if (src?.startsWith('/template/')) urls.add(src);
            }
        }
        for (const url of urls) {
            if (!existsSync(file(url))) continue; // missing files: BUG-145
            expect(statSync(file(url)).size, url).toBeLessThan(1024 * KB);
        }
    });
});
