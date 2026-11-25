import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { hasFill, hasStroke, isVisiblePaint, paintState } from '../paintToggle';

describe('isVisiblePaint', () => {
    it('treats empty / transparent / zero-alpha as no paint', () => {
        for (const v of [
            null,
            undefined,
            '',
            'transparent',
            'rgba(0,0,0,0)',
            'rgba(255, 0, 0, 0)',
            'hsla(0,0%,0%,0)',
            '#ff000000',
            '#f000',
        ])
            expect(isVisiblePaint(v)).toBe(false);
    });
    it('colors, translucent colors and gradients / patterns count as paint', () => {
        for (const v of ['#000', '#ffffff', 'red', 'rgba(0,0,0,0.2)', '#ff000080'])
            expect(isVisiblePaint(v)).toBe(true);
        expect(isVisiblePaint(new fabric.Gradient({ type: 'linear', colorStops: [] }))).toBe(true);
    });
});

describe('hasFill / hasStroke', () => {
    it('stroke needs a visible color AND a width', () => {
        expect(hasStroke(new fabric.Rect({ stroke: '#000', strokeWidth: 2 }))).toBe(true);
        expect(hasStroke(new fabric.Rect({ stroke: '#000', strokeWidth: 0 }))).toBe(false);
        expect(hasStroke(new fabric.Rect({ stroke: null, strokeWidth: 2 }))).toBe(false);
        expect(hasFill(new fabric.Rect({ fill: 'rgba(0,0,0,0)' }))).toBe(false);
        expect(hasFill(new fabric.Rect({ fill: '#fff' }))).toBe(true);
    });
});

describe('paintState', () => {
    const rectA = () => new fabric.Rect({ fill: '#fff', stroke: '#000', strokeWidth: 2 });
    const bare = () => new fabric.Rect({ fill: '', stroke: null, strokeWidth: 0 });

    it('nothing selected: not applicable', () => {
        expect(paintState([], 'fill')).toEqual({ applicable: false, present: false });
    });

    it('mixed multi-selection counts as present (the click removes it from all)', () => {
        expect(paintState([bare(), rectA()], 'stroke')).toEqual({
            applicable: true,
            present: true,
        });
        expect(paintState([bare(), bare()], 'fill')).toEqual({ applicable: true, present: false });
    });

    it('groups are read through their children; images have no fill to toggle', () => {
        const group = new fabric.Group([bare(), rectA()]);
        expect(paintState([group], 'fill').present).toBe(true);
        const img = new fabric.FabricImage(document.createElement('img'));
        expect(paintState([img], 'fill').applicable).toBe(false);
        expect(paintState([img], 'stroke').applicable).toBe(true);
    });
});
