import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import editorsidebarconfig from '../../editorsidebar/editorsidebar.config';
import { ToolContextBar } from '../../toolbars/ui/bars/DrawToolOptions';
import { BrushPickerPanel } from '../BrushPickerPanel';

/* eslint-disable @typescript-eslint/no-explicit-any -- partial store doubles */
const initial = useStore.getState();
afterEach(() => {
    cleanup();
    act(() => useStore.setState(initial, true));
});

describe('Brush (left rail)', () => {
    it('is its own rail item next to Draw, with the B shortcut', () => {
        const ids = (editorsidebarconfig as any[]).map((i) => i.id);
        expect(ids).toEqual(expect.arrayContaining(['brush', 'draw']));
        const brush = (editorsidebarconfig as any[]).find((i) => i.id === 'brush');
        expect(brush).toMatchObject({ label: 'Brush', shortcut: 'B', activateTool: 'draw' });
    });

    it('shows every brush as a tile, the Calligraphy pen included; a click picks it and paints', () => {
        const setBrush = vi.fn();
        const setActiveTool = vi.fn();
        act(() =>
            useStore.setState({
                brush: 'pencil',
                activeTool: 'select',
                setBrush,
                setActiveTool,
            } as any),
        );
        render(<BrushPickerPanel />);
        expect(screen.getByRole('radio', { name: 'Pen' })).toBeChecked();
        fireEvent.click(screen.getByRole('radio', { name: 'Calligraphy pen' }));
        expect(setBrush).toHaveBeenCalledWith({ brush: 'nib' });
        expect(setActiveTool).toHaveBeenCalledWith('draw');
    });

    it('the top bar shows the Calligraphy options while painting with it', () => {
        const setNibStyle = vi.fn();
        act(() => useStore.setState({ activeTool: 'draw', brush: 'nib', setNibStyle } as any));
        render(<ToolContextBar />);
        fireEvent.change(screen.getByRole('slider', { name: 'Calligraphy fixation' }), {
            target: { value: '40' },
        });
        expect(setNibStyle).toHaveBeenCalledWith({ fixation: 0.4 });
        expect(screen.getByRole('slider', { name: 'Calligraphy angle' })).toHaveValue('30');
    });

    it('other brushes keep the normal context row', () => {
        act(() => useStore.setState({ activeTool: 'draw', brush: 'marker' } as any));
        render(<ToolContextBar />);
        expect(screen.queryByRole('slider', { name: 'Calligraphy fixation' })).toBeNull();
    });
});
