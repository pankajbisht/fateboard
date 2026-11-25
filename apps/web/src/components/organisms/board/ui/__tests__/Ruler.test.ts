import { afterEach, describe, expect, it } from 'vitest';
import { rulerColors } from '../Ruler';

afterEach(() => {
    document.documentElement.removeAttribute('style');
});

describe('Ruler colors (BUG-063)', () => {
    it('come from the theme tokens, so the rulers turn dark with the app', () => {
        const root = document.documentElement.style;
        root.setProperty('--color-surface-muted', '#172135');
        root.setProperty('--color-surface', '#0f1726');
        root.setProperty('--color-line-strong', '#34425e');
        root.setProperty('--color-ink-subtle', '#8c98ad');
        root.setProperty('--color-ink-muted', '#a3adc2');

        expect(rulerColors()).toEqual({
            bg: '#172135',
            page: '#0f1726',
            border: '#34425e',
            tick: '#8c98ad',
            text: '#a3adc2',
        });
    });
});
