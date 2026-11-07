import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useStore } from '@store';
import Preferences from '../ui/Preferences';

afterEach(() => {
    cleanup();
    act(() => useStore.getState().setColorTheme('fate'));
});

describe('Settings > Appearance > Color theme', () => {
    it('lists every theme as a radio card and applies the one you pick', () => {
        render(<Preferences />);
        const group = screen.getByRole('radiogroup', { name: 'Color theme' });
        const radios = within(group).getAllByRole('radio');
        expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual([
            'Fate Blue',
            'Ocean',
            'Violet',
            'Rose',
            'Emerald',
            'Graphite',
        ]);
        expect(
            within(group).getByRole('radio', { name: 'Fate Blue' }).getAttribute('aria-checked'),
        ).toBe('true');

        fireEvent.click(within(group).getByRole('radio', { name: 'Ocean' }));
        expect(useStore.getState().settings.colorTheme).toBe('ocean');
        expect(document.documentElement.dataset.theme).toBe('ocean');
        expect(
            within(group).getByRole('radio', { name: 'Ocean' }).getAttribute('aria-checked'),
        ).toBe('true');
    });
});
