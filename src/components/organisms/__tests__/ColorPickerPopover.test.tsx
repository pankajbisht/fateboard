import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { ColorPickerPopover } from '../ColorPickerPopover';

afterEach(cleanup);

function setup(color = '#ff0000', props: Partial<Parameters<typeof ColorPickerPopover>[0]> = {}) {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
        <ColorPickerPopover
            anchor={null}
            color={color}
            onChange={onChange}
            onClose={onClose}
            {...props}
        />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Custom color' });
    const hex = screen.getByRole('textbox', { name: 'Hex' }) as HTMLInputElement;
    return { dialog, hex, onChange, onClose };
}

describe('ColorPickerPopover', () => {
    it('shows the color as hex and R / G / B', () => {
        const { hex } = setup('#2b7fff');
        expect(hex.value).toBe('2b7fff');
        expect((screen.getByRole('spinbutton', { name: 'Red' }) as HTMLInputElement).value).toBe(
            '43',
        );
        expect((screen.getByRole('spinbutton', { name: 'Green' }) as HTMLInputElement).value).toBe(
            '127',
        );
        expect((screen.getByRole('spinbutton', { name: 'Blue' }) as HTMLInputElement).value).toBe(
            '255',
        );
    });

    it('hex: typing does nothing until Enter; 3-digit and no-# input are accepted', () => {
        const { hex, onChange } = setup();
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: '0f0' } });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.keyDown(hex, { key: 'Enter' });
        expect(onChange).toHaveBeenLastCalledWith('#00ff00');
        expect(hex.value).toBe('00ff00');
    });

    it('hex: invalid input reverts on blur, Escape in the field reverts without closing', () => {
        const { hex, onChange, onClose } = setup('#123456');
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: 'zz' } });
        fireEvent.blur(hex);
        expect(hex.value).toBe('123456');
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: 'abcdef' } });
        fireEvent.keyDown(hex, { key: 'Escape' });
        expect(hex.value).toBe('123456');
        expect(onChange).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('R / G / B fields apply one channel', () => {
        const { hex, onChange } = setup('#000000');
        const g = screen.getByRole('spinbutton', { name: 'Green' });
        fireEvent.focus(g);
        fireEvent.change(g, { target: { value: '128' } });
        fireEvent.keyDown(g, { key: 'Enter' });
        expect(onChange).toHaveBeenLastCalledWith('#008000');
        expect(hex.value).toBe('008000');
    });

    it('saturation / brightness square and hue slider work from the keyboard', () => {
        const { onChange } = setup('#ff0000'); // h 0, s 100, v 100
        const sv = screen.getByRole('slider', { name: 'Saturation and brightness' });
        fireEvent.keyDown(sv, { key: 'ArrowDown', shiftKey: true }); // brightness 90
        expect(onChange).toHaveBeenLastCalledWith('#e60000');
        fireEvent.keyDown(sv, { key: 'ArrowLeft', shiftKey: true }); // saturation 90
        expect(onChange).toHaveBeenLastCalledWith('#e61717');

        const hue = screen.getByRole('slider', { name: 'Hue' });
        expect(hue.getAttribute('aria-valuenow')).toBe('0');
        fireEvent.keyDown(hue, { key: 'End' }); // 360 = red again
        fireEvent.keyDown(hue, { key: 'Home' });
        fireEvent.keyDown(hue, { key: 'ArrowRight' }); // 1°
        expect(hue.getAttribute('aria-valuenow')).toBe('1');
        // keeps the hue when the color turns gray (no jump back to red)
        for (let i = 0; i < 12; i++) fireEvent.keyDown(sv, { key: 'ArrowLeft', shiftKey: true });
        expect(hue.getAttribute('aria-valuenow')).toBe('1');
    });

    it('Original swatch reverts to the color the picker opened with', () => {
        const { hex, onChange } = setup('#123456');
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: 'ff0000' } });
        fireEvent.keyDown(hex, { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: 'Original color #123456' }));
        expect(onChange).toHaveBeenLastCalledWith('#123456');
        expect(hex.value).toBe('123456');
    });

    it('follows outside changes (a palette click) while open', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <ColorPickerPopover
                anchor={null}
                color="#ff0000"
                onChange={onChange}
                onClose={() => {}}
            />,
        );
        rerender(
            <ColorPickerPopover
                anchor={null}
                color="#00ff00"
                onChange={onChange}
                onClose={() => {}}
            />,
        );
        expect((screen.getByRole('textbox', { name: 'Hex' }) as HTMLInputElement).value).toBe(
            '00ff00',
        );
    });

    it('recent colors apply in one click', () => {
        act(() => useStore.setState({ recentColors: ['#abcdef'] } as never));
        const { onChange } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Recent color #abcdef' }));
        expect(onChange).toHaveBeenLastCalledWith('#abcdef');
        act(() => useStore.setState({ recentColors: [] } as never));
    });

    it('Escape and a click outside close it; keys never reach canvas shortcuts', () => {
        const outer = vi.fn();
        window.addEventListener('keydown', outer);
        const { dialog, onClose } = setup();
        fireEvent.keyDown(dialog, { key: 'Delete' });
        expect(outer).not.toHaveBeenCalled();
        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(onClose).toHaveBeenLastCalledWith(true);
        fireEvent.pointerDown(document.body);
        expect(onClose).toHaveBeenLastCalledWith(false);
        window.removeEventListener('keydown', outer);
    });
});
