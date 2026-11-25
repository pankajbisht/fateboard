import { describe, expect, it } from 'vitest';
import {
    DEFAULT_GRID_PREFS,
    GRID_STYLES,
    gridModeFor,
    gridSnapSteps,
    isoRowHeight,
    sanitizeGridPrefs,
} from './grid';

describe('grid model', () => {
    it('offers seven styles', () => {
        expect(GRID_STYLES).toEqual([
            'lines',
            'plain',
            'dashed',
            'dots',
            'crosses',
            'isometric',
            'ruled',
        ]);
    });

    it('defaults: dots on the whiteboard, graph lines on a design page', () => {
        expect(DEFAULT_GRID_PREFS.whiteboard).toEqual({ style: 'dots', size: 20 });
        expect(DEFAULT_GRID_PREFS.design).toEqual({ style: 'lines', size: 20 });
        expect(gridModeFor('whiteboard')).toBe('whiteboard');
        expect(gridModeFor(null)).toBe('design');
    });

    it('sanitizes saved prefs: unknown styles and bad sizes fall back, sizes are clamped', () => {
        expect(sanitizeGridPrefs(undefined)).toEqual(DEFAULT_GRID_PREFS);
        expect(
            sanitizeGridPrefs({
                design: { style: 'isometric', size: 1000 },
                whiteboard: { style: 'zigzag', size: 'big' },
            }),
        ).toEqual({
            design: { style: 'isometric', size: 200 },
            whiteboard: { style: 'dots', size: 20 },
        });
        expect(sanitizeGridPrefs({ design: { style: 'ruled', size: 1.4 } }).design.size).toBe(4);
    });

    it('snap lattice: cells for square styles, triangle corners for isometric, rows for ruled', () => {
        for (const style of ['lines', 'plain', 'dashed', 'dots', 'crosses'] as const) {
            expect(gridSnapSteps(style, 20)).toEqual({ x: 20, y: 20 });
        }
        expect(gridSnapSteps('isometric', 20)).toEqual({ x: 10, y: isoRowHeight(20) });
        expect(isoRowHeight(20)).toBeCloseTo(17.3205, 3);
        expect(gridSnapSteps('ruled', 24)).toEqual({ x: null, y: 24 });
    });
});
