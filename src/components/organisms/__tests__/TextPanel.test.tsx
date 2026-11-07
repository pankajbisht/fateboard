import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { TextPanel } from '../TextPanel';

/* eslint-disable @typescript-eslint/no-explicit-any */

let canvas: any;
let tb: fabric.Textbox;

beforeEach(() => {
    canvas = createFakeCanvas();
    canvas.getVpCenter = () => new fabric.Point(100, 100);
    tb = new fabric.Textbox('Hello world', { width: 200, fontSize: 24, fontFamily: 'Arial' });
    canvas.add(tb);
    act(() => useStore.setState({ canvas, saveState: () => {} } as any));
});

afterEach(() => {
    cleanup();
    act(() => useStore.setState({ canvas: null } as any));
});

const select = () =>
    act(() => {
        canvas.setActiveObject(tb);
        canvas.fire('selection:created', { selected: [tb] });
    });

describe('TextPanel', () => {
    it('offers heading / subheading / body presets that add text to the canvas', () => {
        render(<TextPanel />);
        const before = canvas.getObjects().length;
        fireEvent.click(screen.getByRole('button', { name: /Add a heading/ }));
        expect(canvas.getObjects().length).toBe(before + 1);
        expect(canvas.getObjects().at(-1).fontSize).toBe(64);
    });

    it('hides the style controls until a text box is selected', () => {
        render(<TextPanel />);
        expect(screen.queryByLabelText('Font size')).toBeNull();
        select();
        expect((screen.getByLabelText('Font size') as HTMLInputElement).value).toBe('24');
    });

    it('edits the selected text: size, bold, alignment, letter case', () => {
        render(<TextPanel />);
        select();

        const size = screen.getByLabelText('Font size');
        fireEvent.focus(size);
        fireEvent.change(size, { target: { value: '4' } });
        fireEvent.change(size, { target: { value: '40' } });
        expect(tb.fontSize).toBe(24); // not applied per keystroke (no 4 px flash / extra undo step)
        fireEvent.keyDown(size, { key: 'Enter' });
        expect(tb.fontSize).toBe(40);

        fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
        expect(tb.fontWeight).toBe('bold');
        expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')).toBe(
            'true',
        );

        fireEvent.click(screen.getByRole('radio', { name: 'Align center' }));
        expect(tb.textAlign).toBe('center');

        fireEvent.click(screen.getByRole('button', { name: 'UPPERCASE' }));
        expect(tb.text).toBe('HELLO WORLD');
    });

    it('follows changes made on the canvas (e.g. by the top toolbar)', () => {
        render(<TextPanel />);
        select();
        act(() => {
            tb.set({ fontSize: 55 });
            canvas.fire('object:modified', { target: tb });
        });
        expect((screen.getByLabelText('Font size') as HTMLInputElement).value).toBe('55');
    });

    it('turns on an outline and a shadow', () => {
        render(<TextPanel />);
        select();
        fireEvent.click(screen.getByRole('switch', { name: 'Outline' }));
        expect(tb.strokeWidth).toBeGreaterThan(0);
        expect(tb.stroke).toBeTruthy();

        fireEvent.click(screen.getByRole('switch', { name: 'Shadow' }));
        expect(tb.shadow).toBeInstanceOf(fabric.Shadow);
    });
});

describe('font library', () => {
    it('the Text panel lists the same fonts as both floats (one library)', async () => {
        const { FONT_GROUPS } = await import('@/lib/utils/shapeFonts');
        render(<TextPanel />);
        select();
        fireEvent.click(screen.getByRole('combobox', { name: 'Font family' }));
        const names = screen.getAllByRole('option').map((o) => o.textContent?.trim());
        expect(names).toEqual(FONT_GROUPS.flatMap((g) => g.fonts.map((f) => f.label)));
    });
});
