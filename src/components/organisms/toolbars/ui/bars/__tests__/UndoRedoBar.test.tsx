/** Top bar Undo / Redo (BUG-090): enabled only when there is something to undo / redo. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { UndoRedoBar } from '../UndoRedoBar';
import { TopToolbar } from '../../TopToolbar';
import { MemoryRouter } from 'react-router-dom';

/* eslint-disable @typescript-eslint/no-explicit-any */
let prev: any;
const undo = vi.fn();
const redo = vi.fn();

beforeEach(() => {
    prev = { ...useStore.getState() };
    undo.mockReset();
    redo.mockReset();
    act(() => useStore.setState({ undo, redo, canUndo: false, canRedo: false } as any));
});
afterEach(() => {
    cleanup();
    act(() =>
        useStore.setState({
            undo: prev.undo,
            redo: prev.redo,
            canUndo: false,
            canRedo: false,
        } as any),
    );
});

describe('UndoRedoBar', () => {
    it('is disabled with an empty history and follows canUndo / canRedo', () => {
        render(<UndoRedoBar />);
        expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();

        act(() => useStore.setState({ canUndo: true } as any));
        expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    });

    it('clicking runs the canvas undo / redo', () => {
        act(() => useStore.setState({ canUndo: true, canRedo: true } as any));
        render(<UndoRedoBar />);
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        expect(undo).toHaveBeenCalledTimes(1);
        expect(redo).toHaveBeenCalledTimes(1);
    });

    it('is part of the top bar', () => {
        // jsdom has no ResizeObserver (OverflowToolbar measures its groups)
        globalThis.ResizeObserver ??= class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;
        render(
            <MemoryRouter>
                <TopToolbar />
            </MemoryRouter>,
        );
        expect(screen.getAllByRole('button', { name: 'Undo' }).length).toBeGreaterThan(0);
    });
});
