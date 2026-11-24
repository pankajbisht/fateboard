import { describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { createElement } from 'react';
import { useStore } from '@store';
import { FlipBarConfig } from '../ui/FlipBarConfig';

describe('flip buttons', () => {
    it('have readable names (not code names like "flipX")', () => {
        expect(FlipBarConfig.map((b) => b.label)).toEqual(['Flip horizontal', 'Flip vertical']);
    });

    it('use the anchor-aware store flips', () => {
        const flipX = vi.fn();
        const flipY = vi.fn();
        const prev = useStore.getState();
        act(() => useStore.setState({ flipX, flipY } as never));
        FlipBarConfig[0].onClick();
        FlipBarConfig[1].onClick();
        expect(flipX).toHaveBeenCalledTimes(1);
        expect(flipY).toHaveBeenCalledTimes(1);
        act(() => useStore.setState({ flipX: prev.flipX, flipY: prev.flipY } as never));
    });
});

describe('flip icons and state', () => {
    it('Flip horizontal shows a VERTICAL mirror line (◀┊▶), Flip vertical a horizontal one', async () => {
        const { render, cleanup } = await import('@testing-library/react');
        const { Icon } = await import('@/components/atoms/Icon');
        const paths = (name: 'flip-horizontal' | 'flip-vertical') => {
            const { container } = render(createElement(Icon, { name }));
            const d = [...container.querySelectorAll('path')].map((p) => p.getAttribute('d'));
            cleanup();
            return d.join(' ');
        };
        // vertical dashed centre line = segments along x = 12
        expect(paths('flip-horizontal')).toMatch(/M12 2v2/);
        expect(paths('flip-vertical')).toMatch(/M4 12H2/);
    });

    it('the buttons show whether the selection is flipped (aria-pressed)', async () => {
        const { render, screen, cleanup } = await import('@testing-library/react');
        const { FlipBar } = await import('@/components/organisms/toolbars/ui/bars/FlipBar');
        const prev = useStore.getState().transform;
        act(() =>
            useStore.setState({
                transform: { ...prev, flipX: true, flipY: false },
                hasSelection: true, // pressed state only shows for a selection
            } as never),
        );
        render(createElement(FlipBar));
        expect(
            screen.getByRole('button', { name: 'Flip horizontal' }).getAttribute('aria-pressed'),
        ).toBe('true');
        expect(
            screen.getByRole('button', { name: 'Flip vertical' }).getAttribute('aria-pressed'),
        ).toBe('false');
        cleanup();
        act(() => useStore.setState({ transform: prev, hasSelection: false } as never));
    });
});
