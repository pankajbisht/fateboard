// @vitest-environment node
/** Effect brush sets (2026-11-17): lightning & electric, water & liquid, ice & frost, more smoke & fog. */
import { describe, expect, it } from 'vitest';
import { BRUSH_CATEGORIES, STAMP_BRUSHES } from '../brushLibrary';
import { brushCategory, getPreset } from '../brushConfig';
import { resolveStamp } from '@/lib/brushes/stamp/stampParams';

const inCategory = (c: string) =>
    Object.keys(STAMP_BRUSHES).filter((id) => brushCategory(id) === c);

describe('effect brush sets', () => {
    it('adds Lightning & electric, Water & liquid and Ice & frost categories', () => {
        const ids = BRUSH_CATEGORIES.map((c) => c.id as string);
        expect(ids).toEqual(expect.arrayContaining(['electric', 'liquid', 'ice']));
        for (const c of ['electric', 'liquid', 'ice'])
            expect(inCategory(c).length).toBeGreaterThanOrEqual(4);
    });

    it('has at least nine smoke & fog brushes', () => {
        expect(inCategory('smoke').length).toBeGreaterThanOrEqual(9);
    });

    it('lightning brushes zigzag and glow', () => {
        const bolts = inCategory('electric').filter(
            (id) => resolveStamp(getPreset(id).stamp).jag > 0,
        );
        expect(bolts.length).toBeGreaterThanOrEqual(3);
        for (const id of bolts) expect(resolveStamp(getPreset(id).stamp).glow).toBeGreaterThan(0);
    });

    it('every new brush resolves to valid settings and has a label', () => {
        for (const c of ['electric', 'liquid', 'ice', 'smoke'])
            for (const id of inCategory(c)) {
                expect(getPreset(id).label.length).toBeGreaterThan(1);
                expect(getPreset(id).engine).toBe('stamp');
            }
    });
});
