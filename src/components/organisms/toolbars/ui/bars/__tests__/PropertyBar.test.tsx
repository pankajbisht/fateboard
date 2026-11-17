/**
 * Property bar (owner request 2026-11-17): the row under the command bar starts with the tool's icon + label
 * for every tool (the selection too), uses dropdowns instead of tab rows, and keeps hints behind an ⓘ that
 * shows them on hover.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '@store';
import { DEFAULT_PEN_STYLE } from '@/store/slices/drawingTools/penStyle';
import {
    DEFAULT_BUCKET_STYLE,
    DEFAULT_LASSO_STYLE,
} from '@/store/slices/paintTools/paintToolStyles';

import { createFakeCanvas } from '@/test/fakeCanvas';

import { ToolContextBar } from '../DrawToolOptions';

const setBrush = vi.fn();
const updateBrush = vi.fn();
const setPenMode = vi.fn();
const setLassoStyle = vi.fn();
const setBucketStyle = vi.fn();

const pick = (combo: string, option: string | RegExp) => {
    fireEvent.click(screen.getByRole('combobox', { name: combo }));
    fireEvent.click(screen.getByRole('option', { name: option }));
};

describe('property bar', () => {
    beforeEach(() => {
        useStore.setState({
            activeTool: 'select',
            canvas: null,
            brush: 'pencil',
            width: 4,
            brushOpacity: 1,
            smoothing: 2,
            color: '#123456',
            setBrush,
            updateBrush,
            penPointCount: 0,
            penStyle: DEFAULT_PEN_STYLE,
            penMode: 'pen',
            setPenMode,
            lassoStyle: DEFAULT_LASSO_STYLE,
            setLassoStyle,
            bucketStyle: DEFAULT_BUCKET_STYLE,
            setBucketStyle,
        } as never);
    });
    afterEach(() => {
        vi.clearAllMocks();
        useStore.setState({ activeTool: 'select', canvas: null } as never);
    });

    it('the selection row starts with an icon + label too', () => {
        render(<ToolContextBar />);
        expect(screen.getByRole('toolbar', { name: 'Selection options' })).toBeInTheDocument();
        expect(screen.getByRole('spinbutton', { name: /^X/ })).toBeInTheDocument();
    });

    it('names the selected object', () => {
        const canvas = createFakeCanvas();
        const rect = { type: 'rect' };
        canvas.add(rect);
        canvas.setActiveObject(rect);
        useStore.setState({ canvas } as never);
        render(<ToolContextBar />);
        expect(screen.getByRole('toolbar', { name: 'Rectangle options' })).toBeInTheDocument();
    });

    it('hints sit behind an ⓘ and show on hover', async () => {
        useStore.setState({ activeTool: 'lasso' } as never);
        render(<ToolContextBar />);
        const info = screen.getByRole('img', { name: 'Tips' });
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        fireEvent.mouseEnter(info.closest('[tabindex]')!);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(/Shift.*add.*Alt.*remove/);
    });

    it('Brush: label, a brush dropdown by category, size / opacity / smoothing', () => {
        useStore.setState({ activeTool: 'draw' } as never);
        render(<ToolContextBar />);
        const bar = screen.getByRole('toolbar', { name: 'Brush options' });
        expect(within(bar).getByRole('combobox', { name: 'Brush' })).toHaveTextContent(/Pen/); // the 'pencil' brush is labelled Pen

        pick('Brush', 'Lightning');
        expect(setBrush).toHaveBeenCalledWith({ brush: 'electric-lightning' });
        expect(screen.queryByText('Lightning & electric')).not.toBeInTheDocument(); // list closed

        fireEvent.change(within(bar).getByRole('slider', { name: 'Size' }), {
            target: { value: '12' },
        });
        expect(updateBrush).toHaveBeenCalledWith({ width: 12 });
        expect(within(bar).getByRole('slider', { name: 'Opacity' })).toBeInTheDocument();
        expect(within(bar).getByRole('slider', { name: 'Smoothing' })).toBeInTheDocument();
    });

    it('the eraser gets its own label', () => {
        useStore.setState({ activeTool: 'draw', brush: 'eraser' } as never);
        render(<ToolContextBar />);
        expect(screen.getByRole('toolbar', { name: 'Eraser options' })).toBeInTheDocument();
    });

    it('modes are dropdowns, not tab rows (Pen, Lasso, Paint bucket)', () => {
        useStore.setState({ activeTool: 'pen' } as never);
        const { unmount } = render(<ToolContextBar />);
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        pick('Pen mode', /Curvature/);
        expect(setPenMode).toHaveBeenCalledWith('curvature');
        unmount();

        useStore.setState({ activeTool: 'lasso' } as never);
        const lasso = render(<ToolContextBar />);
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        pick('Lasso action', 'Fill');
        expect(setLassoStyle).toHaveBeenCalledWith({ action: 'fill' });
        lasso.unmount();

        useStore.setState({ activeTool: 'bucket' } as never);
        render(<ToolContextBar />);
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        pick('Fill', 'Shape');
        expect(setBucketStyle).toHaveBeenCalledWith({ mode: 'shape' });
    });
});
