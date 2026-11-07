/** Help > Keyboard shortcuts lists the registry; menu-only commands (no shortcut) must not break it. */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShortcutTable from '../ui/ShortcutTable';

describe('ShortcutTable', () => {
    it('lists only commands that have a shortcut, and searching never crashes', () => {
        render(<ShortcutTable />);
        expect(screen.queryByText('Link copies')).toBeNull(); // menu-only
        expect(screen.getByText('Unlink clone')).toBeInTheDocument();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search shortcuts' }), {
            target: { value: 'zzz-no-match' },
        });
        expect(screen.getByText('No shortcuts found.')).toBeInTheDocument();
    });
});
