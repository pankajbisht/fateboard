import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { PaintTargetSwatch } from '../PaintTargetSwatch';

afterEach(() => {
    cleanup();
    act(() => useStore.getState().setPaintTarget(null));
});

const target = () => useStore.getState().paintTarget;

describe('PaintTargetSwatch', () => {
    it('click makes it the palette target; a palette pick calls onChange', () => {
        const onChange = vi.fn();
        render(
            <PaintTargetSwatch
                id="brush-fill"
                label="Fill color"
                value="#ff0000"
                onChange={onChange}
            />,
        );
        const btn = screen.getByRole('button', { name: /Fill color/ });
        expect(btn.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(btn);
        expect(target()?.id).toBe('brush-fill');
        expect(target()?.color).toBe('#ff0000');
        expect(btn.getAttribute('aria-pressed')).toBe('true');

        act(() => useStore.getState().handleColorChange('#00ff00'));
        expect(onChange).toHaveBeenCalledWith('#00ff00');
    });

    it('always calls the latest onChange (no stale selection)', () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = render(
            <PaintTargetSwatch id="t" label="T" value="#000000" onChange={first} />,
        );
        fireEvent.click(screen.getByRole('button'));
        rerender(<PaintTargetSwatch id="t" label="T" value="#000000" onChange={second} />);
        act(() => useStore.getState().handleColorChange('#0000ff'));
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith('#0000ff');
    });

    it('a second click hands the palette back', () => {
        render(<PaintTargetSwatch id="t" label="T" value="#000000" onChange={vi.fn()} />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByRole('button'));
        expect(target()).toBeNull();
    });

    it('unmounting the panel releases its target', () => {
        const { unmount } = render(
            <PaintTargetSwatch id="t" label="T" value="#000000" onChange={vi.fn()} />,
        );
        fireEvent.click(screen.getByRole('button'));
        unmount();
        expect(target()).toBeNull();
    });

    it('keeps the dock indicator in step when the value changes elsewhere', () => {
        const { rerender } = render(
            <PaintTargetSwatch id="t" label="T" value="#000000" onChange={vi.fn()} />,
        );
        fireEvent.click(screen.getByRole('button'));
        rerender(<PaintTargetSwatch id="t" label="T" value="#123456" onChange={vi.fn()} />);
        expect(target()?.color).toBe('#123456');
    });

    it('disabled swatches cannot take the palette', () => {
        render(<PaintTargetSwatch id="t" label="T" value="#000000" onChange={vi.fn()} disabled />);
        fireEvent.click(screen.getByRole('button'));
        expect(target()).toBeNull();
    });
});
