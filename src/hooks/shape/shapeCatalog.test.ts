/**
 * Shape catalog: every entry builds a real Fabric object inside its 100 × 100 box, and the 3D
 * shapes are plain closed paths (one object: undo, save, export, snap and animation treat them
 * like any other shape).
 */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { SHAPE_CATEGORIES, SHAPE_CATEGORY_INFO, SHAPES, getShapeDef } from './shapeCatalog';

const THREE_D = [
    'cube',
    'cuboid',
    'cylinder-3d',
    'cone',
    'sphere',
    'pyramid',
    'prism',
    'hex-prism',
    'torus',
];

describe('shape catalog', () => {
    it('type names are unique', () => {
        const types = SHAPES.map((s) => s.type);
        expect(new Set(types).size).toBe(types.length);
    });

    it('every category has a filter chip and a panel title', () => {
        for (const s of SHAPES) {
            expect(
                SHAPE_CATEGORIES.some((c) => c.id === s.category),
                s.type,
            ).toBe(true);
            expect(SHAPE_CATEGORY_INFO[s.category].title, s.type).toBeTruthy();
        }
    });

    it('every path shape parses into a non-empty object inside its 100 box', () => {
        for (const s of SHAPES.filter((x) => x.kind === 'path')) {
            const p = new fabric.Path(s.d!);
            const { left, top, width, height } = p.getBoundingRect();
            expect(width, s.type).toBeGreaterThan(0);
            expect(left, s.type).toBeGreaterThanOrEqual(-1);
            expect(top, s.type).toBeGreaterThanOrEqual(-6); // curve control points may poke out
            expect(left + width, s.type).toBeLessThanOrEqual(101);
            expect(top + height, s.type).toBeLessThanOrEqual(106);
        }
    });

    it('3D shapes: a closed, filled outline drawn with its edges as one path', () => {
        expect(SHAPES.filter((s) => s.category === '3d').map((s) => s.type)).toEqual(THREE_D);
        for (const type of THREE_D) {
            const def = getShapeDef(type)!;
            expect(def.kind, type).toBe('path');
            expect(def.open, type).toBeFalsy();
            expect(def.text, type).toBeFalsy();
            // the first sub-path is the silhouette and is closed (so it fills)
            const first = def.d!.split(/(?=M)/)[0];
            expect(first.trim().endsWith('Z'), type).toBe(true);
        }
    });
});
