import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { isTextFloatTarget, shapeText, textTargets } from '../textTargets';

/* eslint-disable @typescript-eslint/no-explicit-any */

const textShape = (label = 'Note') => {
    const box = new fabric.Rect({ width: 130, height: 130, fill: '#FFF3A3' });
    const text = new fabric.Textbox(label, { width: 100, fontSize: 18 });
    const g: any = new fabric.Group([box, text]);
    Object.assign(g, { isTextShape: true });
    return { g, box, text };
};

describe('textTargets: one rule for "the text" of a selection', () => {
    it('plain text boxes are their own text', () => {
        const tb = new fabric.Textbox('Hi');
        expect(textTargets([tb])).toEqual([{ text: tb, shape: null }]);
    });

    it('text shapes / sticky notes give their inner text (and the shape, to re-fit it)', () => {
        const { g, text } = textShape();
        expect(shapeText(g)).toBe(text);
        expect(textTargets([g])).toEqual([{ text, shape: g }]);
    });

    it('prefers the cached __text reference; plain shapes and groups have no text', () => {
        const { g } = textShape();
        const other = new fabric.Textbox('cached');
        g.__text = other;
        expect(shapeText(g)).toBe(other);
        expect(textTargets([new fabric.Rect(), new fabric.Group([new fabric.Rect()])])).toEqual([]);
    });

    it('the text float shows for text boxes and text shapes only', () => {
        expect(isTextFloatTarget(new fabric.Textbox('x'))).toBe(true);
        expect(isTextFloatTarget(textShape().g)).toBe(true);
        expect(isTextFloatTarget(new fabric.Rect())).toBe(false);
        expect(isTextFloatTarget(null)).toBe(false);
    });
});
