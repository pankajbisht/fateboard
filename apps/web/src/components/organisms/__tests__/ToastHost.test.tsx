import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { ToastHost } from '../ToastHost';

afterEach(() => {
    cleanup();
    useStore.getState().dismissToast();
    vi.useRealTimers();
});

describe('ToastHost', () => {
    it('renders nothing without a toast', () => {
        render(<ToastHost />);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('announces the message and runs the action once from its button', async () => {
        const onAction = vi.fn();
        render(<ToastHost />);
        act(() =>
            useStore
                .getState()
                .showToast({ message: 'Template applied', actionLabel: 'Undo', onAction }),
        );

        expect(screen.getByRole('status').textContent).toContain('Template applied');
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        });
        expect(onAction).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('hides itself after its duration', () => {
        vi.useFakeTimers();
        render(<ToastHost />);
        act(() => useStore.getState().showToast({ message: 'Saved', duration: 1000 }));
        expect(screen.getByRole('status')).toBeTruthy();
        act(() => vi.advanceTimersByTime(1000));
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('can be closed without running the action', () => {
        const onAction = vi.fn();
        render(<ToastHost />);
        act(() =>
            useStore
                .getState()
                .showToast({ message: 'Template applied', actionLabel: 'Undo', onAction }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(onAction).not.toHaveBeenCalled();
        expect(screen.queryByRole('status')).toBeNull();
    });
});
