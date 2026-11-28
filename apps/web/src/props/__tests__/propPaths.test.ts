// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PROPS } from '../catalog';
import { compose, parseTransform, propPaths, svgBodyPaths } from '../render/propPaths';
import { propSvg } from '../render/propSvg';
import { defaultPropData } from '../schema/parse';

const ELEMENT = /<(path|circle|ellipse|rect|polygon|polyline|line)\b/g;

describe('propPaths (props as path records for the Scene Studio)', () => {
    it('reads every catalogue prop and variant, skipping nothing', () => {
        for (const def of PROPS)
            for (let variant = 0; variant < (def.variants?.length ?? 3); variant++) {
                const data = { ...defaultPropData(def), variant };
                const { paths, skipped } = propPaths(def, data);
                expect(skipped, def.id).toBe(0);
                expect(paths.length, def.id).toBeGreaterThan(0);
                // one record per drawing element the page's SVG has (empty shapes aside)
                const elements = propSvg(def, data).match(ELEMENT)?.length ?? 0;
                expect(paths.length, def.id).toBeLessThanOrEqual(elements);
                expect(paths.length, def.id).toBeGreaterThanOrEqual(elements * 0.9);
                for (const p of paths) {
                    expect(p.d, def.id).toMatch(/^M/);
                    expect(p.matrix.every(Number.isFinite), def.id).toBe(true);
                }
            }
    });

    it('turns shapes into paths and keeps paint', () => {
        const { paths } = svgBodyPaths(
            '<circle cx="10" cy="10" r="5" fill="#ff0000" stroke="#141414" stroke-width="3"/>' +
                '<rect x="0" y="0" width="20" height="10" rx="2" fill="#00ff00"/>' +
                '<path d="M0 0L5 5" fill="none" stroke="#0000ff" stroke-width="2" opacity="0.5"/>',
        );
        expect(paths).toHaveLength(3);
        expect(paths[0]).toMatchObject({ fill: '#ff0000', stroke: '#141414', strokeWidth: 3 });
        expect(paths[0].d).toContain('A5 5');
        expect(paths[1].d).toContain('A2 2');
        expect(paths[2]).toMatchObject({ fill: null, stroke: '#0000ff', opacity: 0.5 });
    });

    it('carries group transforms and opacity down to the children', () => {
        const { paths } = svgBodyPaths(
            '<g transform="translate(0 10)"><g opacity="0.5"><path d="M0 0" fill="#111111" opacity="0.5"/></g></g><path d="M1 1" fill="#222222"/>',
        );
        expect(paths[0].matrix).toEqual([1, 0, 0, 1, 0, 10]);
        expect(paths[0].opacity).toBe(0.25);
        expect(paths[1].matrix).toEqual([1, 0, 0, 1, 0, 0]);
        expect(paths[1].opacity).toBeUndefined();
    });

    it('reads rotate about a point exactly, and refuses mirrors and stretches', () => {
        const m = parseTransform('rotate(90 10 0)')!;
        // (20, 0) turns a quarter about (10, 0) → (10, 10)
        const x = m[0] * 20 + m[2] * 0 + m[4];
        const y = m[1] * 20 + m[3] * 0 + m[5];
        expect(x).toBeCloseTo(10);
        expect(y).toBeCloseTo(10);
        expect(parseTransform('scale(2)')).toEqual([2, 0, 0, 2, 0, 0]);
        expect(parseTransform('scale(-1 1)')).toBeNull();
        expect(parseTransform('scale(2 1)')).toBeNull();
        expect(parseTransform('skewX(10)')).toBeNull();
        expect(svgBodyPaths('<path d="M0 0" fill="#000000" transform="skewX(5)"/>').skipped).toBe(
            1,
        );
    });

    it('composes b first, then a', () => {
        expect(compose([2, 0, 0, 2, 0, 0], [1, 0, 0, 1, 5, 0])).toEqual([2, 0, 0, 2, 10, 0]);
    });
});
