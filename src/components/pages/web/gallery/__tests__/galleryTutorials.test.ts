/**
 * Every gallery piece has a tutorial whose steps match the `<g id="step-N">` groups in its SVG
 * (the stage reveals one group per step), and its key marks name keys the editor really uses.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { countSteps } from '@/components/pages/GalleryTutorial/artwork';

import { GALLERY_ITEMS, galleryImage } from '../galleryData';
import { GALLERY_TUTORIALS } from '../galleryTutorials';

const svgOf = (id: string) =>
    readFileSync(resolve(process.cwd(), 'public', galleryImage({ id } as never).slice(1)), 'utf8');

/** Keys the tutorials may show: the editor's documented shortcuts (Help > Keyboard Shortcuts). */
const KEY_MARK =
    /^(mod\+(O|D|G|L|shift\+U|shift\+L|↑|↓|shift\+↑|shift\+↓|'|;)|alt\+D|shift\+P|[PAVH]|F2|alt|shift)$/;

describe.each(GALLERY_ITEMS)('tutorial for $id', (item) => {
    const tutorial = GALLERY_TUTORIALS[item.id];

    it('exists, with one step per step group in the artwork', () => {
        expect(tutorial).toBeDefined();
        const groups = countSteps(svgOf(item.id));
        expect(groups).toBeGreaterThanOrEqual(3);
        expect(tutorial!.steps).toHaveLength(groups);
    });

    it('has unique step titles, takeaways and sensible metadata', () => {
        const titles = tutorial!.steps.map((s) => s.title);
        expect(new Set(titles).size).toBe(titles.length);
        expect(tutorial!.tricks.length).toBeGreaterThanOrEqual(2);
        expect(tutorial!.minutes).toBeGreaterThan(0);
        expect(tutorial!.intro.length).toBeGreaterThan(40);
    });

    it('only marks real editor keys', () => {
        const text = [
            ...tutorial!.steps.flatMap((s) => [s.text, s.trick ?? '']),
            ...tutorial!.tricks,
        ].join(' ');
        const marks = [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
        expect(marks.filter((mark) => !KEY_MARK.test(mark))).toEqual([]);
    });

    it('step groups appear in order, step-1 first', () => {
        const ids = [...svgOf(item.id).matchAll(/<g id="step-(\d+)">/g)].map((m) => Number(m[1]));
        expect(ids).toEqual(ids.map((_, i) => i + 1));
    });
});

it('no tutorial without a gallery piece', () => {
    const ids = new Set(GALLERY_ITEMS.map((i) => i.id));
    expect(Object.keys(GALLERY_TUTORIALS).filter((id) => !ids.has(id))).toEqual([]);
});
