/** Copy spray (Shift + S) options bar: size, spacing, spread, jitter and Align write `copySprayStyle`. */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '@store';
import { DEFAULT_COPY_SPRAY_STYLE } from '@/lib/canvas/copySpray';

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
        } as never);
    });

    it('shows while Copy spray is active and writes each setting', () => {
        render(<ToolContextBar />);
        const bar = screen.getByRole('toolbar', { name: 'Copy spray options' });

        slide(bar, 'Size', '150');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ scale: 1.5 });
        slide(bar, 'Spacing', '50');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ spacing: 0.5 });
        slide(bar, 'Spread', '200');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ spread: 2 });
        slide(bar, 'Size jitter', '40');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ sizeJitter: 0.4 });
        slide(bar, 'Rotation jitter', '90');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ rotateJitter: 90 });
        slide(bar, 'Opacity jitter', '30');
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ opacityJitter: 0.3 });

        const align = within(bar).getByRole('switch', { name: 'Align to stroke' });
        expect(align).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(align);
        expect(setCopySprayStyle).toHaveBeenLastCalledWith({ align: true });
    });

    it('tells the user to select the objects first', () => {
        render(<ToolContextBar />);
        expect(screen.getByText(/Select objects, then/)).toBeInTheDocument();
    });
});
