/**
 * A render error must never leave a blank page: the fallback explains what happened and offers
 * reload, download of the autosaved project, and (confirmed) clearing a broken autosave.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { createMemoryBackend, projectStorage } from '@/lib/storage';

function Boom(): never {
    throw new Error('kaboom');
}

let backend: ReturnType<typeof createMemoryBackend>;

beforeEach(() => {
    backend = createMemoryBackend();
    projectStorage.useBackend(backend);
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs caught errors
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
    it('renders its children when nothing fails', () => {
        render(
            <ErrorBoundary onReload={vi.fn()}>
                <p>editor</p>
            </ErrorBoundary>,
        );
        expect(screen.getByText('editor')).toBeTruthy();
    });

    it('shows a fallback instead of a blank page, and Reload reloads', () => {
        const onReload = vi.fn();
        render(
            <ErrorBoundary onReload={onReload}>
                <Boom />
            </ErrorBoundary>,
        );
        expect(screen.getByRole('alert').textContent).toMatch(/something went wrong/i);
        fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
        expect(onReload).toHaveBeenCalledTimes(1);
    });

    it('downloads the autosaved project as a .fateboard file', async () => {
        await backend.set('project', {
            app: 'fateboard',
            version: 1,
            currentPageId: 'a',
            pages: [{ id: 'a' }],
        });
        const download = vi.fn();
        render(
            <ErrorBoundary onReload={vi.fn()} onDownload={download}>
                <Boom />
            </ErrorBoundary>,
        );
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Download autosave' }));
        });
        expect(download).toHaveBeenCalledTimes(1);
        const [name, json] = download.mock.calls[0];
        expect(name).toMatch(/\.fateboard$/);
        expect(JSON.parse(json).pages).toHaveLength(1);
    });

    it('clears the autosave only after a second, explicit click, then reloads', async () => {
        await backend.set('project', {
            app: 'fateboard',
            version: 1,
            currentPageId: 'a',
            pages: [{ id: 'a' }],
        });
        const onReload = vi.fn();
        render(
            <ErrorBoundary onReload={onReload}>
                <Boom />
            </ErrorBoundary>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Start with an empty board' }));
        expect(await backend.get('project')).toBeDefined();
        expect(onReload).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Yes, delete the autosave' }));
        });
        expect(await backend.get('project')).toBeUndefined();
        expect(onReload).toHaveBeenCalledTimes(1);
    });
});
