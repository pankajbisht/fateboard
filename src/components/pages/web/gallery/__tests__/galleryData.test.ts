/**
 * Landing page gallery artwork: the set the page promises (3–4 cartoon, 3–4 manga, 4 scenery,
 * 3 flow diagrams), small files, and only SVG the editor can import: Fabric must turn every
 * drawable element into an object, so File > Open gives an editable copy of each piece.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import * as fabric from 'fabric';
import { describe, expect, it } from 'vitest';

import { GALLERY_CATEGORIES, GALLERY_ITEMS, galleryImage, type GalleryItem } from '../galleryData';

const KB = 1024;
const file = (item: GalleryItem) => resolve(process.cwd(), 'public', galleryImage(item).slice(1));
const svgOf = (item: GalleryItem) => readFileSync(file(item), 'utf8');

/** Elements Fabric's SVG parser builds objects from. */
const DRAWABLE = ['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text'];
/** Containers / paint servers it reads. Anything else (filter, mask, pattern, image, use...) is out. */
const ALLOWED = new Set([
    ...DRAWABLE,
    'svg',
    'title',
    'g',
    'defs',
    'linearGradient',
    'radialGradient',
    'stop',
]);

const tagsOf = (svg: string) => [...svg.matchAll(/<([a-zA-Z]+)[\s/>]/g)].map((m) => m[1]!);
const count = (category: string) => GALLERY_ITEMS.filter((i) => i.category === category).length;

describe('gallery data', () => {
    it('has the promised mix of pieces', () => {
        expect(count('cartoon')).toBeGreaterThanOrEqual(3);
        expect(count('cartoon')).toBeLessThanOrEqual(4);
        expect(count('manga')).toBeGreaterThanOrEqual(3);
        expect(count('manga')).toBeLessThanOrEqual(4);
        expect(count('scenery')).toBe(4);
        expect(count('flow')).toBe(3);
        for (const { id } of GALLERY_CATEGORIES) expect(count(id), id).toBeGreaterThan(0);
    });

    it('ids are unique', () => {
        const ids = GALLERY_ITEMS.map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe.each(GALLERY_ITEMS)('gallery artwork $id', (item) => {
    it('exists, is small, and is titled', () => {
        expect(existsSync(file(item))).toBe(true);
        expect(statSync(file(item)).size).toBeLessThan(40 * KB);
        const svg = svgOf(item);
        expect(svg).toContain('viewBox="0 0 480 360"');
        expect(svg).toContain(`<title>${item.title}</title>`);
    });

    it('uses only SVG the editor can import, with no external references', () => {
        const svg = svgOf(item);
        const unsupported = tagsOf(svg).filter((tag) => !ALLOWED.has(tag));
        expect(unsupported).toEqual([]);
        expect(svg).not.toMatch(/href=|url\((?!#)/);
    });

    it('Fabric imports every drawable element', async () => {
        const svg = svgOf(item);
        const drawable = tagsOf(svg).filter((tag) => DRAWABLE.includes(tag)).length;
        const { objects } = await fabric.loadSVGFromString(svg);
        expect(objects.filter(Boolean)).toHaveLength(drawable);
    });
});
