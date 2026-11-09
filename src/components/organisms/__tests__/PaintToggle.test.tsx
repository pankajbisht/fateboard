/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { PaintToggle } from '../PaintToggle';

let canvas: any;
let prevCanvas: any;

const select = (obj: any) =>
    act(() => {
        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.fire('selection:created', { selected: [obj] });
    });

beforeEach(() => {
    prevCanvas = useStore.getState().canvas;
    canvas = createFakeCanvas();
    act(() => useStore.setState({ canvas } as never));
});
afterEach(() => {
    cleanup();
    act(() => useStore.setState({ canvas: prevCanvas } as never));
});

const both = () =>
    render(
        <>
            <PaintToggle paint="stroke" />
            <PaintToggle paint="fill" />
        </>,
    );

describe('PaintToggle', () => {
    it('stroke and fill look different (outlined vs solid square)', () => {
        both();
        const [stroke, fill] = screen.getAllByRole('button');
        const glyph = (b: HTMLElement) => b.querySelector('span')!.className;
        expect(stroke.dataset.paint).toBe('stroke');
        expect(fill.dataset.paint).toBe('fill');
        expect(glyph(stroke)).toMatch(/\bborder-\[1\.5px\]/); // outlined
        expect(glyph(fill)).not.toMatch(/\bborder-\[1\.5px\]/); // solid
    });

    it('nothing selected: both disabled and say why', () => {
        both();
        const stroke = screen.getByRole('button', { name: 'Add or remove stroke' });
        const fill = screen.getByRole('button', { name: 'Add or remove fill' });
        expect((stroke as HTMLButtonElement).disabled).toBe(true);
        expect((fill as HTMLButtonElement).disabled).toBe(true);
    });

    it('toggles: Remove stroke -> Add stroke -> Remove stroke, label and icon state follow', () => {
        both();
        const rect = new fabric.Rect({
            width: 40,
            height: 40,
            fill: '#fff',
            stroke: '#000',
            strokeWidth: 2,
        });
        select(rect);

        const btn = screen.getByRole('button', { name: 'Remove stroke' });
        expect(btn.dataset.state).toBe('on');
        fireEvent.click(btn);
        expect(rect.strokeWidth).toBe(0);
        expect(btn.getAttribute('aria-label')).toBe('Add stroke');
        expect(btn.dataset.state).toBe('off');

        fireEvent.click(btn);
        expect(rect.strokeWidth).toBe(2);
        expect(btn.getAttribute('aria-label')).toBe('Remove stroke');
    });

    it('toggles fill the same way, independent of stroke', () => {
        both();
        const rect = new fabric.Rect({ fill: '#ff0000', stroke: '#000', strokeWidth: 2 });
        select(rect);
        fireEvent.click(screen.getByRole('button', { name: 'Remove fill' }));
        expect(rect.fill).toBe('rgba(0,0,0,0)');
        expect(screen.getByRole('button', { name: 'Add fill' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Remove stroke' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Add fill' }));
        expect(rect.fill).toBe('#FFFFFF');
    });

    it('follows outside changes (a palette pick / undo) and deselection', () => {
        both();
        const rect = new fabric.Rect({ fill: 'rgba(0,0,0,0)', stroke: '#000', strokeWidth: 2 });
        select(rect);
        expect(screen.getByRole('button', { name: 'Add fill' })).toBeTruthy();
        act(() => {
            rect.set('fill', '#00ff00');
            canvas.fire('object:modified', { target: rect });
        });
        expect(screen.getByRole('button', { name: 'Remove fill' })).toBeTruthy();
        act(() => {
            canvas.discardActiveObject();
            canvas.fire('selection:cleared', {});
        });
        expect(
            (screen.getByRole('button', { name: 'Add or remove fill' }) as HTMLButtonElement)
                .disabled,
        ).toBe(true);
    });

    it('images: fill is disabled, stroke (a border) still works', () => {
        both();
        select(new fabric.FabricImage(document.createElement('img')));
        expect(
            (screen.getByRole('button', { name: 'Add or remove fill' }) as HTMLButtonElement)
                .disabled,
        ).toBe(true);
        expect((screen.getByRole('button', { name: /stroke/ }) as HTMLButtonElement).disabled).toBe(
            false,
        );
    });
});
