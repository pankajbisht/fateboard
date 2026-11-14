/**
 * BUG-209 split the layouts: the store-backed RootLayout is now a lazy chunk. A failed chunk load
 * (typical right after a deploy) must still reach a recovery screen, never a blank page.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/templates/RootLayout', () => {
    throw new Error('Failed to fetch dynamically imported module: /assets/RootLayout-x.js');
});

afterEach(() => window.history.pushState({}, '', '/'));

describe('RootRouter', () => {
    it('shows the recovery screen when the editor layout chunk fails to load', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        window.history.pushState({}, '', '/draw');
        const { RootRouter } = await import('../rootRouter');
        render(<RootRouter />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
        expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    });
});
