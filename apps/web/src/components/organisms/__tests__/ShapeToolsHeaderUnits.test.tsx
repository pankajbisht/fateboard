/** BUG-082: Settings > Units applies to the size fields (X / Y / W / H, corner radius); stored in px. */
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
    const rect = new fabric.Rect({ width: 96, height: 48 });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    setTransform.mockReset();
    act(() =>
        useStore.setState({
            canvas,
            hasSelection: true,
            setTransform,
            settings: { ...prev.settings, unit: 'in' },
            transform: { ...prev.transform, x: 192, y: 96, width: 96, height: 48, rotation: 30 },
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
            settings: prev.settings,
        } as any),
    );
});

describe('size fields follow Settings > Units (BUG-082)', () => {
    it('show inches and store px; rotation stays in degrees', () => {
        render(<ShapeToolsHeader />);
        const width = screen.getByRole('spinbutton', { name: 'Width' }) as HTMLInputElement;
        expect(Number(width.value)).toBe(1); // 96 px = 1 in
        expect(
            Number((screen.getByRole('spinbutton', { name: 'X' }) as HTMLInputElement).value),
        ).toBe(2);
        expect(
            Number(
                (screen.getByRole('spinbutton', { name: 'Rotation' }) as HTMLInputElement).value,
            ),
        ).toBe(30);

        fireEvent.change(width, { target: { value: '2' } });
        fireEvent.keyDown(width, { key: 'Enter' });
        expect(setTransform).toHaveBeenLastCalledWith('width', 192);
    });
});
