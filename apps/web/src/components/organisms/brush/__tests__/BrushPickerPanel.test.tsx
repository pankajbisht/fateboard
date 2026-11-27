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
    it('is the one rail item for brushes (no separate Draw panel), with the B shortcut', () => {
        const ids = (editorsidebarconfig as any[]).map((i) => i.id);
        expect(ids).toContain('brush');
        expect(ids).not.toContain('draw');
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
        fireEvent.click(screen.getByRole('button', { name: 'All' })); // opens on the brush's category
        fireEvent.click(screen.getByRole('radio', { name: 'Calligraphy pen' }));
        expect(setBrush).toHaveBeenCalledWith({ brush: 'nib' });
        expect(setActiveTool).toHaveBeenCalledWith('draw');
    });

    it('groups the library by category (fire, smoke, manga, ...) and searches by name', () => {
        act(() => useStore.setState({ brush: 'pencil', activeTool: 'draw' } as any));
        render(<BrushPickerPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Fire & light' }));
        for (const name of ['Fire', 'Embers', 'Glow'])
            expect(screen.getByRole('radio', { name })).toBeTruthy();
        expect(screen.queryByRole('radio', { name: 'G-pen' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Smoke & fog' }));
        expect(screen.getByRole('radio', { name: 'Smoke' })).toBeTruthy();
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search brushes' }), {
            target: { value: 'pen' },
        });
        expect(screen.getByRole('radio', { name: 'G-pen' })).toBeTruthy();
        expect(screen.getByRole('radio', { name: 'Maru pen' })).toBeTruthy();
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search brushes' }), {
            target: { value: 'zzz' },
        });
        expect(screen.getByText('No brush found')).toBeTruthy();
    });

    it('a library brush shows its settings; a change is kept for that brush and can be reset', () => {
        act(() =>
            useStore.setState({
                brush: 'fire-flame',
                activeTool: 'draw',
                stampOverrides: {},
            } as any),
        );
        render(<BrushPickerPanel />);
        expect(screen.getByText('Fire settings')).toBeTruthy();
        fireEvent.change(screen.getByRole('slider', { name: 'Hardness' }), {
            target: { value: '20' },
        });
        expect(useStore.getState().stampOverrides['fire-flame']).toMatchObject({ hardness: 0.2 });
        fireEvent.click(screen.getByRole('button', { name: /Reset/ }));
        expect(useStore.getState().stampOverrides['fire-flame']).toBeUndefined();
    });

    it('classic brushes show every Draw setting here: size, opacity, blend, color, stroke, fill, shadow, aids', () => {
        act(() => useStore.setState({ brush: 'marker', activeTool: 'draw' } as any));
        render(<BrushPickerPanel />);
        expect(screen.queryByText('Fire settings')).toBeNull();
        for (const title of [
            'Size and opacity',
            'Color',
            'Stroke',
            'Fill',
            'Shadow and glow',
            'Drawing aids',
        ])
            expect(screen.getByText(title)).toBeTruthy();
        expect(screen.getByRole('button', { name: /Reset brush/ })).toBeTruthy();
        fireEvent.change(screen.getByRole('slider', { name: 'Size' }), { target: { value: '30' } });
        expect(useStore.getState().width).toBe(30);
    });

    it('the eraser shows its size and eraser type, not color or shadow', () => {
        act(() => useStore.setState({ brush: 'eraser', activeTool: 'draw' } as any));
        render(<BrushPickerPanel />);
        expect(screen.getByText('Eraser type')).toBeTruthy();
        expect(screen.queryByText('Shadow and glow')).toBeNull();
    });

    it('[ and ] change the brush size while the Brush panel is open', () => {
        act(() => useStore.setState({ brush: 'marker', width: 10, activeTool: 'draw' } as any));
        render(<BrushPickerPanel />);
        fireEvent.keyDown(window, { key: ']' });
        expect(useStore.getState().width).toBe(12);
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
