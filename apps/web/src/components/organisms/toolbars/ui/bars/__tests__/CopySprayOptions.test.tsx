/** Spray's Copy mode options bar: size, spacing, spread, jitter and Align write `copySprayStyle`. */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '@store';
import { DEFAULT_COPY_SPRAY_STYLE } from '@/lib/canvas/copySpray';
import { DEFAULT_SPRAY_STYLE } from '@/store/sprayStyle';

import { ToolContextBar } from '../DrawToolOptions';

const setCopySprayStyle = vi.fn();
const slide = (bar: HTMLElement, name: string, value: string) =>
    fireEvent.change(within(bar).getByRole('slider', { name }), { target: { value } });

describe('Copy spray options', () => {
    beforeEach(() => {
        setCopySprayStyle.mockClear();
        useStore.setState({
            activeTool: 'copySpray',
            copySprayStyle: DEFAULT_COPY_SPRAY_STYLE,
            setCopySprayStyle,
            sprayStyle: { ...DEFAULT_SPRAY_STYLE, mode: 'copy' },
        } as never);
    });

    it('shows in Spray’s Copy mode: Size and Spread in the bar, the rest in Variation', () => {
        render(<ToolContextBar />);
        const bar = screen.getByRole('toolbar', { name: 'Spray options' });

        slide(bar, 'Size', '150');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ scale: 1.5 });
        slide(bar, 'Spread', '200');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ spread: 2 });
        expect(within(bar).queryByRole('slider', { name: 'Spacing' })).toBeNull();

        fireEvent.click(within(bar).getByRole('button', { name: 'Copy variation' }));
        const panel = screen.getByRole('dialog', { name: 'Copy variation' });
        slide(panel, 'Spacing', '50');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ spacing: 0.5 });
        slide(panel, 'Size jitter', '40');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ sizeJitter: 0.4 });
        slide(panel, 'Rotation jitter', '90');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ rotateJitter: 90 });
        slide(panel, 'Opacity jitter', '30');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ opacityJitter: 0.3 });

        const align = within(panel).getByRole('switch', { name: 'Align to stroke' });
        expect(align).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(align);
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ align: true });
    });

    it('without a source asks for a click on an object; with one names it', () => {
        useStore.setState({ copySpraySource: null } as never);
        const { rerender } = render(<ToolContextBar />);
        expect(screen.getByRole('status')).toHaveTextContent(
            'Click an object to spray copies of it',
        );
        useStore.setState({ copySpraySource: 'Star' } as never);
        rerender(<ToolContextBar />);
        expect(screen.getByRole('status')).toHaveTextContent('Spraying Star');
    });

    it('one Spray bar for every mode: the Mode dropdown switches between paint and Copy', () => {
        const setSprayStyle = vi.fn();
        useStore.setState({
            activeTool: 'spray',
            sprayStyle: { ...DEFAULT_SPRAY_STYLE, mode: 'mist' },
            setSprayStyle,
        } as never);
        render(<ToolContextBar />);
        const bar = screen.getByRole('toolbar', { name: 'Spray options' });
        expect(within(bar).getByRole('slider', { name: 'Flow' })).toBeInTheDocument();
        // the paint modes keep texture settings in a panel too
        expect(within(bar).queryByRole('slider', { name: 'Softness' })).toBeNull();
        fireEvent.click(within(bar).getByRole('button', { name: 'Spray texture' }));
        slide(screen.getByRole('dialog', { name: 'Spray texture' }), 'Softness', '20');
        expect(setSprayStyle).toHaveBeenLastCalledWith({ softness: 0.2 });
        fireEvent.click(within(bar).getByRole('combobox', { name: 'Spray mode' }));
        fireEvent.click(screen.getByRole('option', { name: /Copy/ }));
        expect(setSprayStyle).toHaveBeenLastCalledWith({ mode: 'copy' });
    });
});
