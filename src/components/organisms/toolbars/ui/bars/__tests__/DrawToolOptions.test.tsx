/**
 * Pen / Pencil options bar: the context row under the top toolbar shows the active drawing tool's
 * options and a hint instead of the selection's X / Y / W / H while Pen or Pencil is active.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '@store';
import { DEFAULT_PENCIL_STYLE } from '@/store/pencilStyle';
import { DEFAULT_PEN_STYLE } from '@/store/slices/drawingTools/penStyle';

import { ToolContextBar } from '../DrawToolOptions';

const setPenStyle = vi.fn();
const setPenMode = vi.fn();
const setPencilStyle = vi.fn();
const updateBrush = vi.fn();

const commitNumber = (name: string, value: string) => {
    const field = screen.getByRole('spinbutton', { name });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value } });
    fireEvent.keyDown(field, { key: 'Enter' });
};

describe('ToolContextBar', () => {
    beforeEach(() => {
        useStore.setState({
            activeTool: 'select',
            penPointCount: 0,
            penStyle: DEFAULT_PEN_STYLE,
            penMode: 'pen',
            setPenMode,
            pencilStyle: DEFAULT_PENCIL_STYLE,
            color: '#123456',
            setPenStyle,
            setPencilStyle,
            updateBrush,
        } as never);
    });
    afterEach(() => {
        vi.clearAllMocks();
        useStore.setState({ activeTool: 'select' } as never);
    });

    it('shows the selection transform row for other tools', () => {
        render(<ToolContextBar />);
        expect(screen.queryByRole('toolbar', { name: /options/ })).not.toBeInTheDocument();
        expect(screen.getByRole('spinbutton', { name: /^X/ })).toBeInTheDocument();
    });

    it('Pen: stroke width and fill, with a hint that follows the path being drawn', () => {
        useStore.setState({ activeTool: 'pen' } as never);
        const { rerender } = render(<ToolContextBar />);
        const bar = screen.getByRole('toolbar', { name: 'Pen options' });
        expect(screen.queryByRole('spinbutton', { name: /^X/ })).not.toBeInTheDocument();

        commitNumber('Pen stroke width', '6');
        expect(setPenStyle).toHaveBeenCalledWith({ strokeWidth: 6 });

        fireEvent.click(within(bar).getByRole('switch', { name: 'Fill' }));
        expect(setPenStyle).toHaveBeenCalledWith({ fillEnabled: true });
        expect(within(bar).getByText(/Click to add points/)).toBeInTheDocument();
        expect(within(bar).getByText(/click an end of a path to continue it/i)).toBeInTheDocument();

        useStore.setState({ penPointCount: 3 } as never);
        rerender(<ToolContextBar />);
        expect(within(bar).getByText(/3 points/)).toBeInTheDocument();
        expect(within(bar).getByText(/Shift/)).toBeInTheDocument();
        expect(within(bar).getByText(/Alt/)).toBeInTheDocument();
        expect(within(bar).getByText(/Enter/)).toBeInTheDocument();
    });

    it('Pen: mode switch, with a hint for each mode', () => {
        useStore.setState({ activeTool: 'pen' } as never);
        const { rerender } = render(<ToolContextBar />);
        const bar = screen.getByRole('toolbar', { name: 'Pen options' });
        const modes = within(bar).getByRole('radiogroup', { name: 'Pen mode' });
        expect(within(modes).getByRole('radio', { name: 'Pen' })).toHaveAttribute(
            'aria-checked',
            'true',
        );

        fireEvent.click(within(modes).getByRole('radio', { name: 'Curvature' }));
        expect(setPenMode).toHaveBeenCalledWith('curvature');

        useStore.setState({ penMode: 'curvature' } as never);
        rerender(<ToolContextBar />);
        expect(within(bar).getByText(/the curve bends through them/)).toBeInTheDocument();
        useStore.setState({ penMode: 'curvature', penPointCount: 2 } as never);
        rerender(<ToolContextBar />);
        expect(within(bar).getByText(/click = corner/)).toBeInTheDocument();

        useStore.setState({ penMode: 'freeform', penPointCount: 0 } as never);
        rerender(<ToolContextBar />);
        expect(within(bar).getByText(/Drag to draw/)).toBeInTheDocument();
    });

    it('Pen: stroke style popover sets line ends, corners, dashes and arrowheads', () => {
        useStore.setState({ activeTool: 'pen' } as never);
        render(<ToolContextBar />);

        const open = screen.getByRole('button', { name: 'Stroke style' });
        expect(open).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(open);
        const dialog = screen.getByRole('dialog', { name: 'Stroke style' });
        const pick = (group: string, option: string) =>
            fireEvent.click(
                within(within(dialog).getByRole('radiogroup', { name: group })).getByRole('radio', {
                    name: option,
                }),
            );

        pick('Line ends', 'Flat');
        expect(setPenStyle).toHaveBeenCalledWith({ lineCap: 'butt' });
        pick('Corners', 'Sharp');
        expect(setPenStyle).toHaveBeenCalledWith({ lineJoin: 'miter' });
        pick('Dash', 'Dashed');
        expect(setPenStyle).toHaveBeenCalledWith({ dash: 'dashed' });
        pick('Arrowheads', 'Both ends');
        expect(setPenStyle).toHaveBeenCalledWith({ arrow: 'both' });

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: 'Stroke style' })).not.toBeInTheDocument();
        expect(open).toHaveFocus();
    });

    it('Pen: Path shape popover picks the Inkscape shape; Thickness shows for a shape', () => {
        useStore.setState({
            activeTool: 'pen',
            penStyle: { ...useStore.getState().penStyle, shape: 'ellipse', shapeWidth: 30 },
        } as never);
        render(<ToolContextBar />);

        fireEvent.click(screen.getByRole('button', { name: 'Path shape' }));
        const dialog = screen.getByRole('dialog', { name: 'Path shape' });
        fireEvent.click(within(dialog).getByRole('radio', { name: 'Triangle out' }));
        expect(setPenStyle).toHaveBeenCalledWith({ shape: 'triangle-out' });
        expect(within(dialog).getByRole('slider', { name: /Thickness/ })).toHaveValue('30');
    });

    it('Pencil: size, opacity, smoothing, pressure, auto-close; Shift hint', () => {
        useStore.setState({ activeTool: 'pencil' } as never);
        render(<ToolContextBar />);
        const bar = screen.getByRole('toolbar', { name: 'Pencil options' });

        commitNumber('Pencil size', '8');
        expect(setPencilStyle).toHaveBeenCalledWith({ width: 8 });

        fireEvent.change(within(bar).getByRole('slider', { name: 'Pencil opacity' }), {
            target: { value: '40' },
        });
        expect(setPencilStyle).toHaveBeenCalledWith({ opacity: 0.4 });

        fireEvent.change(within(bar).getByRole('slider', { name: 'Pencil smoothing' }), {
            target: { value: '7' },
        });
        expect(setPencilStyle).toHaveBeenCalledWith({ smoothing: 7 });

        fireEvent.click(within(bar).getByRole('switch', { name: 'Pressure' }));
        expect(setPencilStyle).toHaveBeenCalledWith({ pressure: true });

        const autoClose = within(bar).getByRole('switch', { name: 'Auto-close' });
        expect(autoClose).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(autoClose);
        expect(setPencilStyle).toHaveBeenCalledWith({ autoClose: false });

        expect(within(bar).getByText(/Shift/)).toBeInTheDocument();
    });
    it('says "1 point" (singular) and turns Auto-close off while Pressure is on', () => {
        useStore.setState({ activeTool: 'pen', penPointCount: 1 } as never);
        const { rerender } = render(<ToolContextBar />);
        expect(screen.getByText('1 point')).toBeInTheDocument();

        useStore.setState({
            activeTool: 'pencil',
            pencilStyle: { ...DEFAULT_PENCIL_STYLE, pressure: true },
        } as never);
        rerender(<ToolContextBar />);
        expect(screen.getByRole('switch', { name: 'Auto-close' })).toBeDisabled();
        expect(screen.getByText(/Auto-close works with Pressure off/)).toBeInTheDocument();
    });
});
