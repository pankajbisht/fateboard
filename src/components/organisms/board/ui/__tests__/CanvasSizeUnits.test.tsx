/** BUG-082: Canvas Size shows and accepts the chosen unit (Settings > Units); pages are stored in px. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { CanvasSizePanel } from '../CanvasSizePanel';
import type { CanvasPreset } from '../../board.type';

/* eslint-disable @typescript-eslint/no-explicit-any */
let prev: any;
const preset = {
    id: 'presentation-16-9',
    label: 'Presentation',
    category: 'Presentation',
    width: 1920,
    height: 1080,
    icon: 'tv',
} as CanvasPreset;

beforeEach(() => {
    prev = useStore.getState().settings;
    act(() => useStore.setState({ settings: { ...prev, unit: 'mm' } } as any));
});
afterEach(() => {
    cleanup();
    act(() => useStore.setState({ settings: prev } as any));
});

describe('Canvas Size in the chosen unit (BUG-082)', () => {
    it('labels sizes in mm and applies a custom size typed in mm as px', () => {
        const onSelectPreset = vi.fn();
        render(<CanvasSizePanel selectedPreset={preset} onSelectPreset={onSelectPreset} />);
        expect(screen.getAllByText(/508 × 285\.7 mm/).length).toBeGreaterThan(0); // 1920 × 1080 px

        fireEvent.click(screen.getByRole('button', { name: /Custom dimensions/ }));
        fireEvent.change(screen.getByLabelText('Width (mm)'), { target: { value: '210' } });
        fireEvent.change(screen.getByLabelText('Height (mm)'), { target: { value: '297' } });
        fireEvent.click(screen.getByRole('button', { name: /Apply size/ }));
        expect(onSelectPreset).toHaveBeenCalledWith(
            expect.objectContaining({ width: 794, height: 1123 }),
        );
    });
});
