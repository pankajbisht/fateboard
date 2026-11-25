import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';

import { createTextSlice } from '@/store/slices/createTextSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

function setup(text = 'Hello world') {
    const canvas = createFakeCanvas() as any;
    canvas.getVpCenter = () => new fabric.Point(100, 100);
    const saveState = vi.fn();
    const h = createHarness([createTextSlice as any], { canvas, saveState });
    const tb = new fabric.Textbox(text, { left: 0, top: 0, width: 200, fontSize: 20 });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    return { canvas, h, tb, saveState };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('updateText', () => {
    it('styles every selected text box and records one history step', () => {
        const { h, tb, saveState } = setup();
        h.get().updateText({ fontWeight: 'bold', textAlign: 'center' });
        expect(tb.fontWeight).toBe('bold');
        expect(tb.textAlign).toBe('center');
        expect(saveState).toHaveBeenCalledTimes(1);
    });

    it('whole-box styling overrides per-character styles of the same property', () => {
        const { h, tb } = setup();
        tb.setSelectionStyles({ fill: '#00ff00' }, 0, 5);
        expect(tb.getStyleAtPosition(0).fill).toBe('#00ff00');

        h.get().updateText({ fill: '#ff0000' });
        expect(tb.fill).toBe('#ff0000');
        expect(tb.getStyleAtPosition(0).fill).toBeUndefined();
    });

    it('while typing with characters selected, styles only those characters', () => {
        const { h, tb } = setup();
        tb.isEditing = true;
        tb.selectionStart = 0;
        tb.selectionEnd = 5;

        h.get().updateText({ fontWeight: 'bold' });
        expect(tb.getStyleAtPosition(0).fontWeight).toBe('bold');
        expect(tb.getStyleAtPosition(7).fontWeight).toBeUndefined();
        expect(tb.fontWeight).not.toBe('bold');
    });

    it('{ history: false } previews without an undo step (slider drag)', () => {
        const { h, tb, saveState } = setup();
        h.get().updateText({ charSpacing: 200 }, { history: false });
        expect(tb.charSpacing).toBe(200);
        expect(saveState).not.toHaveBeenCalled();
    });

    it('waits for a web font to load, then re-measures the text', async () => {
        const { h, tb } = setup();
        const load = vi.fn(() => Promise.resolve([]));
        Object.defineProperty(document, 'fonts', { value: { load }, configurable: true });
        const measure = vi.spyOn(tb, 'initDimensions');

        h.get().updateText({ fontFamily: 'Poppins' });
        expect(load).toHaveBeenCalledWith(expect.stringContaining('"Poppins"'));
        await Promise.resolve();
        await Promise.resolve();
        expect(measure).toHaveBeenCalled();
    });
});

describe('setTextCase', () => {
    it('changes the letter case of the selected text', () => {
        const { h, tb, saveState } = setup('hello big world');
        h.get().setTextCase('upper');
        expect(tb.text).toBe('HELLO BIG WORLD');
        h.get().setTextCase('title');
        expect(tb.text).toBe('Hello Big World');
        h.get().setTextCase('lower');
        expect(tb.text).toBe('hello big world');
        expect(saveState).toHaveBeenCalledTimes(3);
    });
});

describe('addText', () => {
    it('wraps by word, not in the middle of words', () => {
        const { canvas, h } = setup();
        h.get().addText({ text: 'Heading', fontSize: 48 });
        const added = canvas.getObjects().at(-1);
        expect(added).toBeInstanceOf(fabric.Textbox);
        expect(added.splitByGrapheme).toBe(false);
        expect(added.fontSize).toBe(48);
    });
});

describe('font library values', () => {
    it('loads the first family of a list value ("\'Inter\', Arial, sans-serif" -> "Inter")', async () => {
        const { h } = setup();
        const load = vi.fn(() => Promise.resolve([]));
        Object.defineProperty(document, 'fonts', { value: { load }, configurable: true });
        h.get().updateText({ fontFamily: "'Inter', Arial, sans-serif" });
        expect(load).toHaveBeenCalledWith('16px "Inter"');
    });
});

describe('text inside shapes / sticky notes (one text float for the whole app)', () => {
    const shapeSetup = () => {
        const canvas = createFakeCanvas() as any;
        const saveState = vi.fn();
        const fitTextShape = vi.fn();
        const h = createHarness([createTextSlice as any], { canvas, saveState, fitTextShape });
        const box = new fabric.Rect({ width: 130, height: 130 });
        const text = new fabric.Textbox('Note', { width: 100, fontSize: 18 });
        const g: any = new fabric.Group([box, text]);
        Object.assign(g, { isTextShape: true, __text: text, __box: box });
        canvas.add(g);
        canvas.setActiveObject(g);
        return { h, g, text, saveState, fitTextShape };
    };

    it('updateText styles the shape text and re-fits the shape, one history step', () => {
        const { h, g, text, saveState, fitTextShape } = shapeSetup();
        h.get().updateText({ fontSize: 40, fontWeight: 'bold', textAlign: 'right' });
        expect(text.fontSize).toBe(40);
        expect(text.fontWeight).toBe('bold');
        expect(text.textAlign).toBe('right');
        expect(fitTextShape).toHaveBeenCalledWith(g);
        expect(saveState).toHaveBeenCalledTimes(1);
    });

    it('setTextCase also reaches the shape text', () => {
        const { h, text } = shapeSetup();
        h.get().setTextCase('upper');
        expect(text.text).toBe('NOTE');
    });
});
