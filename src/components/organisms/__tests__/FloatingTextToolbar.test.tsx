import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { FONT_GROUPS } from '@/lib/utils/shapeFonts';
import { FLOAT_BAR_CLASS } from '@/lib/floatChrome';
import { FloatingTextToolbar } from '../FloatingTextToolbar';

/* eslint-disable @typescript-eslint/no-explicit-any */

let canvas: any;
let tb: fabric.Textbox;

beforeEach(() => {
    canvas = createFakeCanvas();
    tb = new fabric.Textbox('Hello', { width: 200, fontSize: 24, fontFamily: 'Arial' });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    act(() => useStore.setState({ canvas, saveState: () => {} } as any));
});

afterEach(() => {
    cleanup();
    act(() => useStore.setState({ canvas: null } as any));
});

const renderBar = () => render(<FloatingTextToolbar target={tb} />);

describe('text editing float', () => {
    it('offers the same font library as the shape float (grouped, previewed)', () => {
        renderBar();
        fireEvent.click(screen.getByRole('combobox', { name: 'Font' }));
        const names = screen.getAllByRole('option').map((o) => o.textContent?.trim());
        const library = FONT_GROUPS.flatMap((g) => g.fonts.map((f) => f.label));
        expect(names).toEqual(library);
        const headers = [...screen.getByRole('listbox').querySelectorAll('[data-group]')].map(
            (h) => h.textContent,
        );
        expect(headers).toEqual(FONT_GROUPS.map((g) => g.label));
    });

    it('shows the current font (Arial matches the library entry) and applies a new one', () => {
        renderBar();
        const font = screen.getByRole('combobox', { name: 'Font' });
        expect(font.textContent).toContain('Arial');
        fireEvent.click(font);
        fireEvent.click(screen.getByRole('option', { name: 'Poppins' }));
        expect(tb.fontFamily).toContain('Poppins');
    });

    it('holds font, size, style and alignment, in that order', () => {
        renderBar();
        const parts = [
            screen.getByRole('combobox', { name: 'Font' }),
            screen.getByRole('spinbutton', { name: 'Font size' }),
            screen.getByRole('group', { name: 'Text style' }),
            screen.getByRole('radiogroup', { name: 'Text alignment' }),
        ];
        for (let k = 1; k < parts.length; k++) {
            expect(
                parts[k - 1].compareDocumentPosition(parts[k]) & Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
        }
    });

    it('size: − / + step by 1, typing applies on Enter', () => {
        renderBar();
        fireEvent.click(screen.getByRole('button', { name: 'Bigger text' }));
        expect(tb.fontSize).toBe(25);
        fireEvent.click(screen.getByRole('button', { name: 'Smaller text' }));
        expect(tb.fontSize).toBe(24);
        const size = screen.getByRole('spinbutton', { name: 'Font size' });
        fireEvent.focus(size);
        fireEvent.change(size, { target: { value: '40' } });
        fireEvent.keyDown(size, { key: 'Enter' });
        expect(tb.fontSize).toBe(40);
    });

    it('is the same float for text shapes / sticky notes (styles the text inside)', () => {
        const box = new fabric.Rect({ width: 130, height: 130, fill: '#FFF3A3' });
        const text = new fabric.Textbox('Note', { width: 100, fontSize: 18, fontFamily: 'Arial' });
        const sticky: any = new fabric.Group([box, text]);
        Object.assign(sticky, { isTextShape: true, __text: text, __box: box });
        act(() => {
            canvas.add(sticky);
            canvas.setActiveObject(sticky);
        });
        render(<FloatingTextToolbar target={sticky} />);
        const size = screen.getByRole('spinbutton', { name: 'Font size' }) as HTMLInputElement;
        expect(size.value).toBe('18');
        fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
        expect(text.fontWeight).toBe('bold');
        fireEvent.click(screen.getByRole('radio', { name: 'Align right' }));
        expect(text.textAlign).toBe('right');
    });

    it('marks itself so the shape text editor stays open while you use it', () => {
        const { container } = renderBar();
        expect((container.firstElementChild as HTMLElement).hasAttribute('data-text-float')).toBe(
            true,
        );
    });

    it('style buttons are one Mac-style group with B / I / U glyphs and honest tooltips', () => {
        renderBar();
        const group = screen.getByRole('group', { name: 'Text style' });
        const buttons = within(group).getAllByRole('button');
        expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
            'Bold',
            'Italic',
            'Underline',
        ]);
        expect(buttons.map((b) => b.textContent)).toEqual(['B', 'I', 'U']);
        // no shortcut is promised: none is wired for text styles
        buttons.forEach((b) => expect(b.title).not.toMatch(/Ctrl|⌘/));
    });

    it('bold / italic / underline toggle and show their state', () => {
        renderBar();
        fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
        expect(tb.fontWeight).toBe('bold');
        expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')).toBe(
            'true',
        );
        fireEvent.click(screen.getByRole('button', { name: 'Italic' }));
        expect(tb.fontStyle).toBe('italic');
        fireEvent.click(screen.getByRole('button', { name: 'Underline' }));
        expect(tb.underline).toBe(true);
    });

    it('has text alignment (left / center / right / justify)', () => {
        renderBar();
        const group = screen.getByRole('radiogroup', { name: 'Text alignment' });
        fireEvent.click(within(group).getByRole('radio', { name: 'Align center' }));
        expect(tb.textAlign).toBe('center');
        fireEvent.click(within(group).getByRole('radio', { name: 'Justify' }));
        expect(tb.textAlign).toBe('justify');
    });

    it('uses the shared float look (same as the shape text float): translucent, blurred', async () => {
        const { container } = renderBar();
        expect((container.firstElementChild as HTMLElement).className).toContain(FLOAT_BAR_CLASS);
        expect(FLOAT_BAR_CLASS).toMatch(/backdrop-blur/);
        // capsule: the bar and everything inside it are fully rounded (concentric pills)
        expect(FLOAT_BAR_CLASS).toMatch(/\brounded-full\b/);
        const style = screen.getByRole('group', { name: 'Text style' });
        expect(style.className).toMatch(/\brounded-full\b/);
        within(style)
            .getAllByRole('button')
            .forEach((b) => expect(b.className).toMatch(/\brounded-full\b/));
        const align = screen.getByRole('radiogroup', { name: 'Text alignment' });
        expect(align.className).toMatch(/\brounded-full\b/);
        expect(screen.getByRole('combobox', { name: 'Font' }).className).toMatch(/rounded-full/);
        // one float for the whole app: the old plain-DOM shape bar is gone
        const old = import.meta.glob('/src/lib/utils/shapeTextToolbar.ts');
        expect(Object.keys(old)).toEqual([]);
    });
});
