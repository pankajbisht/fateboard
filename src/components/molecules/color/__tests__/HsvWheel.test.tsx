import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ColorPickerPopover } from '@/components/organisms/ColorPickerPopover';

afterEach(cleanup);

function setup(color = '#ff0000') {
    const onChange = vi.fn();
    render(
        <ColorPickerPopover anchor={null} color={color} onChange={onChange} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: /Wheel/ }));
    return { onChange };
}

describe('Custom color: Wheel view', () => {
    it('switches from the square to the hue wheel with a square inside', () => {
        setup();
        expect(screen.getByRole('slider', { name: 'Hue wheel' })).toBeTruthy();
        expect(screen.getByRole('slider', { name: 'Saturation and brightness' })).toBeTruthy();
        expect(screen.queryByRole('slider', { name: 'Hue' })).toBeNull(); // the bar belongs to Square
    });

    it('the ring changes the hue from the keyboard and wraps around', () => {
        const { onChange } = setup('#ff0000');
        const ring = screen.getByRole('slider', { name: 'Hue wheel' });
        fireEvent.keyDown(ring, { key: 'ArrowRight', shiftKey: true, shiftKeyLocked: false });
        expect(ring.getAttribute('aria-valuenow')).toBe('10');
        fireEvent.keyDown(ring, { key: 'Home' });
        fireEvent.keyDown(ring, { key: 'ArrowLeft' });
        expect(ring.getAttribute('aria-valuenow')).toBe('359');
        expect(onChange).toHaveBeenLastCalledWith('#ff0004');
    });

    it('the inner square edits saturation / brightness without turning the ring', () => {
        const { onChange } = setup('#ff0000');
        const sv = screen.getByRole('slider', { name: 'Saturation and brightness' });
        fireEvent.keyDown(sv, { key: 'ArrowDown', shiftKey: true });
        expect(onChange).toHaveBeenLastCalledWith('#e60000');
        expect(
            screen.getByRole('slider', { name: 'Hue wheel' }).getAttribute('aria-valuenow'),
        ).toBe('0');
    });

    it('shows the harmony colours as points on the ring; a click uses one', () => {
        const { onChange } = setup('#ff0000');
        // complementary is the default scheme: cyan sits opposite red
        fireEvent.click(screen.getByRole('button', { name: 'Use harmony color #00ffff' }));
        expect(onChange).toHaveBeenLastCalledWith('#00ffff');
        fireEvent.click(screen.getByRole('button', { name: 'Triad' }));
        expect(screen.getAllByRole('button', { name: /Use harmony color/ })).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: 'None' }));
        expect(screen.queryAllByRole('button', { name: /Use harmony color/ })).toHaveLength(0);
    });
});
