/**
 * Upright phones: the property bar keeps its row even when it has nothing to show (Select / Hand,
 * nothing selected). Hiding it on deselect and showing it on select resized the board every time.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useStore } from '@store';
import { Header } from '../ui/Header';

// the top toolbar (commands, overflow measuring) is not what this test is about
vi.mock('../../toolbars/ui/TopToolbar', () => ({ TopToolbar: () => null }));

afterEach(cleanup);

describe('phone property bar', () => {
    it('keeps its row with nothing selected, so the board does not resize', () => {
        useStore.setState({ activeTool: 'select', hasSelection: false });
        const { getByTestId } = render(
            <MemoryRouter>
                <Header />
            </MemoryRouter>,
        );
        expect(getByTestId('property-bar').className).not.toContain('hidden');
    });
});
