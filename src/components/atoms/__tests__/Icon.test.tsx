import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Icon, ICONS, type IconName } from '../Icon';

afterEach(cleanup);

const svg = (container: HTMLElement) => container.querySelector('svg')!;

describe('Icon', () => {
    it('renders a Lucide svg sized in em so text-* classes still size it', () => {
        const { container } = render(<Icon name="trash" className="text-xs" />);
        const el = svg(container);

        expect(el).toBeTruthy();
        expect(el.getAttribute('width')).toBe('1.2em');
        expect(el.getAttribute('height')).toBe('1.2em');
        expect(el.getAttribute('class')).toContain('text-xs');
        expect(el.getAttribute('class')).toContain('lucide');
    });

    it('is decorative by default and labelled when given aria-label', () => {
        const { container, rerender } = render(<Icon name="check" />);
        expect(svg(container).getAttribute('aria-hidden')).toBe('true');

        rerender(<Icon name="check" aria-label="Done" />);
        expect(svg(container).getAttribute('aria-hidden')).toBeNull();
        expect(svg(container).getAttribute('role')).toBe('img');
    });

    it('filled paints the shape (solid heart / star), spin animates', () => {
        const { container, rerender } = render(<Icon name="heart" filled />);
        expect(svg(container).getAttribute('fill')).toBe('currentColor');

        rerender(<Icon name="spinner" spin />);
        expect(svg(container).getAttribute('class')).toContain('animate-spin');
    });

    it('renders nothing for an unknown name instead of crashing', () => {
        const { container } = render(<Icon name={'not-an-icon' as IconName} />);
        expect(container.innerHTML).toBe('');
    });

    it('every registered icon renders an svg', () => {
        for (const name of Object.keys(ICONS) as IconName[]) {
            const { container, unmount } = render(<Icon name={name} />);
            expect(svg(container), name).toBeTruthy();
            unmount();
        }
    });
});
