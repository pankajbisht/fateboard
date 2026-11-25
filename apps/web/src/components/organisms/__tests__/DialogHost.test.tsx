import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { DialogHost } from '../DialogHost';

afterEach(() => {
    cleanup();
    // drain anything a failing test left behind
    while (useStore.getState().dialogQueue.length) useStore.getState().resolveDialog(false);
});

const confirm = (opts: Parameters<ReturnType<typeof useStore.getState>['confirmDialog']>[0]) => {
    let answer!: Promise<boolean>;
    act(() => {
        answer = useStore.getState().confirmDialog(opts);
    });
    return answer;
};

describe('DialogHost', () => {
    it('renders nothing when no dialog is queued', () => {
        render(<DialogHost />);
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('shows a themed confirm and resolves true on the confirm button', async () => {
        render(<DialogHost />);
        const answer = confirm({
            title: 'Delete page?',
            message: 'This cannot be undone.',
            confirmLabel: 'Delete',
            tone: 'danger',
        });

        const dialog = screen.getByRole('alertdialog', { name: 'Delete page?' });
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(screen.getByText('This cannot be undone.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        await expect(answer).resolves.toBe(true);
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('the confirm button uses the brand primary color, also for danger confirms', () => {
        render(<DialogHost />);
        confirm({ title: 'Delete page?', message: '', confirmLabel: 'Delete', tone: 'danger' });

        const button = screen.getByRole('button', { name: 'Delete' });
        expect(button.className).toMatch(/\bbg-primary-600\b/);
        expect(button.className).not.toMatch(/\bbg-(danger|red|orange)/);
    });

    it('Cancel, Escape and the backdrop all resolve false', async () => {
        render(<DialogHost />);

        const a = confirm({ title: 'A', message: '' });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await expect(a).resolves.toBe(false);

        const b = confirm({ title: 'B', message: '' });
        fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
        await expect(b).resolves.toBe(false);

        const c = confirm({ title: 'C', message: '' });
        fireEvent.mouseDown(screen.getByTestId('modal-backdrop'));
        await expect(c).resolves.toBe(false);
    });

    it('focuses the safe button for danger confirms and the main button otherwise', () => {
        render(<DialogHost />);

        confirm({ title: 'Danger', message: '', tone: 'danger', confirmLabel: 'Delete' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        confirm({ title: 'Normal', message: '', confirmLabel: 'Continue' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }));
    });

    it('keeps Tab focus inside the dialog', () => {
        render(<DialogHost />);
        confirm({ title: 'Trap', message: '', confirmLabel: 'OK go' });

        const cancel = screen.getByRole('button', { name: 'Cancel' });
        const ok = screen.getByRole('button', { name: 'OK go' });

        ok.focus();
        fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
        expect(document.activeElement).toBe(cancel);

        cancel.focus();
        fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(ok);
    });

    it('does not leak key presses to window shortcuts (Delete, Ctrl+Z)', () => {
        const shortcut = vi.fn();
        window.addEventListener('keydown', shortcut);
        try {
            render(<DialogHost />);
            confirm({ title: 'Leak', message: '' });
            fireEvent.keyDown(document.activeElement!, { key: 'Delete' });
            fireEvent.keyDown(document.activeElement!, { key: 'z', ctrlKey: true });
            expect(shortcut).not.toHaveBeenCalled();
        } finally {
            window.removeEventListener('keydown', shortcut);
        }
    });

    it('alerts have a single OK button', async () => {
        render(<DialogHost />);
        let done!: Promise<void>;
        act(() => {
            done = useStore
                .getState()
                .alertDialog({ title: 'Heads up', message: 'Select 2 objects' });
        });

        expect(screen.getByRole('alertdialog', { name: 'Heads up' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'OK' }));
        await expect(done).resolves.toBeUndefined();
    });
});
