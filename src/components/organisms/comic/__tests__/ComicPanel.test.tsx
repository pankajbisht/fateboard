/** Comic panel (2026-11-17): layouts, split, balloons, tones, effect lines. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import ComicPanel from '../ComicPanel';

const a = {
    setComicStyle: vi.fn(),
    addPanelLayout: vi.fn(),
    splitComicPanel: vi.fn(),
    applyTone: vi.fn(),
    removeTone: vi.fn(),
    addMangaEffect: vi.fn(),
    addShape: vi.fn(),
    fitToPanel: vi.fn(),
    zoomInPanel: vi.fn(),
};

describe('ComicPanel', () => {
    beforeEach(() => {
        useStore.setState({
            comicStyle: { gutter: 14, border: 3 },
            hasSelection: true,
            ...a,
        } as never);
    });
    afterEach(() => vi.clearAllMocks());

    it('a layout tile lays out the page; split cuts the selected panel', () => {
        render(<ComicPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Panel layout Manga page' }));
        expect(a.addPanelLayout).toHaveBeenCalledWith('manga');
        fireEvent.click(screen.getByRole('button', { name: 'Split top / bottom' }));
        expect(a.splitComicPanel).toHaveBeenCalledWith('horizontal');
        fireEvent.change(screen.getByRole('slider', { name: 'Gutter' }), {
            target: { value: '20' },
        });
        expect(a.setComicStyle).toHaveBeenCalledWith({ gutter: 20 });
    });

    it('a scene or picture is filled or fitted into its panel and zoomed there; the buttons wait for a selection', () => {
        render(<ComicPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Fill panel' }));
        expect(a.fitToPanel).toHaveBeenCalledWith('fill');
        fireEvent.click(screen.getByRole('button', { name: 'Fit in panel' }));
        expect(a.fitToPanel).toHaveBeenCalledWith('fit');
        fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
        expect(a.zoomInPanel).toHaveBeenCalledWith(1.1);
        fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
        expect(a.zoomInPanel).toHaveBeenLastCalledWith(1 / 1.1);

        act(() => useStore.setState({ hasSelection: false } as never));
        for (const name of ['Fill panel', 'Fit in panel', 'Zoom in', 'Zoom out'])
            expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(true);
    });

    it('balloons are added as text shapes', () => {
        render(<ComicPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Add Shout balloon' }));
        expect(a.addShape).toHaveBeenCalledWith('balloon-shout');
    });

    it('tones apply the chosen settings; effect buttons add lines', () => {
        render(<ComicPanel />);
        fireEvent.click(screen.getByRole('combobox', { name: 'Tone' }));
        fireEvent.click(screen.getByRole('option', { name: 'Lines' }));
        fireEvent.click(screen.getByRole('button', { name: 'Apply tone' }));
        expect(a.applyTone).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lines' }));
        fireEvent.click(screen.getByRole('button', { name: 'Focus lines' }));
        expect(a.addMangaEffect).toHaveBeenCalledWith('focus');
    });
});
