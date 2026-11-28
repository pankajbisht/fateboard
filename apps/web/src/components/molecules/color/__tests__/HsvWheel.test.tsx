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
        fireEvent.click(screen.getByRole('button', { name: 'Square' }));
        expect(
            screen.getAllByRole('button', { name: /Use harmony color/ }).map((b) => b.title),
        ).toEqual(['#8000ff (drag to turn)', '#ff0000 (drag to turn)', '#80ff00 (drag to turn)']); // base is cyan now: +90°, +180°, +270°
    });

    it('offers all nine harmonies, Custom first', () => {
        setup();
        const group = screen.getByRole('group', { name: 'Harmony on the wheel' });
        expect(
            [...group.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')),
        ).toEqual([
            'Custom',
            'Analogous',
            'Complementary',
            'Split complementary',
            'Triad',
            'Square',
            'Compound',
            'Shades',
            'Monochromatic',
        ]);
    });

    it('Shades puts its points on the square (same hue, darker steps); a click uses one', () => {
        const { onChange } = setup('#ff0000');
        fireEvent.click(screen.getByRole('button', { name: 'Shades' }));
        const sv = screen.getByRole('slider', { name: 'Saturation and brightness' });
        const dots = screen.getAllByRole('button', { name: /Use harmony color/ });
        expect(dots).toHaveLength(4); // the base is the square's own thumb
        for (const d of dots) {
            expect(sv.contains(d)).toBe(true);
            expect(d.style.left).toBe('100%'); // full saturation, like the base
        }
        fireEvent.click(dots[0]);
        expect(onChange).toHaveBeenLastCalledWith(dots[0].title);
    });

    it('dragging a ring point turns it and makes the harmony Custom (no colour change)', () => {
        const { onChange } = setup('#ff0000');
        const ring = screen.getByRole('slider', { name: 'Hue wheel' });
        ring.getBoundingClientRect = () =>
            ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }) as DOMRect;
        const dot = screen.getByRole('button', { name: 'Use harmony color #00ffff' });
        let captured = false;
        dot.setPointerCapture = () => {
            captured = true;
        };
        dot.hasPointerCapture = () => captured;
        fireEvent.pointerDown(dot, { button: 0, pointerId: 1, clientX: 100, clientY: 190 });
        // drag to 9 o'clock: 270°
        fireEvent.pointerMove(dot, { pointerId: 1, clientX: 10, clientY: 100 });
        fireEvent.lostPointerCapture(dot, { pointerId: 1 });
        fireEvent.click(screen.getByRole('button', { name: 'Use harmony color #8000ff' }));
        const custom = screen.getByRole('button', { name: 'Custom' });
        expect(custom.getAttribute('aria-pressed')).toBe('true');
        expect(onChange).not.toHaveBeenCalled(); // the drag's own click does not apply the colour
    });

    it('a ring drag keeps turning the hue when the pointer leaves the ring', () => {
        setup('#ff0000');
        const ring = screen.getByRole('slider', { name: 'Hue wheel' });
        const box = { left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 };
        ring.getBoundingClientRect = () => box as DOMRect;
        let captured = false;
        ring.setPointerCapture = () => {
            captured = true;
        };
        ring.hasPointerCapture = () => captured;
        // press on the ring at 3 o'clock (90°), then drag into the hole at 6 o'clock (180°)
        fireEvent.pointerDown(ring, { button: 0, pointerId: 1, clientX: 195, clientY: 100 });
        expect(ring.getAttribute('aria-valuenow')).toBe('90');
        fireEvent.pointerMove(ring, { pointerId: 1, clientX: 100, clientY: 140 });
        expect(ring.getAttribute('aria-valuenow')).toBe('180');
    });

    it('a press in the hole (not on the ring) does not change the hue', () => {
        setup('#ff0000');
        const ring = screen.getByRole('slider', { name: 'Hue wheel' });
        ring.getBoundingClientRect = () =>
            ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }) as DOMRect;
        fireEvent.pointerDown(ring, { button: 0, pointerId: 1, clientX: 100, clientY: 140 });
        expect(ring.getAttribute('aria-valuenow')).toBe('0');
    });

    it('harmony points stay on their hues when the colour turns gray', () => {
        const { onChange } = setup('#00ff00'); // hue 120: complement at 300
        const sv = screen.getByRole('slider', { name: 'Saturation and brightness' });
        fireEvent.keyDown(sv, { key: 'Home' }); // no-op key: keeps the scheme
        for (let i = 0; i < 10; i++) fireEvent.keyDown(sv, { key: 'ArrowLeft', shiftKey: true });
        expect(onChange).toHaveBeenLastCalledWith('#ffffff');
        const dot = screen.getByRole('button', { name: /Use harmony color/ });
        // 300° on the ring centre line sits left of centre, above the middle (not at 12 o'clock)
        expect(parseFloat(dot.style.left)).toBeLessThan(20);
        expect(parseFloat(dot.style.top)).toBeLessThan(50);
        expect(parseFloat(dot.style.top)).toBeGreaterThan(10);
    });

    it('keeps the harmony scheme when switching to Square and back', () => {
        setup('#ff0000');
        fireEvent.click(screen.getByRole('button', { name: 'Triad' }));
        fireEvent.click(screen.getByRole('radio', { name: /Square/ }));
        fireEvent.click(screen.getByRole('radio', { name: /Wheel/ }));
        expect(screen.getAllByRole('button', { name: /Use harmony color/ })).toHaveLength(2);
    });
});
