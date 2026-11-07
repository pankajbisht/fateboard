import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { ShapeToolsHeader } from '../ShapeToolsHeader';

/* eslint-disable @typescript-eslint/no-explicit-any */

const setTransform = vi.fn();
let prev: any;

beforeEach(() => {
    prev = useStore.getState();
    const canvas = createFakeCanvas() as any;
    const rect = new fabric.Rect({ width: 160, height: 100 });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    setTransform.mockReset();
    act(() =>
        useStore.setState({
            canvas,
            hasSelection: true,
            setTransform,
            transform: { ...prev.transform, x: 640, y: 360, width: 160, height: 100, rotation: 0 },
        } as any),
    );
});

afterEach(() => {
    cleanup();
    act(() =>
        useStore.setState({
            canvas: prev.canvas,
            setTransform: prev.setTransform,
            hasSelection: false,
        } as any),
    );
});

describe('ShapeToolsHeader transform row', () => {
    it('order: anchor, X, Y, W, H, R, then the flip buttons right after R', () => {
        render(<ShapeToolsHeader />);
        const els = [
            screen.getByRole('radiogroup', { name: 'Anchor point' }),
            ...['X', 'Y', 'Width', 'Height', 'Rotation'].map((n) =>
                screen.getByRole('spinbutton', { name: n }),
            ),
            screen.getByRole('button', { name: 'Flip horizontal' }),
            screen.getByRole('button', { name: 'Flip vertical' }),
        ];
        for (let i = 1; i < els.length; i++) {
            expect(
                els[i - 1].compareDocumentPosition(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
        }
    });

    it('fields are compact with the letter inside (X 640, R …°)', () => {
        render(<ShapeToolsHeader />);
        const x = screen.getByRole('spinbutton', { name: 'X' });
        const box = x.closest('label')!;
        expect(box.textContent).toContain('X');
        expect(box.className).toMatch(/\bw-(\[\d+px\]|\d+)(\s|$)/);
        expect(
            screen.getByRole('spinbutton', { name: 'Rotation' }).closest('label')!.textContent,
        ).toContain('°');
    });

    it('typing a width applies it once, on Enter (not per keystroke)', () => {
        render(<ShapeToolsHeader />);
        const w = screen.getByRole('spinbutton', { name: 'Width' });
        fireEvent.focus(w);
        fireEvent.change(w, { target: { value: '2' } });
        fireEvent.change(w, { target: { value: '25' } });
        fireEvent.change(w, { target: { value: '250' } });
        expect(setTransform).not.toHaveBeenCalled();
        fireEvent.keyDown(w, { key: 'Enter' });
        expect(setTransform).toHaveBeenCalledTimes(1);
        expect(setTransform).toHaveBeenCalledWith('width', 250);
    });

    it('typing a width then clicking the empty canvas resizes the shape that was selected', () => {
        // real action; the board deselects on pointerdown, before the field blurs
        act(() => useStore.setState({ setTransform: prev.setTransform } as any));
        const { canvas } = useStore.getState() as any;
        const rect = canvas.getActiveObject();
        render(
            <>
                <ShapeToolsHeader />
                <canvas data-testid="board" />
            </>,
        );
        const board = screen.getByTestId('board');
        board.addEventListener('pointerdown', () => canvas.discardActiveObject());

        const w = screen.getByRole('spinbutton', { name: 'Width' });
        fireEvent.focus(w);
        fireEvent.change(w, { target: { value: '250' } });
        fireEvent.pointerDown(board);
        fireEvent.blur(w);

        expect(rect.width * rect.scaleX).toBeCloseTo(250);
    });
});
